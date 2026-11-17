import { Controller, Post, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { DiscordAlertsService } from './discord-alerts.service';

@UseGuards(GoogleAuthGuard)
@Controller('/discord-alerts')
export class DiscordAlertsController {
  constructor(private readonly service: DiscordAlertsService) {}

  @Post('test')
  test(@CurrentUser() user: AuthUser) {
    return this.service.triggerForUser(user.id);
  }
}
