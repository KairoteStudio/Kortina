import { invoke } from '@tauri-apps/api/core';
export interface GitStatus {
  file_path: string;
  original_file_path?: string;
  worktree_status: string;
  index_status: string;
  is_staged: boolean;
}
export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  short_hash: string;
}
export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
}
export interface GitDiff {
  file_path: string;
  hunks: DiffHunk[];
}
export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: string[];
}
export interface GitRemote {
  name: string;
  url: string;
}
export interface FileOperationResult {
  success: boolean;
  message: string;
}
export class VcsService {
  static async isGitRepository(repoPath: string): Promise<boolean> {
    return await invoke<boolean>('vcs_is_git_repository', {
      repoPath
    });
  }
  static async initRepository(repoPath: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_init', {
      repoPath
    });
  }
  static async getStatus(repoPath: string): Promise<GitStatus[]> {
    return await invoke<GitStatus[]>('vcs_status', {
      repoPath
    });
  }
  static async addFiles(repoPath: string, filePaths: string[]): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_add', {
      repoPath,
      filePaths
    });
  }
  static async unstageFiles(repoPath: string, filePaths: string[]): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_unstage', {
      repoPath,
      filePaths
    });
  }
  static async discardFiles(repoPath: string, filePaths: string[]): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_discard', {
      repoPath,
      filePaths
    });
  }
  static async commit(repoPath: string, message: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_commit', {
      repoPath,
      message
    });
  }
  static async getLog(repoPath: string, limit?: number): Promise<GitCommit[]> {
    return await invoke<GitCommit[]>('vcs_log', {
      repoPath,
      limit
    });
  }
  static async getBranches(repoPath: string): Promise<GitBranch[]> {
    return await invoke<GitBranch[]>('vcs_branch_list', {
      repoPath
    });
  }
  static async checkoutBranch(repoPath: string, branchName: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_checkout', {
      repoPath,
      branchName
    });
  }
  static async createBranch(repoPath: string, branchName: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_create_branch', {
      repoPath,
      branchName
    });
  }
  static async getDiff(repoPath: string, filePath?: string): Promise<GitDiff[]> {
    return await invoke<GitDiff[]>('vcs_diff', {
      repoPath,
      filePath
    });
  }
  static async getCommitDiff(repoPath: string, commitHash: string): Promise<GitDiff[]> {
    return await invoke<GitDiff[]>('vcs_commit_diff', {
      repoPath,
      commitHash
    });
  }
  static async push(repoPath: string, remote?: string, branch?: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_push', {
      repoPath,
      remote,
      branch
    });
  }
  static async pull(repoPath: string, remote?: string, branch?: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_pull', {
      repoPath,
      remote,
      branch
    });
  }
  static async fetch(repoPath: string, remote?: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_fetch', {
      repoPath,
      remote
    });
  }
  static async merge(repoPath: string, branchName: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_merge', {
      repoPath,
      branchName
    });
  }
  static async stash(repoPath: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_stash', {
      repoPath
    });
  }
  static async deleteBranch(repoPath: string, branchName: string, isRemote: boolean = false, force: boolean = false): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_delete_branch', {
      repoPath,
      branchName,
      isRemote,
      force
    });
  }
  static async getRemotes(repoPath: string): Promise<GitRemote[]> {
    return await invoke<GitRemote[]>('vcs_remote_list', {
      repoPath
    });
  }
  static async addRemote(repoPath: string, name: string, url: string): Promise<FileOperationResult> {
    return await invoke<FileOperationResult>('vcs_add_remote', {
      repoPath,
      name,
      url
    });
  }
}