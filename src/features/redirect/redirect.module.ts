import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';
import { PrismaModule } from '@infra/prisma/prisma.module';
import { LinkAnalyticsListener } from './listeners/link-analytics.listener';
import { RedisModule } from '@infra/redis/redis.module';

@Module({
  controllers: [RedirectController],
  providers: [
    RedirectService,
    LinkAnalyticsListener,
    {
      provide: 'IRedirectService',
      useClass: RedirectService,
    },
  ],
  imports: [PrismaModule, RedisModule],
})
export class RedirectModule {}
