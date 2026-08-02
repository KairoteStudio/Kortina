import React, { useEffect, useState } from 'react';
import { PanelTop } from 'lucide-react';
import { pluginManager } from './PluginManager';
import { PluginPanelContent } from './PluginContributions';
import type { PanelContribution } from './index';
import './PluginPanelHost.css';
export const PLUGIN_PANEL_VIEW_PREFIX = 'plugin:';
export function toPluginPanelViewId(panelId: string): string {
  return `${PLUGIN_PANEL_VIEW_PREFIX}${panelId}`;
}
export function parsePluginPanelViewId(viewId: string): string | null {
  if (!viewId.startsWith(PLUGIN_PANEL_VIEW_PREFIX)) return null;
  return viewId.slice(PLUGIN_PANEL_VIEW_PREFIX.length);
}
export function isPluginPanelView(viewId: string): boolean {
  return viewId.startsWith(PLUGIN_PANEL_VIEW_PREFIX);
}
export const PluginPanelHost: React.FC<{
  panelId: string;
}> = ({
  panelId
}) => {
  const [panel, setPanel] = useState<PanelContribution | null>(null);
  useEffect(() => {
    const refresh = () => {
      const found = pluginManager.getContributionRenderer().getPanelContributions().find(p => p.id === panelId) || null;
      setPanel(found);
    };
    refresh();
    const u1 = pluginManager.getEvents().on('plugin-activated', refresh);
    const u2 = pluginManager.getEvents().on('plugin-deactivated', refresh);
    const u3 = pluginManager.getEvents().on('plugin-panel-view-registered', refresh);
    const u4 = pluginManager.getEvents().on('plugin-panel-view-unregistered', refresh);
    const u5 = pluginManager.getEvents().on('plugin-contributions-changed', refresh);
    return () => {
      u1.dispose();
      u2.dispose();
      u3.dispose();
      u4.dispose();
      u5.dispose();
    };
  }, [panelId]);
  return <div className="sidebar-panel plugin-panel-host">
      <div className="panel-header">
        <span className="panel-title">
          {panel?.icon ? <span className="plugin-panel-host-icon">{panel.icon}</span> : <PanelTop size={14} />}
          {panel?.name || panelId}
        </span>
      </div>
      <div className="panel-content plugin-panel-host-body">
        <PluginPanelContent panelId={panelId} />
      </div>
    </div>;
};
export default PluginPanelHost;