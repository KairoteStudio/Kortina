import type { Disposable, EventEmitter } from '../index';
export class EventEmitterImpl implements EventEmitter {
  private events = new Map<string, Set<(...args: any[]) => void>>();
  on(event: string, listener: (...args: any[]) => void): Disposable {
    let listeners = this.events.get(event);
    if (!listeners) {
      listeners = new Set();
      this.events.set(event, listeners);
    }
    listeners.add(listener);
    return {
      dispose: () => this.off(event, listener)
    };
  }
  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }
  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[PluginManager] Event listener error for "${event}":`, error);
        }
      });
    }
  }
  once(event: string, listener: (...args: any[]) => void): Disposable {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }
}