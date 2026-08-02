import { create } from 'zustand';
import type { RecentProject } from '../types/project';
import { isTauri } from '../utils/environment';
const KORTINA_RECENT_PROJECTS = 'kortina_recent_projects';
const KORTINA_CURRENT_PROJECT_PATH = 'kortina_current_project_path';
const LEGACY_RECENT_PROJECTS = 'recent-projects';
function safeParseProjects(raw: string | null): RecentProject[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: unknown) => {
      const item = typeof p === 'object' && p !== null ? p as Record<string, unknown> : {};
      const lastOpenedRaw = item.lastOpened ?? item.last_opened;
      return {
        name: typeof item.name === 'string' ? item.name : '',
        path: typeof item.path === 'string' ? item.path : '',
        lastOpened: lastOpenedRaw instanceof Date ? lastOpenedRaw : new Date(typeof lastOpenedRaw === 'string' || typeof lastOpenedRaw === 'number' ? lastOpenedRaw : Date.now())
      };
    });
  } catch {
    return [];
  }
}
function serializeProjects(projects: RecentProject[]): string {
  return JSON.stringify(projects.map(p => ({
    name: p.name,
    path: p.path,
    lastOpened: p.lastOpened instanceof Date ? p.lastOpened.toISOString() : String(p.lastOpened)
  })));
}
function loadInitialState(): {
  recentProjects: RecentProject[];
  currentProjectPath: string | null;
} {
  if (typeof window === 'undefined') {
    return {
      recentProjects: [],
      currentProjectPath: null
    };
  }
  const legacy = window.localStorage.getItem(LEGACY_RECENT_PROJECTS);
  const recent = window.localStorage.getItem(KORTINA_RECENT_PROJECTS) ?? legacy;
  const current = window.localStorage.getItem(KORTINA_CURRENT_PROJECT_PATH);
  return {
    recentProjects: safeParseProjects(recent),
    currentProjectPath: current
  };
}
interface ProjectState {
  recentProjects: RecentProject[];
  currentProjectPath: string | null;
}
interface ProjectActions {
  setRecentProjects: (projects: RecentProject[]) => void;
  setCurrentProjectPath: (path: string | null) => void;
  addRecentProject: (project: RecentProject) => void;
  loadRecentProjects: () => Promise<void>;
  saveRecentProject: (projectPath: string) => Promise<void>;
  removeRecentProjects: (paths: string[]) => Promise<void>;
  clearRecentProjects: () => Promise<void>;
}
async function persistRecentProjects(projects: RecentProject[], currentProjectPath: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KORTINA_RECENT_PROJECTS, serializeProjects(projects));
  window.localStorage.removeItem(LEGACY_RECENT_PROJECTS);
  if (currentProjectPath) {
    window.localStorage.setItem(KORTINA_CURRENT_PROJECT_PATH, currentProjectPath);
  } else {
    window.localStorage.removeItem(KORTINA_CURRENT_PROJECT_PATH);
  }
  if (!isTauri()) return;
  try {
    const {
      invoke
    } = await import('@tauri-apps/api/core');
    await invoke('save_recent_projects', {
      projects: projects.map(p => ({
        name: p.name,
        path: p.path,
        last_opened: Math.floor(p.lastOpened instanceof Date ? p.lastOpened.getTime() : new Date(p.lastOpened).getTime()).toString()
      }))
    });
    await invoke('save_current_project_path', {
      path: currentProjectPath || ""
    });
  } catch (error) {
    console.error('持久化最近项目失败:', error);
  }
}
const initial = loadInitialState();
export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => ({
  recentProjects: initial.recentProjects,
  currentProjectPath: initial.currentProjectPath,
  setRecentProjects: recentProjects => set({
    recentProjects
  }),
  setCurrentProjectPath: currentProjectPath => set({
    currentProjectPath
  }),
  addRecentProject: project => set(state => {
    const filtered = state.recentProjects.filter(p => p.path !== project.path);
    return {
      recentProjects: [project, ...filtered].slice(0, 10)
    };
  }),
  loadRecentProjects: async () => {
    if (typeof window === 'undefined') return;
    const isTauriEnv = isTauri();
    const localStored = window.localStorage.getItem(KORTINA_RECENT_PROJECTS) ?? window.localStorage.getItem(LEGACY_RECENT_PROJECTS);
    const localProjects = safeParseProjects(localStored);
    const localCurrentPath = window.localStorage.getItem(KORTINA_CURRENT_PROJECT_PATH);
    let projects = localProjects;
    let currentPath: string | null = localCurrentPath;
    if (isTauriEnv) {
      try {
        const {
          invoke
        } = await import('@tauri-apps/api/core');
        const rawProjects = (await invoke('get_recent_projects')) as Array<{
          name: string;
          path: string;
          last_opened: string;
        }>;
        const backendProjects = (rawProjects || []).map(p => {
          const ts = Number(p.last_opened);
          return {
            name: p.name,
            path: p.path,
            lastOpened: Number.isFinite(ts) && ts > 0 ? new Date(ts) : new Date(p.last_opened || Date.now())
          };
        });
        const backendCurrentPath = (await invoke('get_current_project_path')) as string | null;
        if (backendProjects.length > 0 || backendCurrentPath) {
          projects = backendProjects;
          if (!localCurrentPath && backendCurrentPath) {
            currentPath = backendCurrentPath;
          }
        }
      } catch (error) {
        console.error('从后端同步最近项目失败，使用本地数据:', error);
      }
    }
    set({
      recentProjects: projects,
      currentProjectPath: currentPath
    });
    window.localStorage.setItem(KORTINA_RECENT_PROJECTS, serializeProjects(projects));
    window.localStorage.removeItem(LEGACY_RECENT_PROJECTS);
    if (currentPath) {
      window.localStorage.setItem(KORTINA_CURRENT_PROJECT_PATH, currentPath);
    } else {
      window.localStorage.removeItem(KORTINA_CURRENT_PROJECT_PATH);
    }
  },
  saveRecentProject: async (projectPath: string) => {
    if (typeof window === 'undefined') return;
    const projectName = projectPath.split(/[\\/]/).pop() || projectPath;
    const newProject: RecentProject = {
      name: projectName,
      path: projectPath,
      lastOpened: new Date()
    };
    const currentProjects = get().recentProjects;
    const updated = [newProject, ...currentProjects.filter(p => p.path !== projectPath)].slice(0, 10);
    set({
      recentProjects: updated,
      currentProjectPath: projectPath
    });
    await persistRecentProjects(updated, projectPath);
  },
  removeRecentProjects: async (paths: string[]) => {
    if (typeof window === 'undefined' || paths.length === 0) return;
    const pathSet = new Set(paths);
    const {
      recentProjects,
      currentProjectPath
    } = get();
    const updated = recentProjects.filter(p => !pathSet.has(p.path));
    const newCurrentPath = currentProjectPath && pathSet.has(currentProjectPath) ? null : currentProjectPath;
    set({
      recentProjects: updated,
      currentProjectPath: newCurrentPath
    });
    await persistRecentProjects(updated, newCurrentPath);
    if (currentProjectPath && pathSet.has(currentProjectPath)) {
      const {
        useEditorStore
      } = await import('./EditorStore');
      useEditorStore.getState().clearEditor();
    }
  },
  clearRecentProjects: async () => {
    if (typeof window === 'undefined') return;
    const {
      currentProjectPath
    } = get();
    set({
      recentProjects: []
    });
    await persistRecentProjects([], currentProjectPath);
  }
}));