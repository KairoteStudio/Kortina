import { useEffect, useRef } from 'react';
import { isAndroid } from '../utils/environment';

export function useAndroidBackButton(
  onBack: () => boolean | void,
  enabled: boolean = true
): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled || !isAndroid()) return;

    const handleBackButton = (e: Event) => {
      const result = onBackRef.current();
      if (result !== false) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    
    document.addEventListener('backbutton', handleBackButton, true);

    
    const handlePopState = () => {
      const result = onBackRef.current();
      if (result !== false) {
        history.pushState(null, '', location.href);
      }
    };

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('backbutton', handleBackButton, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);
}

export function useDisableContextMenu(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || !isAndroid()) return;

    const handler = (e: Event) => {
      
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isEditor = target.closest('.monaco-editor') !== null;
      const isTextSelectable = target.closest('[data-selectable]') !== null;

      if (!isInput && !isEditor && !isTextSelectable) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handler, true);
    return () => document.removeEventListener('contextmenu', handler, true);
  }, [enabled]);
}
