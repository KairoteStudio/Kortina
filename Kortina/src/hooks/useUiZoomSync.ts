import { useEffect, useState } from 'react';
import { UI_ZOOM_EVENT, applyUiZoom, clampUiZoom, getStoredUiZoom } from '../utils/uiZoom';
import { AppEvents, type SettingsChangedPayload } from '../events/app-events';
import { isTauri } from '../utils/environment';
export function useUiZoomSync(enabled: boolean = true): number {
  const [uiZoom, setUiZoom] = useState(() => getStoredUiZoom());
  useEffect(() => {
    if (!enabled) return;
    const apply = (raw: number) => {
      const z = clampUiZoom(raw);
      setUiZoom(z);
      requestAnimationFrame(() => applyUiZoom(z));
    };
    apply(getStoredUiZoom());
    let unlistenTauri: (() => void) | null = null;
    let unlistenSettings: (() => void) | null = null;
    const onLocalZoom = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') apply(detail);
    };
    window.addEventListener(UI_ZOOM_EVENT, onLocalZoom);
    const onResize = () => applyUiZoom(getStoredUiZoom());
    window.addEventListener('resize', onResize);
    const setup = async () => {
      try {
        if (!isTauri()) return;
        const {
          listen
        } = await import('@tauri-apps/api/event');
        unlistenTauri = await listen<number>(UI_ZOOM_EVENT, event => {
          apply(event.payload);
        });
        unlistenSettings = await listen<SettingsChangedPayload>(AppEvents.SETTINGS_CHANGED, event => {
          const payload = event.payload;
          if (payload && typeof payload.uiZoom === 'number') {
            apply(payload.uiZoom);
          }
        });
      } catch (e) {
        console.error('useUiZoomSync: setup failed', e);
      }
    };
    setup();
    return () => {
      window.removeEventListener(UI_ZOOM_EVENT, onLocalZoom);
      window.removeEventListener('resize', onResize);
      if (unlistenTauri) unlistenTauri();
      if (unlistenSettings) unlistenSettings();
    };
  }, [enabled]);
  return uiZoom;
}