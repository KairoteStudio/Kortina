import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
interface UseVcsActionsOptions {
  isTauri: boolean;
  currentProjectPath: string;
  setIsVcsMerged: React.Dispatch<React.SetStateAction<boolean>>;
  setVcsMergedWidth: React.Dispatch<React.SetStateAction<number>>;
}
export const useVcsActions = (options: UseVcsActionsOptions) => {
  const {
    isTauri,
    currentProjectPath,
    setIsVcsMerged,
    setVcsMergedWidth
  } = options;
  const handleCommit = useCallback(async (message: string) => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_commit', {
        repoPath: currentProjectPath,
        message
      });
      return {
        success: true,
        message: '提交成功'
      };
    } catch (error) {
      console.error('提交失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handlePush = useCallback(async () => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_push', {
        repoPath: currentProjectPath
      });
      return {
        success: true,
        message: '推送成功'
      };
    } catch (error) {
      console.error('推送失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handlePull = useCallback(async () => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_pull', {
        repoPath: currentProjectPath
      });
      return {
        success: true,
        message: '拉取成功'
      };
    } catch (error) {
      console.error('拉取失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handleCreateBranch = useCallback(async (branchName: string) => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_create_branch', {
        repoPath: currentProjectPath,
        branchName
      });
      return {
        success: true,
        message: `已创建分支: ${branchName}`
      };
    } catch (error) {
      console.error('创建分支失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handleCheckoutBranch = useCallback(async (branchName: string) => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_checkout', {
        repoPath: currentProjectPath,
        branchName
      });
      return {
        success: true,
        message: `已切换到分支: ${branchName}`
      };
    } catch (error) {
      console.error('切换分支失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handleMerge = useCallback(async (branchName: string) => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_merge', {
        repoPath: currentProjectPath,
        branchName
      });
      return {
        success: true,
        message: `已合并分支: ${branchName}`
      };
    } catch (error) {
      console.error('合并分支失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handleFetch = useCallback(async (remote?: string) => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) {
        alert('此功能仅在桌面应用中可用');
      }
      return {
        success: false,
        message: '项目路径无效'
      };
    }
    try {
      await invoke('vcs_fetch', {
        repoPath: currentProjectPath,
        remote
      });
      return {
        success: true,
        message: '获取更新成功'
      };
    } catch (error) {
      console.error('获取更新失败:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }, [isTauri, currentProjectPath]);
  const handleToggleVcsPanel = useCallback(() => {
    if (isTauri) {
      const panelWidth = 400;
      const availableWidth = window.innerWidth - panelWidth;
      if (availableWidth >= 300) {
        setIsVcsMerged((prev: boolean) => !prev);
        setVcsMergedWidth(panelWidth);
      } else {
        setIsVcsMerged((prev: boolean) => !prev);
      }
    } else {
      setIsVcsMerged((prev: boolean) => !prev);
    }
  }, [isTauri, setIsVcsMerged, setVcsMergedWidth]);
  return {
    handleCommit,
    handlePush,
    handlePull,
    handleCreateBranch,
    handleCheckoutBranch,
    handleMerge,
    handleFetch,
    handleToggleVcsPanel
  };
};