import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './common/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(config.app.port);
  console.log(`Application is running on port ${config.app.port}`);
}
void bootstrap();
