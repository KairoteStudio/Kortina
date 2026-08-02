export const isExplorerFocused = (): boolean => {
  const el = document.activeElement;
  return !!(el && el instanceof Element && el.closest('.project-explorer'));
};