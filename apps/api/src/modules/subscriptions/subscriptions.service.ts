import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      startDate: string;
      monthlyValue: number;
      autoRenewal?: boolean;
      nextRenewalDate?: string | null;
      endDate?: string | null;
    },
  ) {
    if (!data.name?.trim()) throw new BadRequestException('name is required');
    if (!data.startDate) throw new BadRequestException('startDate is required');
    if (data.monthlyValue === undefined || data.monthlyValue === null) {
      throw new BadRequestException('monthlyValue is required');
    }
    if (data.monthlyValue <= 0) {
      throw new BadRequestException('monthlyValue must be positive');
    }

    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('startDate must be a valid date');
    }

    let nextRenewalDate: Date | null = null;
    if (data.nextRenewalDate) {
      nextRenewalDate = new Date(data.nextRenewalDate);
      if (isNaN(nextRenewalDate.getTime())) {
        throw new BadRequestException('nextRenewalDate must be a valid date');
      }
      if (nextRenewalDate <= startDate) {
        throw new BadRequestException('nextRenewalDate must be after startDate');
      }
    }

    let endDate: Date | null = null;
    if (data.endDate) {
      endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('endDate must be a valid date');
      }
      if (endDate <= startDate) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        name: data.name.trim(),
        startDate,
        monthlyValue: data.monthlyValue,
        autoRenewal: data.autoRenewal ?? false,
        nextRenewalDate,
        endDate,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      name?: string;
      startDate?: string;
      monthlyValue?: number;
      autoRenewal?: boolean;
      nextRenewalDate?: string | null;
      endDate?: string | null;
    },
  ) {
    const existing = await this.prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('subscription not found');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) throw new BadRequestException('name cannot be empty');
      updateData.name = data.name.trim();
    }

    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('startDate must be a valid date');
      }
      updateData.startDate = startDate;
    }

    if (data.monthlyValue !== undefined) {
      if (data.monthlyValue <= 0) {
        throw new BadRequestException('monthlyValue must be positive');
      }
      updateData.monthlyValue = data.monthlyValue;
    }

    if (data.autoRenewal !== undefined) {
      updateData.autoRenewal = data.autoRenewal;
    }

    if (data.nextRenewalDate !== undefined) {
      if (data.nextRenewalDate === null) {
        updateData.nextRenewalDate = null;
      } else {
        const nextRenewalDate = new Date(data.nextRenewalDate);
        if (isNaN(nextRenewalDate.getTime())) {
          throw new BadRequestException('nextRenewalDate must be a valid date');
        }
        const startDate = updateData.startDate ? new Date(updateData.startDate) : existing.startDate;
        if (nextRenewalDate <= startDate) {
          throw new BadRequestException('nextRenewalDate must be after startDate');
        }
        updateData.nextRenewalDate = nextRenewalDate;
      }
    }

    if (data.endDate !== undefined) {
      if (data.endDate === null) {
        updateData.endDate = null;
      } else {
        const endDate = new Date(data.endDate);
        if (isNaN(endDate.getTime())) {
          throw new BadRequestException('endDate must be a valid date');
        }
        const startDate = updateData.startDate ? new Date(updateData.startDate) : existing.startDate;
        if (endDate <= startDate) {
          throw new BadRequestException('endDate must be after startDate');
        }
        updateData.endDate = endDate;
      }
    }

    return this.prisma.subscription.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('subscription not found');

    await this.prisma.subscription.delete({ where: { id } });
    return { ok: true };
  }
}
