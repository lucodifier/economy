import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from '../../auth/google-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(GoogleAuthGuard)
@Controller('/subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name?: string;
      startDate?: string;
      monthlyValue?: number;
      autoRenewal?: boolean;
      nextRenewalDate?: string | null;
      endDate?: string | null;
    },
  ) {
    return this.service.create(user.id, {
      name: String(body.name || ''),
      startDate: String(body.startDate || ''),
      monthlyValue: Number(body.monthlyValue),
      autoRenewal: body.autoRenewal,
      nextRenewalDate: body.nextRenewalDate,
      endDate: body.endDate,
    });
  }

  @Put('/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      startDate?: string;
      monthlyValue?: number;
      autoRenewal?: boolean;
      nextRenewalDate?: string | null;
      endDate?: string | null;
    },
  ) {
    return this.service.update(user.id, id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      startDate: body.startDate !== undefined ? String(body.startDate) : undefined,
      monthlyValue: body.monthlyValue !== undefined ? Number(body.monthlyValue) : undefined,
      autoRenewal: body.autoRenewal,
      nextRenewalDate: body.nextRenewalDate,
      endDate: body.endDate,
    });
  }

  @Delete('/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
