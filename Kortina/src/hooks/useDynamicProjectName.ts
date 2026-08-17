import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../stores/ProjectStore';
import { VcsService } from '../services/vcs';

export function useDynamicProjectName(): string {
  const { currentProjectPath } = useProjectStore();
  const [projectName, setProjectName] = useState<string>('Kortina');

  const updateProjectName = useCallback(async () => {
    if (!currentProjectPath) {
      setProjectName('Kortina');
      return;
    }

    try {
      
      const isRepo = await VcsService.isGitRepository(currentProjectPath);
      if (isRepo) {
        
        const remotes = await VcsService.getRemotes(currentProjectPath);
        if (remotes.length > 0) {
          
          const remoteUrl = remotes[0].url;
          const repoName = extractRepoNameFromUrl(remoteUrl);
          if (repoName) {
            setProjectName(repoName);
            return;
          }
        }
      }
    } catch (error) {
      console.debug('获取 Git 远程仓库信息失败:', error);
    }

    
    const normalized = currentProjectPath.replace(/\\/g, '/');
    const folderName = normalized.split('/').filter(Boolean).pop() || 'Kortina';
    setProjectName(folderName);
  }, [currentProjectPath]);

  useEffect(() => {
    updateProjectName();
  }, [updateProjectName]);

  return projectName;
}

function extractRepoNameFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    
    if (url.startsWith('git@')) {
      const match = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        return match[2];
      }
    }

    
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const repoName = pathParts[pathParts.length - 1];
      
      return repoName.replace(/\.git$/, '');
    }
  } catch {
    
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  }

  return null;
}
