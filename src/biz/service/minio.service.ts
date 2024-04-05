import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  minio: typeof Minio;
  minioClient: Minio.Client;

  constructor(private configSvc: ConfigService) {
    this.minio = Minio;
    this.minioClient = new Minio.Client({
      endPoint: this.configSvc.get<string>('MINIO_HOST'),
      port: parseInt(this.configSvc.get<string>('MINIO_PORT')),
      useSSL: false,
      accessKey: this.configSvc.get<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configSvc.get<string>('MINIO_SECRET_KEY'),
    });
  }

  async uploadFilePromisify(
    path: string,
    fileName: string,
    bucketName: string,
    metaData: any = {},
  ) {
    await this.minioClient.fPutObject(bucketName, fileName, path, metaData);
    return `/${bucketName}/${fileName}`;
  }

  mergeFile(chunksName: string[], fileName: string, bucketName: string) {
    const sourceList = chunksName.map(
      (name) =>
        new this.minio.CopySourceOptions({
          Bucket: bucketName,
          Object: name,
        }),
    );
    const destOption = new this.minio.CopyDestinationOptions({
      Bucket: bucketName,
      Object: fileName,
    });
    return this.minioClient.composeObject(destOption, sourceList);
  }

  async removeFile(bucketName: string, fileNameList: string[]) {
    await this.minioClient.removeObjects(bucketName, fileNameList);
  }
}
