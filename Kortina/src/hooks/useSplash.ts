import { useCallback, useEffect, useState } from 'react';
export const SPLASH_REGIONS = ['top', 'sidebar', 'explorer', 'editor', 'status'] as const;
export type SplashRegion = (typeof SPLASH_REGIONS)[number];
export const useSplash = () => {
  const [visibleRegions, setVisibleRegions] = useState<Set<SplashRegion>>(new Set());
  const [loadedRegions, setLoadedRegions] = useState<Set<SplashRegion>>(new Set());
  const [splashRemoved, setSplashRemoved] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisibleRegions(new Set(SPLASH_REGIONS));
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  const markRegionLoaded = useCallback((region: SplashRegion) => {
    setLoadedRegions(prev => {
      if (prev.has(region)) return prev;
      const next = new Set(prev);
      next.add(region);
      return next;
    });
  }, []);
  useEffect(() => {
    if (loadedRegions.size < SPLASH_REGIONS.length) return;
    const splash = document.getElementById('kortina-splash');
    if (!splash) {
      setSplashRemoved(true);
      return;
    }
    splash.classList.add('fade-out');
    const timer = setTimeout(() => {
      splash.remove();
      setSplashRemoved(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [loadedRegions]);
  return {
    visibleRegions,
    loadedRegions,
    splashRemoved,
    markRegionLoaded
  };
};