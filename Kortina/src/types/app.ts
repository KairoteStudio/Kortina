export interface Tab {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}
export interface CompileError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}