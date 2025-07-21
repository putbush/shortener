import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { generateCode } from '../../common/utils';
import { ERRORS } from '../../common/constants';
import { LinksService } from './links.service';
import type { Link } from '@prisma/client';

jest.mock('../../common/utils', () => ({
  generateCode: jest.fn(),
}));

const mockedGenerateCode = generateCode as jest.MockedFunction<
  typeof generateCode
>;

describe('LinksService', () => {
  const NOW = 1_700_000_000_000;
  const URL = 'https://example.com';
  const ALIAS = 'CUSTOM';
  const TTL_HOURS = 2;

  let prisma: jest.Mocked<PrismaService>;
  let service: LinksService;
  let mockCreate: jest.Mock;
  let mockTransaction: jest.Mock;

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockCreate = jest.fn();
    mockTransaction = jest.fn();

    prisma = {
      link: { create: mockCreate },
      $transaction: mockTransaction,
    } as unknown as jest.Mocked<PrismaService>;

    service = new LinksService(prisma);
  });

  it('создание с alias вызывает prisma.link.create', async () => {
    const returned: Link = {
      id: 1,
      originalUrl: URL,
      code: ALIAS,
      createdAt: new Date(NOW),
      expiresAt: null,
      visits: 0,
    };
    mockCreate.mockResolvedValue(returned);

    const result = await service.create(URL, ALIAS);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { originalUrl: URL, code: ALIAS, expiresAt: null },
    });
    expect(result).toEqual(returned);
  });

  it('создание с TTL вычисляет expiresAt', async () => {
    const expiresAt = new Date(NOW + TTL_HOURS * 3600 * 1000);
    const returned: Link = {
      id: 2,
      originalUrl: URL,
      code: ALIAS,
      createdAt: new Date(NOW),
      expiresAt,
      visits: 0,
    };
    mockCreate.mockResolvedValue(returned);

    await service.create(URL, ALIAS, TTL_HOURS);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { originalUrl: URL, code: ALIAS, expiresAt },
    });
  });

  it('обрабатывает unique constraint ошибку', async () => {
    const uniqueErr = new PrismaClientKnownRequestError('Unique failed', {
      code: ERRORS.UNIQUE_VIOLATION,
      clientVersion: '5.0.0',
    });
    mockCreate.mockRejectedValue(uniqueErr);

    await expect(service.create(URL, ALIAS)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('обрабатывает другие ошибки', async () => {
    mockCreate.mockRejectedValue(new Error('oops'));

    await expect(service.create(URL, ALIAS)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('без alias использует транзакцию и автогенерацию', async () => {
    const GENERATED = 'ABC1234';
    mockedGenerateCode.mockReturnValue(GENERATED);

    mockTransaction.mockImplementation(
      (cb: (prisma: PrismaService) => Promise<Link>) => {
        const tx = {
          link: {
            create: jest.fn().mockResolvedValue({ id: 42 }),
            update: jest.fn().mockResolvedValue({
              id: 42,
              originalUrl: URL,
              code: GENERATED,
              createdAt: new Date(NOW),
              expiresAt: null,
              visits: 0,
            } as Link),
          },
        } as unknown as PrismaService;
        return cb(tx);
      },
    );

    const result = await service.create(URL);

    expect(mockTransaction).toHaveBeenCalled();
    expect(result.code).toBe(GENERATED);
  });
});
