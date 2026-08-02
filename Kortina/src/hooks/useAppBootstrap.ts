import { useCallback, useEffect, useRef } from 'react';
import { useUISettingsStore, useProjectStore } from '../stores';
import { AppEvents, type SettingsChangedPayload, type SwitchProjectPayload } from '../events/app-events';
export interface UseAppBootstrapOptions {
  isTauri: boolean;
  projectExplorerRef: React.RefObject<{
    loadDirectory: (path: string) => Promise<unknown>;
  } | null>;
}
export const useAppBootstrap = ({
  isTauri,
  projectExplorerRef
}: UseAppBootstrapOptions) => {
  const {
    theme,
    setTheme,
    themeGroup,
    setSettingsWindowOpen
  } = useUISettingsStore();
  const {
    loadRecentProjects,
    saveRecentProject
  } = useProjectStore();
  const hasLoadedRecentProjectsRef = useRef(false);
  useEffect(() => {
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [theme]);
  useEffect(() => {
    const group = themeGroup === 'islandtheme' ? 'islandtheme' : 'default';
    document.documentElement.setAttribute('data-theme-group', group);
  }, [themeGroup]);
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      const {
        listen
      } = await import('@tauri-apps/api/event');
      const unlistenFn = await listen<SettingsChangedPayload>(AppEvents.SETTINGS_CHANGED, event => {
        const newSettings = event.payload;
        if (newSettings) {
          useUISettingsStore.getState().updateSettings(newSettings);
        }
      });
      unlisten = unlistenFn;
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri]);
  const saveRecentProjectWrapped = useCallback(async (projectPath: string) => {
    await saveRecentProject(projectPath);
  }, [saveRecentProject]);
  useEffect(() => {
    const handleSwitchProject = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        const unlisten = await listen<SwitchProjectPayload>(AppEvents.SWITCH_PROJECT, async event => {
          const folderPath = event.payload.path;
          if (projectExplorerRef.current) {
            await projectExplorerRef.current.loadDirectory(folderPath);
            saveRecentProjectWrapped(folderPath);
          }
        });
        return unlisten;
      } catch (e) {
        console.error('Failed to setup switch-project listener:', e);
      }
    };
    const unlistenPromise = handleSwitchProject();
    const query = new URLSearchParams(window.location.search);
    const projectPath = query.get('project');
    if (projectPath && projectExplorerRef.current) {
      projectExplorerRef.current.loadDirectory(projectPath);
      saveRecentProjectWrapped(projectPath);
    }
    return () => {
      unlistenPromise.then(unlisten => unlisten && unlisten());
    };
  }, [projectExplorerRef, saveRecentProjectWrapped]);
  const scheduleIdle = useCallback((callback: () => void, timeout = 50): number => {
    const browserWindow: Window = globalThis.window;
    if (typeof browserWindow.requestIdleCallback === 'function') {
      return browserWindow.requestIdleCallback(callback, {
        timeout
      });
    }
    return browserWindow.setTimeout(callback, timeout);
  }, []);
  const loadRecentProjectsWrapped = useCallback(async () => {
    try {
      await loadRecentProjects();
      const currentPath = useProjectStore.getState().currentProjectPath;
      if (currentPath && projectExplorerRef.current) {
        await projectExplorerRef.current.loadDirectory(currentPath);
      }
    } catch (error) {
      console.error('加载最近项目失败:', error);
    }
  }, [loadRecentProjects, projectExplorerRef]);
  const scheduleLoadRecentProjects = useCallback((splashRemoved: boolean) => {
    if (!splashRemoved) return;
    if (hasLoadedRecentProjectsRef.current) return;
    hasLoadedRecentProjectsRef.current = true;
    const idleHandle = scheduleIdle(() => {
      loadRecentProjectsWrapped();
    });
    return () => {
      const browserWindow: Window = globalThis.window;
      if (typeof browserWindow.cancelIdleCallback === 'function') {
        browserWindow.cancelIdleCallback(idleHandle);
      } else {
        browserWindow.clearTimeout(idleHandle);
      }
    };
  }, [loadRecentProjectsWrapped, scheduleIdle]);
  const openSettingsWindow = useCallback(async (initialCategory?: string) => {
    if (!isTauri) {
      setSettingsWindowOpen(true, initialCategory as any || 'general');
      return;
    }
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      await invoke('launch_settings_window', {
        theme: theme === 'light' ? 'light' : 'dark',
        category: initialCategory || 'general'
      });
    } catch (error) {
      console.error('Failed to launch settings window:', error);
      setSettingsWindowOpen(true, initialCategory as any || 'general');
    }
  }, [isTauri, theme, setSettingsWindowOpen]);
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (isTauri) {
      import('@tauri-apps/api/core').then(({
        invoke
      }) => {
        invoke('update_vcs_theme', {
          theme: newTheme
        });
        invoke('update_settings_theme', {
          theme: newTheme
        });
      }).catch(console.error);
    }
  }, [theme, isTauri, setTheme]);
  return {
    saveRecentProject: saveRecentProjectWrapped,
    openSettingsWindow,
    toggleTheme,
    scheduleLoadRecentProjects,
    hasLoadedRecentProjectsRef
  };
};