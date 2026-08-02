import type { Disposable, SettingsAPI } from '../index';
export class SettingsAPIImpl implements SettingsAPI {
  private listeners = new Map<string, ((value: any) => void)[]>();
  private storageKey = 'plugin-settings';
  private getSettings(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  private saveSettings(settings: Record<string, any>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }
  async get<T>(key: string): Promise<T | undefined> {
    const settings = this.getSettings();
    return settings[key] as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    const settings = this.getSettings();
    settings[key] = value;
    this.saveSettings(settings);
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(listener => listener(value));
  }
  async remove(key: string): Promise<void> {
    const settings = this.getSettings();
    delete settings[key];
    this.saveSettings(settings);
  }
  onDidChange(key: string, listener: (value: any) => void): Disposable {
    const listeners = this.listeners.get(key) || [];
    listeners.push(listener);
    this.listeners.set(key, listeners);
    return {
      dispose: () => {
        const keyListeners = this.listeners.get(key) || [];
        const index = keyListeners.indexOf(listener);
        if (index > -1) keyListeners.splice(index, 1);
      }
    };
  }
}