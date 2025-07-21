import { Controller, Body, Post, Inject, UseGuards } from '@nestjs/common';
import { CreateLinkSchema, CreateLinkDto } from './dto/create-link.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ZodExceptionPipe } from '../../common/pipes';
import { ILinksService } from '../../common/interfaces';
import { config } from '../../common/config';

@Controller('links')
export class LinksController {
  constructor(
    @Inject('ILinksService') private readonly linksService: ILinksService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: config.throttle.limit, ttl: config.throttle.ttlMs },
  })
  @Post()
  async createShortURL(
    @Body(new ZodExceptionPipe(CreateLinkSchema)) createLinkDto: CreateLinkDto,
  ) {
    const { url, alias, ttl } = createLinkDto;
    const short = await this.linksService.create(url, alias, ttl);
    return { shortUrl: short.code };
  }
}
