/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-utils';

describe('Redirect API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('GET /:code', () => {
    it('перенаправляет на оригинальный URL', async () => {
      await prisma.link.create({
        data: {
          code: 'testcode',
          originalUrl: 'https://example.com',
          visits: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/testcode')
        .expect(301);

      expect(response.headers.location).toBe('https://example.com');
    });

    it('возвращает 404 для несуществующего кода', async () => {
      await request(app.getHttpServer()).get('/nonexistent').expect(404);
    });

    it('возвращает 404 для истекшей ссылки', async () => {
      await prisma.link.create({
        data: {
          code: 'expired',
          originalUrl: 'https://example.com',
          expiresAt: new Date(Date.now() - 60000), // Истекла минуту назад
          visits: 0,
        },
      });

      await request(app.getHttpServer()).get('/expired').expect(404);
    });
  });
});
