import React, { useEffect, useRef } from 'react';
import type { ITerminalInstance } from '../../../services/TerminalInstance';
import 'xterm/css/xterm.css';
import './terminal.css';
interface XtermTerminalProps {
  instance: ITerminalInstance;
  active?: boolean;
}
export const XtermTerminal: React.FC<XtermTerminalProps> = ({
  instance,
  active
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const attachedRef = useRef(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || attachedRef.current) return;
    instance.attachToElement(container);
    attachedRef.current = true;
    return () => {
      instance.detachFromElement();
      attachedRef.current = false;
    };
  }, [instance]);
  useEffect(() => {
    if (!attachedRef.current) return;
    instance.setVisible(!!active);
    if (active) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          instance.layout({
            width: rect.width,
            height: rect.height
          });
        }
      }
    }
  }, [active, instance]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let resetTimer: number | undefined;
    const demoteHelperTextarea = () => {
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        resetTimer = undefined;
        const textarea = container.querySelector<HTMLTextAreaElement>('.xterm-helper-textarea');
        if (textarea) textarea.style.zIndex = '-5';
      }, 0);
    };
    container.addEventListener('contextmenu', demoteHelperTextarea);
    container.addEventListener('auxclick', demoteHelperTextarea);
    return () => {
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
      container.removeEventListener('contextmenu', demoteHelperTextarea);
      container.removeEventListener('auxclick', demoteHelperTextarea);
    };
  }, []);
  return <div ref={containerRef} className="xterm-terminal-host" />;
};