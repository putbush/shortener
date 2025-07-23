import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@infra/prisma/prisma.service';
import { RedisService } from '@infra/redis/redis.service';
import { config } from '@common/config';
import type { Link } from '@prisma/client';
import { EVENTS } from '@common/constants';
import { RedirectService } from '../services/redirect.service';

describe('RedirectService - business logic for resolving short links', () => {
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

  describe('resolve - main link resolution method', () => {
    it('should return URL from cache if available', async () => {
      mockRedisGet.mockResolvedValue(URL);

      const result = await service.resolve(CODE);

      expect(mockRedisGet).toHaveBeenCalledWith(CODE);
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
      expect(mockPrismaFindUnique).not.toHaveBeenCalled();
    });

    it('should search database if not in cache', async () => {
      const link: Link = {
        id: 1n,
        originalUrl: URL,
        code: CODE,
        createdAt: new Date(NOW),
        expiresAt: null,
        visits: 3,
      };

      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(link);

      const result = await service.resolve(CODE);

      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: {
          code: CODE,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
      });
      expect(mockRedisGet).toHaveBeenCalledWith(CODE);
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
    });

    it('should throw NotFoundException if link not found', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(service.resolve(CODE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.resolve(CODE)).rejects.toThrow('Not found');

      expect(mockEventsEmit).not.toHaveBeenCalled();
    });

    it('should cache popular link (visits >= 5)', async () => {
      const popularLink: Link = {
        id: 1n,
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

    it('should cache popular link with TTL consideration', async () => {
      const futureTime = NOW + 10 * 60 * 1000; // +10 минут
      const popularLink: Link = {
        id: 1n,
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

    it('should not cache unpopular link (visits < 5)', async () => {
      const unpopularLink: Link = {
        id: 1n,
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
    it('should handle full cycle: cache miss → database → caching → event', async () => {
      const popularLink: Link = {
        id: 1n,
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
        where: {
          code: CODE,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
      });
      expect(mockRedisSet).toHaveBeenCalledWith(
        CODE,
        URL,
        config.cache.defaultExpirationHours * 60 * 60,
      );
      expect(mockEventsEmit).toHaveBeenCalledWith(EVENTS.LINK_VISITED, CODE);
      expect(result).toBe(URL);
    });
  });
});
