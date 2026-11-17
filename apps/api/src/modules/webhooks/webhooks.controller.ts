import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { WebhooksService } from './webhooks.service';

@UseGuards(GoogleAuthGuard)
@Controller('/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; url?: string; events?: string[] },
  ) {
    return this.service.create(user.id, {
      name: String(body.name || ''),
      url: String(body.url || ''),
      events: body.events || [],
    });
  }

  @Put('/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; url?: string; events?: string[]; active?: boolean },
  ) {
    return this.service.update(user.id, id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      url: body.url !== undefined ? String(body.url) : undefined,
      events: body.events,
      active: body.active,
    });
  }

  @Delete('/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
