import type { LoggerAPI } from '../index';
export class LoggerAPIImpl implements LoggerAPI {
  private prefix = '[Plugin]';
  private isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
  info(message: string, ...args: any[]): void {
    console.log(this.prefix, message, ...args);
  }
  warn(message: string, ...args: any[]): void {
    console.warn(this.prefix, message, ...args);
  }
  error(message: string, ...args: any[]): void {
    console.error(this.prefix, message, ...args);
  }
  debug(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.debug(this.prefix, message, ...args);
    }
  }
}