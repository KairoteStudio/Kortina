import React, { useState, useEffect } from 'react';
import { VcsPanel } from './VcsPanel';
import { WindowControls } from '../Core/WindowControls';
import { listen } from '@tauri-apps/api/event';
import { Github } from 'lucide-react';
import { useUiZoomSync } from '../../hooks/useUiZoomSync';
import { AppEvents, type VcsProjectPathChangedPayload, type VcsActionTriggerPayload, type VcsInitialDataPayload, type VcsThemeUpdatePayload } from '../../events/app-events';
import './VcsPanel.css';
const windowStyles = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: var(--font-kortina);
    background-color: var(--background-color);
    color: var(--text-color);
  }
  #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .vcs-window {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
    box-sizing: border-box;
  }
  .vcs-title-bar {
    height: 32px;
    background-color: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 0 12px;
    user-select: none;
    -webkit-app-region: drag;
    border-bottom: 1px solid var(--border-color);
  }
  .vcs-title-bar-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .vcs-window .vcs-panel {
    flex: 1;
    height: auto;
    border: none;
  }
`;
interface VcsWindowProps {}
export const VcsWindow: React.FC<VcsWindowProps> = () => {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [vcsActionTrigger, setVcsActionTrigger] = useState<'commit' | 'push' | 'pull' | null>(null);
  useUiZoomSync(true);
  useEffect(() => {
    console.log('VcsWindow: Component mounted');
    const styleElement = document.createElement('style');
    styleElement.textContent = windowStyles;
    document.head.appendChild(styleElement);
    const savedSettings = localStorage.getItem('kortina_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
      } catch (e) {
        console.error('Failed to parse settings for initial theme:', e);
      }
    }
    let unlistenProjectPath: (() => void) | null = null;
    let unlistenActionTrigger: (() => void) | null = null;
    let unlistenInitialData: (() => void) | null = null;
    let unlistenThemeUpdate: (() => void) | null = null;
    const setupListeners = async () => {
      try {
        console.log('VcsWindow: Setting up listeners');
        unlistenProjectPath = await listen<VcsProjectPathChangedPayload>(AppEvents.VCS_PROJECT_PATH_CHANGED, event => {
          console.log('VcsWindow: Received project path:', event.payload);
          setProjectPath(event.payload);
        });
        unlistenActionTrigger = await listen<VcsActionTriggerPayload>(AppEvents.VCS_ACTION_TRIGGER, event => {
          console.log('VcsWindow: Received VCS action trigger:', event.payload);
          setVcsActionTrigger(event.payload);
        });
        unlistenInitialData = await listen<VcsInitialDataPayload>(AppEvents.VCS_INITIAL_DATA, event => {
          console.log('VcsWindow: Received initial data:', event.payload);
          if (event.payload.projectPath) {
            setProjectPath(event.payload.projectPath);
          }
          if (event.payload.theme) {
            document.documentElement.setAttribute('data-theme', event.payload.theme);
          }
        });
        unlistenThemeUpdate = await listen<VcsThemeUpdatePayload>(AppEvents.VCS_THEME_UPDATE, event => {
          console.log('VcsWindow: Received theme update:', event.payload);
          document.documentElement.setAttribute('data-theme', event.payload);
        });
        const {
          invoke
        } = await import('@tauri-apps/api/core');
        const currentPath = (await invoke('get_current_project_path')) as string | null;
        if (currentPath) {
          console.log('VcsWindow: Proactively fetched project path:', currentPath);
          setProjectPath(currentPath);
        }
      } catch (error) {
        console.error('Failed to setup VCS listeners:', error);
      }
    };
    setupListeners();
    return () => {
      if (unlistenProjectPath) unlistenProjectPath();
      if (unlistenActionTrigger) unlistenActionTrigger();
      if (unlistenInitialData) unlistenInitialData();
      if (unlistenThemeUpdate) unlistenThemeUpdate();
    };
  }, []);
  const handleActionTriggered = () => {
    setVcsActionTrigger(null);
  };
  return <div className="vcs-window">
      <div className="vcs-title-bar">
        <div className="vcs-title-bar-content">
          <Github size={14} />
          <span>源代码管理</span>
        </div>
        <WindowControls />
      </div>
      <VcsPanel projectPath={projectPath} actionTrigger={vcsActionTrigger} onActionTriggered={handleActionTriggered} />
    </div>;
};