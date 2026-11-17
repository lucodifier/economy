import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { CategoriesService } from './categories.service';

@UseGuards(GoogleAuthGuard)
@Controller('/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { name?: string; color?: string }) {
    return this.service.create(user.id, String(body.name || ''), body.color);
  }

  @Put('/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { name?: string; color?: string }) {
    return this.service.update(user.id, id, String(body.name || ''), body.color);
  }

  @Delete('/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
