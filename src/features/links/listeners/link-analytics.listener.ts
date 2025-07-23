import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@infra/prisma/prisma.service';
import { EVENTS } from '@common/constants';

@Injectable()
export class LinkAnalyticsListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENTS.LINK_VISITED, { async: true })
  async handleLinkVisited(code: string) {
    await this.prisma.link.update({
      where: { code: code },
      data: { visits: { increment: 1 } },
    });
  }
}
