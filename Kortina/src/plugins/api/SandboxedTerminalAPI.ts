import terminalService from '../../services/TerminalService';
import type { TerminalAPI, TerminalInstance, TerminalOptions } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedTerminalAPI extends SandboxedAPI implements TerminalAPI {
  private terminals = new Map<string, TerminalInstance>();
  private activeTerminalId: string | null = null;
  async createTerminal(options: TerminalOptions): Promise<TerminalInstance> {
    this.checkPermission('terminal:create');
    const id = `plugin-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const shellType = (options.shell || 'bash') as any;
    const session = await terminalService.createSession(shellType, options.cwd);
    const terminal: TerminalInstance = {
      id: session.id,
      name: options.name || 'Plugin Terminal',
      write: (data: string) => this.writeToTerminal(session.id, data),
      writeln: (data: string) => this.writeToTerminal(session.id, `${data}\r\n`),
      clear: () => this.writeToTerminal(session.id, '\x1b[2J\x1b[H'),
      kill: () => this.killTerminal(session.id),
      focus: () => {
        this.activeTerminalId = session.id;
      }
    };
    this.terminals.set(id, terminal);
    this.activeTerminalId = id;
    console.log(`[PluginManager] Terminal created: ${id}`, options);
    return terminal;
  }
  private async writeToTerminal(terminalId: string, data: string): Promise<void> {
    try {
      await terminalService.write(terminalId, data);
    } catch (error) {
      console.error(`[PluginManager] Failed to write to terminal ${terminalId}:`, error);
    }
  }
  private async killTerminal(terminalId: string): Promise<void> {
    try {
      await terminalService.killSession(terminalId);
    } catch (error) {
      console.error(`[PluginManager] Failed to kill terminal ${terminalId}:`, error);
    }
    this.terminals.delete(terminalId);
    if (this.activeTerminalId === terminalId) {
      this.activeTerminalId = null;
    }
  }
  getActiveTerminal(): TerminalInstance | null {
    return this.activeTerminalId ? this.terminals.get(this.activeTerminalId) || null : null;
  }
  async executeCommand(terminalId: string, command: string): Promise<void> {
    this.checkPermission('terminal:execute');
    await this.writeToTerminal(terminalId, `${command}\r\n`);
  }
  async write(terminalId: string, data: string): Promise<void> {
    this.checkPermission('terminal:execute');
    await this.writeToTerminal(terminalId, data);
  }
}