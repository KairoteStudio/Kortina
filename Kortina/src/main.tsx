import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './assets/fonts.css';
import './styles.css';
import './themes/island-theme.css';
import './themes/fleet-theme.css';
import App from './App.tsx';
import { loadFontFamily } from './utils/fontLoader.ts';
const query = new URLSearchParams(window.location.search);
const windowType = query.get('window');
function getStoredTheme(): 'light' | 'dark' {
  try {
    const raw = window.localStorage.getItem('kortina_settings_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed && parsed.state ? parsed.state : parsed;
      if (state?.theme === 'light') return 'light';
      if (state?.theme === 'dark' || state?.theme === 'kortina') return 'dark';
    }
  } catch (e) {}
  return 'dark';
}
function getStoredThemeGroup(): 'default' | 'islandtheme' | 'fleet' {
  try {
    const raw = window.localStorage.getItem('kortina_settings_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed && parsed.state ? parsed.state : parsed;
      if (state?.themeGroup === 'islandtheme' || state?.themeGroup === 'default' || state?.themeGroup === 'fleet') {
        return state.themeGroup;
      }
    }
  } catch (e) {}
  return 'default';
}
function getStoredFontFamily(): string {
  try {
    const raw = window.localStorage.getItem('kortina_settings_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed && parsed.state ? parsed.state : parsed;
      if (typeof state?.fontFamily === 'string') {
        return state.fontFamily;
      }
    }
  } catch (e) {}
  return 'LitalagicaL Mono';
}
const storedTheme = getStoredTheme();
const storedThemeGroup = getStoredThemeGroup();
const fallbackBg = 'var(--bg-primary)';
document.documentElement.setAttribute('data-theme', storedTheme);
document.documentElement.setAttribute('data-theme-group', storedThemeGroup);
loadFontFamily(getStoredFontFamily()).catch(() => {});
const SettingsPage = React.lazy(() => import('./SettingsPage').then(m => ({
  default: m.SettingsPage
})));
const VcsWindow = React.lazy(() => import('./components/Vcs/VcsWindow').then(m => ({
  default: m.VcsWindow
})));
const LoadingWindow = React.lazy(() => import('./components/Core/layout/LoadingWindow').then(m => ({
  default: m.LoadingWindow
})));
const WelcomeWindow = React.lazy(() => import('./components/Core/layout/WelcomeWindow').then(m => ({
  default: m.WelcomeWindow
})));
const InputDialogWindow = React.lazy(() => import('./components/Dialogs/InputDialogWindow').then(m => ({
  default: m.InputDialogWindow
})));
const CompileOptionsWindow = React.lazy(() => import('./components/Dialogs/CompileOptionsWindow').then(m => ({
  default: m.CompileOptionsWindow
})));
const WindowFallback = () => {
  if (windowType === 'settings' || windowType === 'vcs' || windowType === 'loading' || windowType === 'welcome' || windowType === 'input-dialog' || windowType === 'compile-options') {
    return <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: fallbackBg
    }} />;
  }
  return null;
};
(window as any).__kortinaWindowType = windowType;
const WindowContent = () => {
  switch (windowType) {
    case 'settings':
      return <SettingsPage />;
    case 'vcs':
      return <VcsWindow />;
    case 'loading':
      return <LoadingWindow />;
    case 'welcome':
      return <WelcomeWindow />;
    case 'input-dialog':
      return <InputDialogWindow />;
    case 'compile-options':
      return <CompileOptionsWindow />;
    default:
      return <App />;
  }
};
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <Suspense fallback={<WindowFallback />}>
      <WindowContent />
    </Suspense>
  </React.StrictMode>);