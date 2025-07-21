import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ResolveLinkDto, ResolveLinkSchema } from './dto/resolve-link.dto';
import { Response } from 'express';
import { ZodExceptionPipe } from '@common/pipes';
import { IRedirectService } from '@common/interfaces';

@Controller()
export class RedirectController {
  constructor(
    @Inject('IRedirectService')
    private readonly redirectService: IRedirectService,
  ) {}

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
