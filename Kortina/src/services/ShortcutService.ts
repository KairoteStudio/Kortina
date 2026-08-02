import { SHORTCUTS_ALLOWED_IN_INPUT } from '../constants/shortcuts';
export type ShortcutHandler = () => void | Promise<void>;
interface ParsedKey {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}
function normalizeKeyToken(token: string): string {
  const t = token.trim();
  const lower = t.toLowerCase();
  if (lower === 'control' || lower === 'ctrl') return 'ctrl';
  if (lower === 'cmd' || lower === 'meta' || lower === 'command' || lower === 'super') return 'meta';
  if (lower === 'option' || lower === 'alt') return 'alt';
  if (lower === 'shift') return 'shift';
  if (lower === 'escape' || lower === 'esc') return 'escape';
  if (lower === 'space' || lower === ' ') return 'space';
  if (lower === 'arrowleft' || lower === 'left') return 'arrowleft';
  if (lower === 'arrowright' || lower === 'right') return 'arrowright';
  if (lower === 'arrowup' || lower === 'up') return 'arrowup';
  if (lower === 'arrowdown' || lower === 'down') return 'arrowdown';
  if (lower === 'plus' || t === '+') return '=';
  if (lower === 'minus' || t === '-') return '-';
  if (lower === 'period' || t === '.') return '.';
  if (lower === 'comma' || t === ',') return ',';
  if (lower === 'slash' || t === '/') return '/';
  if (lower === 'backquote' || t === '`') return '`';
  if (/^f\d{1,2}$/i.test(t)) return lower;
  if (t.length === 1) return lower;
  return lower;
}
function parseChord(binding: string): ParsedKey[] {
  const parts = binding.trim().split(/\s+/).filter(Boolean);
  return parts.map(part => {
    const tokens = part.split('+').map(x => x.trim()).filter(Boolean);
    const parsed: ParsedKey = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: ''
    };
    for (const token of tokens) {
      const n = normalizeKeyToken(token);
      if (n === 'ctrl') parsed.ctrl = true;else if (n === 'shift') parsed.shift = true;else if (n === 'alt') parsed.alt = true;else if (n === 'meta') parsed.meta = true;else parsed.key = n;
    }
    return parsed;
  });
}
function eventToParsed(e: KeyboardEvent): ParsedKey {
  let key = e.key;
  if (key === ' ') key = 'space';
  if (key === '+') key = '=';
  return {
    ctrl: e.ctrlKey || e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    key: normalizeKeyToken(key)
  };
}
function keysEqual(a: ParsedKey, b: ParsedKey): boolean {
  const aCtrl = a.ctrl || a.meta;
  const bCtrl = b.ctrl || b.meta;
  return aCtrl === bCtrl && a.shift === b.shift && a.alt === b.alt && a.key === b.key && a.key !== '';
}
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.classList.contains('shortcut-edit-input')) return true;
  return false;
}
function isShortcutCaptureTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.classList.contains('shortcut-edit-input');
}
function isTerminalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('.xterm, .xterm-terminal-host');
}
const TERMINAL_OVERRIDDEN_COMMANDS = new Set(['selectAll', 'copy', 'cut', 'paste', 'clean', 'inlineVariable']);
export function findShortcutConflict(shortcuts: Record<string, string>, commandId: string, newBinding: string): string | null {
  if (!newBinding || !newBinding.trim()) return null;
  try {
    const newChord = parseChord(newBinding);
    if (newChord.length === 0 || newChord.some(s => !s.key)) return null;
    for (const [id, binding] of Object.entries(shortcuts)) {
      if (id === commandId) continue;
      if (!binding || !binding.trim()) continue;
      const chord = parseChord(binding);
      if (chord.length !== newChord.length) continue;
      if (chord.every((s, i) => keysEqual(s, newChord[i]))) {
        return id;
      }
    }
  } catch {}
  return null;
}
class ShortcutServiceImpl {
  private handlers = new Map<string, ShortcutHandler>();
  private bindings = new Map<string, ParsedKey[]>();
  private chordBuffer: ParsedKey[] = [];
  private chordTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSingle: {
    commandId: string;
    event: KeyboardEvent;
  } | null = null;
  private listening = false;
  private modalActive = false;
  private readonly chordTimeoutMs = 400;
  register(commandId: string, handler: ShortcutHandler): () => void {
    this.handlers.set(commandId, handler);
    return () => {
      if (this.handlers.get(commandId) === handler) {
        this.handlers.delete(commandId);
      }
    };
  }
  unregister(commandId: string): void {
    this.handlers.delete(commandId);
  }
  setBindings(shortcuts: Record<string, string>): void {
    this.bindings.clear();
    for (const [commandId, binding] of Object.entries(shortcuts)) {
      if (!binding || !binding.trim()) continue;
      try {
        const chord = parseChord(binding);
        if (chord.length > 0 && chord.every(s => s.key)) {
          this.bindings.set(commandId, chord);
        }
      } catch {}
    }
    this.resetChord();
  }
  setModalActive(active: boolean): void {
    this.modalActive = active;
    if (active) this.resetChord();
  }
  isModalActive(): boolean {
    return this.modalActive;
  }
  start(): void {
    if (this.listening) return;
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
    this.listening = true;
  }
  stop(): void {
    if (!this.listening) return;
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('keyup', this.onKeyUp, true);
    this.listening = false;
    this.resetChord();
  }
  private resetChord(): void {
    this.chordBuffer = [];
    this.pendingSingle = null;
    if (this.chordTimer) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
  }
  private armChordTimeout(onTimeout?: () => void): void {
    if (this.chordTimer) clearTimeout(this.chordTimer);
    this.chordTimer = setTimeout(() => {
      onTimeout?.();
      this.chordBuffer = [];
      this.pendingSingle = null;
      this.chordTimer = null;
    }, this.chordTimeoutMs);
  }
  private isAllowed(commandId: string, target: EventTarget | null): boolean {
    if (!isEditableTarget(target)) return true;
    return SHORTCUTS_ALLOWED_IN_INPUT.has(commandId);
  }
  private isChordPrefix(buffer: ParsedKey[]): boolean {
    for (const [, chord] of this.bindings) {
      if (chord.length <= buffer.length) continue;
      let ok = true;
      for (let i = 0; i < buffer.length; i++) {
        if (!keysEqual(buffer[i], chord[i])) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }
  private findCompleteMatches(buffer: ParsedKey[]): string[] {
    const matched: string[] = [];
    for (const [commandId, chord] of this.bindings) {
      if (!this.handlers.has(commandId)) continue;
      if (chord.length !== buffer.length) continue;
      let ok = true;
      for (let i = 0; i < chord.length; i++) {
        if (!keysEqual(chord[i], buffer[i])) {
          ok = false;
          break;
        }
      }
      if (ok) matched.push(commandId);
    }
    return matched;
  }
  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.modalActive) {
      return;
    }
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
      return;
    }
    if (isShortcutCaptureTarget(e.target)) {
      return;
    }
    const pressed = eventToParsed(e);
    const nextBuffer = [...this.chordBuffer, pressed];
    const complete = this.findCompleteMatches(nextBuffer).filter(id => this.isAllowed(id, e.target));
    const canContinue = this.isChordPrefix(nextBuffer);
    if (isTerminalTarget(e.target) && complete.some(id => TERMINAL_OVERRIDDEN_COMMANDS.has(id))) {
      this.resetChord();
      return;
    }
    if (complete.length > 0 && !canContinue) {
      e.preventDefault();
      e.stopPropagation();
      this.invoke(complete[0]);
      return;
    }
    if (canContinue) {
      e.preventDefault();
      e.stopPropagation();
      this.chordBuffer = nextBuffer;
      if (complete.length > 0) {
        this.pendingSingle = {
          commandId: complete[0],
          event: e
        };
        this.armChordTimeout(() => {
          if (this.pendingSingle) {
            this.invoke(this.pendingSingle.commandId);
          }
        });
      } else {
        this.pendingSingle = null;
        this.armChordTimeout();
      }
      return;
    }
    if (this.chordBuffer.length > 0) {
      const pending = this.pendingSingle;
      this.resetChord();
      if (pending && this.isAllowed(pending.commandId, e.target)) {
        this.invoke(pending.commandId);
      }
      const restartComplete = this.findCompleteMatches([pressed]).filter(id => this.isAllowed(id, e.target));
      const restartPrefix = this.isChordPrefix([pressed]);
      if (restartComplete.length > 0 && !restartPrefix) {
        e.preventDefault();
        e.stopPropagation();
        this.invoke(restartComplete[0]);
        return;
      }
      if (restartPrefix) {
        e.preventDefault();
        e.stopPropagation();
        this.chordBuffer = [pressed];
        if (restartComplete.length > 0) {
          this.pendingSingle = {
            commandId: restartComplete[0],
            event: e
          };
          this.armChordTimeout(() => {
            if (this.pendingSingle) this.invoke(this.pendingSingle.commandId);
          });
        } else {
          this.armChordTimeout();
        }
      }
      return;
    }
    if (complete.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      this.invoke(complete[0]);
    }
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key !== 'Control' && e.key !== 'Meta') return;
    if (this.chordBuffer.length !== 1 || !this.pendingSingle) return;
    const pending = this.pendingSingle;
    this.resetChord();
    if (this.isAllowed(pending.commandId, pending.event.target)) {
      this.invoke(pending.commandId);
    }
  };
  private invoke(commandId: string): void {
    const handler = this.handlers.get(commandId);
    this.resetChord();
    if (!handler) return;
    try {
      const result = handler();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch(err => {
          console.error(`[ShortcutService] command "${commandId}" failed:`, err);
        });
      }
    } catch (err) {
      console.error(`[ShortcutService] command "${commandId}" failed:`, err);
    }
  }
}
export const shortcutService = new ShortcutServiceImpl();