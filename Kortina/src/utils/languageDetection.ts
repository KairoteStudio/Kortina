export const detectLanguage = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (extension === 'kairote' || extension === 'krt') return 'kairote';
  if (['js', 'jsx'].includes(extension)) return 'javascript';
  if (['ts', 'tsx'].includes(extension)) return 'typescript';
  if (['html', 'htm'].includes(extension)) return 'html';
  if (['css', 'scss', 'sass'].includes(extension)) return 'css';
  if (extension === 'json') return 'json';
  if (extension === 'xml') return 'xml';
  if (extension === 'md') return 'markdown';
  if (extension === 'py') return 'python';
  if (extension === 'java') return 'java';
  if (['cpp', 'c', 'h', 'hpp'].includes(extension)) return 'cpp';
  if (extension === 'go') return 'go';
  if (extension === 'rs') return 'rust';
  return 'text';
};