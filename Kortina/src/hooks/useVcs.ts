import { useState, useEffect, useCallback } from 'react';
import { VcsService, GitStatus, GitCommit, GitBranch, GitRemote } from '../services/vcs';
export interface VcsState {
  isRepository: boolean;
  status: GitStatus[];
  commits: GitCommit[];
  branches: GitBranch[];
  remotes: GitRemote[];
  currentBranch: string | null;
  isLoading: boolean;
  error: string | null;
}
export const useVcs = (projectPath: string | null) => {
  const [state, setState] = useState<VcsState>({
    isRepository: false,
    status: [],
    commits: [],
    branches: [],
    remotes: [],
    currentBranch: null,
    isLoading: false,
    error: null
  });
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));
  }, []);
  const checkRepository = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const isRepo = await VcsService.isGitRepository(projectPath);
      setState(prev => ({
        ...prev,
        isRepository: isRepo
      }));
      if (isRepo) {
        await Promise.all([refreshStatus(), refreshBranches(), refreshRemotes()]);
      }
    } catch (error) {
      setError(`检查仓库失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [projectPath, setLoading, setError]);
  const initRepository = useCallback(async () => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    setLoading(true);
    try {
      const result = await VcsService.initRepository(projectPath);
      if (result.success) {
        await checkRepository();
      }
      return result;
    } catch (error) {
      setError(`初始化仓库失败: ${error}`);
      return {
        success: false,
        message: `初始化仓库失败: ${error}`
      };
    } finally {
      setLoading(false);
    }
  }, [projectPath, setLoading, setError, checkRepository]);
  const refreshStatus = useCallback(async () => {
    if (!projectPath || !state.isRepository) return;
    try {
      const status = await VcsService.getStatus(projectPath);
      setState(prev => ({
        ...prev,
        status
      }));
    } catch (error) {
      setError(`获取状态失败: ${error}`);
    }
  }, [projectPath, state.isRepository, setError]);
  const addFiles = useCallback(async (filePaths: string[]) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.addFiles(projectPath, filePaths);
      if (result.success) {
        await refreshStatus();
      }
      return result;
    } catch (error) {
      setError(`添加文件失败: ${error}`);
      return {
        success: false,
        message: `添加文件失败: ${error}`
      };
    }
  }, [projectPath, refreshStatus, setError]);
  const refreshCommits = useCallback(async (limit?: number) => {
    if (!projectPath || !state.isRepository) return;
    try {
      const commits = await VcsService.getLog(projectPath, limit);
      setState(prev => ({
        ...prev,
        commits
      }));
    } catch (error) {
      setError(`获取提交历史失败: ${error}`);
    }
  }, [projectPath, state.isRepository, setError]);
  const commit = useCallback(async (message: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.commit(projectPath, message);
      if (result.success) {
        await Promise.all([refreshStatus(), refreshCommits()]);
      }
      return result;
    } catch (error) {
      setError(`提交失败: ${error}`);
      return {
        success: false,
        message: `提交失败: ${error}`
      };
    }
  }, [projectPath, refreshStatus, refreshCommits, setError]);
  const refreshBranches = useCallback(async () => {
    if (!projectPath || !state.isRepository) return;
    try {
      const branches = await VcsService.getBranches(projectPath);
      const currentBranch = branches.find(b => b.is_current)?.name || null;
      setState(prev => ({
        ...prev,
        branches,
        currentBranch
      }));
    } catch (error) {
      setError(`获取分支列表失败: ${error}`);
    }
  }, [projectPath, state.isRepository, setError]);
  const createBranch = useCallback(async (branchName: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.createBranch(projectPath, branchName);
      if (result.success) {
        await refreshBranches();
      }
      return result;
    } catch (error) {
      setError(`创建分支失败: ${error}`);
      return {
        success: false,
        message: `创建分支失败: ${error}`
      };
    }
  }, [projectPath, refreshBranches, setError]);
  const checkoutBranch = useCallback(async (branchName: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.checkoutBranch(projectPath, branchName);
      if (result.success) {
        await Promise.all([refreshStatus(), refreshBranches()]);
      }
      return result;
    } catch (error) {
      setError(`切换分支失败: ${error}`);
      return {
        success: false,
        message: `切换分支失败: ${error}`
      };
    }
  }, [projectPath, refreshStatus, refreshBranches, setError]);
  const push = useCallback(async (remote?: string, branch?: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.push(projectPath, remote, branch);
      return result;
    } catch (error) {
      setError(`推送失败: ${error}`);
      return {
        success: false,
        message: `推送失败: ${error}`
      };
    }
  }, [projectPath, setError]);
  const pull = useCallback(async (remote?: string, branch?: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.pull(projectPath, remote, branch);
      if (result.success) {
        await Promise.all([refreshStatus(), refreshCommits()]);
      }
      return result;
    } catch (error) {
      setError(`拉取失败: ${error}`);
      return {
        success: false,
        message: `拉取失败: ${error}`
      };
    }
  }, [projectPath, refreshStatus, refreshCommits, setError]);
  const fetch = useCallback(async (remote?: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.fetch(projectPath, remote);
      if (result.success) {
        await refreshBranches();
      }
      return result;
    } catch (error) {
      setError(`获取更新失败: ${error}`);
      return {
        success: false,
        message: `获取更新失败: ${error}`
      };
    }
  }, [projectPath, refreshBranches, setError]);
  const merge = useCallback(async (branchName: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.merge(projectPath, branchName);
      if (result.success) {
        await Promise.all([refreshStatus(), refreshCommits()]);
      }
      return result;
    } catch (error) {
      setError(`合并失败: ${error}`);
      return {
        success: false,
        message: `合并失败: ${error}`
      };
    }
  }, [projectPath, refreshStatus, refreshCommits, setError]);
  const deleteBranch = useCallback(async (branchName: string, isRemote: boolean = false, force: boolean = false) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.deleteBranch(projectPath, branchName, isRemote, force);
      if (result.success) {
        await refreshBranches();
      }
      return result;
    } catch (error) {
      setError(`删除分支失败: ${error}`);
      return {
        success: false,
        message: `删除分支失败: ${error}`
      };
    }
  }, [projectPath, refreshBranches, setError]);
  const refreshRemotes = useCallback(async () => {
    if (!projectPath || !state.isRepository) return;
    try {
      const remotes = await VcsService.getRemotes(projectPath);
      setState(prev => ({
        ...prev,
        remotes
      }));
    } catch (error) {
      setError(`获取远程仓库列表失败: ${error}`);
    }
  }, [projectPath, state.isRepository, setError]);
  const addRemote = useCallback(async (name: string, url: string) => {
    if (!projectPath) return {
      success: false,
      message: '项目路径无效'
    };
    try {
      const result = await VcsService.addRemote(projectPath, name, url);
      if (result.success) {
        await refreshRemotes();
      }
      return result;
    } catch (error) {
      setError(`添加远程仓库失败: ${error}`);
      return {
        success: false,
        message: `添加远程仓库失败: ${error}`
      };
    }
  }, [projectPath, refreshRemotes, setError]);
  useEffect(() => {
    if (projectPath) {
      checkRepository();
    } else {
      setState(prev => ({
        ...prev,
        isRepository: false,
        status: [],
        commits: [],
        branches: [],
        remotes: [],
        currentBranch: null
      }));
    }
  }, [projectPath, checkRepository]);
  return {
    ...state,
    checkRepository,
    initRepository,
    refreshStatus,
    addFiles,
    commit,
    refreshCommits,
    refreshBranches,
    createBranch,
    checkoutBranch,
    push,
    pull,
    fetch,
    merge,
    deleteBranch,
    refreshRemotes,
    addRemote
  };
};