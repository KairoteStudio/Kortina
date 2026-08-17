import { useEffect } from 'react';
import { useUISettingsStore } from '../stores/UISettingsStore';
import { AppEvents, type SettingsChangedPayload } from '../events/app-events';
import { isTauri } from '../utils/environment';
export const useSettings = () => {
  const theme = useUISettingsStore(s => s.theme);
  const themeGroup = useUISettingsStore(s => s.themeGroup);
  const fontSize = useUISettingsStore(s => s.fontSize);
  const fontFamily = useUISettingsStore(s => s.fontFamily);
  const fontLigatures = useUISettingsStore(s => s.fontLigatures);
  const tabSize = useUISettingsStore(s => s.tabSize);
  const wordWrap = useUISettingsStore(s => s.wordWrap);
  const showLineNumbers = useUISettingsStore(s => s.showLineNumbers);
  const autoSave = useUISettingsStore(s => s.autoSave);
  const autoSaveInterval = useUISettingsStore(s => s.autoSaveInterval);
  const showMinimap = useUISettingsStore(s => s.showMinimap);
  const enableCodeLens = useUISettingsStore(s => s.enableCodeLens);
  const uiZoom = useUISettingsStore(s => s.uiZoom);
  const syntaxTheme = useUISettingsStore(s => s.syntaxTheme);
  const compilerPath = useUISettingsStore(s => s.compilerPath);
  const compilerUseSystemPath = useUISettingsStore(s => s.compilerUseSystemPath);
  const compilerTargetType = useUISettingsStore(s => s.compilerTargetType);
  const compilerOutputFile = useUISettingsStore(s => s.compilerOutputFile);
  const compilerShowIR = useUISettingsStore(s => s.compilerShowIR);
  const editorBackgroundImage = useUISettingsStore(s => s.editorBackgroundImage);
  const editorBackgroundOpacity = useUISettingsStore(s => s.editorBackgroundOpacity);
  const globalWallpaperImage = useUISettingsStore(s => s.globalWallpaperImage);
  const globalWallpaperOpacity = useUISettingsStore(s => s.globalWallpaperOpacity);
  const wallpaperMode = useUISettingsStore(s => s.wallpaperMode);
  const fleetLayout = useUISettingsStore(s => s.fleetLayout);
  const shortcuts = useUISettingsStore(s => s.shortcuts);
  const setTheme = useUISettingsStore(s => s.setTheme);
  const setThemeGroup = useUISettingsStore(s => s.setThemeGroup);
  const setFontSize = useUISettingsStore(s => s.setFontSize);
  const setFontFamily = useUISettingsStore(s => s.setFontFamily);
  const setFontLigatures = useUISettingsStore(s => s.setFontLigatures);
  const setSyntaxTheme = useUISettingsStore(s => s.setSyntaxTheme);
  const setTabSize = useUISettingsStore(s => s.setTabSize);
  const setWordWrap = useUISettingsStore(s => s.setWordWrap);
  const setShowLineNumbers = useUISettingsStore(s => s.setShowLineNumbers);
  const setAutoSave = useUISettingsStore(s => s.setAutoSave);
  const setAutoSaveInterval = useUISettingsStore(s => s.setAutoSaveInterval);
  const setShowMinimap = useUISettingsStore(s => s.setShowMinimap);
  const setEnableCodeLens = useUISettingsStore(s => s.setEnableCodeLens);
  const setCompilerPath = useUISettingsStore(s => s.setCompilerPath);
  const setCompilerUseSystemPath = useUISettingsStore(s => s.setCompilerUseSystemPath);
  const setCompilerTargetType = useUISettingsStore(s => s.setCompilerTargetType);
  const setCompilerOutputFile = useUISettingsStore(s => s.setCompilerOutputFile);
  const setCompilerShowIR = useUISettingsStore(s => s.setCompilerShowIR);
  const setEditorBackgroundImage = useUISettingsStore(s => s.setEditorBackgroundImage);
  const setEditorBackgroundOpacity = useUISettingsStore(s => s.setEditorBackgroundOpacity);
  const setGlobalWallpaperImage = useUISettingsStore(s => s.setGlobalWallpaperImage);
  const setGlobalWallpaperOpacity = useUISettingsStore(s => s.setGlobalWallpaperOpacity);
  const setWallpaperMode = useUISettingsStore(s => s.setWallpaperMode);
  const setFleetLayout = useUISettingsStore(s => s.setFleetLayout);
  const setUiZoom = useUISettingsStore(s => s.setUiZoom);
  const setShortcuts = useUISettingsStore(s => s.setShortcuts);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      if (!isTauri()) return;
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        unlisten = await listen<SettingsChangedPayload>(AppEvents.SETTINGS_CHANGED, event => {
          if (event.payload) {
            useUISettingsStore.getState().updateSettings(event.payload);
          }
        });
      } catch (e) {
        console.error('Failed to setup settings listener:', e);
      }
    };
    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
  return {
    theme,
    themeGroup,
    fontSize,
    fontFamily,
    fontLigatures,
    tabSize,
    wordWrap,
    showLineNumbers,
    autoSave,
    autoSaveInterval,
    showMinimap,
    enableCodeLens,
    uiZoom,
    syntaxTheme,
    compilerPath,
    compilerUseSystemPath,
    compilerTargetType,
    compilerOutputFile,
    compilerShowIR,
    editorBackgroundImage,
    editorBackgroundOpacity,
    globalWallpaperImage,
    globalWallpaperOpacity,
    wallpaperMode,
    fleetLayout,
    shortcuts,
    setTheme,
    setThemeGroup,
    setFontSize,
    setFontFamily,
    setFontLigatures,
    setSyntaxTheme,
    setTabSize,
    setWordWrap,
    setShowLineNumbers,
    setAutoSave,
    setAutoSaveInterval,
    setShowMinimap,
    setEnableCodeLens,
    setCompilerPath,
    setCompilerUseSystemPath,
    setCompilerTargetType,
    setCompilerOutputFile,
    setCompilerShowIR,
    setEditorBackgroundImage,
    setEditorBackgroundOpacity,
    setGlobalWallpaperImage,
    setGlobalWallpaperOpacity,
    setWallpaperMode,
    setFleetLayout,
    setUiZoom,
    setShortcuts
  };
};
