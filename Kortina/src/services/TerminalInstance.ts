import type { Terminal as XTermTerminal, IDisposable as XTermDisposable } from 'xterm';
import { terminalService, TerminalSessionInfo, ShellType } from './TerminalService';
import { getShellProfileById } from './terminal-profiles';
import { Emitter, Event } from './terminal-events';
export interface ShellLaunchConfig {
  executable: string;
  args?: string[];
  cwd?: string;
}
let instanceIdCounter = 1;
const TERMINAL_FONT_FAMILY = "'LitalagicaL Mono', monospace";
const TERMINAL_FONT_SIZE = 14;
let terminalFontsReady: Promise<void> | undefined;
function ensureTerminalFontsReady(): Promise<void> {
  if (!document.fonts?.load) return Promise.resolve();
  if (!terminalFontsReady) {
    terminalFontsReady = Promise.all([document.fonts.load(`400 ${TERMINAL_FONT_SIZE}px ${TERMINAL_FONT_FAMILY}`), document.fonts.load(`700 ${TERMINAL_FONT_SIZE}px ${TERMINAL_FONT_FAMILY}`), document.fonts.load(`italic 400 ${TERMINAL_FONT_SIZE}px ${TERMINAL_FONT_FAMILY}`), document.fonts.load(`italic 700 ${TERMINAL_FONT_SIZE}px ${TERMINAL_FONT_FAMILY}`)]).then(() => undefined, () => undefined);
  }
  return terminalFontsReady;
}
export interface ITerminalInstance {
  readonly instanceId: number;
  readonly sessionId: string;
  readonly shellType: ShellType;
  readonly shellLaunchConfig: ShellLaunchConfig;
  readonly title: string;
  readonly isDisposed: boolean;
  readonly hasFocus: boolean;
  readonly onDisposed: Event<ITerminalInstance>;
  readonly onTitleChanged: Event<ITerminalInstance>;
  readonly onData: Event<string>;
  attachToElement(container: HTMLElement): void;
  detachFromElement(): void;
  setVisible(visible: boolean): void;
  layout(dimension?: {
    width: number;
    height: number;
  }): void;
  focus(): void;
  focusWhenReady(): Promise<void>;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  clear(): void;
  updateTheme(): void;
  dispose(): void;
}
function getCssVariable(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function getTerminalColors(isDark: boolean) {
  
  const isFleetTheme = document.documentElement.getAttribute('data-theme-group') === 'fleet';
  const fleetEditor = getCssVariable('--fleet-editor');
  const bgPrimary = isFleetTheme && fleetEditor ? fleetEditor : (getCssVariable('--bg-primary') || (isDark ? '#1e1e1e' : '#ffffff'));
  const textPrimary = getCssVariable('--text-primary') || (isDark ? '#cccccc' : '#212529');
  const textSecondary = getCssVariable('--text-secondary') || (isDark ? '#969696' : '#6c757d');
  if (isDark) {
    return {
      background: bgPrimary,
      foreground: textPrimary,
      cursor: textPrimary,
      cursorAccent: bgPrimary,
      selectionBackground: `${textPrimary}4D`,
      selectionForeground: textPrimary,
      black: '#1e1e1e',
      red: '#f44336',
      green: '#4caf50',
      yellow: '#ff9800',
      blue: textSecondary,
      magenta: '#9c27b0',
      cyan: '#00bcd4',
      white: textSecondary,
      brightBlack: textSecondary,
      brightRed: '#ff5252',
      brightGreen: '#69f0ae',
      brightYellow: '#ffd740',
      brightBlue: '#448aff',
      brightMagenta: '#e040fb',
      brightCyan: '#18ffff',
      brightWhite: textPrimary
    };
  }
  return {
    background: bgPrimary,
    foreground: textPrimary,
    cursor: textPrimary,
    cursorAccent: bgPrimary,
    selectionBackground: `${textPrimary}4D`,
    selectionForeground: textPrimary,
    black: '#212529',
    red: '#d32f2f',
    green: '#388e3c',
    yellow: '#f57c00',
    blue: textSecondary,
    magenta: '#7b1fa2',
    cyan: '#0097a7',
    white: textSecondary,
    brightBlack: textSecondary,
    brightRed: '#e53935',
    brightGreen: '#43a047',
    brightYellow: '#fb8c00',
    brightBlue: '#1e88e5',
    brightMagenta: '#8e24aa',
    brightCyan: '#00acc1',
    brightWhite: textPrimary
  };
}
export class TerminalInstance implements ITerminalInstance {
  readonly instanceId: number;
  readonly sessionId: string;
  readonly shellType: ShellType;
  readonly shellLaunchConfig: ShellLaunchConfig;
  private _title: string;
  private _xterm: XTermTerminal | undefined;
  private _xtermReady: Promise<XTermTerminal> | undefined;
  private _fitAddon: {
    fit: () => void;
    proposeDimensions: () => {
      cols: number;
      rows: number;
    } | undefined;
  } | undefined;
  private _container: HTMLElement | undefined;
  private _visible = false;
  private _disposed = false;
  private _unsubOutput: (() => void) | undefined;
  private _unsubClosed: (() => void) | undefined;
  private _resizeObserver: ResizeObserver | undefined;
  private _resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  private _pendingLayout: {
    width: number;
    height: number;
  } | undefined;
  private _xtermDisposables: XTermDisposable[] = [];
  private _attachGeneration = 0;
  private readonly _onDisposed = new Emitter<ITerminalInstance>();
  readonly onDisposed: Event<ITerminalInstance> = this._onDisposed.event;
  private readonly _onTitleChanged = new Emitter<ITerminalInstance>();
  readonly onTitleChanged: Event<ITerminalInstance> = this._onTitleChanged.event;
  private readonly _onData = new Emitter<string>();
  readonly onData: Event<string> = this._onData.event;
  constructor(session: TerminalSessionInfo) {
    this.instanceId = instanceIdCounter++;
    this.sessionId = session.id;
    this.shellType = session.shellType ?? 'bash';
    this.shellLaunchConfig = {
      executable: session.shell,
      cwd: session.cwd ?? undefined
    };
    const profile = getShellProfileById(this.shellType);
    this._title = profile?.name ?? this.shellType;
    this._unsubOutput = terminalService.onSessionOutput(this.sessionId, text => {
      this._safeWrite(text);
    });
    this._unsubClosed = terminalService.onSessionClosed(this.sessionId, () => {
      this.dispose();
    });
  }
  get title(): string {
    return this._title;
  }
  get isDisposed(): boolean {
    return this._disposed;
  }
  get hasFocus(): boolean {
    if (!this._container) return false;
    return this._container.contains(document.activeElement);
  }
  private async _createXtermAsync(): Promise<XTermTerminal> {
    if (this._xtermReady) return this._xtermReady;
    this._xtermReady = (async () => {
      const [{
        Terminal
      }, {
        FitAddon
      }, {
        WebLinksAddon
      }] = await Promise.all([import('xterm'), import('xterm-addon-fit'), import('xterm-addon-web-links')]);
      if (this._disposed) {
        throw new Error('TerminalInstance disposed before xterm created');
      }
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const colors = getTerminalColors(!isDark);
      const terminal = new Terminal({
        cols: 80,
        rows: 24,
        theme: colors,
        fontFamily: TERMINAL_FONT_FAMILY,
        fontSize: TERMINAL_FONT_SIZE,
        lineHeight: 1,
        letterSpacing: 0,
        cursorBlink: true,
        cursorStyle: 'bar',
        allowTransparency: true,
        scrollback: 10000,
        tabStopWidth: 4,
        convertEol: true
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());
      terminal.attachCustomKeyEventHandler(event => this._handleTerminalKeyEvent(event, terminal));
      this._xtermDisposables.push(terminal.onData(data => {
        if (!this._disposed) this.write(data);
      }));
      this._xtermDisposables.push(terminal.onTitleChange(title => {
        if (title && title.trim() && title !== this._title) {
          this._title = title;
          this._onTitleChanged.fire(this);
        }
      }));
      this._xterm = terminal;
      this._fitAddon = fitAddon;
      return terminal;
    })();
    return this._xtermReady;
  }
  private _handleTerminalKeyEvent(event: KeyboardEvent, terminal: XTermTerminal): boolean {
    if (event.type !== 'keydown') return true;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      if (event.key === 'c' || event.key === 'C') {
        if (terminal.hasSelection()) {
          void navigator.clipboard.writeText(terminal.getSelection());
        }
        return false;
      }
      if (event.key === 'v' || event.key === 'V') {
        void navigator.clipboard.readText().then(text => {
          if (text && !this._disposed) {
            terminal.paste(text);
          }
        });
        return false;
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'l' || event.key === 'L')) {
      terminal.clear();
      return false;
    }
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      terminal.selectAll();
      return false;
    }
    return true;
  }
  attachToElement(container: HTMLElement): void {
    if (this._disposed) return;
    if (this._container === container) return;
    this._container = container;
    const generation = ++this._attachGeneration;
    this._createXtermAsync().then(async xterm => {
      await ensureTerminalFontsReady();
      if (this._disposed) return;
      if (generation !== this._attachGeneration) return;
      if (!this._container) return;
      if (!xterm.element?.isConnected) {
        xterm.open(container);
      }
      this._setupResizeObserver(container);
      if (this._visible) {
        this.focus();
        this._flushLayout();
      }
    }).catch(error => {
      console.error('[TerminalInstance] Failed to create xterm:', error);
    });
  }
  detachFromElement(): void {
    this._stopResizeObserver();
    this._container = undefined;
  }
  private _setupResizeObserver(container: HTMLElement): void {
    this._stopResizeObserver();
    this._resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width === 0 || entry.contentRect.height === 0) return;
      this._scheduleFit();
    });
    this._resizeObserver.observe(container);
  }
  private _stopResizeObserver(): void {
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = undefined;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }
  }
  private _scheduleFit(): void {
    if (this._resizeTimeout) return;
    this._resizeTimeout = setTimeout(() => {
      this._resizeTimeout = undefined;
      this._flushLayout();
    }, 50);
  }
  setVisible(visible: boolean): void {
    if (this._visible === visible) return;
    this._visible = visible;
    if (this._container) {
      this._container.style.visibility = visible ? 'visible' : 'hidden';
      this._container.style.opacity = visible ? '1' : '0';
      this._container.style.pointerEvents = visible ? 'auto' : 'none';
      this._container.style.zIndex = visible ? '1' : '0';
    }
    if (visible) {
      this.focus();
      this._flushLayout();
    }
  }
  layout(dimension?: {
    width: number;
    height: number;
  }): void {
    if (this._disposed) return;
    if (dimension) {
      this._pendingLayout = dimension;
    }
    if (!this._visible) return;
    this._flushLayout();
  }
  private _flushLayout(): void {
    if (this._disposed || !this._xterm || !this._fitAddon || !this._container) return;
    let width: number | undefined;
    let height: number | undefined;
    if (this._pendingLayout) {
      width = this._pendingLayout.width;
      height = this._pendingLayout.height;
      this._pendingLayout = undefined;
    } else {
      const rect = this._container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    if (!width || !height || width === 0 || height === 0) return;
    try {
      const dims = this._fitAddon.proposeDimensions();
      if (dims && dims.cols > 0 && dims.rows > 0) {
        if (this._xterm.cols !== dims.cols || this._xterm.rows !== dims.rows) {
          this._fitAddon.fit();
          this.resize(this._xterm.cols, this._xterm.rows);
        }
      }
    } catch (error) {
      console.error('[TerminalInstance] Layout error:', error);
    }
  }
  focus(): void {
    this._xterm?.focus();
  }
  async focusWhenReady(): Promise<void> {
    try {
      await this._createXtermAsync();
      this.focus();
    } catch {}
  }
  write(data: string): void {
    if (this._disposed) return;
    terminalService.write(this.sessionId, data).catch(error => {
      console.error('[TerminalInstance] Failed to write to terminal:', error);
    });
  }
  resize(cols: number, rows: number): void {
    if (this._disposed) return;
    terminalService.resize(this.sessionId, cols, rows).catch(error => {
      console.error('[TerminalInstance] Failed to resize terminal:', error);
    });
  }
  clear(): void {
    this._xterm?.clear();
  }
  private _safeWrite(text: string): void {
    if (this._disposed || !this._xterm) return;
    try {
      this._xterm.write(text);
    } catch (error) {
      console.error('[TerminalInstance] Failed to write to xterm:', error);
    }
  }
  updateTheme(): void {
    if (!this._xterm) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    this._xterm.options.theme = getTerminalColors(!isDark);
  }
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._stopResizeObserver();
    this._unsubOutput?.();
    this._unsubOutput = undefined;
    this._unsubClosed?.();
    this._unsubClosed = undefined;
    this._xtermDisposables.forEach(d => {
      try {
        d.dispose();
      } catch {}
    });
    this._xtermDisposables = [];
    if (this._xterm) {
      try {
        this._xterm.dispose();
      } catch {}
      this._xterm = undefined;
      this._fitAddon = undefined;
    }
    this._xtermReady = undefined;
    this._container = undefined;
    terminalService.killSession(this.sessionId).catch(() => {});
    this._onDisposed.fire(this);
    this._onDisposed.dispose();
    this._onTitleChanged.dispose();
    this._onData.dispose();
  }
}
