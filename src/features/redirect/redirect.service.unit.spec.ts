import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { RedirectService } from './redirect.service';
import { config } from '../../common/config';
import type { Link } from '@prisma/client';
import { EVENTS } from '../../common/constants';

describe('RedirectService – бизнес‑логика разрешения коротких ссылок', () => {
  const NOW = 1_700_000_000_000;
  const CODE = 'ABC123';
  const URL = 'https://example.com';
  const VISITS_THRESHOLD = config.cache.visitsThreshold;

  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;
  let events: jest.Mocked<EventEmitter2>;
  let service: RedirectService;
  let mockRedisGet: jest.Mock;
  let mockRedisSet: jest.Mock;
  let mockPrismaFindUnique: jest.Mock;
  let mockPrismaDelete: jest.Mock;
  let mockEventsEmit: jest.Mock;

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockPrismaFindUnique = jest.fn();
    mockPrismaDelete = jest.fn();
    mockRedisGet = jest.fn();
    mockRedisSet = jest.fn();
    mockEventsEmit = jest.fn();

    prisma = {
      link: {
        findUnique: mockPrismaFindUnique,
        delete: mockPrismaDelete,
      },
    } as unknown as jest.Mocked<PrismaService>;

    redis = {
      get: mockRedisGet,
      set: mockRedisSet,
    } as unknown as jest.Mocked<RedisService>;

    events = {
      emit: mockEventsEmit,
    } as unknown as jest.Mocked<EventEmitter2>;

    service = new RedirectService(prisma, events, redis);
  });

  describe('resolve – основной метод разрешения ссылок', () => {
    it('возвращает URL из кеша, если он есть', async () => {
      mockRedisGet.mockResolvedValue(URL);

      const result = await service.resolve(CODE);

      expect(mockRedisGet).toHaveBeenCalledWith(CODE);
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
      expect(mockPrismaFindUnique).not.toHaveBeenCalled();
    });

    it('ищет в БД, если в кеше нет', async () => {
      const link: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: null,
        visits: 3,
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(link);

      const result = await service.resolve(CODE);

      expect(mockRedisGet).toHaveBeenCalledWith(CODE);
      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { code: CODE },
      });
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
    });

    it('выбрасывает NotFoundException, если ссылка не найдена', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(service.resolve(CODE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.resolve(CODE)).rejects.toThrow('Not found');

      expect(mockEventsEmit).not.toHaveBeenCalled();
    });

    it('удаляет истекшую ссылку и выбрасывает NotFoundException', async () => {
      const expiredLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW - 1000),
        expiresAt: new Date(NOW - 1), // истекла
        visits: 3,
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(expiredLink);
      mockPrismaDelete.mockResolvedValue(expiredLink);

      await expect(service.resolve(CODE)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(mockPrismaDelete).toHaveBeenCalledWith({
        where: { code: CODE },
      });
      expect(mockEventsEmit).not.toHaveBeenCalled();
    });

    it('кеширует популярную ссылку (visits >= 5)', async () => {
      const popularLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: null,
        visits: VISITS_THRESHOLD, // достигнут порог
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(popularLink);

      const result = await service.resolve(CODE);

      expect(result).toBe(URL);
      expect(mockRedisSet).toHaveBeenCalledWith(
        CODE,
        URL,
        config.cache.defaultExpirationHours * 60 * 60, // CACHE_EXPIRATION from config
      );
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
    });

    it('кеширует популярную ссылку с учетом TTL', async () => {
      const futureTime = NOW + 10 * 60 * 1000; // +10 минут
      const popularLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: new Date(futureTime),
        visits: VISITS_THRESHOLD,
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(popularLink);

      const result = await service.resolve(CODE);

      expect(result).toBe(URL);
      expect(mockRedisSet).toHaveBeenCalledWith(
        CODE,
        URL,
        Math.floor((futureTime - NOW) / 1000), // TTL в секундах
      );
    });

    it('не кеширует непопулярную ссылку (visits < 5)', async () => {
      const unpopularLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: null,
        visits: 2, // меньше порога
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(unpopularLink);

      const result = await service.resolve(CODE);

      expect(result).toBe(URL);
      expect(mockRedisSet).not.toHaveBeenCalled();
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
    });
  });

  describe('интеграционные сценарии', () => {
    it('обрабатывает полный цикл: кеш промах → БД → кеширование → событие', async () => {
      const popularLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: null,
        visits: VISITS_THRESHOLD,
      };

      mockRedisGet.mockResolvedValue(null); // кеш промах
      mockPrismaFindUnique.mockResolvedValue(popularLink);

      const result = await service.resolve(CODE);

      expect(mockRedisGet).toHaveBeenCalledWith(CODE);
      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { code: CODE },
      });
      expect(mockRedisSet).toHaveBeenCalledWith(
        CODE,
        URL,
        config.cache.defaultExpirationHours * 60 * 60,
      );
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
    });

    it('не удаляет активную ссылку с будущим expiresAt', async () => {
      const futureLink: Link = {
        id: 1,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: new Date(NOW + 10000), // в будущем
        visits: 1,
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(futureLink);

      const result = await service.resolve(CODE);

      expect(result).toBe(URL);
      expect(mockPrismaDelete).not.toHaveBeenCalled();
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
    });
  });
});
