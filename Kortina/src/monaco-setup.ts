import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
type WorkerCtor = new () => Worker;
const workerCtorCache = new Map<string, Promise<WorkerCtor>>();
function loadWorkerCtor(key: string, importer: () => Promise<{
  default: WorkerCtor;
}>): Promise<WorkerCtor> {
  let cached = workerCtorCache.get(key);
  if (!cached) {
    cached = importer().then(m => m.default);
    workerCtorCache.set(key, cached);
  }
  return cached;
}
function resolveWorkerCtor(label: string): Promise<WorkerCtor> {
  if (label === 'json') {
    return loadWorkerCtor('json', () => import('monaco-editor/esm/vs/language/json/json.worker?worker'));
  }
  if (label === 'css' || label === 'scss' || label === 'less') {
    return loadWorkerCtor('css', () => import('monaco-editor/esm/vs/language/css/css.worker?worker'));
  }
  if (label === 'html' || label === 'handlebars' || label === 'razor') {
    return loadWorkerCtor('html', () => import('monaco-editor/esm/vs/language/html/html.worker?worker'));
  }
  if (label === 'typescript' || label === 'javascript') {
    return loadWorkerCtor('ts', () => import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'));
  }
  return loadWorkerCtor('editor', () => import('monaco-editor/esm/vs/editor/editor.worker?worker'));
}
(self as any).MonacoEnvironment = {
  async getWorker(_workerId: string, label: string) {
    const WorkerCtor = await resolveWorkerCtor(label);
    return new WorkerCtor();
  }
};
loader.config({
  monaco
});