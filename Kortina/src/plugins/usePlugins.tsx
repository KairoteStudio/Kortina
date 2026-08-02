import { useState, useEffect, useCallback, useRef } from 'react';
import { pluginManager } from './PluginManager';
import { PluginContribution } from './index';
import { showToast } from '../utils/toastService';
import { shortcutService, type ShortcutHandler } from '../services/ShortcutService';
interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  command?: string;
  order: number;
  children?: PluginMenuItem[];
}
interface PluginCommand {
  id: string;
  label: string;
  icon?: string;
  keybinding?: string;
}
interface UsePluginsOptions {
  autoInitialize?: boolean;
  pluginDir?: string;
}
export function usePlugins(options: UsePluginsOptions = {}): {
  initialized: boolean;
  plugins: any[];
  contributions: PluginContribution;
  menuItems: PluginMenuItem[];
  commands: PluginCommand[];
  isLoading: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  registerPlugin: (manifest: any, module: any) => Promise<void>;
  unregisterPlugin: (pluginId: string) => Promise<void>;
  executeCommand: (command: string, ...args: any[]) => Promise<any>;
  reloadPlugins: () => Promise<void>;
} {
  const {
    autoInitialize = true,
    pluginDir
  } = options;
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [contributions, setContributions] = useState<PluginContribution>({
    menus: [],
    panels: [],
    commands: [],
    themes: [],
    grammars: []
  });
  const [menuItems, setMenuItems] = useState<PluginMenuItem[]>([]);
  const [commands, setCommands] = useState<PluginCommand[]>([]);
  const initialize = useCallback(async () => {
    if (initialized || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.initialize(pluginDir);
      setPlugins(pluginManager.getAllPlugins());
      setContributions(combineContributions(pluginManager.getContributions()));
      setInitialized(true);
      console.log('[usePlugins] Plugin system initialized');
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('[usePlugins] Failed to initialize plugins:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initialized, isLoading, pluginDir]);
  const registerPlugin = useCallback(async (manifest: any, module: any) => {
    try {
      await pluginManager.registerPlugin(manifest, module);
      const allPlugins = pluginManager.getAllPlugins();
      setPlugins(allPlugins);
      const allContributions = pluginManager.getContributions();
      const combinedContributions = combineContributions(allContributions);
      setContributions(combinedContributions);
      const allCommands = pluginManager.getCommands().getCommands();
      setCommands(allCommands.map((cmd: string) => ({
        id: cmd,
        label: cmd.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      })));
      console.log('[usePlugins] Plugin registered successfully');
    } catch (err) {
      console.error('[usePlugins] Failed to register plugin:', err);
      throw err;
    }
  }, []);
  const unregisterPlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginManager.unregisterPlugin(pluginId);
      setPlugins(pluginManager.getAllPlugins());
      const allContributions = pluginManager.getContributions();
      setContributions(combineContributions(allContributions));
    } catch (err) {
      console.error('[usePlugins] Failed to unregister plugin:', err);
      throw err;
    }
  }, []);
  const executeCommand = useCallback(async (command: string, ...args: any[]) => {
    return pluginManager.getCommands().executeCommand(command, ...args);
  }, []);
  const reloadPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      await pluginManager.reloadPluginsFromDirectory();
      await pluginManager.reloadAllPlugins();
      setPlugins(pluginManager.getAllPlugins());
    } catch (err) {
      console.error('[usePlugins] Failed to reload plugins:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const registeredPluginCommandsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handlePluginActivated = () => {
      const allContributions = pluginManager.getContributions();
      setContributions(combineContributions(allContributions));
      setPlugins(pluginManager.getAllPlugins());
      registerPluginKeybindings(allContributions);
    };
    const handlePluginDeactivated = () => {
      const allContributions = pluginManager.getContributions();
      setContributions(combineContributions(allContributions));
      setPlugins(pluginManager.getAllPlugins());
      registerPluginKeybindings(allContributions);
    };
    const registerPluginKeybindings = (allContributions: PluginContribution[]) => {
      const activeCommandIds = new Set<string>();
      for (const contrib of allContributions) {
        if (contrib.commands) {
          for (const cmd of contrib.commands) {
            if (cmd.keybinding && cmd.keybinding.trim()) {
              activeCommandIds.add(cmd.id);
            }
          }
        }
      }
      const registeredCommands = registeredPluginCommandsRef.current;
      for (const id of Array.from(registeredCommands)) {
        if (!activeCommandIds.has(id)) {
          shortcutService.unregister(id);
          registeredCommands.delete(id);
        }
      }
      for (const contrib of allContributions) {
        if (contrib.commands) {
          for (const cmd of contrib.commands) {
            if (cmd.keybinding && cmd.keybinding.trim() && !registeredCommands.has(cmd.id)) {
              const handler: ShortcutHandler = () => {
                void pluginManager.getCommands().executeCommand(cmd.id);
              };
              shortcutService.register(cmd.id, handler);
              registeredCommands.add(cmd.id);
            }
          }
        }
      }
    };
    const events = pluginManager.getEvents();
    const sub1 = events.on('plugin-activated', handlePluginActivated);
    const sub2 = events.on('plugin-deactivated', handlePluginDeactivated);
    if (autoInitialize) {
      initialize();
    }
    return () => {
      sub1.dispose();
      sub2.dispose();
      for (const id of Array.from(registeredPluginCommandsRef.current)) {
        shortcutService.unregister(id);
      }
      registeredPluginCommandsRef.current.clear();
    };
  }, [autoInitialize, initialize]);
  useEffect(() => {
    if (contributions.menus && contributions.menus.length > 0) {
      const items: PluginMenuItem[] = contributions.menus.map(menu => ({
        id: menu.id,
        label: menu.label,
        icon: menu.icon,
        command: menu.command,
        order: menu.order || 0
      }));
      setMenuItems(items.sort((a, b) => a.order - b.order));
    }
  }, [contributions.menus]);
  useEffect(() => {
    if (contributions.commands && contributions.commands.length > 0) {
      const cmds: PluginCommand[] = contributions.commands.map(cmd => ({
        id: cmd.id,
        label: cmd.label,
        icon: cmd.icon,
        keybinding: cmd.keybinding
      }));
      setCommands(cmds);
    }
  }, [contributions.commands]);
  return {
    initialized,
    plugins,
    contributions,
    menuItems,
    commands,
    isLoading,
    error,
    initialize,
    registerPlugin,
    unregisterPlugin,
    executeCommand,
    reloadPlugins
  };
}
function combineContributions(allContributions: PluginContribution[]): PluginContribution {
  const combined: PluginContribution = {
    menus: [],
    panels: [],
    commands: [],
    themes: [],
    grammars: []
  };
  for (const contrib of allContributions) {
    if (contrib.menus) combined.menus?.push(...contrib.menus);
    if (contrib.panels) combined.panels?.push(...contrib.panels);
    if (contrib.commands) combined.commands?.push(...contrib.commands);
    if (contrib.themes) combined.themes?.push(...contrib.themes);
    if (contrib.grammars) combined.grammars?.push(...contrib.grammars);
  }
  return combined;
}
export function usePluginCommands(): {
  commands: PluginCommand[];
  executeCommand: (commandId: string, ...args: any[]) => Promise<any>;
} {
  const [commands, setCommands] = useState<PluginCommand[]>([]);
  useEffect(() => {
    const events = pluginManager.getEvents();
    const updateCommands = () => {
      const allCommands = pluginManager.getCommands().getCommands();
      setCommands(allCommands.map((cmd: string) => ({
        id: cmd,
        label: cmd.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      })));
    };
    updateCommands();
    const sub = events.on('plugin-activated', updateCommands);
    const sub2 = events.on('plugin-deactivated', updateCommands);
    return () => {
      sub.dispose();
      sub2.dispose();
    };
  }, []);
  const executeCommand = useCallback(async (commandId: string, ...args: any[]) => {
    return pluginManager.getCommands().executeCommand(commandId, ...args);
  }, []);
  return {
    commands,
    executeCommand
  };
}
export function usePluginNotifications(): {
  notify: (message: string, type?: 'info' | 'warning' | 'error') => void;
} {
  const notify = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const toastType = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
    const title = type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示';
    showToast({
      title,
      message,
      type: toastType
    });
  }, []);
  return {
    notify
  };
}
export default usePlugins;