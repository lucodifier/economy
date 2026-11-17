import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma typings don't currently expose 'beforeExit' in $on, so call through `any`.
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
