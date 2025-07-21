// test/testUtils.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@infra/prisma/prisma.service';
import { RedisService } from '@infra/redis/redis.service';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  redisService: RedisService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());

  const prisma = moduleFixture.get(PrismaService);
  const redisService = moduleFixture.get(RedisService);

  await app.init();
  return { app, prisma, redisService };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.link.deleteMany();
}
