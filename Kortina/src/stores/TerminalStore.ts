import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ITerminalInstance } from '../services/TerminalInstance';
import { ITerminalGroup } from '../services/TerminalGroup';
import { terminalGroupService } from '../services/TerminalGroupService';
import { ShellType } from '../services/TerminalService';
import { setDefaultShellType as persistDefaultShellType } from '../services/terminal-profiles';
const STORAGE_KEY_HEIGHT = 'kortina_terminal_height';
const STORAGE_KEY_OPEN = 'kortina_terminal_open';
const STORAGE_KEY_STATUSBAR_VISIBLE = 'kortina_terminal_statusbar_visible';
const STORAGE_KEY_TABS_VERTICAL = 'kortina_terminal_tabs_vertical';
const STORAGE_KEY_TABS_WIDTH = 'kortina_terminal_tabs_width';
const DEFAULT_TABS_WIDTH = 168;
const MIN_TABS_WIDTH = 168;
const MAX_TABS_WIDTH = 400;
function loadHeight(): number {
  if (typeof window === 'undefined') return 250;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HEIGHT);
    if (raw) {
      const value = Number(raw);
      if (!Number.isNaN(value) && value >= 120 && value <= 800) {
        return value;
      }
    }
  } catch {}
  return 250;
}
function saveHeight(height: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_HEIGHT, String(height));
  } catch {}
}
function loadOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_OPEN);
    return raw === 'true';
  } catch {
    return false;
  }
}
function saveOpen(open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_OPEN, String(open));
  } catch {}
}
function loadStatusBarVisible(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY_STATUSBAR_VISIBLE) !== 'false';
  } catch {
    return true;
  }
}
function saveStatusBarVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_STATUSBAR_VISIBLE, String(visible));
  } catch {}
}
function loadTabsVertical(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY_TABS_VERTICAL) === 'true';
  } catch {
    return false;
  }
}
function saveTabsVertical(vertical: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_TABS_VERTICAL, String(vertical));
  } catch {}
}
function loadTabsWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_TABS_WIDTH;
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY_TABS_WIDTH));
    if (Number.isFinite(value)) {
      return Math.max(MIN_TABS_WIDTH, Math.min(MAX_TABS_WIDTH, value));
    }
  } catch {}
  return DEFAULT_TABS_WIDTH;
}
function saveTabsWidth(width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_TABS_WIDTH, String(width));
  } catch {}
}
interface TerminalState {
  isOpen: boolean;
  height: number;
  isStatusBarVisible: boolean;
  isTabsVertical: boolean;
  verticalTabsWidth: number;
  groups: ITerminalGroup[];
  activeGroupIndex: number;
  activeInstance: ITerminalInstance | undefined;
  defaultShellType: ShellType;
  isCreating: boolean;
}
interface TerminalActions {
  setIsOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setHeight: (height: number) => void;
  setStatusBarVisible: (visible: boolean) => void;
  toggleStatusBar: () => void;
  setTabsVertical: (vertical: boolean) => void;
  toggleTabsVertical: () => void;
  setVerticalTabsWidth: (width: number) => void;
  setActiveInstance: (instance: ITerminalInstance) => void;
  setActiveInstanceByIndex: (index: number) => void;
  focusPreviousInstance: () => void;
  focusNextInstance: () => void;
  createTerminal: (shellType?: ShellType) => Promise<ITerminalInstance | undefined>;
  closeInstance: (instance: ITerminalInstance) => Promise<void>;
  closeActiveInstance: () => Promise<void>;
  closeAllInstances: () => Promise<void>;
  setDefaultShellType: (type: ShellType) => void;
  refresh: () => void;
}
const service = terminalGroupService;
export const useTerminalStore = create<TerminalState & TerminalActions>()(devtools((set, get) => {
  const syncFromService = () => {
    set({
      groups: [...service.groups],
      activeGroupIndex: service.activeGroupIndex,
      activeInstance: service.activeInstance,
      defaultShellType: service.defaultShellType,
      isCreating: service.isCreating
    });
  };
  return {
    isOpen: loadOpen(),
    height: loadHeight(),
    isStatusBarVisible: loadStatusBarVisible(),
    isTabsVertical: loadTabsVertical(),
    verticalTabsWidth: loadTabsWidth(),
    groups: [...service.groups],
    activeGroupIndex: service.activeGroupIndex,
    activeInstance: service.activeInstance,
    defaultShellType: service.defaultShellType,
    isCreating: service.isCreating,
    setIsOpen: open => {
      saveOpen(open);
      set({
        isOpen: open
      });
    },
    toggleTerminal: () => {
      const next = !get().isOpen;
      saveOpen(next);
      set({
        isOpen: next
      });
    },
    setHeight: height => {
      const clamped = Math.max(120, Math.min(800, height));
      saveHeight(clamped);
      set({
        height: clamped
      });
    },
    setStatusBarVisible: visible => {
      saveStatusBarVisible(visible);
      set({
        isStatusBarVisible: visible
      });
    },
    toggleStatusBar: () => {
      const next = !get().isStatusBarVisible;
      saveStatusBarVisible(next);
      set({
        isStatusBarVisible: next
      });
    },
    setTabsVertical: vertical => {
      saveTabsVertical(vertical);
      set({
        isTabsVertical: vertical
      });
    },
    toggleTabsVertical: () => {
      const next = !get().isTabsVertical;
      saveTabsVertical(next);
      set({
        isTabsVertical: next
      });
    },
    setVerticalTabsWidth: width => {
      const clamped = Math.max(MIN_TABS_WIDTH, Math.min(MAX_TABS_WIDTH, Math.round(width)));
      saveTabsWidth(clamped);
      set({
        verticalTabsWidth: clamped
      });
    },
    setActiveInstance: instance => {
      service.setActiveInstance(instance);
    },
    setActiveInstanceByIndex: index => {
      service.setActiveInstanceByIndex(index);
    },
    focusPreviousInstance: () => {
      service.focusPreviousInstance();
    },
    focusNextInstance: () => {
      service.focusNextInstance();
    },
    createTerminal: async shellType => {
      const instance = await service.createTerminal(shellType);
      if (instance) {
        set({
          isOpen: true
        });
        saveOpen(true);
      }
      return instance;
    },
    closeInstance: async instance => {
      await service.closeInstance(instance);
      if (service.instances.length === 0) {
        set({
          isOpen: false
        });
        saveOpen(false);
      }
    },
    closeActiveInstance: async () => {
      await service.closeActiveInstance();
      if (service.instances.length === 0) {
        set({
          isOpen: false
        });
        saveOpen(false);
      }
    },
    closeAllInstances: async () => {
      await service.closeAllInstances();
      set({
        isOpen: false
      });
      saveOpen(false);
    },
    setDefaultShellType: type => {
      service.setDefaultShellType(type);
      persistDefaultShellType(type);
      set({
        defaultShellType: service.defaultShellType
      });
    },
    refresh: () => {
      syncFromService();
    }
  };
}, {
  name: 'TerminalStore'
}));
const unsubscribeInstances = terminalGroupService.onDidChangeInstances(() => {
  useTerminalStore.getState().refresh();
});
const unsubscribeGroups = terminalGroupService.onDidChangeGroups(() => {
  useTerminalStore.getState().refresh();
});
const unsubscribeActiveInstance = terminalGroupService.onDidChangeActiveInstance(() => {
  useTerminalStore.getState().refresh();
});
const unsubscribeActiveGroup = terminalGroupService.onDidChangeActiveGroup(() => {
  useTerminalStore.getState().refresh();
});
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__terminalStoreUnsubscribe = () => {
    unsubscribeInstances();
    unsubscribeGroups();
    unsubscribeActiveInstance();
    unsubscribeActiveGroup();
  };
}
export function selectActiveInstance(state: TerminalState): ITerminalInstance | undefined {
  return state.activeInstance;
}
export function selectInstances(state: TerminalState): ITerminalInstance[] {
  return state.groups.reduce((acc, group) => acc.concat(group.terminalInstances), [] as ITerminalInstance[]);
}