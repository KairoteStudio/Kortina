import React, { useEffect, useState } from 'react';
import { Settings, FileText, Terminal, GitBranch } from 'lucide-react';
import { VcsService } from '../../services/vcs';
interface StatusBarProps {
  currentFile: string;
  currentProjectPath: string | null;
  cursorPosition: {
    line: number;
    column: number;
  };
  isCompiling: boolean;
  compileMessage: string;
  onToggleSettings: () => void;
  onToggleConsole: () => void;
}
const StatusBar: React.FC<StatusBarProps> = ({
  currentFile,
  currentProjectPath,
  cursorPosition,
  isCompiling,
  compileMessage,
  onToggleSettings,
  onToggleConsole
}) => {
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
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
  return <div className="status-bar">
      <div className="status-left">
        <span className="file-info">
          <FileText size={14} />
          {currentFile || 'No file open'}
        </span>
        <span className="cursor-position">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        {currentBranch && <span className="branch-info" title={`当前分支: ${currentBranch}`}>
            <GitBranch size={14} />
            {currentBranch}
          </span>}
        {!isCompiling && <button className="status-button" onClick={onToggleConsole} title="Toggle Console">
            <Terminal size={14} />
          </button>}
      </div>

      <div className="status-center">
        {isCompiling && <span className="compiling-indicator">
            <div className="spinner"></div>
            Compiling...
          </span>}
        {compileMessage && !isCompiling && <span className={`compile-message ${compileMessage.includes('错误') ? 'error' : 'success'}`}>
            {compileMessage}
          </span>}
      </div>

      <div className="status-right">
        <button className="status-button" onClick={onToggleConsole} title="Toggle Console">
          <Terminal size={14} />
        </button>
        <button className="status-button" onClick={onToggleSettings} title="Settings">
          <Settings size={14} />
        </button>
      </div>
    </div>;
};
export default StatusBar;