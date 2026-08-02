import { useState, useCallback } from 'react';
import { createFile, deleteFile, renameFile, moveFile, copyFile, getCurrentDir } from '../utils/fileSystem';
import { systemLogger } from '../utils/logger';
export interface ClipboardItem {
  path: string;
  name: string;
  type: string;
  operation: 'copy' | 'cut';
}
export const useFileOperations = () => {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const handleNewFile = useCallback(async (fileName: string, targetPath: string, projectRootPath: string, isDirectory: boolean = false) => {
    if (!fileName) return {
      success: false,
      message: '文件名不能为空'
    };
    try {
      let filePath = fileName;
      if (targetPath) {
        if (targetPath !== projectRootPath) {
          filePath = `${targetPath}/${fileName}`;
        } else {
          filePath = `${targetPath}/${fileName}`;
        }
      } else if (projectRootPath) {
        filePath = `${projectRootPath}/${fileName}`;
      } else {
        return {
          success: false,
          message: '请先打开一个项目文件夹'
        };
      }
      if (!filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/)) {
        if (projectRootPath) {
          filePath = `${projectRootPath}/${filePath}`;
        } else {
          const currentDir = await getCurrentDir();
          filePath = `${currentDir}/${filePath}`;
        }
      }
      filePath = filePath.replace(/\\/g, '/');
      console.log('准备创建文件:', filePath, '是否为目录:', isDirectory);
      systemLogger.info(`准备创建${isDirectory ? '目录' : '文件'}: ${filePath}`);
      const result = await createFile(filePath, isDirectory);
      console.log('创建结果:', result);
      systemLogger.info(`创建${isDirectory ? '目录' : '文件'}结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('创建文件异常:', error);
      systemLogger.error(`创建${isDirectory ? '目录' : '文件'}异常: ${error}`);
      return {
        success: false,
        message: `${isDirectory ? '目录' : '文件'}创建异常: ${error}`
      };
    }
  }, []);
  const handleDeleteFile = useCallback(async (filePath: string) => {
    try {
      setIsLoading(true);
      const result = await deleteFile(filePath);
      if (result.success) {
        systemLogger.info(`文件 ${filePath} 删除成功`);
      } else {
        systemLogger.error(`文件删除失败: ${result.message}`);
      }
      return result;
    } catch (error) {
      console.error('删除文件异常:', error);
      systemLogger.error(`文件删除异常: ${error}`);
      return {
        success: false,
        message: `文件删除异常: ${error}`
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  const handleRenameFile = useCallback(async (filePath: string, newName: string) => {
    try {
      setIsLoading(true);
      const result = await renameFile(filePath, newName);
      if (result.success) {
        systemLogger.info(`文件 ${filePath} 重命名成功`);
      } else {
        systemLogger.error(`文件重命名失败: ${result.message}`);
      }
      return result;
    } catch (error) {
      console.error('重命名文件异常:', error);
      systemLogger.error(`文件重命名异常: ${error}`);
      return {
        success: false,
        message: `文件重命名异常: ${error}`
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  const handleMoveFile = useCallback(async (sourcePath: string, targetPath: string) => {
    try {
      setIsLoading(true);
      const result = await moveFile(sourcePath, targetPath);
      if (result.success) {
        systemLogger.info(`文件 ${sourcePath} 移动成功`);
      } else {
        systemLogger.error(`文件移动失败: ${result.message}`);
      }
      return result;
    } catch (error) {
      console.error('移动文件异常:', error);
      systemLogger.error(`文件移动异常: ${error}`);
      return {
        success: false,
        message: `文件移动异常: ${error}`
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  const handleCopyFile = useCallback((filePath: string, name: string, type: string) => {
    setClipboard({
      path: filePath,
      name,
      type,
      operation: 'copy'
    });
    systemLogger.info(`复制文件: ${filePath}`);
  }, []);
  const handleCutFile = useCallback((filePath: string, name: string, type: string) => {
    setClipboard({
      path: filePath,
      name,
      type,
      operation: 'cut'
    });
    systemLogger.info(`剪切文件: ${filePath}`);
  }, []);
  const handlePasteFile = useCallback(async (targetPath: string) => {
    if (!clipboard) return {
      success: false,
      message: '剪贴板为空'
    };
    try {
      setIsLoading(true);
      const fileName = clipboard.name;
      const targetFilePath = `${targetPath}/${fileName}`;
      if (clipboard.operation === 'cut') {
        const result = await moveFile(clipboard.path, targetFilePath);
        if (result.success) {
          setClipboard(null);
          systemLogger.info(`文件 ${clipboard.path} 移动成功`);
        } else {
          systemLogger.error(`文件移动失败: ${result.message}`);
        }
        return result;
      } else {
        const result = await copyFile(clipboard.path, targetFilePath);
        if (result.success) {
          systemLogger.info(`文件 ${clipboard.path} 复制成功`);
        } else {
          systemLogger.error(`文件复制失败: ${result.message}`);
        }
        return result;
      }
    } catch (error) {
      console.error('粘贴文件异常:', error);
      systemLogger.error(`文件粘贴异常: ${error}`);
      return {
        success: false,
        message: `文件粘贴异常: ${error}`
      };
    } finally {
      setIsLoading(false);
    }
  }, [clipboard]);
  return {
    clipboard,
    isLoading,
    handleNewFile,
    handleDeleteFile,
    handleRenameFile,
    handleMoveFile,
    handleCopyFile,
    handleCutFile,
    handlePasteFile
  };
};