import { describe, expect, it } from 'vitest';
import { resolveDebugConfiguration } from './DebugService';
describe('resolveDebugConfiguration', () => {
  it('resolves launch variables in all supported string fields', () => {
    const resolved = resolveDebugConfiguration({
      type: 'debugpy',
      name: 'Python',
      request: 'launch',
      program: '${workspaceFolder}/main.py',
      cwd: '${workspaceFolder}',
      args: ['--source', '${file}'],
      env: {
        MODE: 'test'
      }
    }, '/workspace/demo', '/workspace/demo/main.py');
    expect(resolved.program).toBe('/workspace/demo/main.py');
    expect(resolved.cwd).toBe('/workspace/demo');
    expect(resolved.args).toEqual(['--source', '/workspace/demo/main.py']);
    expect(resolved.launch.arguments.env).toEqual({
      MODE: 'test'
    });
  });
  it('preserves attach configurations', () => {
    const resolved = resolveDebugConfiguration({
      type: 'debugpy',
      name: 'Attach',
      request: 'attach',
      connect: {
        host: '127.0.0.1',
        port: 5678
      }
    }, '/workspace/demo', '/workspace/demo/main.py');
    expect(resolved.launch.request).toBe('attach');
    expect(resolved.launch.arguments.connect).toEqual({
      host: '127.0.0.1',
      port: 5678
    });
  });
});