import * as crypto from 'crypto';
import { buf } from 'crc-32';
import { readFileAsBuffer } from './fs-util';

function generateUUID(): string {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function md5(str: string): string {
  const hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}

async function md5ForFile(path: string) {
  const buffer = await readFileAsBuffer(path);
  const hash = crypto.createHash('md5');
  hash.update(buffer);
  return hash.digest('hex');
}

async function crc32ForFile(path: string, seed = 0) {
  const getCrcHex = (crc: number) => (crc >>> 0).toString(16);
  const buffer = await readFileAsBuffer(path);
  const crc = buf(buffer, seed);
  return getCrcHex(crc);
}

export { generateUUID, md5, md5ForFile, crc32ForFile };
