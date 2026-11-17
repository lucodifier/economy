import { Module } from '@nestjs/common';
import { DiscordAlertsController } from './discord-alerts.controller';
import { DiscordAlertsService } from './discord-alerts.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [DiscordAlertsController],
  providers: [DiscordAlertsService],
})
export class DiscordAlertsModule {}
