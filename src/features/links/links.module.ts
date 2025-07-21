import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  controllers: [LinksController],
  providers: [
    LinksService,
    {
      provide: 'ILinksService',
      useClass: LinksService,
    },
  ],
  imports: [PrismaModule],
})
export class LinksModule {}
