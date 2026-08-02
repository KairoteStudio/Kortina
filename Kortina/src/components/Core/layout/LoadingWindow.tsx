import React, { useEffect, useState } from 'react';
import { KortinaLogo } from '../KortinaLogo';
import { useUiZoomSync } from '../../../hooks/useUiZoomSync';
import './LoadingWindow.css';
export const LoadingWindow: React.FC = () => {
  const [progress, setProgress] = useState(0);
  useUiZoomSync(true);
  useEffect(() => {
    const saved = localStorage.getItem('kortina_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
        if (settings.themeGroup) {
          document.documentElement.setAttribute('data-theme-group', settings.themeGroup);
        }
      } catch {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    const load = async () => {
      setProgress(30);
      await new Promise(r => setTimeout(r, 50));
      setProgress(60);
      localStorage.getItem('kortina_settings');
      await new Promise(r => setTimeout(r, 50));
      setProgress(100);
      await new Promise(r => setTimeout(r, 100));
      try {
        const {
          getAllWindows
        } = await import('@tauri-apps/api/window');
        const windows = await getAllWindows();
        const welcomeWin = windows.find(w => w.label === 'welcome');
        const loadingWin = windows.find(w => w.label === 'loading');
        if (welcomeWin) {
          await welcomeWin.show();
          await welcomeWin.setFocus();
        }
        if (loadingWin) {
          await loadingWin.close();
        }
      } catch (error) {
        console.error('LoadingWindow transition error:', error);
      }
    };
    load();
  }, []);
  return <div className="loading-window">
      <div className="loading-content">
        <KortinaLogo size={48} />
        <div className="loading-bar">
          <div className="loading-bar-fill" style={{
          width: `${progress}%`
        }} />
        </div>
      </div>
    </div>;
};
export default LoadingWindow;