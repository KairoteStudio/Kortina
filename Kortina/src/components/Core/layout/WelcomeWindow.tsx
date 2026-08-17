import React, { useEffect } from 'react';
import { AppWelcome } from './AppWelcome';
import { WindowControls } from '../WindowControls';
import { KortinaLogo } from '../KortinaLogo';
import { useUiZoomSync } from '../../../hooks/useUiZoomSync';
import { useProjectStore } from '../../../stores';
import { AppEvents, type OpenFolderPayload, type SwitchProjectPayload, type OpenSettingsPayload } from '../../../events/app-events';
import { isMobile } from '../../../utils/environment';
import './WelcomeWindow.css';
export const WelcomeWindow: React.FC = () => {
  const {
    recentProjects,
    currentProjectPath,
    loadRecentProjects,
    removeRecentProjects
  } = useProjectStore();
  useUiZoomSync(true);
  useEffect(() => {
    const syncTheme = () => {
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
        } catch (e) {
          console.error('Failed to parse settings in WelcomeWindow', e);
        }
      } else {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    };
    syncTheme();
    const setupListener = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        const {
          getCurrentWindow
        } = await import('@tauri-apps/api/window');
        const unlisten = await listen<OpenFolderPayload>(AppEvents.OPEN_FOLDER, async event => {
          const folderPath = event.payload.path;
          const {
            getAllWindows
          } = await import('@tauri-apps/api/window');
          const windows = await getAllWindows();
          let mainWin = windows.find(w => w.label === 'main');
          if (mainWin) {
            const {
              emit
            } = await import('@tauri-apps/api/event');
            await emit<SwitchProjectPayload>(AppEvents.SWITCH_PROJECT, {
              path: folderPath
            });
            await mainWin.show();
            await mainWin.setFocus();
          } else {
            console.error('WelcomeWindow: Main window not found in runtime windows list!');
          }
          const currentWin = getCurrentWindow();
          await currentWin.close();
        });
        return unlisten;
      } catch (error) {
        console.error('Failed to setup event listeners in WelcomeWindow:', error);
      }
    };
    loadRecentProjects();
    const unlistenPromise = setupListener();
    return () => {
      unlistenPromise.then(unlisten => unlisten && unlisten());
    };
  }, []);
  const handleOpenFolder = async () => {
    try {
      let selected: string | null = null;
      if (isMobile()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<string | null>('open_folder_picker_android');
        if (result) {
          selected = result;
        }
      } else {
        const {
          open
        } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
          directory: true,
          multiple: false,
          title: '打开项目文件夹'
        });
        if (result && typeof result === 'string') {
          selected = result;
        }
      }
      if (selected) {
        const {
          emit
        } = await import('@tauri-apps/api/event');
        await emit<OpenFolderPayload>(AppEvents.OPEN_FOLDER, {
          path: selected
        });
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };
  const handleNewFile = async () => {
    const {
      emit
    } = await import('@tauri-apps/api/event');
    await emit(AppEvents.NEW_FILE);
  };
  const handleOpenSettings = async (category: string = 'general') => {
    const {
      emit
    } = await import('@tauri-apps/api/event');
    await emit<OpenSettingsPayload>(AppEvents.OPEN_SETTINGS, {
      category
    });
  };
  const handleOpenRecentProject = async (path: string) => {
    const {
      emit
    } = await import('@tauri-apps/api/event');
    await emit<OpenFolderPayload>(AppEvents.OPEN_FOLDER, {
      path
    });
  };
  const handleRemoveRecentProjects = async (paths: string[]) => {
    try {
      await removeRecentProjects(paths);
    } catch (error) {
      console.error('移除最近项目失败:', error);
    }
  };
  const handleOpenExternalUrl = async (url: string) => {
    try {
      const {
        openUrl
      } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (error) {
      console.error('Failed to open external URL:', error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  return <div className="welcome-window">
      <div className="welcome-header" data-tauri-drag-region>
        <div className="welcome-header-left" data-tauri-drag-region>
          <KortinaLogo size={16} />
          <span className="welcome-title">欢迎使用 Kortina</span>
        </div>
        <WindowControls />
      </div>
      <div className="welcome-content">
        <AppWelcome currentProjectPath={currentProjectPath} recentProjects={recentProjects} onOpenFolder={handleOpenFolder} onNewFile={handleNewFile} onOpenSettings={handleOpenSettings} onOpenRecentProject={handleOpenRecentProject} openExternalUrl={handleOpenExternalUrl} onRemoveProjects={handleRemoveRecentProjects} />
      </div>
    </div>;
};
export default WelcomeWindow;