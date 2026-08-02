import type { LoggerAPI } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedLoggerAPI extends SandboxedAPI implements LoggerAPI {
  private delegate: LoggerAPI;
  constructor(pluginId: string, permissions: Set<string>, delegate: LoggerAPI) {
    super(pluginId, permissions);
    this.delegate = delegate;
  }
  info(message: string, ...args: any[]): void {
    this.checkPermission('logger:write');
    this.delegate.info(message, ...args);
  }
  warn(message: string, ...args: any[]): void {
    this.checkPermission('logger:write');
    this.delegate.warn(message, ...args);
  }
  error(message: string, ...args: any[]): void {
    this.checkPermission('logger:write');
    this.delegate.error(message, ...args);
  }
  debug(message: string, ...args: any[]): void {
    this.checkPermission('logger:write');
    this.delegate.debug(message, ...args);
  }
}