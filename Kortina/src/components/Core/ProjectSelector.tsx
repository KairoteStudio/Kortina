import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, ChevronDown, X, Trash2, CheckSquare, Square } from 'lucide-react';
import type { RecentProject } from '../../types/project';
import './ProjectSelector.css';
interface ProjectSelectorProps {
  currentProjectPath: string | null;
  recentProjects: RecentProject[];
  onProjectSelect: (projectPath: string) => void;
  onOpenFolder: () => void;
  onRemoveProjects?: (paths: string[]) => void | Promise<void>;
}
export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  currentProjectPath,
  recentProjects,
  onProjectSelect,
  onOpenFolder,
  onRemoveProjects
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    isClosingRef.current = isClosing;
  }, [isClosing]);
  const resetManageState = useCallback(() => {
    setIsManaging(false);
    setSelectedPaths(new Set());
  }, []);
  const handleClose = useCallback(() => {
    if (isClosingRef.current || !isOpenRef.current) return;
    setIsClosing(true);
    isClosingRef.current = true;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      isOpenRef.current = false;
      isClosingRef.current = false;
      resetManageState();
      closeTimeoutRef.current = null;
    }, 200);
  }, [resetManageState]);
  const toggleSelector = useCallback(() => {
    if (isClosingRef.current) return;
    if (isOpenRef.current) {
      handleClose();
    } else {
      setIsClosing(false);
      isClosingRef.current = false;
      setIsOpen(true);
      isOpenRef.current = true;
    }
  }, [handleClose]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpenRef.current && !isClosingRef.current) {
          handleClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [handleClose]);
  useEffect(() => {
    setSelectedPaths(prev => {
      if (prev.size === 0) return prev;
      const valid = new Set(recentProjects.map(p => p.path));
      const next = new Set([...prev].filter(path => valid.has(path)));
      return next.size === prev.size ? prev : next;
    });
  }, [recentProjects]);
  const getCurrentProjectName = () => {
    if (!currentProjectPath) return '未打开项目';
    return currentProjectPath.split(/[\\/]/).pop() || currentProjectPath;
  };
  const toggleProjectSelection = useCallback((path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedPaths(prev => {
      if (prev.size === recentProjects.length) {
        return new Set();
      }
      return new Set(recentProjects.map(p => p.path));
    });
  }, [recentProjects]);
  const handleRemoveSelected = useCallback(async () => {
    if (!onRemoveProjects || selectedPaths.size === 0) return;
    const count = selectedPaths.size;
    if (!confirm(`确定从最近项目中移除选中的 ${count} 个项目吗？`)) return;
    await onRemoveProjects([...selectedPaths]);
    setSelectedPaths(new Set());
    if (recentProjects.length <= count) {
      setIsManaging(false);
    }
  }, [onRemoveProjects, selectedPaths, recentProjects.length]);
  const handleRemoveOne = useCallback(async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemoveProjects) return;
    await onRemoveProjects([path]);
  }, [onRemoveProjects]);
  const isExpanded = isOpen && !isClosing;
  const allSelected = recentProjects.length > 0 && selectedPaths.size === recentProjects.length;
  return <div className="project-selector" ref={dropdownRef}>
      <button className={`project-selector-button ${isExpanded ? 'active' : ''}`} onClick={toggleSelector} title="当前项目">
        <Folder size={14} />
        <span className="project-name">{getCurrentProjectName()}</span>
        <ChevronDown size={12} className={`dropdown-icon ${isExpanded ? 'open' : ''}`} />
      </button>

      {(isOpen || isClosing) && <div className={`project-selector-dropdown ${isClosing ? 'closing' : ''}`}>
          <div className="project-selector-header">
            <span>最近项目</span>
            <div className="project-selector-header-actions">
              {recentProjects.length > 0 && onRemoveProjects && <button className={`manage-button ${isManaging ? 'active' : ''}`} onClick={() => {
            setIsManaging(prev => !prev);
            setSelectedPaths(new Set());
          }} title={isManaging ? '完成' : '管理'}>
                  {isManaging ? '完成' : '管理'}
                </button>}
              <button className="close-button" onClick={handleClose} title="关闭">
                <X size={12} />
              </button>
            </div>
          </div>

          {isManaging && recentProjects.length > 0 && <div className="project-selector-batch-bar">
              <button className="batch-action-button" onClick={toggleSelectAll}>
                {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                <span>{allSelected ? '取消全选' : '全选'}</span>
              </button>
              <button className="batch-action-button danger" onClick={handleRemoveSelected} disabled={selectedPaths.size === 0}>
                <Trash2 size={13} />
                <span>删除{selectedPaths.size > 0 ? ` (${selectedPaths.size})` : ''}</span>
              </button>
            </div>}

          {recentProjects.length > 0 ? <div className="recent-projects-list">
              {recentProjects.map((project, index) => {
          const isSelected = selectedPaths.has(project.path);
          return <button key={`${project.path}-${index}`} className={`project-item ${project.path === currentProjectPath ? 'current' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => {
            if (isManaging) {
              toggleProjectSelection(project.path);
              return;
            }
            onProjectSelect(project.path);
            handleClose();
          }} title={project.path}>
                    {isManaging ? <span className={`project-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </span> : <Folder size={14} />}
                    <div className="project-info">
                      <span className="project-item-name">{project.name}</span>
                      <span className="project-item-path">{project.path}</span>
                    </div>
                    {!isManaging && project.path === currentProjectPath && <span className="current-indicator">当前</span>}
                    {!isManaging && onRemoveProjects && <span className="project-remove-button" onClick={e => handleRemoveOne(project.path, e)} title="从最近项目中移除" role="button" tabIndex={0} onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                void handleRemoveOne(project.path, e as unknown as React.MouseEvent);
              }
            }}>
                        <Trash2 size={12} />
                      </span>}
                  </button>;
        })}
            </div> : <div className="no-recent-projects">
              <span>暂无最近项目</span>
            </div>}

          <div className="project-selector-divider" />

          <button className="project-item open-folder-item" onClick={() => {
        onOpenFolder();
        handleClose();
      }}>
            <Folder size={14} />
            <span>打开其他文件夹...</span>
          </button>
        </div>}
    </div>;
};