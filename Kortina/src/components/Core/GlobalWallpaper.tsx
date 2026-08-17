import React, { useEffect, useState } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';
interface GlobalWallpaperProps {
  imagePath: string;
  opacity: number;
}

export const GlobalWallpaper: React.FC<GlobalWallpaperProps> = ({ imagePath, opacity }) => {
  const [dataImageUrl, setDataImageUrl] = useState<string>('');
  
  useEffect(() => {
    if (!imagePath) {
      setDataImageUrl('');
      return;
    }

    async function loadImageAsDataUrl() {
      try {
        console.log('[GlobalWallpaper] Loading wallpaper from path:', imagePath);

        const uint8Array = await readFile(imagePath);
        
        let mimeType = 'image/png';
        if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
          mimeType = 'image/jpeg';
        } else if (imagePath.endsWith('.gif')) {
          mimeType = 'image/gif';
        } else if (imagePath.endsWith('.webp')) {
          mimeType = 'image/webp';
        }

        let binaryString = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
          binaryString += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binaryString);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        console.log('[GlobalWallpaper] Successfully loaded wallpaper as data URL, length:', dataUrl.length);
        setDataImageUrl(dataUrl);
      } catch (error) {
        console.error('[GlobalWallpaper] Failed to load wallpaper:', error);
        setDataImageUrl('');
      }
    }

    loadImageAsDataUrl();
  }, [imagePath]);

  if (!dataImageUrl || !imagePath) {
    return null;
  }

  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("${dataImageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: opacity / 100,
    zIndex: -1,
    pointerEvents: 'none'
  }} />;
};