import { Module } from '@nestjs/common';
import { LinksService } from './services/links.service';
import { LinksController } from './links.controller';
import { PrismaModule } from '@infra/prisma/prisma.module';
import { LinkAnalyticsListener } from './listeners/link-analytics.listener';
import { RedirectService } from './services/redirect.service';
import { RedisModule } from '@infra/redis/redis.module';

@Module({
  controllers: [LinksController],
  providers: [
    {
      provide: 'ILinksService',
      useClass: LinksService,
    },
    LinkAnalyticsListener,
    {
      provide: 'IRedirectService',
      useClass: RedirectService,
    },
  ],
  imports: [PrismaModule, RedisModule],
})
export class LinksModule {}
