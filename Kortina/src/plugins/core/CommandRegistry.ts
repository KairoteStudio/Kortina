import type { CommandRegistry, Disposable } from '../index';
import { pluginLogger } from './PluginLogger';
export class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, (args?: any[]) => Promise<void> | void>();
  private commandHistory: {
    command: string;
    args: any[];
    timestamp: number;
  }[] = [];
  registerCommand(command: string, handler: (args?: any[]) => Promise<void> | void): Disposable {
    if (this.commands.has(command)) {
      pluginLogger.warn(`Command "${command}" already registered, overwriting`);
    }
    this.commands.set(command, handler);
    pluginLogger.log(`Command registered: ${command}`);
    return {
      dispose: () => {
        this.commands.delete(command);
      }
    };
  }
  async executeCommand(command: string, ...args: any[]): Promise<any> {
    const handler = this.commands.get(command);
    if (!handler) {
      pluginLogger.warn(`Command "${command}" not found`);
      return Promise.reject(new Error(`Command not found: ${command}`));
    }
    this.commandHistory.push({
      command,
      args,
      timestamp: Date.now()
    });
    pluginLogger.log(`Executing command: ${command}`, args);
    const result = handler(args);
    return result !== undefined ? Promise.resolve(result) : undefined;
  }
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
  hasCommand(command: string): boolean {
    return this.commands.has(command);
  }
}