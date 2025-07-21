import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Link } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { IRedirectService, IRedisService } from '../../common/interfaces';
import { config } from '../../common/config';
import { EVENTS } from '../..//common/constants';

const VISITS_THRESHOLD = config.cache.visitsThreshold;
const CACHE_EXPIRATION = config.cache.defaultExpirationHours * 60 * 60;

@Injectable()
export class RedirectService implements IRedirectService {
  constructor(
    private prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject('IRedisService') private redis: IRedisService,
  ) {}

  async resolve(code: string): Promise<string> {
    const cachedUrl = await this.resolveFromCache(code);
    if (cachedUrl) {
      return cachedUrl;
    }

    const link = await this.resolveFromDatabase(code);
    if (!link) {
      throw new NotFoundException(`Not found`);
    }

    this.events.emit(EVENTS.LINK_VISITED, link.code);
    return link.originalUrl;
  }

  private async resolveFromCache(code: string): Promise<string | null> {
    const cached = await this.redis.get(code);
    if (cached) {
      this.events.emit(EVENTS.LINK_VISITED, code);
      return cached;
    }
    return null;
  }

  private async resolveFromDatabase(code: string): Promise<Link | null> {
    const link = await this.prisma.link.findUnique({ where: { code } });
    if (!link) return null;

    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      void this.prisma.link.delete({ where: { code } });
      return null;
    }

    if (link.visits + 1 >= VISITS_THRESHOLD) {
      void this.redis.set(
        code,
        link.originalUrl,
        link.expiresAt
          ? Math.floor((link.expiresAt.getTime() - Date.now()) / 1000)
          : CACHE_EXPIRATION,
      );
    }

    return link;
  }
}
