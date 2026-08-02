export interface SystemLogger {
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}
class InternalSystemLogger implements SystemLogger {
  private static instance: InternalSystemLogger;
  private logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    data?: any;
  }> = [];
  private maxLogs = 1000;
  private constructor() {}
  static getInstance(): InternalSystemLogger {
    if (!InternalSystemLogger.instance) {
      InternalSystemLogger.instance = new InternalSystemLogger();
    }
    return InternalSystemLogger.instance;
  }
  private addLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    };
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    try {
      if (typeof window === 'undefined') {
        const isNodeEnv = typeof (globalThis as any).process !== 'undefined';
        if (isNodeEnv && (globalThis as any).process?.env?.NODE_ENV === 'development') {
          const formattedMessage = `[System][${level.toUpperCase()}] ${message}`;
          if (data) {
            console[level](formattedMessage, data);
          } else {
            console[level](formattedMessage);
          }
        }
      } else {
        const isDev = (import.meta as any).env?.DEV || false;
        if (isDev) {
          const formattedMessage = `[System][${level.toUpperCase()}] ${message}`;
          if (data) {
            console[level](formattedMessage, data);
          } else {
            console[level](formattedMessage);
          }
        }
      }
    } catch (e) {}
  }
  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }
  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }
  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }
  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }
  getRecentLogs(count: number = 100) {
    return this.logs.slice(-count);
  }
  clearLogs() {
    this.logs = [];
  }
  exportLogs() {
    return this.logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.message,
      data: log.data
    }));
  }
}
export const systemLogger = InternalSystemLogger.getInstance();
export function shouldShowToUser(message: string): boolean {
  const systemMessages = ['项目根目录加载成功', '项目加载失败', '成功打开文件夹', '文件移动成功', '文件重命名成功', '文件创建成功', '文件删除成功'];
  return !systemMessages.some(sysMsg => message.includes(sysMsg));
}
export function filterUserMessage(type: 'info' | 'error' | 'warning' | 'command' | 'output', message: string): {
  showToUser: boolean;
  filteredMessage?: string;
} {
  if (type === 'error' || type === 'warning') {
    return {
      showToUser: true,
      filteredMessage: simplifyErrorMessage(message)
    };
  }
  if (type === 'command' || type === 'output') {
    return {
      showToUser: true,
      filteredMessage: message
    };
  }
  if (shouldShowToUser(message)) {
    return {
      showToUser: true,
      filteredMessage: message
    };
  }
  return {
    showToUser: false
  };
}
function simplifyErrorMessage(message: string): string {
  if (message.includes('ENOENT')) {
    return '文件或目录不存在';
  }
  if (message.includes('EACCES')) {
    return '权限不足，无法访问';
  }
  if (message.includes('ENOTEMPTY')) {
    return '目录不为空，无法删除';
  }
  return message;
}