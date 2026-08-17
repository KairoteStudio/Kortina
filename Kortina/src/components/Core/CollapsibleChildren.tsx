import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
export const COLLAPSIBLE_ANIM_MS = 260;
interface CollapsibleChildrenProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  
  animateOnMount?: boolean;
}
export const CollapsibleChildren: React.FC<CollapsibleChildrenProps> = ({
  open,
  children,
  className = 'collapsible-children',
  innerClassName = 'collapsible-children-inner',
  animateOnMount = false
}) => {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'open' | 'closed' | 'opening' | 'closing'>(open ? 'open' : 'closed');
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevOpenRef = useRef(open);
  const firstPaintRef = useRef(true);

  
  const clearAnimations = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  
  useEffect(() => () => clearAnimations(), []);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    
    if (firstPaintRef.current) {
      firstPaintRef.current = false;
      if (open && outer && inner) {
        if (animateOnMount) {
          
          const target = inner.scrollHeight;
          outer.style.height = '0px';
          outer.style.opacity = '0';
          
          void outer.offsetHeight;
          
          outer.style.height = `${Math.max(target, 0)}px`;
          outer.style.opacity = '1';
          setPhase('opening');

          timerRef.current = setTimeout(() => {
            if (outerRef.current) {
              outerRef.current.style.height = 'auto';
            }
            setPhase('open');
            timerRef.current = null;
          }, COLLAPSIBLE_ANIM_MS);
        } else {
          
          outer.style.height = 'auto';
          outer.style.opacity = '1';
          setPhase('open');
        }
        setMounted(true);
      }
      return;
    }

    
    if (wasOpen === open) return;

    
    clearAnimations();

    if (open) {
      
      if (!mounted) {
        
        setMounted(true);
        setPhase('opening');

        
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(() => {
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
              if (outerRef.current) {
                outerRef.current.style.height = 'auto';
              }
              setPhase('open');
              timerRef.current = null;
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
        if (outerRef.current) {
          outerRef.current.style.height = 'auto';
        }
        setPhase('open');
        timerRef.current = null;
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

    
    const current = outer.style.height === 'auto' || outer.style.height === ''
      ? inner.scrollHeight
      : outer.getBoundingClientRect().height;

    
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
      timerRef.current = null;
    }, COLLAPSIBLE_ANIM_MS);
  }, [open, mounted, animateOnMount]);

  if (!mounted) return null;

  return (
    <div
      ref={outerRef}
      className={`${className} phase-${phase}`}
      style={
        phase === 'open'
          ? { height: 'auto', opacity: 1 }
          : phase === 'closed'
            ? { height: 0, opacity: 0 }
            : undefined
      }
    >
      <div ref={innerRef} className={innerClassName}>
        {children}
      </div>
    </div>
  );
};
