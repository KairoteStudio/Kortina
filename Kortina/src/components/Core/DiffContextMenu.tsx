import React, { useState, useRef, useEffect } from 'react';

export interface DiffContextMenuItem {
  label: string;
  action?: () => void;
  submenu?: DiffContextMenuItem[];
}

interface DiffContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  isFleetUI?: boolean;
}

const MENU_ITEMS: DiffContextMenuItem[] = [
  { label: '快速修复' },
  {
    label: 'AI操作',
    submenu: [
      { label: '解释代码' },
      { label: '生成测试' },
      { label: '查找问题' },
      { label: '优化建议' },
    ]
  },
  {
    label: '重构',
    submenu: [
      { label: '提取方法' },
      { label: '提取变量' },
      { label: '内联变量' },
      { label: '移动成员' },
    ]
  },
  {
    label: '转到',
    submenu: [
      { label: '转到定义' },
      { label: '转到实现' },
      { label: '转到引用' },
    ]
  },
  { label: '格式化代码' },
  {
    label: 'git操作',
    submenu: [
      { label: '撤销此修改' },
      { label: '暂存此文件' },
      { label: '查看历史' },
    ]
  },
  { label: '剪切' },
  { label: '复制' },
  { label: '粘贴' },
  {
    label: '插件',
    submenu: [
      { label: '已安装插件' },
      { label: '浏览插件市场' },
    ]
  },
];

const SubMenu: React.FC<{
  items: DiffContextMenuItem[];
  parentRect: DOMRect;
  onClose: () => void;
  isFleetUI: boolean;
}> = ({ items, parentRect, onClose, isFleetUI }) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (submenuRef.current) {
      const rect = submenuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = 0;
      let left = parentRect.width;
      
      if (parentRect.top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - parentRect.top - 8;
      }
      
      if (parentRect.left + parentRect.width + rect.width > viewportWidth) {
        left = -rect.width;
      }
      
      setPosition({ top, left });
    }
  }, [parentRect]);

  return (
    <div
      ref={submenuRef}
      className={isFleetUI ? 'diff-context-submenu' : 'diff-context-submenu-classic'}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={isFleetUI ? 'diff-context-menu-item' : 'diff-context-menu-item-classic'}
          onClick={() => {
            item.action?.();
            onClose();
          }}
        >
          <span className="diff-context-menu-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const DiffContextMenu: React.FC<DiffContextMenuProps> = ({
  isVisible,
  x,
  y,
  onClose,
  isFleetUI = true,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  useEffect(() => {
    if (isVisible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let finalX = x;
      let finalY = y;
      
      if (x + rect.width > viewportWidth) {
        finalX = Math.max(10, x - rect.width);
      }
      
      if (y + rect.height > viewportHeight) {
        finalY = Math.max(10, viewportHeight - rect.height - 10);
      }
      
      setAdjustedPosition({ x: Math.max(10, finalX), y: Math.max(10, finalY) });
    }
  }, [isVisible, x, y]);

  useEffect(() => {
    if (!isVisible) {
      setOpenSubmenu(null);
      return;
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className={isFleetUI ? 'diff-context-menu' : 'diff-context-menu-classic'}
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 20000,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {MENU_ITEMS.map((item, index) => (
        <div
          key={index}
          className={isFleetUI ? 'diff-context-menu-item' : 'diff-context-menu-item-classic'}
          onMouseEnter={() => item.submenu && setOpenSubmenu(index)}
          onMouseLeave={() => setOpenSubmenu(null)}
          onClick={() => {
            if (!item.submenu) {
              item.action?.();
              onClose();
            }
          }}
        >
          <span className="diff-context-menu-label">{item.label}</span>
          {item.submenu && (
            <>
              <span className="diff-context-menu-arrow">{'>'}</span>
              {openSubmenu === index && (
                <SubMenu
                  items={item.submenu}
                  parentRect={menuRef.current?.getBoundingClientRect() || new DOMRect()}
                  onClose={onClose}
                  isFleetUI={isFleetUI}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default DiffContextMenu;
