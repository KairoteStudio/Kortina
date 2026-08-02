import type { ToastItem } from '../components/Core/Toast';
import '../components/Core/Toast.css';
export type ToastType = ToastItem['type'];
interface ShowToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}
const DEFAULT_DURATION = 5000;
function ensureContainer(): HTMLElement {
  let container = document.querySelector<HTMLElement>('.toast-container[data-toast-service="true"]');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.dataset.toastService = 'true';
    document.body.appendChild(container);
  }
  return container;
}
function iconSvg(type: ToastType): string {
  if (type === 'success') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;
}
function createToastElement(id: string, options: Required<Pick<ShowToastOptions, 'title' | 'type'>> & {
  message?: string;
}): HTMLElement {
  const el = document.createElement('div');
  el.className = `toast toast-${options.type}`;
  el.dataset.toastId = id;
  el.title = options.message || options.title;
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.innerHTML = iconSvg(options.type);
  const content = document.createElement('div');
  content.className = 'toast-content';
  const title = document.createElement('div');
  title.className = 'toast-title';
  title.textContent = options.title;
  content.appendChild(title);
  if (options.message) {
    const message = document.createElement('div');
    message.className = 'toast-message';
    message.textContent = options.message;
    content.appendChild(message);
  }
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', '关闭');
  close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  el.appendChild(icon);
  el.appendChild(content);
  el.appendChild(close);
  return el;
}
function removeToastElement(el: HTMLElement): void {
  el.style.opacity = '0';
  el.style.transform = 'translateX(20px)';
  el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  window.setTimeout(() => {
    el.remove();
    const container = document.querySelector<HTMLElement>('.toast-container[data-toast-service="true"]');
    if (container && container.childElementCount === 0) {
      container.remove();
    }
  }, 200);
}
export function showToast(options: ShowToastOptions): string {
  const type = options.type || 'info';
  const duration = options.duration ?? DEFAULT_DURATION;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const container = ensureContainer();
  const el = createToastElement(id, {
    title: options.title,
    message: options.message,
    type
  });
  const closeBtn = el.querySelector('.toast-close');
  closeBtn?.addEventListener('click', () => removeToastElement(el));
  container.appendChild(el);
  window.setTimeout(() => {
    if (el.isConnected) removeToastElement(el);
  }, duration);
  return id;
}
export function showSuccessToast(title: string, message?: string, duration?: number): string {
  return showToast({
    title,
    message,
    type: 'success',
    duration
  });
}
export function showErrorToast(title: string, message?: string, duration?: number): string {
  return showToast({
    title,
    message,
    type: 'error',
    duration
  });
}
export function showWarningToast(title: string, message?: string, duration?: number): string {
  return showToast({
    title,
    message,
    type: 'warning',
    duration
  });
}
export function showInfoToast(title: string, message?: string, duration?: number): string {
  return showToast({
    title,
    message,
    type: 'info',
    duration
  });
}