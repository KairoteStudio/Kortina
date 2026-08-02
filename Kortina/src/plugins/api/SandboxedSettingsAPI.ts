import type { Disposable, SettingsAPI } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedSettingsAPI extends SandboxedAPI implements SettingsAPI {
  private delegate: SettingsAPI;
  constructor(pluginId: string, permissions: Set<string>, delegate: SettingsAPI) {
    super(pluginId, permissions);
    this.delegate = delegate;
  }
  async get<T>(key: string): Promise<T | undefined> {
    this.checkPermission('settings:read');
    return this.delegate.get(key);
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.checkPermission('settings:write');
    return this.delegate.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.checkPermission('settings:write');
    return this.delegate.remove(key);
  }
  onDidChange(key: string, listener: (value: any) => void): Disposable {
    this.checkPermission('settings:read');
    return this.delegate.onDidChange(key, listener);
  }
}