import { afterEach, describe, expect, it, vi } from 'vitest';
const STORAGE_KEY_TABS_VERTICAL = 'kortina_terminal_tabs_vertical';
const STORAGE_KEY_TABS_WIDTH = 'kortina_terminal_tabs_width';
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async () => vi.fn())
}));
const cleanupTerminalStore = () => {
  const cleanup = (window as unknown as Record<string, unknown>).__terminalStoreUnsubscribe;
  if (typeof cleanup === 'function') {
    cleanup();
  }
  delete (window as unknown as Record<string, unknown>).__terminalStoreUnsubscribe;
};
describe('TerminalStore tab layout persistence', () => {
  afterEach(() => {
    cleanupTerminalStore();
    window.localStorage.clear();
    vi.resetModules();
  });
  it('restores the vertical layout and persists layout changes', async () => {
    window.localStorage.setItem(STORAGE_KEY_TABS_VERTICAL, 'true');
    const {
      useTerminalStore
    } = await import('./TerminalStore');
    expect(useTerminalStore.getState().isTabsVertical).toBe(true);
    useTerminalStore.getState().toggleTabsVertical();
    expect(useTerminalStore.getState().isTabsVertical).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY_TABS_VERTICAL)).toBe('false');
    useTerminalStore.getState().setTabsVertical(true);
    expect(useTerminalStore.getState().isTabsVertical).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY_TABS_VERTICAL)).toBe('true');
    useTerminalStore.getState().setVerticalTabsWidth(236);
    expect(useTerminalStore.getState().verticalTabsWidth).toBe(236);
    expect(window.localStorage.getItem(STORAGE_KEY_TABS_WIDTH)).toBe('236');
    useTerminalStore.getState().setVerticalTabsWidth(120);
    expect(useTerminalStore.getState().verticalTabsWidth).toBe(168);
    expect(window.localStorage.getItem(STORAGE_KEY_TABS_WIDTH)).toBe('168');
  });
});