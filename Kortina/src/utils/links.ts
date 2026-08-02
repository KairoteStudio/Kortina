import { isTauri } from './environment';
export const openExternalUrl = async (url: string): Promise<void> => {
  try {
    if (isTauri()) {
      const {
        openUrl
      } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error('Failed to open external URL:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};