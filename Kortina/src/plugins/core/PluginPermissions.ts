export interface PluginPermission {
  id: string;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}
export const PLUGIN_PERMISSIONS: Record<string, PluginPermission> = {
  'fs:read': {
    id: 'fs:read',
    name: 'Read Files',
    description: 'Allow reading files from disk',
    risk: 'low'
  },
  'fs:write': {
    id: 'fs:write',
    name: 'Write Files',
    description: 'Allow writing files to disk',
    risk: 'medium'
  },
  'fs:delete': {
    id: 'fs:delete',
    name: 'Delete Files',
    description: 'Allow deleting files',
    risk: 'high'
  },
  'terminal:create': {
    id: 'terminal:create',
    name: 'Create Terminal',
    description: 'Allow creating terminal sessions',
    risk: 'medium'
  },
  'terminal:execute': {
    id: 'terminal:execute',
    name: 'Execute Commands',
    description: 'Allow executing commands in terminal',
    risk: 'high'
  },
  'editor:read': {
    id: 'editor:read',
    name: 'Read Editor',
    description: 'Allow reading editor content',
    risk: 'low'
  },
  'editor:write': {
    id: 'editor:write',
    name: 'Write Editor',
    description: 'Allow modifying editor content',
    risk: 'medium'
  },
  'window:notification': {
    id: 'window:notification',
    name: 'Show Notifications',
    description: 'Allow showing notifications',
    risk: 'low'
  },
  'window:dialog': {
    id: 'window:dialog',
    name: 'Show Dialogs',
    description: 'Allow showing dialog windows',
    risk: 'low'
  },
  'window:openUrl': {
    id: 'window:openUrl',
    name: 'Open URLs',
    description: 'Allow opening external URLs',
    risk: 'medium'
  },
  'window:identity': {
    id: 'window:identity',
    name: 'Window Identity',
    description: 'Allow reading current window identity',
    risk: 'low'
  },
  'settings:read': {
    id: 'settings:read',
    name: 'Read Settings',
    description: 'Allow reading plugin settings',
    risk: 'low'
  },
  'settings:write': {
    id: 'settings:write',
    name: 'Write Settings',
    description: 'Allow writing plugin settings',
    risk: 'medium'
  },
  'events:subscribe': {
    id: 'events:subscribe',
    name: 'Subscribe Events',
    description: 'Allow subscribing to plugin events',
    risk: 'low'
  },
  'events:emit': {
    id: 'events:emit',
    name: 'Emit Events',
    description: 'Allow emitting plugin events',
    risk: 'medium'
  },
  'logger:write': {
    id: 'logger:write',
    name: 'Write Logs',
    description: 'Allow writing to plugin log',
    risk: 'low'
  }
};
export type PermissionId = keyof typeof PLUGIN_PERMISSIONS;