import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configSvc = app.get(ConfigService);

  app.enableCors();

  await app.listen(configSvc.get<number>('serverPort'));
}

bootstrap();
