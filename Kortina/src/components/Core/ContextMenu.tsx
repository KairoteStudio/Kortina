import React, { useRef, useEffect, useCallback } from 'react';

interface ContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  fileType: string;
  hasClipboardContent: boolean;
  clipboardName?: string;
  menuId?: string;
  onClose: () => void;
  onNewFile: (e: React.MouseEvent) => void;
  onNewFolder: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent) => void;
  onCut: (e: React.MouseEvent) => void;
  onPaste: (e: React.MouseEvent) => void;
  onRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onRefresh: (e: React.MouseEvent) => void;
  onUndo?: (e: React.MouseEvent) => void;
  onRedo?: (e: React.MouseEvent) => void;
  onSelectAll?: (e: React.MouseEvent) => void;
  onFind?: (e: React.MouseEvent) => void;
  onReplace?: (e: React.MouseEvent) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isVisible,
  x,
  y,
  fileType,
  hasClipboardContent,
  clipboardName,
  menuId = 'default',
  onClose,
  onNewFile,
  onNewFolder,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onDelete,
  onRefresh,
  onUndo,
  onRedo,
  onSelectAll,
  onFind,
  onReplace
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState({ x: 0, y: 0 });

  const calculateMenuPosition = useCallback((originalX: number, originalY: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedMenuWidth = 200;
    const estimatedMenuHeight = fileType === 'editor' ? 250 : 200;
    let adjustedX = originalX;
    let adjustedY = originalY;

    if (originalX + estimatedMenuWidth > viewportWidth) {
      adjustedX = Math.max(10, originalX - estimatedMenuWidth);
    }
    if (originalY + estimatedMenuHeight > viewportHeight) {
      adjustedY = Math.max(10, originalY - estimatedMenuHeight);
    }

    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      if (menuRect.width > 0 && menuRect.height > 0) {
        let finalX = originalX;
        let finalY = originalY;

        if (originalX + menuRect.width > viewportWidth) {
          finalX = Math.max(10, originalX - menuRect.width);
        }

        if (originalY + menuRect.height > viewportHeight) {
          const desiredGap = 1;
          finalY = originalY - menuRect.height - desiredGap;
          if (finalY < 10) {
            finalY = 10;
          }
        }

        finalX = Math.max(10, finalX);
        finalY = Math.max(10, finalY);

        return { x: finalX, y: finalY };
      }
    }

    return { x: adjustedX, y: adjustedY };
  }, [fileType]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleMenuItemClick = (e: React.MouseEvent, action: (e: React.MouseEvent) => void) => {
    e.preventDefault();
    e.stopPropagation();
    action(e);
    handleClose();
  };

  useEffect(() => {
    if (isVisible) {
      const adjusted = calculateMenuPosition(x, y);
      setAdjustedPosition(adjusted);
    }
  }, [isVisible, x, y, calculateMenuPosition]);

  useEffect(() => {
    if (isVisible && menuRef.current) {
      const timer = setTimeout(() => {
        const adjusted = calculateMenuPosition(x, y);
        setAdjustedPosition(adjusted);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isVisible, x, y, calculateMenuPosition]);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      const dropdownTriggers = document.querySelectorAll('.dropdown-trigger, .menu-button, .menu-toolbar-item');
      for (const trigger of dropdownTriggers) {
        if (trigger.contains(target)) {
          const triggerMenuId = trigger.getAttribute('data-menu-id');
          if (!triggerMenuId || triggerMenuId !== menuId) {
            handleClose();
            return;
          }
        }
      }

      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, handleClose, menuId]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 20000
      }}
    >
      {fileType === 'editor' && (
        <>
          <div className="context-menu-item" onClick={e => onUndo && handleMenuItemClick(e, onUndo)}>
            撤销
          </div>
          <div className="context-menu-item" onClick={e => onRedo && handleMenuItemClick(e, onRedo)}>
            重做
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onCut)}>
            剪切
          </div>
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onCopy)}>
            复制
          </div>
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onPaste)}>
            粘贴
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={e => onSelectAll && handleMenuItemClick(e, onSelectAll)}>
            全选
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={e => onFind && handleMenuItemClick(e, onFind)}>
            查找
          </div>
          <div className="context-menu-item" onClick={e => onReplace && handleMenuItemClick(e, onReplace)}>
            替换
          </div>
        </>
      )}

      {fileType !== 'editor' && (
        <>
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onNewFile)}>
            新建文件
          </div>
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onNewFolder)}>
            新建文件夹
          </div>

          {fileType !== 'blank' && (
            <>
              <div className="context-menu-separator" />
              <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onCopy)}>
                复制
              </div>
              <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onCut)}>
                剪切
              </div>
            </>
          )}

          {hasClipboardContent && (
            <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onPaste)}>
              粘贴 "{clipboardName}"
            </div>
          )}

          {fileType !== 'blank' && (
            <>
              <div className="context-menu-separator" />
              <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onRename)}>
                重命名
              </div>
              <div className="context-menu-item context-menu-item-danger" onClick={e => handleMenuItemClick(e, onDelete)}>
                删除
              </div>
            </>
          )}

          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={e => handleMenuItemClick(e, onRefresh)}>
            刷新
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
