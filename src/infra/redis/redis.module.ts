import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [
    {
      provide: 'IRedisService',
      useClass: RedisService,
    },
  ],
  exports: ['IRedisService'],
})
export class RedisModule {}
