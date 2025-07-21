import { Module } from '@nestjs/common';
import { LinksModule } from './features/links/links.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedirectModule } from './features/redirect/redirect.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './infra/redis/redis.module';

@Module({
  imports: [
    LinksModule,
    PrismaModule,
    RedirectModule,
    RedisModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot(),
  ],
})
export class AppModule {}
