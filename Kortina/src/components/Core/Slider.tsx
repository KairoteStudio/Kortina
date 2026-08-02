import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import './Slider.css';
export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
  width?: number | string;
  ariaLabel?: string;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function snapToStep(n: number, min: number, max: number, step: number) {
  if (step <= 0) return clamp(n, min, max);
  const snapped = Math.round((n - min) / step) * step + min;
  const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return clamp(Number(snapped.toFixed(precision)), min, max);
}
export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue,
  showValue,
  disabled = false,
  className = '',
  width = 140,
  ariaLabel
}) => {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const percent = useMemo(() => {
    if (max === min) return 0;
    return clamp((value - min) / (max - min) * 100, 0, 100);
  }, [value, min, max]);
  const displayValue = formatValue ? formatValue(value) : String(value);
  const shouldShowValue = showValue ?? Boolean(formatValue);
  const setFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track || disabled) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pad = 8;
    const usable = Math.max(1, rect.width - pad * 2);
    const ratio = clamp((clientX - rect.left - pad) / usable, 0, 1);
    onChange(snapToStep(min + ratio * (max - min), min, max, step));
  }, [disabled, min, max, step, onChange]);
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  }, [disabled, setFromClientX]);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    setFromClientX(e.clientX);
  }, [dragging, disabled, setFromClientX]);
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setDragging(false);
  }, [dragging]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    let next: number | null = null;
    const large = step * 10;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - step;
        break;
      case 'PageUp':
        next = value + large;
        break;
      case 'PageDown':
        next = value - large;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(snapToStep(next, min, max, step));
  }, [disabled, value, step, min, max, onChange]);
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  return <div className={['k-slider', dragging ? 'is-dragging' : '', focused ? 'is-focused' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ')} style={{
    ['--k-slider-width' as string]: widthStyle
  }}>
      <div ref={trackRef} className="k-slider-track" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        {}
        <div className="k-slider-fill" style={{
        width: `calc((100% - 16px) * ${percent / 100} + 4px)`
      }} />
        <div className="k-slider-thumb" style={{
        left: `calc(8px + (100% - 16px) * ${percent / 100})`
      }} role="slider" id={id} tabIndex={disabled ? -1 : 0} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-label={ariaLabel} aria-disabled={disabled || undefined} onKeyDown={handleKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </div>

      <input type="range" className="k-slider-native" min={min} max={max} step={step} value={value} disabled={disabled} aria-hidden="true" tabIndex={-1} onChange={e => onChange(Number(e.target.value))} />

      {shouldShowValue && <span className="k-slider-value" aria-hidden="true">
          {displayValue}
        </span>}
    </div>;
};
export default Slider;