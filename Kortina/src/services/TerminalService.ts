import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
export type ShellType = 'powershell' | 'cmd' | 'bash' | 'wsl' | 'zsh' | 'fish' | 'sh';
export interface TerminalSessionInfo {
  id: string;
  shell: string;
  shellType: ShellType;
  cwd: string | null;
}
export interface TerminalOutputEvent {
  session_id: string;
  data: number[];
}
export interface TerminalSessionClosedEvent {
  session_id: string;
}
class TerminalService {
  private outputListeners: Map<string, Set<(text: string) => void>> = new Map();
  private closedListeners: Map<string, Set<() => void>> = new Map();
  private unlistenOutput?: UnlistenFn;
  private unlistenClosed?: UnlistenFn;
  private disposed = false;
  constructor() {
    this._setupGlobalListeners();
  }
  private async _setupGlobalListeners() {
    try {
      this.unlistenOutput = await listen<TerminalOutputEvent>('terminal:output', event => {
        const sessionId = event.payload.session_id;
        if (!sessionId) return;
        const text = new TextDecoder('utf-8').decode(new Uint8Array(event.payload.data));
        this.outputListeners.get(sessionId)?.forEach(cb => {
          try {
            cb(text);
          } catch {}
        });
      });
    } catch (error) {
      console.error('[TerminalService] Failed to setup output listener:', error);
    }
    try {
      this.unlistenClosed = await listen<TerminalSessionClosedEvent>('terminal:session:closed', event => {
        const sessionId = event.payload.session_id;
        this.closedListeners.get(sessionId)?.forEach(cb => {
          try {
            cb();
          } catch {}
        });
      });
    } catch (error) {
      console.error('[TerminalService] Failed to setup closed listener:', error);
    }
  }
  async createSession(shellType: ShellType, cwd?: string): Promise<TerminalSessionInfo> {
    if (this.disposed) throw new Error('TerminalService is disposed');
    const raw = await invoke<{
      id: string;
      shell: string;
      shell_type: string;
      cwd: string | null;
    }>('terminal_create_session', {
      shell: shellType,
      cwd: cwd ?? null
    });
    return {
      id: raw.id,
      shell: raw.shell,
      shellType: raw.shell_type as ShellType,
      cwd: raw.cwd
    };
  }
  async write(sessionId: string, data: string): Promise<void> {
    if (!sessionId || this.disposed) return;
    try {
      const encoded = new TextEncoder().encode(data);
      await invoke('terminal_write', {
        sessionId,
        data: Array.from(encoded)
      });
    } catch (error) {
      console.error('[TerminalService] Failed to write to terminal:', error);
      throw error;
    }
  }
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    if (!sessionId || this.disposed) return;
    try {
      await invoke('terminal_resize', {
        sessionId,
        cols,
        rows
      });
    } catch (error) {
      console.error('[TerminalService] Failed to resize terminal:', error);
    }
  }
  async killSession(sessionId: string): Promise<void> {
    if (!sessionId || this.disposed) return;
    try {
      await invoke('terminal_kill_session', {
        sessionId
      });
    } catch (error) {
      console.error('[TerminalService] Failed to kill terminal session:', error);
    }
  }
  onSessionOutput(sessionId: string, callback: (text: string) => void): () => void {
    if (!this.outputListeners.has(sessionId)) {
      this.outputListeners.set(sessionId, new Set());
    }
    const set = this.outputListeners.get(sessionId)!;
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.outputListeners.delete(sessionId);
      }
    };
  }
  onSessionClosed(sessionId: string, callback: () => void): () => void {
    if (!this.closedListeners.has(sessionId)) {
      this.closedListeners.set(sessionId, new Set());
    }
    const set = this.closedListeners.get(sessionId)!;
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.closedListeners.delete(sessionId);
      }
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.outputListeners.clear();
    this.closedListeners.clear();
    this.unlistenOutput?.();
    this.unlistenClosed?.();
  }
}
export const terminalService = new TerminalService();
export default terminalService;