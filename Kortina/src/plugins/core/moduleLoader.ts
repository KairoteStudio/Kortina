import { readFile } from '../../utils/fileSystem';
import type { SandboxPluginModule } from '../PluginSandbox';
import type { PluginContext, PluginManifest, PluginModule, PluginModuleLoadErrorCode } from '../index';
import { PluginModuleLoadError } from './PluginError';
export interface ModuleLoaderDeps {
  executeModuleSource(source: string, pluginId: string): Promise<SandboxPluginModule>;
}
export interface LoadModuleResult {
  module: SandboxPluginModule | PluginModule;
  triedPaths: string[];
}
export async function loadPluginModule(manifest: PluginManifest, deps: ModuleLoaderDeps): Promise<LoadModuleResult> {
  const possiblePaths = getPluginModuleCandidatePaths(manifest);
  const triedPaths: string[] = [];
  const pathErrors: Array<{
    path: string;
    code: PluginModuleLoadErrorCode;
    message: string;
  }> = [];
  for (const modulePath of possiblePaths) {
    triedPaths.push(modulePath);
    try {
      const fileContent = await readFile(modulePath);
      if (!fileContent?.content || !fileContent.content.trim()) {
        pathErrors.push({
          path: modulePath,
          code: 'EMPTY_SOURCE',
          message: `模块文件为空: ${modulePath}`
        });
        continue;
      }
      try {
        const module = await deps.executeModuleSource(fileContent.content, manifest.id);
        return {
          module,
          triedPaths
        };
      } catch (execError) {
        const message = execError instanceof Error ? execError.message : String(execError);
        throw createPluginModuleLoadError({
          code: 'EXECUTE_FAILED',
          pluginId: manifest.id,
          message: `插件模块执行失败: ${message}`,
          triedPaths,
          cause: execError
        });
      }
    } catch (error) {
      if (error instanceof PluginModuleLoadError) {
        throw error;
      }
      const classified = classifyFileReadError(modulePath, error);
      pathErrors.push(classified);
    }
  }
  if (allowsContributionOnlyStub(manifest)) {
    return {
      module: {
        activate: (ctx: PluginContext) => {
          ctx.api.logger.info(`Plugin ${manifest.name} loaded (contribution-only, no JS module)`);
        }
      },
      triedPaths
    };
  }
  const hasReadFailure = pathErrors.some(e => e.code === 'READ_FAILED');
  const hasEmpty = pathErrors.some(e => e.code === 'EMPTY_SOURCE');
  const code: PluginModuleLoadErrorCode = hasReadFailure ? 'READ_FAILED' : hasEmpty ? 'EMPTY_SOURCE' : 'NOT_FOUND';
  const detail = pathErrors.map(e => `${e.path} => ${e.code}: ${e.message}`).join('; ') || '无可用模块路径';
  throw createPluginModuleLoadError({
    code,
    pluginId: manifest.id,
    message: `无法加载插件模块 (${code}): ${detail}`,
    triedPaths
  });
}
export function getPluginModuleCandidatePaths(manifest: PluginManifest): string[] {
  const base = (manifest.installPath || '').replace(/\/+$/, '');
  if (!base) return [];
  const paths: string[] = [];
  if (manifest.main) {
    paths.push(`${base}/${manifest.main}`);
  }
  paths.push(`${base}/index.js`, `${base}/dist/index.js`, `${base}/plugin.js`);
  return Array.from(new Set(paths));
}
export function allowsContributionOnlyStub(manifest: PluginManifest): boolean {
  if (manifest.main) return false;
  const c = manifest.contributions;
  if (!c) return false;
  return !!(c.menus && c.menus.length || c.panels && c.panels.length || c.themes && c.themes.length || c.grammars && c.grammars.length || c.commands && c.commands.length);
}
export function classifyFileReadError(path: string, error: unknown): {
  path: string;
  code: PluginModuleLoadErrorCode;
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const notFound = lower.includes('not found') || lower.includes('no such file') || lower.includes('os error 2') || lower.includes('enoent') || lower.includes('不存在') || lower.includes('找不到');
  return {
    path,
    code: notFound ? 'NOT_FOUND' : 'READ_FAILED',
    message
  };
}
export function createPluginModuleLoadError(params: {
  code: PluginModuleLoadErrorCode;
  pluginId: string;
  message: string;
  triedPaths: string[];
  cause?: unknown;
}): PluginModuleLoadError {
  return new PluginModuleLoadError(params.code, params.pluginId, params.message, params.triedPaths, params.cause);
}
export function toPluginLoadError(pluginId: string, error: unknown) {
  if (error instanceof PluginModuleLoadError) {
    return error.toJSON();
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: 'EXECUTE_FAILED' as const,
    message,
    pluginId,
    triedPaths: [],
    causeMessage: message
  };
}
export function createFailedModuleStub(manifest: PluginManifest, loadError: {
  code: string;
  message: string;
}): PluginModule {
  return {
    activate: (ctx: PluginContext) => {
      ctx.api.logger.error(`Plugin ${manifest.name} module load failed [${loadError.code}]: ${loadError.message}`);
    }
  };
}