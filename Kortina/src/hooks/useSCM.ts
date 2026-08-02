import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGitProvider, type SCMProvider, type SCMRepository, type SCMInput } from '../services/scm';
export interface UseSCMResult {
  provider: SCMProvider | null;
  repository: SCMRepository | null;
  input: SCMInput | null;
  isLoading: boolean;
  error: string | null;
  hasChanges: boolean;
  hasStagedChanges: boolean;
  refresh: () => Promise<void>;
  setInputValue: (value: string) => void;
  stage: (filePaths: string[]) => Promise<void>;
  unstage: (filePaths: string[]) => Promise<void>;
  discard: (filePaths: string[]) => Promise<void>;
  commit: (message?: string) => Promise<void>;
  initRepository: () => Promise<void>;
  push: (remote?: string, branch?: string) => Promise<void>;
  pull: (remote?: string, branch?: string) => Promise<void>;
  fetch: (remote?: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  merge: (branchName: string) => Promise<void>;
  deleteBranch: (name: string, isRemote?: boolean, force?: boolean) => Promise<void>;
}
export function useSCM(projectPath: string | null): UseSCMResult {
  const [, forceUpdate] = useState(0);
  const providerRef = useRef<SCMProvider | null>(null);
  const isInitialMount = useRef(true);
  const notify = useCallback(() => {
    forceUpdate(v => v + 1);
  }, []);
  const provider = useMemo(() => {
    if (!projectPath) {
      providerRef.current = null;
      return null;
    }
    const p = createGitProvider(projectPath);
    providerRef.current = p;
    return p;
  }, [projectPath]);
  const refresh = useCallback(async () => {
    if (!provider) return;
    await provider.refresh();
    notify();
  }, [provider, notify]);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      refresh();
    }
  }, [refresh]);
  const setInputValue = useCallback((value: string) => {
    const p = providerRef.current;
    if (!p) return;
    p.setInput(value);
    notify();
  }, [notify]);
  const stage = useCallback(async (filePaths: string[]) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.stage(filePaths);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const unstage = useCallback(async (filePaths: string[]) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.unstage(filePaths);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const discard = useCallback(async (filePaths: string[]) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.discard(filePaths);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const commit = useCallback(async (message?: string) => {
    const p = providerRef.current;
    if (!p) return;
    const commitMessage = message ?? p.input.value;
    const result = await p.commit(commitMessage);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const initRepository = useCallback(async () => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.initRepository();
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const push = useCallback(async (remote?: string, branch?: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.push(remote, branch);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const pull = useCallback(async (remote?: string, branch?: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.pull(remote, branch);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const fetch = useCallback(async (remote?: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.fetch(remote);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const createBranch = useCallback(async (name: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.createBranch(name);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const checkoutBranch = useCallback(async (name: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.checkoutBranch(name);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const merge = useCallback(async (branchName: string) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.merge(branchName);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const deleteBranch = useCallback(async (name: string, isRemote: boolean = false, force: boolean = false) => {
    const p = providerRef.current;
    if (!p) return;
    const result = await p.deleteBranch(name, isRemote, force);
    notify();
    if (!result.success) {
      throw new Error(result.message);
    }
  }, [notify]);
  const repository = provider?.repository ?? null;
  const input = provider?.input ?? null;
  const stagedGroup = repository?.groups.find(g => g.id === 'staged');
  const hasStagedChanges = (stagedGroup?.resources.length ?? 0) > 0;
  const hasChanges = repository?.groups.some(g => g.resources.length > 0) ?? false;
  return {
    provider,
    repository,
    input,
    isLoading: repository?.isLoading ?? false,
    error: repository?.error ?? null,
    hasChanges,
    hasStagedChanges,
    refresh,
    setInputValue,
    stage,
    unstage,
    discard,
    commit,
    initRepository,
    push,
    pull,
    fetch,
    createBranch,
    checkoutBranch,
    merge,
    deleteBranch
  };
}