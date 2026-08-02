import { useCallback, useMemo, useState } from 'react';
import { useEditorStore, useCompileStore } from '../stores';
import { readFile, writeFile } from '../utils/fileSystem';
import { detectLanguage } from '../utils/languageDetection';
import type { Tab } from '../types/app';
export interface UseEditorTabsOptions {
  isTauri: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}
export const useEditorTabs = ({
  isTauri,
  autoSave,
  autoSaveInterval
}: UseEditorTabsOptions) => {
  const {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
    setEditorContent,
    updateTab,
    setCompileErrors
  } = useEditorStore();
  const {
    setOutput: setCompileOutput
  } = useCompileStore();
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const currentTab = useMemo(() => tabs.find(tab => tab.id === activeTab), [tabs, activeTab]);
  const saveCurrentFile = useCallback(async () => {
    if (!activeTab) return;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;
    try {
      const result = await writeFile(currentTab.id, currentTab.content);
      if (result.success) {
        updateTab(activeTab, {
          isDirty: false
        });
        setCompileOutput('文件已保存');
        setCompileErrors([]);
        if (isTauri) {
          import('../utils/fileCache').then(({
            cacheFile
          }) => cacheFile(currentTab.id, currentTab.content)).catch(console.error);
        }
      } else {
        setCompileOutput(`保存失败: ${result.message}`);
      }
    } catch (error) {
      setCompileOutput(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [activeTab, tabs, updateTab, setCompileOutput, setCompileErrors, isTauri]);
  const updateTabContent = useCallback((tabId: string, content: string) => {
    updateTab(tabId, {
      content,
      isDirty: true
    });
    if (activeTab === tabId) setEditorContent(content);
    if (isTauri) {
      import('../utils/fileCache').then(({
        cacheFile
      }) => cacheFile(tabId, content)).catch(console.error);
    }
    if (autoSave) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => saveCurrentFile(), autoSaveInterval * 1000);
      setAutoSaveTimer(timer);
    }
  }, [activeTab, updateTab, setEditorContent, isTauri, autoSave, autoSaveInterval, autoSaveTimer, saveCurrentFile]);
  const openFile = useCallback(async (filePath: string, fileName: string) => {
    try {
      const existingTab = tabs.find(tab => tab.id === filePath);
      if (existingTab) {
        setActiveTab(existingTab.id);
        setEditorContent(existingTab.content);
        return;
      }
      const fileContent = await readFile(filePath);
      const newTab: Tab = {
        id: filePath,
        name: fileName,
        content: fileContent.content,
        isDirty: false,
        language: detectLanguage(fileName)
      };
      setTabs([...tabs, newTab]);
      setActiveTab(newTab.id);
      setEditorContent(newTab.content);
      if (isTauri) {
        import('../utils/fileCache').then(({
          cacheFile
        }) => cacheFile(filePath, newTab.content)).catch(console.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setCompileOutput(`打开文件失败: ${errorMessage}`);
    }
  }, [tabs, setTabs, setActiveTab, setEditorContent, setCompileOutput, isTauri]);
  const closeTab = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      if (newTabs.length > 0) {
        const newActiveTab = tabIndex > 0 ? newTabs[tabIndex - 1] : newTabs[0];
        setActiveTab(newActiveTab.id);
        setEditorContent(newActiveTab.content);
      } else {
        setActiveTab(null);
        setEditorContent('');
      }
    }
  }, [tabs, activeTab, setTabs, setActiveTab, setEditorContent]);
  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) setEditorContent(tab.content);
  }, [tabs, setActiveTab, setEditorContent]);
  return {
    tabs,
    activeTab,
    currentTab,
    openFile,
    closeTab,
    updateTabContent,
    saveCurrentFile,
    handleTabClick
  };
};