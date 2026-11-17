import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

const TIMEZONE = 'America/Sao_Paulo';
// Discord permite no máximo 25 fields por embed
const MAX_EMBED_FIELDS = 25;

interface AlertItem {
  name: string;
  value: string;
  amount: number;
}

@Injectable()
export class DiscordAlertsService {
  private readonly logger = new Logger(DiscordAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Cron('0 9 * * *', { timeZone: TIMEZONE })
  async handleDueExpenses() {
    this.logger.log('Checking due expenses for Discord alerts...');

    const today = this.localTodayAsUtc();
    const users = await this.prisma.user.findMany();

    for (const user of users) {
      try {
        await this.processUserAlerts(user.id, today);
      } catch (error) {
        this.logger.error(`Error processing alerts for user ${user.id}: ${error}`);
      }
    }
  }

  async triggerForUser(userId: string) {
    this.logger.log(`Manual trigger for user ${userId}`);
    await this.processUserAlerts(userId, this.localTodayAsUtc());
    return { ok: true };
  }

  // Datas de transações/assinaturas são gravadas como meia-noite UTC do dia
  // escolhido (o front envia "YYYY-MM-DD"). "Hoje" precisa ser o dia-calendário
  // em São Paulo, representado nessa mesma convenção.
  private localTodayAsUtc(): Date {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
    return new Date(`${ymd}T00:00:00.000Z`);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async processUserAlerts(userId: string, today: Date) {
    const webhooks = await this.webhooksService.findByEvent(userId, 'expense_due');
    if (!webhooks.length) {
      this.logger.log(`User ${userId}: no active webhooks for event expense_due, skipping`);
      return;
    }

    const tomorrow = this.addDays(today, 1);
    const dayAfterTomorrow = this.addDays(today, 2);

    const baseWhere = { userId, type: 'EXPENSE' as const, consolidated: false };
    const include = { account: true, category: true };

    const [overdueTx, dueTodayTx, dueTomorrowTx, subscriptions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { ...baseWhere, date: { lt: today } },
        include,
        orderBy: { date: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: { ...baseWhere, date: { gte: today, lt: tomorrow } },
        include,
      }),
      this.prisma.transaction.findMany({
        where: { ...baseWhere, date: { gte: tomorrow, lt: dayAfterTomorrow } },
        include,
      }),
      this.prisma.subscription.findMany({
        where: {
          userId,
          nextRenewalDate: { gte: today, lt: dayAfterTomorrow },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
      }),
    ]);

    const txItem = (t: (typeof dueTodayTx)[number]): AlertItem => {
      const amount = Math.abs(Number(t.amount));
      return {
        name: t.description,
        value: `R$ ${amount.toFixed(2)} — ${t.account.name}${t.category ? ` (${t.category.name})` : ''}`,
        amount,
      };
    };

    const overdue: AlertItem[] = overdueTx.map(t => {
      const item = txItem(t);
      return { ...item, value: `${item.value} — venceu em ${this.formatDayMonth(t.date)}` };
    });
    const dueToday: AlertItem[] = dueTodayTx.map(txItem);
    const dueTomorrow: AlertItem[] = dueTomorrowTx.map(txItem);

    for (const sub of subscriptions) {
      const amount = Math.abs(Number(sub.monthlyValue));
      const item: AlertItem = {
        name: sub.name,
        value: `R$ ${amount.toFixed(2)} — Assinatura`,
        amount,
      };
      if (sub.nextRenewalDate && sub.nextRenewalDate < tomorrow) {
        dueToday.push(item);
      } else {
        dueTomorrow.push(item);
      }
    }

    this.logger.log(
      `User ${userId}: today=${today.toISOString().slice(0, 10)} | overdue=${overdue.length}, dueToday=${dueToday.length}, dueTomorrow=${dueTomorrow.length} (subscriptions=${subscriptions.length})`,
    );

    if (!overdue.length && !dueToday.length && !dueTomorrow.length) {
      this.logger.log(`User ${userId}: nothing due, no alert sent`);
      return;
    }

    for (const webhook of webhooks) {
      try {
        await this.sendDiscordAlert(webhook.url, overdue, dueToday, dueTomorrow);
        this.logger.log(`Alert sent to webhook ${webhook.id} (${webhook.name})`);
      } catch (error) {
        this.logger.error(`Error sending webhook ${webhook.id}: ${error}`);
      }
    }
  }

  private formatDayMonth(date: Date): string {
    // datas gravadas como meia-noite UTC, então os getters UTC dão o dia correto
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  private buildEmbed(title: string, color: number, items: AlertItem[]) {
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    let fields = items.map(({ name, value }) => ({ name, value, inline: false }));
    if (fields.length > MAX_EMBED_FIELDS) {
      const hidden = fields.length - (MAX_EMBED_FIELDS - 1);
      fields = fields.slice(0, MAX_EMBED_FIELDS - 1);
      fields.push({ name: '…', value: `e mais ${hidden} itens`, inline: false });
    }

    return {
      title: `${title} (${items.length})`,
      color,
      fields,
      footer: { text: `Total: R$ ${total.toFixed(2)}` },
    };
  }

  async sendDiscordAlert(
    webhookUrl: string,
    overdue: AlertItem[],
    dueToday: AlertItem[],
    dueTomorrow: AlertItem[],
  ) {
    const embeds: any[] = [];

    if (overdue.length) {
      embeds.push(this.buildEmbed('Em atraso', 0x991b1b, overdue));
    }
    if (dueToday.length) {
      embeds.push(this.buildEmbed('Vencimento hoje', 0xef4444, dueToday));
    }
    if (dueTomorrow.length) {
      embeds.push(this.buildEmbed('Vencimento amanhã', 0xf59e0b, dueTomorrow));
    }

    const totalGeneral = [...overdue, ...dueToday, ...dueTomorrow].reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const body = {
      username: 'Minhas Economias',
      embeds,
      content: `Resumo de contas a pagar — Total: R$ ${totalGeneral.toFixed(2)}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
    }
  }
}
