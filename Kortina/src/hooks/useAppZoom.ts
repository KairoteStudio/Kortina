import { useCallback, useMemo } from 'react';
import { useUISettingsStore } from '../stores';
export const useAppZoom = () => {
  const {
    uiZoom,
    setUiZoom,
    setFontSize
  } = useUISettingsStore();
  const BASE_FONT_SIZE = 14;
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(uiZoom + 0.1, 2);
    setUiZoom(newZoom);
    setFontSize(Math.round(BASE_FONT_SIZE * newZoom));
  }, [uiZoom, setUiZoom, setFontSize]);
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(uiZoom - 0.1, 0.5);
    setUiZoom(newZoom);
    setFontSize(Math.round(BASE_FONT_SIZE * newZoom));
  }, [uiZoom, setUiZoom, setFontSize]);
  const handleResetZoom = useCallback(() => {
    setUiZoom(1);
    setFontSize(BASE_FONT_SIZE);
  }, [setUiZoom, setFontSize]);
  const appStyle = useMemo(() => ({}), []);
  return {
    uiZoom,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    appStyle
  };
};