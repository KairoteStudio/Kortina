import type { PluginLoadError, PluginModuleLoadErrorCode } from '../index';
export class PluginModuleLoadError extends Error {
  readonly code: PluginModuleLoadErrorCode;
  readonly pluginId: string;
  readonly triedPaths: string[];
  readonly causeMessage?: string;
  constructor(code: PluginModuleLoadErrorCode, pluginId: string, message: string, triedPaths: string[] = [], cause?: unknown) {
    super(message);
    this.name = 'PluginModuleLoadError';
    this.code = code;
    this.pluginId = pluginId;
    this.triedPaths = triedPaths;
    this.causeMessage = cause instanceof Error ? cause.message : cause != null ? String(cause) : undefined;
  }
  toJSON(): PluginLoadError {
    return {
      code: this.code,
      message: this.message,
      pluginId: this.pluginId,
      triedPaths: this.triedPaths,
      causeMessage: this.causeMessage
    };
  }
}