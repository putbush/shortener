import {
  Controller,
  Body,
  Post,
  Inject,
  UseGuards,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { CreateLinkSchema, CreateLinkDto } from './dto/create-link.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ZodExceptionPipe } from '@common/pipes';
import { config } from '@common/config';
import { ResolveLinkDto, ResolveLinkSchema } from './dto/resolve-link.dto';
import { Response } from 'express';
import { ILinksService } from './interfaces/links.interface';
import { IRedirectService } from './interfaces/redirect.interface';

@Controller('')
export class LinksController {
  constructor(
    @Inject('ILinksService') private readonly linksService: ILinksService,
    @Inject('IRedirectService')
    private readonly redirectService: IRedirectService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: config.throttle.limit, ttl: config.throttle.ttlMs },
  })
  @Post('links')
  async createShortURL(
    @Body(new ZodExceptionPipe(CreateLinkSchema)) createLinkDto: CreateLinkDto,
  ) {
    const { url, alias, ttl } = createLinkDto;
    const short = await this.linksService.create(url, alias, ttl);
    return { shortUrl: short.code };
  }

  @Get(':code')
  async resolve(
    @Param(new ZodExceptionPipe(ResolveLinkSchema))
    linkCodeDto: ResolveLinkDto,
    @Res() res: Response,
  ) {
    const { code } = linkCodeDto;
    const originalUrl = await this.redirectService.resolve(code);
    return res.redirect(301, originalUrl);
  }
}
