import { AppEvents } from '../events/app-events';
import { isTauri } from './environment';
export const UI_ZOOM_EVENT = AppEvents.UI_ZOOM_UPDATE;
export const UI_ZOOM_MIN = 0.5;
export const UI_ZOOM_MAX = 2;
export function clampUiZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  const normalized = zoom > 10 ? zoom / 100 : zoom;
  return Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, normalized));
}
export function getStoredUiZoom(): number {
  try {
    const v3 = localStorage.getItem('kortina_settings_v3');
    if (v3) {
      const parsed = JSON.parse(v3);
      const state = parsed?.state ?? parsed;
      if (typeof state?.uiZoom === 'number') {
        return clampUiZoom(state.uiZoom);
      }
    }
  } catch {}
  try {
    const legacy = localStorage.getItem('kortina_settings');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (typeof parsed?.uiZoom === 'number') {
        return clampUiZoom(parsed.uiZoom);
      }
    }
  } catch {}
  return 1;
}
function ensureZoomViewport(): void {
  const html = document.documentElement;
  const body = document.body;
  html.style.height = '100%';
  html.style.width = '100%';
  html.style.margin = '0';
  html.style.padding = '0';
  html.style.overflow = 'hidden';
  body.style.height = '100%';
  body.style.width = '100%';
  body.style.margin = '0';
  body.style.padding = '0';
  body.style.overflow = 'hidden';
}
export function applyUiZoom(zoom: number, target?: HTMLElement | null): void {
  ensureZoomViewport();
  const el = target ?? document.getElementById('root');
  if (!el) return;
  const z = clampUiZoom(zoom);
  el.style.transform = `scale(${z})`;
  el.style.transformOrigin = 'top left';
  el.style.width = `${100 / z}%`;
  el.style.height = `${100 / z}%`;
  el.style.overflow = 'hidden';
  el.style.boxSizing = 'border-box';
  document.documentElement.style.setProperty('--ui-zoom', String(z));
}
export async function broadcastUiZoom(zoom: number): Promise<void> {
  const z = clampUiZoom(zoom);
  try {
    if (isTauri()) {
      const {
        emit
      } = await import('@tauri-apps/api/event');
      await emit(UI_ZOOM_EVENT, z);
    }
  } catch (e) {
    console.error('broadcastUiZoom failed:', e);
  }
  window.dispatchEvent(new CustomEvent(UI_ZOOM_EVENT, {
    detail: z
  }));
}