import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TokenInfoPayload = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: string;
  active?: string;
};

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] || '');

    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
      );

      if (!response.ok) {
        throw new UnauthorizedException('Token expired or invalid');
      }

      const payload: TokenInfoPayload = await response.json();

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.prisma.user.upsert({
        where: { googleSub: payload.sub },
        create: {
          googleSub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        },
        update: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          lastAccessAt: new Date(),
        },
        select: { id: true, email: true, name: true, lastAccessAt: true },
      });

      req.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token expired or invalid');
    }
  }
}
