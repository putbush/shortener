import { Link } from '@prisma/client';

export interface ILinksService {
  create(originalUrl: string, alias?: string, ttlHours?: number): Promise<Link>;
}
