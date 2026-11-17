import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function parseISODate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('invalid date');
  return d;
}

function toDecimal2(value: number): Prisma.Decimal {
  // Prisma.Decimal accepts string/number; using string with fixed 2 to avoid float artifacts
  return new Prisma.Decimal(value.toFixed(2));
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, args: { from?: string; to?: string; accountId?: string; q?: string }) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (args.accountId) where.accountId = args.accountId;

    if (args.from || args.to) {
      where.date = {};
      if (args.from) where.date.gte = parseISODate(args.from);
      if (args.to) {
        // inclui o dia final inteiro
        const end = parseISODate(args.to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (args.q?.trim()) {
      where.description = { contains: args.q.trim(), mode: 'insensitive' };
    }

    return this.prisma.transaction.findMany({
      where,
      include: { account: true, category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
  }

  async createExpenseOrIncome(userId: string, body: {
    accountId: string;
    categoryId?: string | null;
    date: string;
    description: string;
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    consolidated?: boolean;
  }) {
    if (!body.accountId) throw new BadRequestException('accountId is required');
    if (!body.description?.trim()) throw new BadRequestException('description is required');
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount)) throw new BadRequestException('amount is required');

    const date = parseISODate(body.date);
    const sign = body.type === 'EXPENSE' ? -1 : 1;
    const normalized = Math.abs(body.amount) * sign;

    return this.prisma.transaction.create({
      data: {
        userId,
        accountId: body.accountId,
        categoryId: body.categoryId || null,
        type: body.type === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME,
        date,
        description: body.description.trim(),
        amount: toDecimal2(normalized),
        consolidated: body.consolidated || false,
      },
      include: { account: true, category: true },
    });
  }

  async createTransfer(userId: string, body: {
    fromAccountId: string;
    toAccountId: string;
    date: string;
    description?: string;
    amount: number;
  }) {
    if (!body.fromAccountId || !body.toAccountId) throw new BadRequestException('fromAccountId and toAccountId are required');
    if (body.fromAccountId === body.toAccountId) throw new BadRequestException('accounts must differ');
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) throw new BadRequestException('amount must be > 0');

    const date = parseISODate(body.date);
    const amount = Math.abs(body.amount);
    const description = (body.description?.trim() || 'Transferência');

    const group = await this.prisma.transactionGroup.create({
      data: { userId, kind: 'TRANSFER' },
      select: { id: true },
    });

    const txOut = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: body.fromAccountId,
        type: TransactionType.TRANSFER,
        date,
        description: `${description} (saída)`,
        amount: toDecimal2(-amount),
        groupId: group.id,
      },
    });

    const txIn = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: body.toAccountId,
        type: TransactionType.TRANSFER,
        date,
        description: `${description} (entrada)`,
        amount: toDecimal2(amount),
        groupId: group.id,
      },
    });

    const items = await this.prisma.transaction.findMany({
      where: { id: { in: [txOut.id, txIn.id] } },
      include: { account: true, category: true },
      orderBy: { amount: 'asc' },
    });

    return { groupId: group.id, items };
  }

  async update(userId: string, id: string, body: {
    accountId?: string;
    categoryId?: string | null;
    date?: string;
    description?: string;
    amount?: number;
    type?: 'EXPENSE' | 'INCOME';
    consolidated?: boolean;
  }) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('transaction not found');

    if (existing.type === TransactionType.TRANSFER) {
      throw new BadRequestException('transfer transactions must be edited via delete + recreate (simplified)');
    }

    const data: Prisma.TransactionUncheckedUpdateInput = {};

    if (body.accountId) data.accountId = body.accountId;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.date) data.date = parseISODate(body.date);
    if (body.description?.trim()) data.description = body.description.trim();
    if (body.consolidated !== undefined) data.consolidated = body.consolidated;

    if (body.amount !== undefined) {
      if (typeof body.amount !== 'number' || !Number.isFinite(body.amount)) throw new BadRequestException('invalid amount');
      const t = body.type || (existing.type === TransactionType.EXPENSE ? 'EXPENSE' : 'INCOME');
      const sign = t === 'EXPENSE' ? -1 : 1;
      data.amount = toDecimal2(Math.abs(body.amount) * sign);
      data.type = t === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME;
    } else if (body.type) {
      // if only type changes, flip sign to match new type
      const sign = body.type === 'EXPENSE' ? -1 : 1;
      data.amount = toDecimal2(Math.abs(Number(existing.amount)) * sign);
      data.type = body.type === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME;
    }

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: { account: true, category: true },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('transaction not found');

    if (existing.type === TransactionType.TRANSFER && existing.groupId) {
      // remove whole group
      await this.prisma.transaction.deleteMany({ where: { groupId: existing.groupId, userId } });
      await this.prisma.transactionGroup.delete({ where: { id: existing.groupId } }).catch(() => undefined);
      return { ok: true, deletedTransferGroup: true };
    }

    await this.prisma.transaction.delete({ where: { id } });
    return { ok: true };
  }
}
