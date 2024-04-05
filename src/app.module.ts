import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { projectConfig } from './common/config/project.config';
import { MinioController } from './biz/controller/minio.controller';
import { FileInfoService } from './biz/service/file-info.service';
import { MinioService } from './biz/service/minio.service';
import { PrismaService } from './biz/service/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [projectConfig],
    }),
  ],
  controllers: [AppController, MinioController],
  providers: [AppService, FileInfoService, MinioService, PrismaService],
})
export class AppModule {}
