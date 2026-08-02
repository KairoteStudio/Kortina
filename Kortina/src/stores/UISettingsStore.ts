import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppEvents, type SettingsChangedPayload } from '../events/app-events';
import { isTauri } from '../utils/environment';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
export const DEFAULT_COMPILER_OUTPUT = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform) ? 'output.exe' : 'output';
interface UISettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
  enableCodeLens: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  theme: 'light' | 'dark';
  themeGroup: 'default' | 'islandtheme';
  uiZoom: number;
  fontFamily: string;
  fontLigatures: boolean;
  syntaxTheme: 'default' | 'jetbrains' | 'vscode' | 'monokai';
  compilerPath: string;
  compilerUseSystemPath: boolean;
  compilerTargetType: 'asm' | 'ir' | 'exe';
  compilerOutputFile: string;
  compilerShowIR: boolean;
  shortcuts: Record<string, string>;
  isSettingsWindowOpen: boolean;
  settingsInitialCategory: 'general' | 'editor' | 'files' | 'shortcuts' | 'compiler' | 'extensions' | 'other' | 'about';
  isPluginsPanelOpen: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  currentSidebarView: string;
  explorerWidth: number;
  consoleHeight: number;
}
interface UIActions {
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setWordWrap: (wrap: boolean) => void;
  setShowLineNumbers: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  setEnableCodeLens: (enable: boolean) => void;
  setAutoSave: (auto: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setThemeGroup: (group: 'default' | 'islandtheme') => void;
  setUiZoom: (zoom: number) => void;
  setFontFamily: (family: string) => void;
  setFontLigatures: (ligatures: boolean) => void;
  setSyntaxTheme: (theme: 'default' | 'jetbrains' | 'vscode' | 'monokai') => void;
  setCompilerPath: (path: string) => void;
  setCompilerUseSystemPath: (use: boolean) => void;
  setCompilerTargetType: (type: 'asm' | 'ir' | 'exe') => void;
  setCompilerOutputFile: (file: string) => void;
  setCompilerShowIR: (show: boolean) => void;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  setSettingsWindowOpen: (open: boolean, category?: UISettings['settingsInitialCategory']) => void;
  setPluginsPanelOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentSidebarView: (view: string) => void;
  setExplorerWidth: (width: number) => void;
  setConsoleHeight: (height: number) => void;
  updateSettings: (settings: Partial<UISettings>) => void;
  _emitChange: () => void;
}
export const useUISettingsStore = create<UISettings & UIActions>()(persist((set, get) => ({
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  showLineNumbers: true,
  showMinimap: true,
  enableCodeLens: false,
  autoSave: false,
  autoSaveInterval: 30,
  theme: 'dark',
  themeGroup: 'default',
  uiZoom: 1,
  fontFamily: 'LitalagicaL Mono',
  fontLigatures: false,
  syntaxTheme: 'jetbrains',
  compilerPath: '',
  compilerUseSystemPath: true,
  compilerTargetType: 'exe',
  compilerOutputFile: DEFAULT_COMPILER_OUTPUT,
  compilerShowIR: false,
  shortcuts: {
    ...DEFAULT_SHORTCUTS
  },
  isSettingsWindowOpen: false,
  settingsInitialCategory: 'general',
  isPluginsPanelOpen: false,
  sidebarWidth: 200,
  sidebarCollapsed: false,
  currentSidebarView: 'explorer',
  explorerWidth: 250,
  consoleHeight: 200,
  setFontSize: fontSize => {
    set({
      fontSize
    });
    get()._emitChange();
  },
  setTabSize: tabSize => {
    set({
      tabSize
    });
    get()._emitChange();
  },
  setWordWrap: wordWrap => {
    set({
      wordWrap
    });
    get()._emitChange();
  },
  setShowLineNumbers: showLineNumbers => {
    set({
      showLineNumbers
    });
    get()._emitChange();
  },
  setShowMinimap: showMinimap => {
    set({
      showMinimap
    });
    get()._emitChange();
  },
  setEnableCodeLens: enableCodeLens => {
    set({
      enableCodeLens
    });
    get()._emitChange();
  },
  setAutoSave: autoSave => {
    set({
      autoSave
    });
    get()._emitChange();
  },
  setAutoSaveInterval: autoSaveInterval => {
    set({
      autoSaveInterval
    });
    get()._emitChange();
  },
  setTheme: theme => {
    const currentState = get();
    if (currentState.theme === theme) return;
    set({
      theme
    });
    document.documentElement.setAttribute('data-theme', theme);
    get()._emitChange();
  },
  setThemeGroup: themeGroup => {
    set({
      themeGroup
    });
    if (themeGroup) {
      document.documentElement.setAttribute('data-theme-group', themeGroup);
    } else {
      document.documentElement.removeAttribute('data-theme-group');
    }
    get()._emitChange();
  },
  setUiZoom: uiZoom => {
    set({
      uiZoom
    });
    get()._emitChange();
    import('../utils/uiZoom').then(({
      broadcastUiZoom
    }) => {
      broadcastUiZoom(uiZoom);
    }).catch(console.error);
  },
  setFontFamily: fontFamily => {
    set({
      fontFamily
    });
    get()._emitChange();
    import('../utils/fontLoader').then(({
      loadFontFamily
    }) => {
      loadFontFamily(fontFamily).catch(() => {});
    }).catch(console.error);
  },
  setFontLigatures: fontLigatures => {
    set({
      fontLigatures
    });
    get()._emitChange();
  },
  setSyntaxTheme: syntaxTheme => {
    set({
      syntaxTheme
    });
    get()._emitChange();
  },
  setCompilerPath: compilerPath => {
    set({
      compilerPath
    });
    get()._emitChange();
  },
  setCompilerUseSystemPath: compilerUseSystemPath => {
    set({
      compilerUseSystemPath
    });
    get()._emitChange();
  },
  setCompilerTargetType: compilerTargetType => {
    set({
      compilerTargetType
    });
    get()._emitChange();
  },
  setCompilerOutputFile: compilerOutputFile => {
    set({
      compilerOutputFile
    });
    get()._emitChange();
  },
  setCompilerShowIR: compilerShowIR => {
    set({
      compilerShowIR
    });
    get()._emitChange();
  },
  setShortcuts: shortcuts => {
    set({
      shortcuts
    });
    get()._emitChange();
  },
  setSettingsWindowOpen: (isSettingsWindowOpen, settingsInitialCategory = 'general') => set({
    isSettingsWindowOpen,
    settingsInitialCategory
  }),
  setPluginsPanelOpen: isPluginsPanelOpen => set({
    isPluginsPanelOpen
  }),
  setSidebarWidth: sidebarWidth => set({
    sidebarWidth
  }),
  setSidebarCollapsed: sidebarCollapsed => set({
    sidebarCollapsed
  }),
  setCurrentSidebarView: currentSidebarView => set({
    currentSidebarView
  }),
  setExplorerWidth: explorerWidth => set({
    explorerWidth
  }),
  setConsoleHeight: consoleHeight => set({
    consoleHeight
  }),
  updateSettings: newSettings => {
    const currentState = get();
    const hasChanges = Object.keys(newSettings).some(key => (currentState as any)[key] !== (newSettings as any)[key]);
    if (!hasChanges) return;
    set(state => ({
      ...state,
      ...newSettings
    }));
    if (newSettings.theme) {
      document.documentElement.setAttribute('data-theme', newSettings.theme);
    }
  },
  _emitChange: () => {
    if (isTauri()) {
      import('@tauri-apps/api/event').then(({
        emit
      }) => {
        const state = get();
        const {
          isSettingsWindowOpen,
          settingsInitialCategory,
          isPluginsPanelOpen,
          sidebarWidth,
          currentSidebarView,
          explorerWidth,
          consoleHeight,
          _emitChange,
          ...persistentState
        } = state as any;
        emit<SettingsChangedPayload>(AppEvents.SETTINGS_CHANGED, persistentState as SettingsChangedPayload).catch(console.error);
      });
    }
  }
}), {
  name: 'kortina_settings_v3',
  partialize: state => {
    const {
      isSettingsWindowOpen,
      settingsInitialCategory,
      isPluginsPanelOpen,
      sidebarWidth,
      currentSidebarView,
      explorerWidth,
      consoleHeight,
      ...persistentState
    } = state as any;
    return persistentState;
  },
  merge: (persisted, current) => {
    const p = (persisted || {}) as Partial<UISettings>;
    const next = {
      ...current,
      ...p
    } as UISettings & UIActions;
    if (next.theme as string === 'kortina') {
      next.theme = 'dark';
    }
    if (next.theme !== 'light' && next.theme !== 'dark') {
      next.theme = 'dark';
    }
    if (next.themeGroup !== 'islandtheme' && next.themeGroup !== 'default') {
      next.themeGroup = 'default';
    }
    if (next.currentSidebarView === 'extensions') {
      next.currentSidebarView = 'explorer';
    }
    next.shortcuts = {
      ...DEFAULT_SHORTCUTS,
      ...(p.shortcuts || {})
    };
    return next;
  }
}));