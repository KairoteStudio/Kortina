import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MoreHorizontal, Play, Save, FolderOpen, Moon, Sun, Settings } from 'lucide-react';
import './DropdownMenu.css';
interface DropdownMenuProps {
  onCompile: () => void;
  onSave: () => void;
  onOpenFolder: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  isCompiling: boolean;
  isTauri: boolean;
  theme: 'light' | 'dark' | 'kortina';
  hasActiveTab: boolean;
}
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  onCompile,
  onSave,
  onOpenFolder,
  onToggleTheme,
  onOpenSettings,
  isCompiling,
  isTauri,
  theme,
  hasActiveTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  }, [isClosing]);
  const toggleMenu = useCallback(() => {
    if (isClosing) return;
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  }, [isOpen, isClosing, handleClose]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen && !isClosing) {
          handleClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isClosing, handleClose]);
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);
  return <div className="dropdown-container" ref={dropdownRef}>
      <button className={`menu-button ${isOpen ? 'active' : ''}`} onClick={toggleMenu} title="更多选项">
        <MoreHorizontal size={16} />
      </button>

      {(isOpen || isClosing) && <div className={`dropdown-menu ${isClosing ? 'closing' : ''}`}>
          <button className="dropdown-item" onClick={() => {
        onCompile();
        handleClose();
      }} disabled={isCompiling || !isTauri} title={isTauri ? "编译" : "编译功能仅在桌面应用中可用"}>
            <Play size={14} />
            <span>编译运行</span>
          </button>

          <button className="dropdown-item" onClick={() => {
        onSave();
        handleClose();
      }} disabled={!hasActiveTab}>
            <Save size={14} />
            <span>保存文件</span>
          </button>

          <button className="dropdown-item" onClick={() => {
        onOpenFolder();
        handleClose();
      }}>
            <FolderOpen size={14} />
            <span>打开项目</span>
          </button>

          <button className="dropdown-item" onClick={() => {
        onToggleTheme();
        handleClose();
      }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item" onClick={() => {
        onOpenSettings();
        handleClose();
      }}>
            <Settings size={14} />
            <span>设置</span>
          </button>
        </div>}
    </div>;
};