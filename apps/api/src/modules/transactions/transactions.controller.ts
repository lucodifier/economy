import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { TransactionsService } from './transactions.service';

@UseGuards(GoogleAuthGuard)
@Controller('/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountId') accountId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.list(user.id, { from, to, accountId, q });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    const kind = String(body.kind || body.type || '').toUpperCase();

    if (kind === 'TRANSFER') {
      return this.service.createTransfer(user.id, {
        fromAccountId: String(body.fromAccountId || ''),
        toAccountId: String(body.toAccountId || ''),
        date: String(body.date || ''),
        description: body.description ? String(body.description) : undefined,
        amount: Number(body.amount),
      });
    }

    const type = kind === 'INCOME' ? 'INCOME' : 'EXPENSE';

    return this.service.createExpenseOrIncome(user.id, {
      accountId: String(body.accountId || ''),
      categoryId: body.categoryId ? String(body.categoryId) : null,
      date: String(body.date || ''),
      description: String(body.description || ''),
      amount: Number(body.amount),
      type,
      consolidated: Boolean(body.consolidated),
    });
  }

  @Put('/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.service.update(user.id, id, {
      accountId: body.accountId ? String(body.accountId) : undefined,
      categoryId: body.categoryId !== undefined ? (body.categoryId ? String(body.categoryId) : null) : undefined,
      date: body.date ? String(body.date) : undefined,
      description: body.description ? String(body.description) : undefined,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      type: body.type ? (String(body.type).toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE') : undefined,
      consolidated: body.consolidated !== undefined ? Boolean(body.consolidated) : undefined,
    });
  }

  @Delete('/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
