import * as fsp from 'fs/promises';
import * as fsc from 'fs';

/**
 * 检查文件夹是否存在
 * @param dirPath 文件夹的路径
 */
async function checkDirExists(dirPath: string) {
  try {
    await fsp.access(dirPath);
    return true; // 文件夹存在
  } catch {
    return false; // 文件夹不存在或无法访问
  }
}

/**
 * 创建目录, 如果父级目录不存在则会被自动创建
 * @param dirPath
 */
async function createDir(dirPath: string) {
  return await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * 移动文件 (先复制后删除)
 * @param source 源路径
 * @param destination 目标路径
 * @param destinationParent 目标路径的父路径, 用于检查文件是否移动成功
 */
async function moveFile(
  source: string,
  destination: string,
  destinationParent: string,
) {
  return new Promise<void>((rs, rj) => {
    try {
      const readStream = fsc.createReadStream(source);
      const writeStream = fsc.createWriteStream(destination);
      readStream.pipe(writeStream);
      readStream.on('end', async () => {
        await fsp.readdir(destinationParent);
        await fsp.unlink(source);
        rs();
      });
    } catch (e) {
      rj(e);
    }
  });
}

/**
 * 读取一个文件并将它转成 Buffer
 * @param path
 */
async function readFileAsBuffer(path: string) {
  const readStream = fsc.createReadStream(path);
  const chunks = [];
  return new Promise<Buffer>((rs, rj) => {
    readStream.on('data', (chunk) => {
      chunks.push(chunk); // 收集数据块
    });

    readStream.on('end', () => {
      const buffer = Buffer.concat(chunks); // 合并所有数据块构成Buffer
      rs(buffer);
    });

    readStream.on('error', (e) => {
      rj(e);
    });
  });
}

export { checkDirExists, createDir, moveFile, readFileAsBuffer };
