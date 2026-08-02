import React from 'react';
interface FileTooltipProps {
  content: string;
  x: number;
  y: number;
}
const FileTooltip: React.FC<FileTooltipProps> = ({
  content,
  x,
  y
}) => {
  if (!content) return null;
  return <div className="file-tooltip" style={{
    position: 'fixed',
    left: `${x + 10}px`,
    top: `${y - 30}px`,
    backgroundColor: 'var(--bg-tooltip)',
    color: 'var(--text-tooltip)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    zIndex: 10002,
    boxShadow: 'var(--shadow-sm)',
    pointerEvents: 'none',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }}>
      {content}
    </div>;
};
export default FileTooltip;