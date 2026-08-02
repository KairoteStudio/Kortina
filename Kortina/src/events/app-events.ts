export const AppEvents = {
  SETTINGS_CHANGED: 'settings-changed',
  SETTINGS_THEME_UPDATE: 'settings-theme-update',
  SETTINGS_INITIAL_DATA: 'settings-initial-data',
  UI_ZOOM_UPDATE: 'ui-zoom-update',
  OPEN_FOLDER: 'open-folder',
  SWITCH_PROJECT: 'switch-project',
  NEW_FILE: 'new-file',
  OPEN_SETTINGS: 'open-settings',
  VCS_ACTION_TRIGGER: 'vcs-action-trigger',
  INPUT_DIALOG_RESULT: 'input-dialog-result',
  COMPILE_OPTIONS_RESULT: 'compile-options-result',
  VCS_PROJECT_PATH_CHANGED: 'vcs-project-path-changed',
  VCS_INITIAL_DATA: 'vcs-initial-data',
  VCS_THEME_UPDATE: 'vcs-theme-update',
  FS_CHANGED: 'fs-changed'
} as const;
export type AppEventName = (typeof AppEvents)[keyof typeof AppEvents];
export interface SettingsChangedPayload {
  theme?: 'light' | 'dark';
  themeGroup?: 'default' | 'islandtheme';
  fontSize?: number;
  fontFamily?: string;
  fontLigatures?: boolean;
  tabSize?: number;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  showMinimap?: boolean;
  enableCodeLens?: boolean;
  uiZoom?: number;
  syntaxTheme?: 'default' | 'jetbrains' | 'vscode' | 'monokai';
  compilerPath?: string;
  compilerUseSystemPath?: boolean;
  compilerTargetType?: 'asm' | 'ir' | 'exe';
  compilerOutputFile?: string;
  compilerShowIR?: boolean;
  shortcuts?: Record<string, string>;
}
export type SettingsThemeUpdatePayload = string;
export interface SettingsInitialDataPayload {
  theme?: string;
  themeGroup?: string;
  category?: string;
}
export type UiZoomUpdatePayload = number;
export interface OpenFolderPayload {
  path: string;
}
export interface SwitchProjectPayload {
  path: string;
}
export interface OpenSettingsPayload {
  category: string;
}
export type VcsActionTriggerPayload = 'commit' | 'push' | 'pull';
export interface InputDialogResultPayload {
  requestId: string;
  confirmed: boolean;
  value: string;
}
export interface CompileOptionsResultPayload {
  confirmed: boolean;
  compilerTargetType?: 'asm' | 'ir' | 'exe';
  compilerOutputFile?: string;
  compilerShowIR?: boolean;
}
export type VcsProjectPathChangedPayload = string;
export interface VcsInitialDataPayload {
  theme: string;
  projectPath: string | null;
}
export type VcsThemeUpdatePayload = string;
export type EmptyPayload = void;
export interface AppEventPayloadMap {
  [AppEvents.SETTINGS_CHANGED]: SettingsChangedPayload;
  [AppEvents.SETTINGS_THEME_UPDATE]: SettingsThemeUpdatePayload;
  [AppEvents.SETTINGS_INITIAL_DATA]: SettingsInitialDataPayload;
  [AppEvents.UI_ZOOM_UPDATE]: UiZoomUpdatePayload;
  [AppEvents.OPEN_FOLDER]: OpenFolderPayload;
  [AppEvents.SWITCH_PROJECT]: SwitchProjectPayload;
  [AppEvents.NEW_FILE]: EmptyPayload;
  [AppEvents.OPEN_SETTINGS]: OpenSettingsPayload;
  [AppEvents.VCS_ACTION_TRIGGER]: VcsActionTriggerPayload;
  [AppEvents.INPUT_DIALOG_RESULT]: InputDialogResultPayload;
  [AppEvents.COMPILE_OPTIONS_RESULT]: CompileOptionsResultPayload;
  [AppEvents.VCS_PROJECT_PATH_CHANGED]: VcsProjectPathChangedPayload;
  [AppEvents.VCS_INITIAL_DATA]: VcsInitialDataPayload;
  [AppEvents.VCS_THEME_UPDATE]: VcsThemeUpdatePayload;
}