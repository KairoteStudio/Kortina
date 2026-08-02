import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore, useCompileStore, useTerminalStore, useUISettingsStore } from '../stores';
import { AppEvents, type CompileOptionsResultPayload } from '../events/app-events';
import type { CompileError } from '../types/app';
export interface UseCompilerOptions {
  isTauri: boolean;
  saveCurrentFile: () => Promise<void>;
}
export const useCompiler = ({
  isTauri,
  saveCurrentFile
}: UseCompilerOptions) => {
  const {
    tabs,
    activeTab,
    setCompileErrors
  } = useEditorStore();
  const {
    isCompiling,
    setIsCompiling,
    output: compileOutput,
    setOutput: setCompileOutput
  } = useCompileStore();
  const {
    setIsOpen: setIsTerminalOpen
  } = useTerminalStore();
  const {
    theme,
    themeGroup,
    compilerUseSystemPath,
    compilerPath,
    compilerTargetType,
    compilerOutputFile,
    compilerShowIR,
    setCompilerTargetType,
    setCompilerOutputFile,
    setCompilerShowIR
  } = useUISettingsStore();
  const compileArgsRef = useRef({
    compilerTargetType,
    compilerOutputFile,
    compilerShowIR
  });
  const pendingActionRef = useRef<'compile' | 'run'>('compile');
  compileArgsRef.current = {
    compilerTargetType,
    compilerOutputFile,
    compilerShowIR
  };
  const invokeKairoteCompiler = useCallback(async (filePath: string, options: string[] = []) => {
    if (!isTauri) {
      return {
        success: false,
        output: '',
        errors: '编译功能仅在桌面应用中可用。请下载并安装 Kortina 桌面版本以使用编译功能。',
        exitCode: -1
      };
    }
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      const result = await invoke('compile', {
        filePath,
        options,
        compilerPath: compilerUseSystemPath ? null : compilerPath,
        useSystemPath: compilerUseSystemPath
      });
      return result as {
        success: boolean;
        output: string;
        errors: string;
        exitCode: number;
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('timeout')) {
        userFriendlyError = '编译超时，请检查代码复杂度或增加超时时间';
      } else if (errorMessage.includes('NotFound')) {
        userFriendlyError = '未找到编译器，请确保 KairoteLang 编译器已正确安装';
      } else if (errorMessage.includes('拒绝访问') || errorMessage.includes('Access is denied')) {
        userFriendlyError = '权限不足，无法访问编译器或文件';
      }
      return {
        success: false,
        output: '',
        errors: userFriendlyError,
        exitCode: -1
      };
    }
  }, [isTauri, compilerUseSystemPath, compilerPath]);
  const runCompile = useCallback(async (override?: {
    compilerTargetType?: 'asm' | 'ir' | 'exe';
    compilerOutputFile?: string;
    compilerShowIR?: boolean;
  }, runAfterCompile = false) => {
    if (!isTauri) return;
    setIsCompiling(true);
    setIsTerminalOpen(true);
    setCompileOutput('正在编译项目...');
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) {
      setIsCompiling(false);
      return;
    }
    await saveCurrentFile();
    const target = override?.compilerTargetType ?? compileArgsRef.current.compilerTargetType;
    const outputFile = override?.compilerOutputFile ?? compileArgsRef.current.compilerOutputFile;
    const showIR = override?.compilerShowIR ?? compileArgsRef.current.compilerShowIR;
    const options: string[] = [];
    if (target) options.push('-t', target);
    if (outputFile) options.push('-o', outputFile);
    if (showIR) options.push('-ir');
    const result = await invokeKairoteCompiler(currentTab.id, options);
    if (result.success) {
      setCompileOutput(`编译成功！\n\n${result.output}`);
      const mockErrors: CompileError[] = [];
      if (result.errors) {
        result.errors.split('\n').forEach((line, index) => {
          if (line.includes('错误') || line.includes('error')) {
            mockErrors.push({
              line: index + 1,
              column: 1,
              message: line,
              severity: 'error'
            });
          } else if (line.includes('警告') || line.includes('warning')) {
            mockErrors.push({
              line: index + 1,
              column: 1,
              message: line,
              severity: 'warning'
            });
          }
        });
      }
      setCompileErrors(mockErrors);
      if (runAfterCompile) {
        if (!outputFile) {
          setCompileOutput('编译成功，但运行需要在编译选项中设置输出文件。');
        } else {
          const separatorIndex = Math.max(currentTab.id.lastIndexOf('/'), currentTab.id.lastIndexOf('\\'));
          const cwd = separatorIndex >= 0 ? currentTab.id.slice(0, separatorIndex) : '.';
          const {
            invoke
          } = await import('@tauri-apps/api/core');
          const runResult = await invoke<{
            success: boolean;
            output: string;
            errors: string;
            exitCode: number;
          }>('run_program', {
            program: outputFile,
            cwd,
            args: []
          });
          setCompileOutput(['编译成功', runResult.output, runResult.errors, `进程退出码: ${runResult.exitCode}`].filter(Boolean).join('\n\n'));
        }
      }
    } else {
      setCompileOutput(`编译失败！\n\n${result.errors}`);
      setCompileErrors([{
        line: 1,
        column: 1,
        message: result.errors || '编译错误',
        severity: 'error'
      }]);
    }
    setIsCompiling(false);
  }, [isTauri, tabs, activeTab, saveCurrentFile, invokeKairoteCompiler, setIsCompiling, setIsTerminalOpen, setCompileOutput, setCompileErrors]);
  const openCompileOptionsWindow = useCallback(async () => {
    if (!isTauri) return;
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      await invoke('launch_compile_options', {
        options: {
          theme,
          themeGroup,
          compilerPath,
          compilerUseSystemPath,
          compilerTargetType,
          compilerOutputFile,
          compilerShowIR
        }
      });
    } catch (e) {
      console.error('Failed to open compile options window:', e);
    }
  }, [isTauri, theme, themeGroup, compilerPath, compilerUseSystemPath, compilerTargetType, compilerOutputFile, compilerShowIR]);
  const compileProject = useCallback(async () => {
    if (!isTauri) return;
    pendingActionRef.current = 'compile';
    await openCompileOptionsWindow();
  }, [isTauri, openCompileOptionsWindow]);
  const runProject = useCallback(async () => {
    if (!isTauri) return;
    pendingActionRef.current = 'run';
    await openCompileOptionsWindow();
  }, [isTauri, openCompileOptionsWindow]);
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    const setup = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        if (cancelled) return;
        unlisten = await listen<CompileOptionsResultPayload>(AppEvents.COMPILE_OPTIONS_RESULT, event => {
          const payload = event.payload;
          if (!payload?.confirmed) return;
          if (payload.compilerTargetType) {
            setCompilerTargetType(payload.compilerTargetType);
          }
          setCompilerOutputFile(payload.compilerOutputFile ?? '');
          setCompilerShowIR(Boolean(payload.compilerShowIR));
          void runCompile({
            compilerTargetType: payload.compilerTargetType,
            compilerOutputFile: payload.compilerOutputFile ?? '',
            compilerShowIR: Boolean(payload.compilerShowIR)
          }, pendingActionRef.current === 'run');
        });
      } catch (e) {
        console.error('Failed to listen compile-options-result:', e);
      }
    };
    void setup();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [isTauri, runCompile, setCompilerTargetType, setCompilerOutputFile, setCompilerShowIR]);
  return {
    isCompiling,
    compileOutput,
    invokeKairoteCompiler,
    compileProject,
    runProject,
    openCompileOptionsWindow
  };
};