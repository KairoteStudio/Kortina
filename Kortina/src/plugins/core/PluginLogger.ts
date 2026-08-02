const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
export const pluginLogger = {
  log: (message: string, ...args: any[]) => {
    console.log(`[PluginManager] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[PluginManager] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[PluginManager] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[PluginManager] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.info(`[PluginManager] ${message}`, ...args);
  }
};