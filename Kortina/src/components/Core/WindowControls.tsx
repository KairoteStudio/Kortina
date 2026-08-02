import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import type { Window as TauriWindow } from '@tauri-apps/api/window';
import { isTauri } from '../../utils/environment';
import './WindowControls.css';
let appWindow: TauriWindow | null = null;
export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriReady, setIsTauriReady] = useState(false);
  const [isTauriEnv] = useState(() => isTauri());
  useEffect(() => {
    const initTauri = async () => {
      try {
        if (isTauriEnv) {
          console.log('Initializing Tauri window controls...');
          const {
            getCurrentWindow
          } = await import('@tauri-apps/api/window');
          const {
            TauriEvent
          } = await import('@tauri-apps/api/event');
          appWindow = getCurrentWindow();
          console.log('Tauri window instance created:', appWindow);
          try {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
            console.log('Window maximized state:', maximized);
          } catch (error) {
            console.warn('Failed to check if window is maximized:', error);
          }
          const checkMaximized = async () => {
            if (appWindow) {
              try {
                const state = await appWindow.isMaximized();
                setIsMaximized(state);
              } catch (error) {
                console.warn('Failed to check maximized state:', error);
              }
            }
          };
          try {
            const unlisten = await appWindow.listen(TauriEvent.WINDOW_RESIZED, checkMaximized);
            console.log('Window resize listener attached');
            setIsTauriReady(true);
            return () => {
              unlisten();
              window.removeEventListener('resize', checkMaximized);
            };
          } catch (error) {
            console.warn('Failed to listen to window resize events:', error);
            window.addEventListener('resize', checkMaximized);
            setIsTauriReady(true);
            return () => window.removeEventListener('resize', checkMaximized);
          }
        }
      } catch (e) {
        console.error('Failed to initialize Tauri window controls', e);
      }
    };
    initTauri();
  }, [isTauriEnv]);
  const minimize = async () => {
    console.log('Minimize button clicked');
    try {
      const {
        getCurrentWindow
      } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };
  const maximize = async () => {
    console.log('Maximize button clicked, current state:', isMaximized);
    try {
      const {
        getCurrentWindow
      } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      console.log('Using fresh window instance for maximize');
      await win.toggleMaximize();
      setTimeout(async () => {
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);
        console.log('Window maximized state updated to:', maximized);
      }, 100);
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };
  const close = async () => {
    console.log('Close button clicked');
    try {
      const {
        getCurrentWindow
      } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };
  if (!isTauriEnv) {
    console.log('Not in Tauri environment, hiding window controls');
    return null;
  }
  return <div className="window-controls">
      <div className={`window-control-button ${!isTauriReady ? 'disabled' : ''}`} onClick={isTauriReady ? minimize : undefined} title="最小化">
        <Minus size={16} />
      </div>
      <div className={`window-control-button ${!isTauriReady ? 'disabled' : ''}`} onClick={isTauriReady ? maximize : undefined} title={isMaximized ? "还原" : "最大化"}>
        {isMaximized ? <div style={{
        position: 'relative',
        width: 14,
        height: 14
      }}>
             <Square size={10} style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fill: 'transparent'
        }} />
             <Square size={10} style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          fill: 'var(--bg-secondary)',
          backgroundColor: 'var(--bg-secondary)'
        }} />
          </div> : <Square size={12} />}
      </div>
      <div className={`window-control-button close ${!isTauriReady ? 'disabled' : ''}`} onClick={isTauriReady ? close : undefined} title="关闭">
        <X size={16} />
      </div>
    </div>;
};