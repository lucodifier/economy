import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, name: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');
    return this.prisma.account.create({
      data: { userId, name: name.trim() },
    });
  }

  async update(userId: string, id: string, name: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');

    const existing = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('account not found');

    return this.prisma.account.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('account not found');

    await this.prisma.account.delete({ where: { id } });
    return { ok: true };
  }
}
