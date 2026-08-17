import React from 'react';

interface FleetSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  children?: React.ReactNode;
  projectName?: string;
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`fleet-sidebar-tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({
  currentView,
  onViewChange,
  children,
  projectName,
}) => {
  const tabs = [
    { id: 'explorer', label: 'Files' },
    { id: 'search', label: 'Search' },
    { id: 'git', label: 'Git' },
    { id: 'history', label: 'History' },
  ];

  return (
    <aside className="fleet-sidebar">
      <div className="fleet-sidebar-tabs">
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            label={tab.label}
            active={currentView === tab.id}
            onClick={() => onViewChange(tab.id)}
          />
        ))}
      </div>
      {projectName && currentView === 'explorer' && (
        <div className="fleet-sidebar-project-name">
          {projectName}
        </div>
      )}
      <div className="fleet-sidebar-content">
        {children}
      </div>
    </aside>
  );
};
