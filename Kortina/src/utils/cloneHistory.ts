import { GitCloneOptions } from '../utils/fileSystem';
export interface CloneHistoryItem {
  id: string;
  repoUrl: string;
  targetPath: string;
  branch?: string;
  timestamp: number;
  success: boolean;
  message?: string;
}
const HISTORY_KEY = 'git_clone_history';
const MAX_HISTORY_ITEMS = 20;
export class CloneHistoryManager {
  private static instance: CloneHistoryManager;
  private constructor() {}
  public static getInstance(): CloneHistoryManager {
    if (!CloneHistoryManager.instance) {
      CloneHistoryManager.instance = new CloneHistoryManager();
    }
    return CloneHistoryManager.instance;
  }
  public getHistory(): CloneHistoryItem[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as CloneHistoryItem[];
        return history.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {
      console.error('读取克隆历史失败:', error);
    }
    return [];
  }
  public addHistory(options: GitCloneOptions, success: boolean, message?: string): CloneHistoryItem {
    const history = this.getHistory();
    const existingIndex = history.findIndex(item => item.repoUrl === options.repoUrl && item.targetPath === options.targetPath);
    const newItem: CloneHistoryItem = {
      id: Date.now().toString(),
      repoUrl: options.repoUrl,
      targetPath: options.targetPath,
      branch: options.branch,
      timestamp: Date.now(),
      success,
      message
    };
    if (existingIndex !== -1) {
      history[existingIndex] = newItem;
    } else {
      history.unshift(newItem);
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
      }
    }
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存克隆历史失败:', error);
    }
    return newItem;
  }
  public removeHistory(id: string): boolean {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      if (filteredHistory.length < history.length) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
        return true;
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
    }
    return false;
  }
  public clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('清空历史记录失败:', error);
    }
  }
  public formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) {
      return '刚刚';
    }
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
    return date.toLocaleDateString('zh-CN');
  }
  public getRepoName(repoUrl: string): string {
    try {
      if (repoUrl.startsWith('https://')) {
        const parts = repoUrl.split('/');
        const repoName = parts[parts.length - 1];
        return repoName.replace('.git', '');
      }
      if (repoUrl.startsWith('git@')) {
        const parts = repoUrl.split(':');
        const repoName = parts[parts.length - 1];
        return repoName.replace('.git', '');
      }
      const parts = repoUrl.split('/');
      return parts[parts.length - 1].replace('.git', '');
    } catch (error) {
      console.error('解析仓库名称失败:', error);
      return '未知仓库';
    }
  }
}