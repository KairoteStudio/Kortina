import { useCallback, useEffect } from 'react';
import { useUpdaterStore } from '../stores/UpdaterStore';
import { isTauri } from '../utils/environment';
import { getVersion } from '@tauri-apps/api/app';

export const useUpdater = () => {
  const status = useUpdaterStore(s => s.status);
  const info = useUpdaterStore(s => s.info);
  const progress = useUpdaterStore(s => s.progress);
  const error = useUpdaterStore(s => s.error);
  const channel = useUpdaterStore(s => s.channel);
  const lastCheck = useUpdaterStore(s => s.lastCheck);
  const setStatus = useUpdaterStore(s => s.setStatus);
  const setInfo = useUpdaterStore(s => s.setInfo);
  const setProgress = useUpdaterStore(s => s.setProgress);
  const setError = useUpdaterStore(s => s.setError);
  const setChannel = useUpdaterStore(s => s.setChannel);
  const setLastCheck = useUpdaterStore(s => s.setLastCheck);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) {
      return null;
    }
    try {
      setStatus('checking');
      setError(null);
      const { check } = await import('@tauri-apps/plugin-updater');
      const currentVersion = await getVersion();
      const update = await check();
      if (update) {
        setInfo({
          version: update.version,
          currentVersion,
          date: update.date,
          body: update.body,
        });
        setStatus('available');
        setLastCheck(Date.now());
        return update;
      } else {
        setInfo(null);
        setStatus('idle');
        setLastCheck(Date.now());
        return null;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setStatus('error');
      return null;
    }
  }, [setStatus, setError, setInfo, setLastCheck]);

  const downloadAndInstall = useCallback(async () => {
    if (!isTauri()) {
      return false;
    }
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) {
        return false;
      }
      setStatus('downloading');
      setProgress(0);
      let downloaded = 0;
      let totalLength = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setProgress(0);
            totalLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (totalLength > 0) {
              setProgress(Math.round((downloaded / totalLength) * 100));
            }
            break;
          case 'Finished':
            setProgress(100);
            setStatus('ready');
            break;
        }
      });
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setStatus('error');
      return false;
    }
  }, [setStatus, setProgress, setError]);

  useEffect(() => {
    if (!isTauri()) return;
    const savedChannel = localStorage.getItem('kortina_update_channel');
    if (savedChannel === 'nightly' || savedChannel === 'canary' || savedChannel === 'stable') {
      setChannel(savedChannel);
    }
  }, [setChannel]);

  const updateChannel = useCallback((newChannel: string) => {
    if (!['nightly', 'canary', 'stable'].includes(newChannel)) {
      setError('无效的渠道值');
      return;
    }
    setChannel(newChannel as 'nightly' | 'canary' | 'stable');
    localStorage.setItem('kortina_update_channel', newChannel);

    // Note: Tauri updater plugin doesn't expose a setChannel API
    // Channel switching is handled via tauri.conf.json endpoint configuration
    console.log(`Update channel changed to: ${newChannel}`);
  }, [setChannel, setError]);

  return {
    status,
    info,
    progress,
    error,
    channel,
    lastCheck,
    checkForUpdates,
    downloadAndInstall,
    updateChannel,
  };
};