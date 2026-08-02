import React, { useEffect } from 'react';
import { SettingsWindow } from './components/Core/SettingsWindow';
import { useSettings } from './hooks/useSettings';
import { useUiZoomSync } from './hooks/useUiZoomSync';
import { listen } from '@tauri-apps/api/event';
import { AppEvents, type SettingsChangedPayload, type SettingsInitialDataPayload, type SettingsThemeUpdatePayload } from './events/app-events';
export const SettingsPage: React.FC = () => {
  const settings = useSettings();
  useUiZoomSync(true);
  const [initialCategory, setInitialCategory] = React.useState<'general' | 'editor' | 'files' | 'shortcuts' | 'compiler' | 'extensions' | 'other' | 'about'>('general');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kortina_settings_v3') ?? localStorage.getItem('kortina_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const state = parsed?.state ?? parsed;
        const theme = state?.theme === 'light' ? 'light' : 'dark';
        const group = state?.themeGroup === 'islandtheme' ? 'islandtheme' : 'default';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme-group', group);
      }
    } catch (e) {
      console.error('Failed to parse settings for initial theme:', e);
    }
    let unlistenThemeUpdate: (() => void) | null = null;
    let unlistenInitialData: (() => void) | null = null;
    let unlistenSettingsChanged: (() => void) | null = null;
    const applyTheme = (theme?: string, themeGroup?: string) => {
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
      }
      if (themeGroup === 'islandtheme' || themeGroup === 'default') {
        document.documentElement.setAttribute('data-theme-group', themeGroup);
      }
    };
    const setupListeners = async () => {
      unlistenThemeUpdate = await listen<SettingsThemeUpdatePayload>(AppEvents.SETTINGS_THEME_UPDATE, event => {
        applyTheme(event.payload);
      });
      unlistenInitialData = await listen<SettingsInitialDataPayload>(AppEvents.SETTINGS_INITIAL_DATA, event => {
        applyTheme(event.payload.theme, event.payload.themeGroup);
        if (event.payload.category) {
          setInitialCategory(event.payload.category as any);
        }
      });
      unlistenSettingsChanged = await listen<SettingsChangedPayload>(AppEvents.SETTINGS_CHANGED, event => {
        const payload = event.payload || {};
        applyTheme(payload.theme, payload.themeGroup);
      });
    };
    setupListeners();
    return () => {
      if (unlistenThemeUpdate) unlistenThemeUpdate();
      if (unlistenInitialData) unlistenInitialData();
      if (unlistenSettingsChanged) unlistenSettingsChanged();
    };
  }, []);
  const handleClose = async () => {
    console.log('SettingsPage: handleClose called');
    try {
      const {
        getCurrentWindow
      } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window in SettingsPage:', error);
      window.close();
    }
  };
  return <div style={{
    height: '100%',
    width: '100%',
    background: 'var(--bg-primary)',
    overflow: 'hidden'
  }}>
      <SettingsWindow isOpen={true} onClose={handleClose} isStandalone={true} initialCategory={initialCategory} {...settings} />
    </div>;
};