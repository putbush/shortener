import { Injectable } from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from '@common/config';
import { IRedisService } from '@common/interfaces';

@Injectable()
export class RedisService implements IRedisService {
  private readonly client: RedisClient;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
}
