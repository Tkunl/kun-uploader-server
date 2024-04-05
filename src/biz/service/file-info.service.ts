import { Inject, Injectable } from '@nestjs/common';
import { generateUUID } from '../../common/utils/common-util';
import { PrismaService } from './prisma.service';

@Injectable()
export class FileInfoService {
  @Inject()
  prismaSvc: PrismaService;

  async checkIfExist(hash: string, size: string) {
    const foundRecord = await this.prismaSvc.bizFileInfo.findFirst({
      where: {
        hash,
        size,
      },
      select: {
        bucketName: true,
        filename: true,
      },
    });
    if (foundRecord) {
      return foundRecord.bucketName + '/' + foundRecord.filename;
    }
    return '';
  }

  /**
   * 记录 merge 好的文件
   * @param hash 文件 Hash
   * @param bucketName
   * @param filename 文件名
   * @param size 文件大小, 单位 KB
   * @param metadata 元数据, Json 字符串
   */
  async recordHash(
    hash: string,
    bucketName: string,
    filename: string,
    size: string, // 单位 KB
    metadata: string,
  ) {
    await this.prismaSvc.bizFileInfo.create({
      data: {
        id: generateUUID(),
        bucketName,
        filename,
        hash,
        size,
        metaData: metadata,
        uploadDate: new Date(),
      },
    });
  }
}
