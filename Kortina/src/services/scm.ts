import { VcsService, type GitStatus, type GitBranch, type GitRemote, type FileOperationResult } from './vcs';
export type SCMResourceStatus = 'untracked' | 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'conflicted' | 'ignored';
export interface SCMResource {
  id: string;
  filePath: string;
  originalFilePath?: string;
  status: SCMResourceStatus;
  isStaged: boolean;
  indexStatus: string;
  worktreeStatus: string;
  decorations: SCMResourceDecorations;
}
export interface SCMResourceDecorations {
  icon?: string;
  tooltip: string;
  strikeThrough?: boolean;
  faded?: boolean;
}
export interface SCMResourceGroup {
  id: string;
  label: string;
  resources: SCMResource[];
  hideWhenEmpty: boolean;
}
export interface SCMInput {
  value: string;
  placeholder: string;
  visible: boolean;
}
export interface SCMRepository {
  rootUri: string;
  currentBranch: string | null;
  groups: SCMResourceGroup[];
  remotes: GitRemote[];
  branches: GitBranch[];
  isLoading: boolean;
  error: string | null;
}
export interface SCMOperationResult {
  success: boolean;
  message: string;
}
export interface SCMProvider {
  readonly id: string;
  readonly label: string;
  readonly repository: SCMRepository;
  readonly input: SCMInput;
  setInput(value: string): void;
  refresh(): Promise<void>;
  initRepository(): Promise<SCMOperationResult>;
  stage(filePaths: string[]): Promise<SCMOperationResult>;
  unstage(filePaths: string[]): Promise<SCMOperationResult>;
  discard(filePaths: string[]): Promise<SCMOperationResult>;
  commit(message: string): Promise<SCMOperationResult>;
  push(remote?: string, branch?: string): Promise<SCMOperationResult>;
  pull(remote?: string, branch?: string): Promise<SCMOperationResult>;
  fetch(remote?: string): Promise<SCMOperationResult>;
  createBranch(name: string): Promise<SCMOperationResult>;
  checkoutBranch(name: string): Promise<SCMOperationResult>;
  merge(branchName: string): Promise<SCMOperationResult>;
  deleteBranch(name: string, isRemote?: boolean, force?: boolean): Promise<SCMOperationResult>;
}
function mapGitStatus(indexStatus: string, worktreeStatus: string): SCMResourceStatus {
  if (indexStatus === 'R' || worktreeStatus === 'R') return 'renamed';
  if (indexStatus === 'C' || worktreeStatus === 'C') return 'copied';
  if (indexStatus === 'D' || worktreeStatus === 'D') return 'deleted';
  if (indexStatus === 'A' || worktreeStatus === 'A') return 'added';
  if (indexStatus === 'M' || worktreeStatus === 'M') return 'modified';
  if (indexStatus === 'U' || worktreeStatus === 'U') return 'conflicted';
  if (indexStatus === '?' || worktreeStatus === '?') return 'untracked';
  if (indexStatus === '!' || worktreeStatus === '!') return 'ignored';
  return 'modified';
}
function getStatusDecorations(status: SCMResourceStatus, isStaged: boolean): SCMResourceDecorations {
  const stageLabel = isStaged ? '（已暂存）' : '（未暂存）';
  switch (status) {
    case 'added':
      return {
        tooltip: `已添加${stageLabel}`,
        icon: 'add'
      };
    case 'modified':
      return {
        tooltip: `已修改${stageLabel}`,
        icon: 'edit'
      };
    case 'deleted':
      return {
        tooltip: `已删除${stageLabel}`,
        icon: 'trash',
        strikeThrough: true
      };
    case 'renamed':
      return {
        tooltip: `已重命名${stageLabel}`,
        icon: 'rename'
      };
    case 'copied':
      return {
        tooltip: `已复制${stageLabel}`,
        icon: 'copy'
      };
    case 'untracked':
      return {
        tooltip: `未跟踪${stageLabel}`,
        icon: 'question',
        faded: true
      };
    case 'conflicted':
      return {
        tooltip: `冲突${stageLabel}`,
        icon: 'warning'
      };
    case 'ignored':
      return {
        tooltip: `已忽略${stageLabel}`,
        icon: 'ignore',
        faded: true
      };
    default:
      return {
        tooltip: `已更改${stageLabel}`,
        icon: 'edit'
      };
  }
}
function parseStatusPath(rawPath: string): {
  filePath: string;
  originalFilePath?: string;
} {
  if (rawPath.includes(' -> ')) {
    const parts = rawPath.split(' -> ');
    if (parts.length === 2) {
      return {
        originalFilePath: parts[0],
        filePath: parts[1]
      };
    }
  }
  return {
    filePath: rawPath
  };
}
export function gitStatusToSCMResource(status: GitStatus): SCMResource {
  const {
    filePath,
    originalFilePath
  } = parseStatusPath(status.file_path);
  const backendOriginalFilePath = status.original_file_path || originalFilePath;
  const resourceStatus = mapGitStatus(status.index_status, status.worktree_status);
  const isStaged = status.is_staged;
  return {
    id: `${isStaged ? 'staged' : 'unstaged'}:${backendOriginalFilePath ? `${backendOriginalFilePath}->` : ''}${filePath}`,
    filePath,
    originalFilePath: backendOriginalFilePath,
    status: resourceStatus,
    isStaged,
    indexStatus: status.index_status,
    worktreeStatus: status.worktree_status,
    decorations: getStatusDecorations(resourceStatus, isStaged)
  };
}
export function groupResources(resources: SCMResource[]): SCMResourceGroup[] {
  const staged = resources.filter(r => r.isStaged);
  const unstaged = resources.filter(r => !r.isStaged);
  return [{
    id: 'staged',
    label: `暂存的更改${staged.length > 0 ? ` (${staged.length})` : ''}`,
    resources: staged,
    hideWhenEmpty: true
  }, {
    id: 'changes',
    label: `更改${unstaged.length > 0 ? ` (${unstaged.length})` : ''}`,
    resources: unstaged,
    hideWhenEmpty: false
  }];
}
function adaptResult(result: FileOperationResult): SCMOperationResult {
  return {
    success: result.success,
    message: result.message
  };
}
export function createGitProvider(projectPath: string): SCMProvider {
  const repository: SCMRepository = {
    rootUri: projectPath,
    currentBranch: null,
    groups: [],
    remotes: [],
    branches: [],
    isLoading: false,
    error: null
  };
  const input: SCMInput = {
    value: '',
    placeholder: '输入提交消息（按 Ctrl+Enter 提交）',
    visible: true
  };
  const provider: SCMProvider = {
    id: 'git',
    label: 'Git',
    repository,
    input,
    setInput(value: string) {
      input.value = value;
    },
    async refresh() {
      if (!projectPath) {
        repository.error = '未打开项目';
        return;
      }
      repository.isLoading = true;
      repository.error = null;
      try {
        const [statuses, branches, remotes] = await Promise.all([VcsService.getStatus(projectPath), VcsService.getBranches(projectPath).catch(() => [] as GitBranch[]), VcsService.getRemotes(projectPath).catch(() => [] as GitRemote[])]);
        const resources = statuses.map(gitStatusToSCMResource);
        repository.groups = groupResources(resources);
        repository.branches = branches;
        repository.remotes = remotes;
        repository.currentBranch = branches.find(b => b.is_current)?.name || null;
      } catch (error) {
        repository.error = error instanceof Error ? error.message : String(error);
        repository.groups = [];
      } finally {
        repository.isLoading = false;
      }
    },
    async initRepository() {
      const result = await VcsService.initRepository(projectPath);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async stage(filePaths: string[]) {
      const result = await VcsService.addFiles(projectPath, filePaths);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async unstage(filePaths: string[]) {
      const result = await VcsService.unstageFiles(projectPath, filePaths);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async discard(filePaths: string[]) {
      const result = await VcsService.discardFiles(projectPath, filePaths);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async commit(message: string) {
      if (!message.trim()) {
        return {
          success: false,
          message: '提交消息不能为空'
        };
      }
      const result = await VcsService.commit(projectPath, message);
      if (result.success) {
        input.value = '';
        await this.refresh();
      }
      return adaptResult(result);
    },
    async push(remote?: string, branch?: string) {
      const result = await VcsService.push(projectPath, remote, branch);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async pull(remote?: string, branch?: string) {
      const result = await VcsService.pull(projectPath, remote, branch);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async fetch(remote?: string) {
      const result = await VcsService.fetch(projectPath, remote);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async createBranch(name: string) {
      const result = await VcsService.createBranch(projectPath, name);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async checkoutBranch(name: string) {
      const result = await VcsService.checkoutBranch(projectPath, name);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async merge(branchName: string) {
      const result = await VcsService.merge(projectPath, branchName);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    },
    async deleteBranch(name: string, isRemote: boolean = false, force: boolean = false) {
      const result = await VcsService.deleteBranch(projectPath, name, isRemote, force);
      if (result.success) {
        await this.refresh();
      }
      return adaptResult(result);
    }
  };
  return provider;
}