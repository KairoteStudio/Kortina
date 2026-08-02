import type { PermissionId } from '../core/PluginPermissions';
export class SandboxedAPI {
  private grantedPermissions: Set<string>;
  protected pluginId: string;
  constructor(pluginId: string, permissions: Set<string>) {
    this.pluginId = pluginId;
    this.grantedPermissions = permissions;
  }
  checkPermission(permission: PermissionId): void {
    if (!this.grantedPermissions.has(permission)) {
      throw new Error(`Plugin "${this.pluginId}" does not have permission: ${permission}`);
    }
  }
}