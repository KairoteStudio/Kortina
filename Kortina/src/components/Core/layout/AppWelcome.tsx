import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, Plus, Settings, Code, Folder, BookOpen, Github, HelpCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import type { RecentProject } from '../../../types/project';
interface AppWelcomeProps {
  currentProjectPath: string | null;
  recentProjects: RecentProject[];
  onOpenFolder: () => void;
  onNewFile: () => void;
  onOpenSettings: (category?: string) => void;
  onOpenRecentProject: (path: string) => void;
  openExternalUrl: (url: string) => void;
  onRemoveProjects?: (paths: string[]) => void | Promise<void>;
}
export const AppWelcome: React.FC<AppWelcomeProps> = ({
  currentProjectPath,
  recentProjects,
  onOpenFolder,
  onNewFile,
  onOpenSettings,
  onOpenRecentProject,
  openExternalUrl,
  onRemoveProjects
}) => {
  const [isManaging, setIsManaging] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const sortedProjects = useMemo(() => {
    return [...recentProjects].sort((a, b) => {
      if (a.path === currentProjectPath) return -1;
      if (b.path === currentProjectPath) return 1;
      const ta = a.lastOpened instanceof Date ? a.lastOpened.getTime() : new Date(a.lastOpened).getTime();
      const tb = b.lastOpened instanceof Date ? b.lastOpened.getTime() : new Date(b.lastOpened).getTime();
      return tb - ta;
    }).slice(0, isManaging ? 10 : 5);
  }, [recentProjects, currentProjectPath, isManaging]);
  useEffect(() => {
    setSelectedPaths(prev => {
      if (prev.size === 0) return prev;
      const valid = new Set(recentProjects.map(p => p.path));
      const next = new Set([...prev].filter(path => valid.has(path)));
      return next.size === prev.size ? prev : next;
    });
  }, [recentProjects]);
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
      if (prev.size === sortedProjects.length) {
        return new Set();
      }
      return new Set(sortedProjects.map(p => p.path));
    });
  }, [sortedProjects]);
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
  const allSelected = sortedProjects.length > 0 && selectedPaths.size === sortedProjects.length;
  return <div className="empty-editor">
      <div className="empty-state">
        <div className="empty-icon">
          <Code size={64} />
        </div>
        <h3>欢迎使用 Kortina</h3>
        <p className="empty-description">现代化的 Kairote 集成开发环境</p>
        <div className="quick-actions">
          <button className="quick-action-button" onClick={onOpenFolder}>
            <FolderOpen size={20} />
            <span>打开文件夹</span>
          </button>
          <button className="quick-action-button" onClick={onNewFile}>
            <Plus size={20} />
            <span>新建文件</span>
          </button>
          <button className="quick-action-button" onClick={() => onOpenSettings('general')}>
            <Settings size={20} />
            <span>IDE设置</span>
          </button>
        </div>
        <div className="recent-projects">
          <div className="recent-projects-header">
            <h4>最近项目</h4>
            {recentProjects.length > 0 && onRemoveProjects && <button className={`recent-manage-button ${isManaging ? 'active' : ''}`} onClick={() => {
            setIsManaging(prev => !prev);
            setSelectedPaths(new Set());
          }}>
                {isManaging ? '完成' : '管理'}
              </button>}
          </div>

          {isManaging && sortedProjects.length > 0 && <div className="recent-batch-bar">
              <button className="recent-batch-button" onClick={toggleSelectAll}>
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{allSelected ? '取消全选' : '全选'}</span>
              </button>
              <button className="recent-batch-button danger" onClick={handleRemoveSelected} disabled={selectedPaths.size === 0}>
                <Trash2 size={14} />
                <span>删除{selectedPaths.size > 0 ? ` (${selectedPaths.size})` : ''}</span>
              </button>
            </div>}

          {sortedProjects.length > 0 ? <div className="recent-projects-list">
              {sortedProjects.map(project => {
            const isCurrentProject = project.path === currentProjectPath;
            const isSelected = selectedPaths.has(project.path);
            return <div key={project.path} className={`recent-project-item ${isCurrentProject ? 'current-project' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => {
              if (isManaging) {
                toggleProjectSelection(project.path);
                return;
              }
              if (!isCurrentProject) {
                onOpenRecentProject(project.path);
              }
            }}>
                    {isManaging ? <span className={`recent-project-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span> : <Folder size={16} />}
                    <span>{project.name}</span>
                    <span className="recent-project-path">{project.path}</span>
                    {!isManaging && isCurrentProject && <span className="current-project-indicator">当前打开</span>}
                    {!isManaging && onRemoveProjects && <button className="recent-project-remove" onClick={e => handleRemoveOne(project.path, e)} title="从最近项目中移除">
                        <Trash2 size={14} />
                      </button>}
                  </div>;
          })}
            </div> : <p className="no-recent-projects">暂无最近项目</p>}
        </div>
        <div className="help-links">
          <h4>快速开始</h4>
          <div className="help-links-list">
            <button className="help-link" onClick={() => openExternalUrl('https://docs.kortina.com')}>
              <BookOpen size={16} />
              <span>Kairote 文档</span>
            </button>
            <button className="help-link" onClick={() => openExternalUrl('https://github.com/kortina')}>
              <Github size={16} />
              <span>GitHub</span>
            </button>
            <a href="#" className="help-link" onClick={e => {
            e.preventDefault();
            onOpenSettings('shortcuts');
          }}>
              <HelpCircle size={16} />
              <span>键盘快捷键</span>
            </a>
          </div>
        </div>
      </div>
    </div>;
};