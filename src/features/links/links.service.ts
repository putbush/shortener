import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import { Link } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ERRORS } from '@common/constants';
import { generateCode } from '@common/utils';
import { ILinksService } from '@common/interfaces';

@Injectable()
export class LinksService implements ILinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    originalUrl: string,
    alias?: string,
    ttlHours?: number,
  ): Promise<Link> {
    const expiresAt = ttlHours
      ? new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      : null;

    if (alias) {
      return await this.createWithAlias(originalUrl, alias, expiresAt);
    }

    return await this.createWithAutoCode(originalUrl, expiresAt);
  }

  private async createWithAlias(
    originalUrl: string,
    alias: string,
    expiresAt: Date | null,
  ): Promise<Link> {
    try {
      return await this.prisma.link.create({
        data: { originalUrl, code: alias, expiresAt },
      });
    } catch (err: unknown) {
      this.handlePrismaError(err, alias);
    }
  }

  private async createWithAutoCode(
    originalUrl: string,
    expiresAt: Date | null,
  ): Promise<Link> {
    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.link.create({
        data: { originalUrl, code: '', expiresAt },
      });

      const generated = generateCode(created.id);
      return await tx.link.update({
        where: { id: created.id },
        data: { code: generated },
      });
    });
  }

  private handlePrismaError(err: unknown, alias: string): never {
    if (
      err instanceof PrismaClientKnownRequestError &&
      err.code === ERRORS.UNIQUE_VIOLATION
    ) {
      throw new ConflictException(`Code "${alias}" is already taken`);
    }
    throw new InternalServerErrorException();
  }
}
