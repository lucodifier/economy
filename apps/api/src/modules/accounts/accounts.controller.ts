import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { AccountsService } from './accounts.service';

@UseGuards(GoogleAuthGuard)
@Controller('/accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { name?: string }) {
    return this.service.create(user.id, String(body.name || ''));
  }

  @Put('/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { name?: string }) {
    return this.service.update(user.id, id, String(body.name || ''));
  }

  @Delete('/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
