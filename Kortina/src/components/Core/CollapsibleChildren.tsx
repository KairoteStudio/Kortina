import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
export const COLLAPSIBLE_ANIM_MS = 260;
interface CollapsibleChildrenProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}
export const CollapsibleChildren: React.FC<CollapsibleChildrenProps> = ({
  open,
  children,
  className = 'collapsible-children',
  innerClassName = 'collapsible-children-inner'
}) => {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'open' | 'closed' | 'opening' | 'closing'>(open ? 'open' : 'closed');
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOpenRef = useRef(open);
  const firstPaintRef = useRef(true);
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => () => clearTimer(), []);
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (firstPaintRef.current) {
      firstPaintRef.current = false;
      if (open && outer && inner) {
        outer.style.height = 'auto';
        outer.style.opacity = '1';
        setPhase('open');
        setMounted(true);
      }
      return;
    }
    if (wasOpen === open) return;
    clearTimer();
    if (open) {
      if (!mounted) {
        setMounted(true);
        setPhase('opening');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = outerRef.current;
            const content = innerRef.current;
            if (!el || !content) return;
            const target = content.scrollHeight;
            el.style.height = '0px';
            el.style.opacity = '0';
            void el.offsetHeight;
            el.style.height = `${Math.max(target, 0)}px`;
            el.style.opacity = '1';
            setPhase('opening');
            timerRef.current = setTimeout(() => {
              if (outerRef.current) outerRef.current.style.height = 'auto';
              setPhase('open');
            }, COLLAPSIBLE_ANIM_MS);
          });
        });
        return;
      }
      if (!outer || !inner) return;
      const target = inner.scrollHeight;
      outer.style.height = '0px';
      outer.style.opacity = '0';
      void outer.offsetHeight;
      outer.style.height = `${Math.max(target, 0)}px`;
      outer.style.opacity = '1';
      setPhase('opening');
      timerRef.current = setTimeout(() => {
        if (outerRef.current) outerRef.current.style.height = 'auto';
        setPhase('open');
      }, COLLAPSIBLE_ANIM_MS);
      return;
    }
    if (!mounted) {
      setPhase('closed');
      return;
    }
    if (!outer || !inner) {
      setMounted(false);
      setPhase('closed');
      return;
    }
    const current = outer.style.height === 'auto' || outer.style.height === '' ? inner.scrollHeight : outer.getBoundingClientRect().height;
    outer.style.height = `${Math.max(current, 0)}px`;
    outer.style.opacity = '1';
    void outer.offsetHeight;
    setPhase('closing');
    outer.style.height = '0px';
    outer.style.opacity = '0';
    timerRef.current = setTimeout(() => {
      setPhase('closed');
      setMounted(false);
      if (outerRef.current) {
        outerRef.current.style.height = '';
        outerRef.current.style.opacity = '';
      }
    }, COLLAPSIBLE_ANIM_MS);
  }, [open, mounted]);
  if (!mounted) return null;
  return <div ref={outerRef} className={`${className} phase-${phase}`} style={phase === 'open' ? {
    height: 'auto',
    opacity: 1
  } : phase === 'closed' ? {
    height: 0,
    opacity: 0
  } : undefined}>
      <div ref={innerRef} className={innerClassName}>
        {children}
      </div>
    </div>;
};