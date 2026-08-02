import { isTauri } from '../../utils/environment';
import { showToast } from '../../utils/toastService';
import type { DialogOptions, DialogResult, WindowManager } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedWindowManager extends SandboxedAPI implements WindowManager {
  async openUrl(url: string): Promise<void> {
    this.checkPermission('window:openUrl');
    try {
      const isTauriEnv = isTauri();
      if (isTauriEnv) {
        const {
          openUrl: tauriOpenUrl
        } = await import('@tauri-apps/plugin-opener');
        await tauriOpenUrl(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('[PluginManager] Failed to open URL:', error);
      throw error;
    }
  }
  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.checkPermission('window:notification');
    const windowType = (window as any).__kortinaWindowType;
    if (windowType && windowType !== 'main') {
      console.warn(`[PluginManager] Plugin notification suppressed in "${windowType}" window:`, message);
      return;
    }
    const toastType = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
    const title = type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示';
    showToast({
      title,
      message: `[${this.pluginId}] ${message}`,
      type: toastType
    });
  }
  async showDialog(options: DialogOptions): Promise<DialogResult> {
    this.checkPermission('window:dialog');
    const windowType = (window as any).__kortinaWindowType;
    if (windowType && windowType !== 'main') {
      throw new Error(`Plugin "${this.pluginId}" cannot show dialog in "${windowType}" window. Dialogs are only allowed in the main IDE window.`);
    }
    return new Promise(resolve => {
      const buttons = options.buttons?.length ? options.buttons : ['确定'];
      let settled = false;
      const backdrop = document.createElement('div');
      backdrop.className = 'dialog-backdrop';
      backdrop.tabIndex = -1;
      const container = document.createElement('div');
      container.className = 'dialog-container';
      const header = document.createElement('div');
      header.className = 'dialog-header';
      const titleEl = document.createElement('h3');
      titleEl.textContent = options.title || this.getDialogDefaultTitle(options.type);
      header.appendChild(titleEl);
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dialog-close-btn';
      closeBtn.setAttribute('aria-label', '关闭');
      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      header.appendChild(closeBtn);
      const content = document.createElement('div');
      content.className = 'dialog-content';
      const messageRow = document.createElement('div');
      const noticeType = options.type === 'warning' || options.type === 'error' ? 'dialog-notice-warning' : 'dialog-notice-info';
      messageRow.className = `dialog-notice ${noticeType}`;
      messageRow.style.display = 'flex';
      messageRow.style.alignItems = 'flex-start';
      messageRow.style.gap = '12px';
      messageRow.style.marginBottom = '0';
      const iconEl = document.createElement('span');
      iconEl.style.flexShrink = '0';
      iconEl.style.fontSize = '18px';
      iconEl.style.lineHeight = '1.4';
      iconEl.style.color = this.getDialogIconColor(options.type);
      iconEl.textContent = this.getDialogIconSymbol(options.type);
      messageRow.appendChild(iconEl);
      const messageEl = document.createElement('span');
      messageEl.style.whiteSpace = 'pre-wrap';
      messageEl.style.wordBreak = 'break-word';
      messageEl.style.flex = '1';
      messageEl.style.color = 'var(--text-primary)';
      messageEl.style.fontSize = '14px';
      messageEl.style.lineHeight = '1.5';
      messageEl.textContent = options.message;
      messageRow.appendChild(messageEl);
      content.appendChild(messageRow);
      const footer = document.createElement('div');
      footer.className = 'dialog-footer';
      const cleanup = (button: string | null) => {
        if (settled) return;
        settled = true;
        backdrop.classList.add('closing');
        container.classList.add('closing');
        window.setTimeout(() => {
          backdrop.remove();
          resolve({
            button
          });
        }, 200);
      };
      buttons.forEach((label, index) => {
        const btn = document.createElement('button');
        const isPrimary = index === buttons.length - 1;
        btn.className = `dialog-btn ${isPrimary ? 'dialog-btn-primary' : 'dialog-btn-secondary'}`;
        btn.textContent = label;
        btn.addEventListener('click', () => cleanup(label));
        footer.appendChild(btn);
      });
      closeBtn.addEventListener('click', () => cleanup(null));
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) cleanup(null);
      });
      backdrop.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(null);
        }
      });
      container.appendChild(header);
      container.appendChild(content);
      container.appendChild(footer);
      backdrop.appendChild(container);
      document.body.appendChild(backdrop);
      backdrop.focus();
    });
  }
  private getDialogDefaultTitle(type?: string): string {
    switch (type) {
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      case 'question':
        return '确认';
      default:
        return '提示';
    }
  }
  private getDialogIconSymbol(type?: string): string {
    switch (type) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'question':
        return '?';
      default:
        return 'ℹ';
    }
  }
  private getDialogIconColor(type?: string): string {
    switch (type) {
      case 'error':
        return 'var(--error-color)';
      case 'warning':
        return 'var(--warning-color)';
      case 'question':
        return 'var(--info-color, var(--text-secondary))';
      default:
        return 'var(--info-color, var(--text-secondary))';
    }
  }
  getCurrentWindowId(): string {
    this.checkPermission('window:identity');
    return 'main-window';
  }
}