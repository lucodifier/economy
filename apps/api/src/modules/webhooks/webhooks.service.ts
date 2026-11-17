import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, data: { name: string; url: string; events: string[] }) {
    if (!data.name?.trim()) throw new BadRequestException('name is required');
    if (!data.url?.trim()) throw new BadRequestException('url is required');
    if (!data.events?.length) throw new BadRequestException('at least one event is required');

    const url = data.url.trim();
    if (!url.startsWith('https://discord.com/api/webhooks/')) {
      throw new BadRequestException('url must be a valid Discord webhook URL');
    }

    return this.prisma.webhook.create({
      data: {
        userId,
        name: data.name.trim(),
        url,
        events: data.events,
      },
    });
  }

  async update(userId: string, id: string, data: { name?: string; url?: string; events?: string[]; active?: boolean }) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('webhook not found');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) throw new BadRequestException('name cannot be empty');
      updateData.name = data.name.trim();
    }

    if (data.url !== undefined) {
      if (!data.url?.trim()) throw new BadRequestException('url cannot be empty');
      const url = data.url.trim();
      if (!url.startsWith('https://discord.com/api/webhooks/')) {
        throw new BadRequestException('url must be a valid Discord webhook URL');
      }
      updateData.url = url;
    }

    if (data.events !== undefined) {
      if (!data.events?.length) throw new BadRequestException('at least one event is required');
      updateData.events = data.events;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    return this.prisma.webhook.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.webhook.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('webhook not found');

    await this.prisma.webhook.delete({ where: { id } });
    return { ok: true };
  }

  async findByEvent(userId: string, event: string) {
    return this.prisma.webhook.findMany({
      where: { userId, active: true, events: { has: event } },
    });
  }
}
