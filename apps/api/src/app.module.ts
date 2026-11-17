import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DiscordAlertsModule } from './modules/discord-alerts/discord-alerts.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AccountsModule, CategoriesModule, TransactionsModule, ImportExportModule, SubscriptionsModule, WebhooksModule, DiscordAlertsModule],
  controllers: [HealthController],
})
export class AppModule {}
