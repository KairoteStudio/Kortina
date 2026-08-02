import { useEffect, useRef } from 'react';
import { shortcutService, type ShortcutHandler } from '../services/ShortcutService';
export function useAppShortcuts(shortcuts: Record<string, string>, handlers: Record<string, ShortcutHandler | undefined>): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    shortcutService.setBindings(shortcuts);
  }, [shortcuts]);
  const commandIdsKey = Object.keys(handlers).sort().join('\0');
  useEffect(() => {
    const commandIds = commandIdsKey ? commandIdsKey.split('\0') : [];
    const cleanups: Array<() => void> = [];
    for (const commandId of commandIds) {
      cleanups.push(shortcutService.register(commandId, () => {
        const handler = handlersRef.current[commandId];
        if (handler) return handler();
      }));
    }
    shortcutService.start();
    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [commandIdsKey]);
}