export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  dependencies?: Record<string, string>;
  main?: string;
  backend?: string;
  contributions?: PluginContribution;
  permissions?: string[];
  installPath?: string;
  installedAt?: string;
  isEnabled?: boolean;
  category?: string;
  tags?: string[];
  homepage?: string;
  repository?: string;
  compatibility?: {
    minVersion: string;
    maxVersion?: string;
  };
}
export interface PluginContribution {
  menus?: MenuContribution[];
  panels?: PanelContribution[];
  commands?: CommandContribution[];
  themes?: ThemeContribution[];
  grammars?: GrammarContribution[];
}
export interface MenuContribution {
  id: string;
  label: string;
  icon?: string;
  command?: string;
  parent?: string;
  order?: number;
}
export interface PanelContribution {
  id: string;
  name: string;
  icon?: string;
  component?: string;
  order?: number;
}
export interface CommandContribution {
  id: string;
  label: string;
  icon?: string;
  keybinding?: string;
}
export interface ThemeContribution {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'kortina';
  colors: Record<string, string>;
}
export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string;
}
export interface PluginContext {
  api: PluginAPI;
  subscriptions: Subscription[];
  contributions: PluginContribution;
}
export interface PluginAPI {
  commands: CommandRegistry;
  windows: WindowManager;
  terminals: TerminalAPI;
  editor: EditorAPI;
  fs: FileSystemAPI;
  settings: SettingsAPI;
  events: EventEmitter;
  logger: LoggerAPI;
}
export interface CommandRegistry {
  registerCommand(command: string, handler: (args?: any[]) => Promise<void> | void): Disposable;
  executeCommand(command: string, ...args: any[]): Promise<any>;
  getCommands(): string[];
}
export interface WindowManager {
  openUrl(url: string): Promise<void>;
  showNotification(message: string, type?: 'info' | 'warning' | 'error'): void;
  showDialog(options: DialogOptions): Promise<DialogResult>;
  getCurrentWindowId(): string;
}
export interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'question';
  buttons?: string[];
}
export interface DialogResult {
  button: string | null;
}
export interface TerminalAPI {
  createTerminal(options: TerminalOptions): Promise<TerminalInstance>;
  getActiveTerminal(): TerminalInstance | null;
  executeCommand(terminalId: string, command: string): Promise<void>;
  write(terminalId: string, data: string): Promise<void>;
}
export interface TerminalOptions {
  shell?: string;
  cwd?: string;
  name?: string;
}
export interface TerminalInstance {
  id: string;
  name: string;
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  kill(): void;
  focus(): void;
}
export interface EditorAPI {
  openFile(path: string): Promise<void>;
  getActiveEditor(): EditorState | null;
  getSelection(): SelectionRange | null;
  insertText(text: string): Promise<void>;
  replaceText(range: SelectionRange, text: string): Promise<void>;
  getCurrentContent(): Promise<string>;
  showSuggestion(language: string): void;
  formatDocument(): Promise<void>;
}
export interface EditorState {
  id: string;
  path: string;
  content: string;
  cursor: SelectionRange;
}
export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
export interface FileSystemAPI {
  readFile(path: string): Promise<FileContent>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  readDir(path: string): Promise<FileEntry[]>;
  unlink(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
}
export interface FileContent {
  content: string;
  encoding: string;
}
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}
export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modified: number;
}
export interface SettingsAPI {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  onDidChange(key: string, listener: (value: any) => void): Disposable;
}
export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): Disposable;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: (...args: any[]) => void): Disposable;
}
export interface LoggerAPI {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
export interface Disposable {
  dispose(): void;
}
export interface Subscription extends Disposable {}
export type PluginActivateFunc = (context: PluginContext) => Promise<void> | void;
export type PluginDeactivateFunc = () => Promise<void> | void;
export interface SandboxPluginContext {
  pluginId: string;
  api: string[];
  subscriptions: number;
  contributions: PluginContribution;
}
export interface PluginModule {
  activate?: PluginActivateFunc;
  deactivate?: PluginDeactivateFunc;
  default?: PluginActivateFunc;
}
export interface PluginModuleSandboxed {
  activate: ((context: SandboxPluginContext) => Promise<void> | void) | null;
  deactivate: (() => Promise<void> | void) | null;
  callExport: (name: string, args: any[]) => Promise<any>;
}
export type PluginModuleLoadErrorCode = 'NOT_FOUND' | 'READ_FAILED' | 'EXECUTE_FAILED' | 'EMPTY_SOURCE';
export interface PluginLoadError {
  code: PluginModuleLoadErrorCode;
  message: string;
  pluginId: string;
  triedPaths: string[];
  causeMessage?: string;
}
export interface Plugin {
  manifest: PluginManifest;
  module: PluginModule | PluginModuleSandboxed;
  context?: PluginContext;
  isActive: boolean;
  subscriptions: Disposable[];
  isSandboxed?: boolean;
  isBuiltIn?: boolean;
  loadError?: PluginLoadError;
}
export interface PluginFilter {
  id?: string;
  name?: string;
  author?: string;
}
export interface PluginUpdateInfo {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
}