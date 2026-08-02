import React from 'react';
import { X } from 'lucide-react';
interface Tab {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}
interface AppTabsProps {
  tabs: Tab[];
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}
export const AppTabs: React.FC<AppTabsProps> = ({
  tabs,
  activeTab,
  onTabClick,
  onTabClose
}) => {
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTabClose(tabId);
  };
  if (tabs.length === 0) {
    return <div className="editor-tabs">
        <div className="tab active">
          <div className="tab-content">
            <span>欢迎</span>
          </div>
        </div>
      </div>;
  }
  return <div className="editor-tabs">
      {tabs.map(tab => <div key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabClick(tab.id)}>
          <div className="tab-content">
            <span className={tab.isDirty ? 'dirty' : ''}>{tab.name}</span>
          </div>
          <button className="close-tab" onClick={e => closeTab(tab.id, e)}>
            <X size={12} />
          </button>
        </div>)}
    </div>;
};