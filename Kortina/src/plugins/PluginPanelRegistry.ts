import type { ComponentType } from 'react';
import type { PanelContribution, PluginContext } from './index';
export interface PluginPanelProps {
  panelId: string;
  panel: PanelContribution;
  pluginId?: string;
  context?: PluginContext;
}
export type PluginPanelComponent = ComponentType<PluginPanelProps>;
interface RegisteredPanelView {
  component: PluginPanelComponent;
  pluginId?: string;
  id: string;
}
class PluginPanelRegistryImpl {
  private views = new Map<string, RegisteredPanelView>();
  register(id: string, component: PluginPanelComponent, pluginId?: string): void {
    if (!id) {
      console.warn('[PluginPanelRegistry] register ignored: empty id');
      return;
    }
    this.views.set(id, {
      id,
      component,
      pluginId
    });
    console.log(`[PluginPanelRegistry] Registered panel view: ${id}`);
  }
  unregister(id: string): void {
    if (this.views.delete(id)) {
      console.log(`[PluginPanelRegistry] Unregistered panel view: ${id}`);
    }
  }
  unregisterByPlugin(pluginId: string): void {
    for (const [id, view] of this.views) {
      if (view.pluginId === pluginId) {
        this.views.delete(id);
      }
    }
  }
  get(id: string): RegisteredPanelView | undefined {
    return this.views.get(id);
  }
  has(id: string): boolean {
    return this.views.has(id);
  }
  list(): RegisteredPanelView[] {
    return Array.from(this.views.values());
  }
  clear(): void {
    this.views.clear();
  }
}
export const pluginPanelRegistry = new PluginPanelRegistryImpl();