import type { Disposable, EventEmitter } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedEventEmitter extends SandboxedAPI implements EventEmitter {
  private delegate: EventEmitter;
  constructor(pluginId: string, permissions: Set<string>, delegate: EventEmitter) {
    super(pluginId, permissions);
    this.delegate = delegate;
  }
  on(event: string, listener: (...args: any[]) => void): Disposable {
    this.checkPermission('events:subscribe');
    return this.delegate.on(event, listener);
  }
  off(event: string, listener: (...args: any[]) => void): void {
    this.checkPermission('events:subscribe');
    this.delegate.off(event, listener);
  }
  emit(event: string, ...args: any[]): void {
    this.checkPermission('events:emit');
    return this.delegate.emit(event, ...args);
  }
  once(event: string, listener: (...args: any[]) => void): Disposable {
    this.checkPermission('events:subscribe');
    return this.delegate.once(event, listener);
  }
}