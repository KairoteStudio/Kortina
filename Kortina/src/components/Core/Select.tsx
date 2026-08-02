import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
}
export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  placeholder = '请选择',
  ariaLabel,
  id
}) => {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const listboxId = id ? `${id}-listbox` : `${generatedId}-listbox`;
  const selected = useMemo(() => options.find(opt => opt.value === value) ?? null, [options, value]);
  const enabledIndexes = useMemo(() => options.map((opt, i) => !opt.disabled ? i : -1).filter(i => i >= 0), [options]);
  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);
  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    const selectedIndex = options.findIndex(opt => opt.value === value && !opt.disabled);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : enabledIndexes[0] ?? -1);
  }, [disabled, options, value, enabledIndexes]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);
  useEffect(() => {
    if (!open || highlightIndex < 0) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightIndex}"]`);
    item?.scrollIntoView({
      block: 'nearest'
    });
  }, [open, highlightIndex]);
  const commit = useCallback((next: string) => {
    onChange(next);
    close();
  }, [onChange, close]);
  const moveHighlight = useCallback((direction: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    setHighlightIndex(prev => {
      const currentPos = enabledIndexes.indexOf(prev);
      if (currentPos < 0) {
        return direction === 1 ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
      }
      const nextPos = (currentPos + direction + enabledIndexes.length) % enabledIndexes.length;
      return enabledIndexes[nextPos];
    });
  }, [enabledIndexes]);
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openMenu();else moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openMenu();else moveHighlight(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) {
          openMenu();
        } else if (highlightIndex >= 0) {
          const opt = options[highlightIndex];
          if (opt && !opt.disabled) commit(opt.value);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        if (open) close();
        break;
      default:
        break;
    }
  }, [disabled, open, openMenu, moveHighlight, highlightIndex, options, commit, close]);
  return <div ref={rootRef} className={`k-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      <button id={id} type="button" className="k-select-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} aria-label={ariaLabel} onClick={() => open ? close() : openMenu()} onKeyDown={handleKeyDown}>
        <span className={`k-select-value ${selected ? '' : 'is-placeholder'}`.trim()}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={14} className="k-select-chevron" aria-hidden />
      </button>

      {open && <ul ref={listRef} id={listboxId} className="k-select-menu" role="listbox" aria-activedescendant={highlightIndex >= 0 ? `${listboxId}-opt-${highlightIndex}` : undefined}>
          {options.map((opt, index) => {
        const isSelected = opt.value === value;
        const isHighlighted = index === highlightIndex;
        return <li key={opt.value} id={`${listboxId}-opt-${index}`} data-index={index} role="option" aria-selected={isSelected} aria-disabled={opt.disabled || undefined} className={['k-select-option', isSelected ? 'is-selected' : '', isHighlighted ? 'is-highlighted' : '', opt.disabled ? 'is-disabled' : ''].filter(Boolean).join(' ')} onMouseEnter={() => {
          if (!opt.disabled) setHighlightIndex(index);
        }} onMouseDown={event => {
          event.preventDefault();
        }} onClick={() => {
          if (!opt.disabled) commit(opt.value);
        }}>
                {opt.label}
              </li>;
      })}
        </ul>}
    </div>;
};