import { EVENTS } from '@common/constants';
import { PrismaService } from '@infra/prisma/prisma.service';
import { LinkAnalyticsListener } from './link-analytics.listener';

describe('LinkAnalyticsListener', () => {
  let listener: LinkAnalyticsListener;
  let mockPrismaUpdate: jest.Mock;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrismaUpdate = jest.fn();

    prisma = {
      link: {
        update: mockPrismaUpdate,
      },
    } as unknown as jest.Mocked<PrismaService>;

    listener = new LinkAnalyticsListener(prisma);
  });

  it('should increment visit counter by 1', async () => {
    const code = 'ABC123';
    mockPrismaUpdate.mockResolvedValue({
      id: 1,
      code,
      visits: 6,
    });

    await listener.handleLinkVisited(code);

    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { code },
      data: { visits: { increment: 1 } },
    });
  });

  it('should handle different link codes', async () => {
    const codes = ['XYZ789', 'test123', 'shortlink'];

    for (const code of codes) {
      mockPrismaUpdate.mockResolvedValue({ id: 1, code, visits: 1 });
      await listener.handleLinkVisited(code);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { code },
        data: { visits: { increment: 1 } },
      });
    }

    expect(mockPrismaUpdate).toHaveBeenCalledTimes(3);
  });

  it('should handle database errors', async () => {
    const code = 'ERROR123';
    const dbError = new Error('Database connection failed');
    mockPrismaUpdate.mockRejectedValue(dbError);

    await expect(listener.handleLinkVisited(code)).rejects.toThrow(dbError);

    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { code },
      data: { visits: { increment: 1 } },
    });
  });

  it('should correctly export event constants', () => {
    expect(EVENTS.LINK_VISITED).toBe('link.visited');
  });

  it('should mark method as async for event handling', () => {
    const isAsync =
      listener.handleLinkVisited.constructor.name === 'AsyncFunction';
    expect(isAsync).toBe(true);
  });
});
