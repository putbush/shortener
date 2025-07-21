/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@infra/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-utils';

describe('Links API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('POST /links', () => {
    it('should create a link with auto-generated code', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('shortUrl');
      const { shortUrl } = response.body as { shortUrl: string };
      expect(shortUrl).toMatch(/^[a-zA-Z0-9]{7}$/);
    });

    it('should create a link with alias', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .send({
          url: 'https://example.com',
          alias: 'my-custom-link',
        })
        .expect(201);

      const { shortUrl } = response.body as { shortUrl: string };
      expect(shortUrl).toBe('my-custom-link');
    });

    it('should reject duplicate alias', async () => {
      const alias = 'duplicate-alias';

      await request(app.getHttpServer())
        .post('/links')
        .send({
          url: 'https://example.com',
          alias,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/links')
        .send({
          url: 'https://example.com',
          alias,
        })
        .expect(409);
    });

    it('should reject invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/links')
        .send({ url: 'not-a-valid-url' })
        .expect(400);
    });
  });
});
