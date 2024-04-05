import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../service/minio.service';
import { FileInfoService } from '../service/file-info.service';
import { crc32ForFile, md5ForFile } from '../../common/utils/common-util';
import {
  checkDirExists,
  createDir,
  moveFile,
} from '../../common/utils/fs-util';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { R } from '../../common/vo/r.vo';
import { SysCodeEnum } from '../../common/enum/sys-code.enum';

@Controller('minio')
export class MinioController {
  separator = '__';
  chunkDir = 'uploads' + path.sep + 'chunks' + this.separator;
  bucketName = 'my-file';

  constructor(
    private minioSvc: MinioService,
    private fileInfoSvc: FileInfoService,
  ) {}

  private sortChunkNames(chunkNames: string[]) {
    return chunkNames.sort(
      (a: string, b: string) =>
        parseInt(a.split(this.separator).pop()) -
        parseInt(b.split(this.separator).pop()),
    );
  }

  private async readChunksDirWithSorted(chunkDir: string) {
    if (!(await checkDirExists(chunkDir))) {
      throw Error('no such a directory');
    }
    const chunkNames = await fsp.readdir(chunkDir);
    return this.sortChunkNames(chunkNames);
  }

  @Post('minio-test')
  async minioTest() {
    return R.ok();
  }

  @Get('exist')
  async checkIfExist(@Query('hash') hash: string, @Query('size') size: string) {
    const fileUrl = await this.fileInfoSvc.checkIfExist(hash, size);
    return R.ok(fileUrl);
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 100, { dest: `uploads${path.sep}temp` }),
  )
  async uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body()
    body: {
      name: string; // 文件名
      index: string; // chunk index
      fileHash: string; // 文件 Hash
      chunkHash: string; // chunk Hash
    },
  ) {
    const chunkDir = `uploads${path.sep}chunks${this.separator}${body.fileHash}`;

    if (!(await checkDirExists(chunkDir))) await createDir(chunkDir);

    // 移动缓存文件到目录中, 并改文件名
    const source = files[0].path;
    const destination =
      chunkDir +
      path.sep +
      body.name +
      this.separator +
      body.chunkHash +
      this.separator +
      body.index;
    await moveFile(source, destination, chunkDir);
    return R.ok();
  }

  @Post('chunks')
  async getExistChunks(
    @Body('hash') hash: string,
    @Body('hashList') hashList: string[],
  ) {
    const chunkDir = this.chunkDir + hash;
    if (await checkDirExists(chunkDir)) {
      const existHashList = await fsp.readdir(chunkDir);
      const hashSet = new Set<string>(
        existHashList.map((file) => file.split(this.separator)[1]),
      );
      return R.ok(hashList.filter((_hash: string) => !hashSet.has(_hash)));
    } else {
      return R.ok(hashList);
    }
  }

  @Post('verify2')
  async verifyChunks2(
    @Body('hash') hash: string,
    @Body('hashList') hashList: string[],
  ) {
    // 分片数量小于 borderCount 用 MD5, 否则用 CRC32 算 Hash
    const BORDER_COUNT = 100;
    const chunkDir = this.chunkDir + hash;
    if (await checkDirExists(chunkDir)) {
      let localChunkHashList: string[] = [];
      const chunkNames = await this.readChunksDirWithSorted(chunkDir);

      if (hashList.length <= BORDER_COUNT) {
        const getMd5ForFile = chunkNames.map((fileName) =>
          md5ForFile(chunkDir + path.sep + fileName),
        );
        localChunkHashList = await Promise.all(getMd5ForFile);
      } else {
        // 直接算分片的 crc 32
        const getCrc32ForFile = chunkNames.map((fileName) =>
          crc32ForFile(chunkDir + path.sep + fileName),
        );
        localChunkHashList = await Promise.all(getCrc32ForFile);
      }

      // 删除损坏的 chunk
      const existHashSet = new Set<string>(localChunkHashList);
      const brokenChunkList = hashList.filter(
        (_hash: string) => !existHashSet.has(_hash),
      );
      const brokenChunkSet = new Set<string>(brokenChunkList);
      const deleteBrokenChunks = chunkNames
        .filter((chunkName) =>
          brokenChunkSet.has(chunkName.split(this.separator).at(-2)),
        )
        .map((chunkName) => fsp.unlink(chunkDir + path.sep + chunkName));
      await Promise.all(deleteBrokenChunks);
      return R.ok(brokenChunkList);
    } else {
      return R.error(SysCodeEnum.NO_SUCH_FILE);
    }
  }

  @Post('merge2')
  async mergeInMinio(
    @Body('hash') hash: string,
    @Body('name') name: string,
    @Body('size') size: string,
    @Body('metadata') metadata: string,
  ) {
    const chunkDir = this.chunkDir + hash;
    const chunkNames = await this.readChunksDirWithSorted(chunkDir);

    for (const chunkName of chunkNames) {
      await this.minioSvc.uploadFilePromisify(
        chunkDir + path.sep + chunkName,
        chunkName,
        this.bucketName,
      );
    }

    // 使用 uuid 多用户同时 Merge 一个文件时会 Merge 出两个不同文件
    // const fileName = generateUUID() + this.separator + name;
    // 改为使用 hash 加文件名
    const fileName = hash + this.separator + name;
    await this.minioSvc.mergeFile(chunkNames, fileName, this.bucketName);
    await this.minioSvc.removeFile(this.bucketName, chunkNames);
    await this.fileInfoSvc.recordHash(
      hash,
      this.bucketName,
      fileName,
      size,
      metadata,
    );
    await fsp.rm(chunkDir, { recursive: true, force: true });

    return R.ok(`/${this.bucketName}/${fileName}`);
  }
}
