import React, { useState, useEffect } from 'react';
import { CloneHistoryManager, CloneHistoryItem } from '../../utils/cloneHistory';
import { DialogShell, DialogActions } from './primitives';
import './Dialogs.css';
interface CloneHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistory?: (item: CloneHistoryItem) => void;
}
export const CloneHistoryDialog: React.FC<CloneHistoryDialogProps> = ({
  isOpen,
  onClose,
  onSelectHistory
}) => {
  const [history, setHistory] = useState<CloneHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const historyManager = CloneHistoryManager.getInstance();
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);
  const loadHistory = () => {
    setIsLoading(true);
    try {
      setHistory(historyManager.getHistory());
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleRemoveHistory = (id: string) => {
    if (confirm('确定要删除这条历史记录吗？')) {
      historyManager.removeHistory(id);
      loadHistory();
    }
  };
  const handleClearHistory = () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      historyManager.clearHistory();
      loadHistory();
    }
  };
  const handleSelectHistory = (item: CloneHistoryItem) => {
    onSelectHistory?.(item);
    onClose();
  };
  const footer = history.length > 0 && <DialogActions>
      <button onClick={handleClearHistory} className="dialog-btn" style={{
      marginRight: 'auto',
      color: 'var(--text-primary)',
      background: 'none',
      border: 'none',
      fontSize: '12px'
    }}>
        清空历史
      </button>
      <button onClick={onClose} className="dialog-btn dialog-btn-primary">
        关闭
      </button>
    </DialogActions>;
  return <DialogShell isOpen={isOpen} onClose={onClose} title="克隆历史记录" style={{
    maxHeight: '70vh'
  }} footer={footer || undefined}>
      {isLoading ? <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 0'
    }}>
          <div className="loading-spinner"></div>
          <span style={{
        marginLeft: '8px',
        color: 'var(--text-secondary)'
      }}>加载中...</span>
        </div> : history.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '32px 0',
      color: 'var(--text-secondary)'
    }}>
          <p style={{
        margin: 0
      }}>暂无克隆历史记录</p>
          <p style={{
        margin: '4px 0 0 0',
        fontSize: '12px'
      }}>克隆仓库后，历史记录将显示在这里</p>
        </div> : <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }}>
          <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '16px'
      }}>
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
              {history.map(item => <div key={item.id} onClick={() => handleSelectHistory(item)} style={{
            padding: '12px',
            border: 'var(--text-primary)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: 'var(--bg-secondary)'
          }} onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            e.currentTarget.style.borderColor = 'var(--text-primary)';
          }} onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}>
                  <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
                    <div style={{
                flex: 1,
                minWidth: 0
              }}>
                      <p style={{
                  margin: 0,
                  fontWeight: '500',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={item.repoUrl}>
                        {historyManager.getRepoName(item.repoUrl)}
                      </p>
                      <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={item.targetPath}>
                        {item.targetPath}
                      </p>
                    </div>
                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '8px'
              }}>
                      {item.success ? <span style={{
                  color: 'var(--success-color)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>成功</span> : <span style={{
                  color: 'var(--error-color)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>失败</span>}
                      <button onClick={e => {
                  e.stopPropagation();
                  handleRemoveHistory(item.id);
                }} style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  lineHeight: 1
                }} onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--error-color)';
                  e.currentTarget.style.backgroundColor = 'var(--error-bg)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }} title="删除记录">
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
                    <span>{historyManager.formatTimestamp(item.timestamp)}</span>
                    {item.branch && <span style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px'
              }}>
                        {item.branch}
                      </span>}
                  </div>

                  {item.message && <p style={{
              margin: '8px 0 0 0',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }} title={item.message}>
                      {item.message}
                    </p>}
                </div>)}
            </div>
          </div>
        </div>}
    </DialogShell>;
};
export default CloneHistoryDialog;