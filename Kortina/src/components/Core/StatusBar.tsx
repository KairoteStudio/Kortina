import React, { useEffect, useState } from 'react';
import { ChevronRight, Terminal, Settings } from 'lucide-react';
import { VcsService } from '../../services/vcs';

interface StatusBarProps {
  currentFile: string;
  currentProjectPath: string | null;
  isCompiling: boolean;
  compileMessage: string;
  onToggleSettings: () => void;
  onToggleConsole: () => void;
}

function Crumb({ label, dim }: { label: string; dim?: boolean }) {
  return <span className={dim ? 'fleet-status-crumb fleet-status-dim' : 'fleet-status-crumb'}>{label}</span>;
}

function Sep() {
  return <ChevronRight className="fleet-status-sep" strokeWidth={2} />;
}

function getPathBreadcrumbs(currentFile: string, currentProjectPath: string | null): string[] {
  
  if (!currentFile) {
    if (currentProjectPath) {
      const parts = currentProjectPath.split('/');
      return [parts[parts.length - 1] || 'project'];
    }
    return ['No folder open'];
  }

  
  if (currentProjectPath) {
    const parts = currentFile.split('/');
    if (parts.length > 0) {
      const fileName = parts[parts.length - 1];
      const projectParts = currentProjectPath.split('/');
      const projectName = projectParts[projectParts.length - 1] || 'project';

      
      if (currentFile.startsWith(currentProjectPath)) {
        const relativePath = currentFile.slice(currentProjectPath.length);
        const relativeParts = relativePath.split('/').filter(Boolean);
        if (relativeParts.length > 0) {
          return [projectName, ...relativeParts];
        }
        return [projectName];
      }

      
      return [fileName];
    }
  }

  
  const parts = currentFile.split('/');
  return [parts[parts.length - 1] || currentFile];
}

const StatusBar: React.FC<StatusBarProps> = ({
  currentFile,
  currentProjectPath,
  isCompiling,
  compileMessage,
  onToggleSettings,
  onToggleConsole
}) => {
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!currentProjectPath) {
      setCurrentBranch(null);
      return;
    }
    let cancelled = false;
    VcsService.getBranches(currentProjectPath).then(branches => {
      if (cancelled) return;
      const current = branches.find(b => b.is_current)?.name || null;
      setCurrentBranch(current);
    }).catch(() => {
      if (!cancelled) setCurrentBranch(null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentProjectPath]);

  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const breadcrumbs = getPathBreadcrumbs(currentFile, currentProjectPath);

  return (
    <div className="fleet-status-bar">
      <div className="fleet-status-left">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Sep />}
            <Crumb label={crumb} dim={index < breadcrumbs.length - 1} />
          </React.Fragment>
        ))}
        {currentBranch && (
          <>
            <Sep />
            <span className="fleet-status-branch">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 3v6a3 3 0 0 0 3 3h5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <path d="M10 9.5 12.5 12 10 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="4" cy="3" r="1.6" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <span>{currentBranch}</span>
            </span>
          </>
        )}
      </div>

      <div className="fleet-status-center">
        {isCompiling && <span className="compiling-indicator">
            <div className="spinner"></div>
            Compiling...
          </span>}
        {compileMessage && !isCompiling && <span className={`compile-message ${compileMessage.includes('错误') ? 'error' : 'success'}`}>
            {compileMessage}
          </span>}
      </div>

      <div className="fleet-status-right">
        <span className="fleet-status-item">{currentTime}</span>
        <span className="fleet-status-item">UTF-8</span>
        <span className="fleet-status-item">{currentFile ? getLanguageFromFile(currentFile) : 'Plain Text'}</span>
        <button className="fleet-status-btn" onClick={onToggleConsole} title="切换终端">
          <Terminal size={14} strokeWidth={1.5} />
        </button>
        <button className="fleet-status-btn" onClick={onToggleSettings} title="设置">
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

function getLanguageFromFile(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return 'Plain Text';

  const langMap: Record<string, string> = {
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'css': 'CSS',
    'scss': 'SCSS',
    'less': 'Less',
    'html': 'HTML',
    'json': 'JSON',
    'md': 'Markdown',
    'py': 'Python',
    'rs': 'Rust',
    'go': 'Go',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
    'h': 'C Header',
    'hpp': 'C++ Header',
    'sh': 'Shell',
    'bash': 'Bash',
    'zsh': 'Zsh',
    'ps1': 'PowerShell',
    'sql': 'SQL',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'toml': 'TOML',
    'vue': 'Vue',
    'svelte': 'Svelte',
  };

  return langMap[ext] || ext.toUpperCase();
}

export default StatusBar;
