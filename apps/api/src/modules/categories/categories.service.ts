import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, name: string, color?: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');
    return this.prisma.category.create({
      data: { userId, name: name.trim(), color: color?.trim() || null },
    });
  }

  async update(userId: string, id: string, name: string, color?: string) {
    if (!name?.trim()) throw new BadRequestException('name is required');

    const existing = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('category not found');

    return this.prisma.category.update({
      where: { id },
      data: { name: name.trim(), color: color?.trim() || null },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('category not found');

    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}
