export type Category = 'general' | 'editor' | 'files' | 'shortcuts' | 'compiler' | 'extensions' | 'other' | 'about';
export const CATEGORIES: Category[] = ['general', 'editor', 'files', 'shortcuts', 'compiler', 'extensions', 'other', 'about'];
export const getCategoryTitle = (category: Category): string => {
  switch (category) {
    case 'general':
      return '常规设置';
    case 'editor':
      return '编辑器设置';
    case 'files':
      return '文件设置';
    case 'shortcuts':
      return '键盘快捷键';
    case 'compiler':
      return '编译器设置';
    case 'extensions':
      return '扩展';
    case 'other':
      return '其他设置';
    case 'about':
      return '关于';
  }
};