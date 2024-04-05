import { SysCodeEnum } from '../enum/sys-code.enum';
import { isNotEmpty } from '../utils/is';

export class R {
  statusCode: number;
  message: string;
  data: any;
  error: string;

  constructor(
    statusCode: number,
    message?: string,
    data?: any,
    error?: string,
  ) {
    this.statusCode = statusCode;
    if (message) this.message = message;
    if (isNotEmpty(data)) this.data = data;
    if (error) this.error = error;
  }

  static ok(): R;
  static ok(data: any): R;
  static ok(data?: any): R {
    if (isNotEmpty(data)) {
      return new R(SysCodeEnum.OK, 'success', data);
    }
    return new R(SysCodeEnum.OK, 'success');
  }

  static error(code: SysCodeEnum): R;
  static error(code: SysCodeEnum, msg: string): R;
  static error(code: SysCodeEnum, msg: string, data: any): R;
  static error(code = SysCodeEnum.ERROR, msg?: string, data?: any): R {
    const r = new R(code, msg);
    if (data) {
      r.data = data;
    }
    return r;
  }
}
