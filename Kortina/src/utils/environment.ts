declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauri = (): boolean => typeof window !== 'undefined' && (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);

export const isMobile = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
  const isSmallScreen = window.innerWidth < 768 || window.innerHeight < 768;
  return isMobileUA || (isSmallScreen && 'ontouchstart' in window);
};

export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const isDesktopTauri = (): boolean => isTauri() && !isMobile();
