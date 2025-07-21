import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [
    RedisService,
    {
      provide: 'IRedisService',
      useClass: RedisService,
    },
  ],
  exports: [RedisService, 'IRedisService'],
})
export class RedisModule {}
