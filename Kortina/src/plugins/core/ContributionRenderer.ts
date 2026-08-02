import type { Disposable, GrammarContribution, MenuContribution, PanelContribution, PluginContribution, ThemeContribution } from '../index';
export class ContributionRenderer {
  private menuContributions: MenuContribution[] = [];
  private panelContributions: PanelContribution[] = [];
  private themeContributions: ThemeContribution[] = [];
  private grammarContributions: GrammarContribution[] = [];
  private grammarHandlers = new Map<string, (grammar: GrammarContribution) => void>();
  addContributions(contributions: PluginContribution): void {
    if (contributions.menus) {
      this.menuContributions.push(...contributions.menus);
    }
    if (contributions.panels) {
      this.panelContributions.push(...contributions.panels);
    }
    if (contributions.themes) {
      this.themeContributions.push(...contributions.themes);
    }
    if (contributions.grammars) {
      this.grammarContributions.push(...contributions.grammars);
      contributions.grammars.forEach(grammar => {
        this.grammarHandlers.forEach(handler => handler(grammar));
      });
    }
  }
  removeContributions(contributions: PluginContribution): void {
    if (contributions.menus) {
      this.menuContributions = this.menuContributions.filter(m => !contributions.menus!.some(cm => cm.id === m.id));
    }
    if (contributions.panels) {
      this.panelContributions = this.panelContributions.filter(p => !contributions.panels!.some(cp => cp.id === p.id));
    }
    if (contributions.themes) {
      this.themeContributions = this.themeContributions.filter(t => !contributions.themes!.some(ct => ct.id === t.id));
    }
    if (contributions.grammars) {
      this.grammarContributions = this.grammarContributions.filter(g => !contributions.grammars!.some(cg => cg.language === g.language));
    }
  }
  getMenuContributions(): MenuContribution[] {
    return [...this.menuContributions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  getPanelContributions(): PanelContribution[] {
    return [...this.panelContributions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  getThemeContributions(): ThemeContribution[] {
    return this.themeContributions;
  }
  getGrammarContributions(): GrammarContribution[] {
    return this.grammarContributions;
  }
  onGrammarRegistered(handler: (grammar: GrammarContribution) => void): Disposable {
    const id = `grammar-handler-${Date.now()}`;
    this.grammarHandlers.set(id, handler);
    return {
      dispose: () => this.grammarHandlers.delete(id)
    };
  }
  applyTheme(themeId: string): boolean {
    const theme = this.themeContributions.find(t => t.id === themeId);
    if (!theme) return false;
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    return true;
  }
}