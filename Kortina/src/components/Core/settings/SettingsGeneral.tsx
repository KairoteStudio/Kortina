import React from 'react';
import { Select } from '../Select';
import { Slider } from '../Slider';
import { isTauri } from '../../../utils/environment';
interface SettingsGeneralProps {
  tempTheme: 'light' | 'dark';
  setTempTheme: (theme: 'light' | 'dark') => void;
  tempThemeGroup: 'default' | 'islandtheme' | 'fleet';
  setTempThemeGroup: (group: 'default' | 'islandtheme' | 'fleet') => void;
  tempUiZoom: number;
  setTempUiZoom: (zoom: number) => void;
  tempGlobalWallpaperImage: string;
  setTempGlobalWallpaperImage: (path: string) => void;
  tempGlobalWallpaperOpacity: number;
  setTempGlobalWallpaperOpacity: (opacity: number) => void;
  tempEditorBackgroundImage: string;
  setTempEditorBackgroundImage: (path: string) => void;
  tempEditorBackgroundOpacity: number;
  setTempEditorBackgroundOpacity: (opacity: number) => void;
  tempWallpaperMode: 'none' | 'global' | 'editor';
  setTempWallpaperMode: (mode: 'none' | 'global' | 'editor') => void;
  tempFleetLayout: boolean;
  setTempFleetLayout: (enabled: boolean) => void;
}
export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({
  tempTheme,
  setTempTheme,
  tempThemeGroup,
  setTempThemeGroup,
  tempUiZoom,
  setTempUiZoom,
  tempGlobalWallpaperImage,
  setTempGlobalWallpaperImage,
  tempGlobalWallpaperOpacity,
  setTempGlobalWallpaperOpacity,
  tempEditorBackgroundImage,
  setTempEditorBackgroundImage,
  tempEditorBackgroundOpacity,
  setTempEditorBackgroundOpacity,
  tempWallpaperMode,
  setTempWallpaperMode,
  tempFleetLayout,
  setTempFleetLayout
}) => {
  const isTauriEnv = isTauri();

  const openWallpaperSelector = async () => {
    if (!isTauriEnv) {
      alert('图片选择功能仅在桌面应用中可用');
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: false,
        multiple: false,
        title: '选择全局壁纸',
        filters: [{
          name: '图片文件',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
        }, {
          name: '所有文件',
          extensions: ['*']
        }]
      });
      if (selected && typeof selected === 'string') {
        setTempGlobalWallpaperImage(selected);
      }
    } catch (error) {
      console.error('壁纸选择失败:', error);
      alert('壁纸选择失败: ' + error);
    }
  };

  const openEditorBgSelector = async () => {
    if (!isTauriEnv) {
      alert('图片选择功能仅在桌面应用中可用');
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: false,
        multiple: false,
        title: '选择编辑器背景图',
        filters: [{
          name: '图片文件',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
        }, {
          name: '所有文件',
          extensions: ['*']
        }]
      });
      if (selected && typeof selected === 'string') {
        setTempEditorBackgroundImage(selected);
      }
    } catch (error) {
      console.error('背景图选择失败:', error);
      alert('背景图选择失败: ' + error);
    }
  };

  const handleWallpaperModeChange = (mode: 'none' | 'global' | 'editor') => {
    if (mode === 'global') {
      setTempEditorBackgroundImage('');
    } else if (mode === 'editor') {
      setTempGlobalWallpaperImage('');
    }
    setTempWallpaperMode(mode);
  };

  return <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">主题</span>
        <span className="setting-description">选择主题（每套包含明/暗两套配色）</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={tempThemeGroup} onChange={(v: string) => setTempThemeGroup(v as 'default' | 'islandtheme' | 'fleet')} options={[{
        value: 'default',
        label: 'Kortina Theme(默认主题)'
      }, {
        value: 'islandtheme',
        label: 'IslandTheme (岛屿主题)'
      }, {
        value: 'fleet',
        label: 'Fleet (Fleet 主题)'
      }]} ariaLabel="主题" />
      </div>
    </div>

    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">暗色模式</span>
        <span className="setting-description">启用当前主题的暗色配色</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempTheme === 'dark'} onChange={e => setTempTheme(e.target.checked ? 'dark' : 'light')} />
          <span className="slider"></span>
        </label>
      </div>
    </div>

    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">启用 Fleet UI 布局 (Beta)</span>
        <span className="setting-description">切换到 Fleet 设计稿的 UI 布局（需要 Fleet 主题）</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempFleetLayout} onChange={e => setTempFleetLayout(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>

    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">界面缩放</span>
        <span className="setting-description">整体界面缩放比例</span>
      </div>
      <div className="setting-control setting-range-container">
        <Slider min={0.6} max={1.25} step={0.05} value={tempUiZoom} onChange={setTempUiZoom} formatValue={(v: number) => `${Math.round(v * 100)}%`} ariaLabel="界面缩放" width={150} />
      </div>
    </div>

    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name" style={{ fontSize: '15px', fontWeight: '600' }}>壁纸与背景</span>
        <span className="setting-description">选择一种背景显示方式（二选一）</span>
      </div>
      <div className="setting-control">
        <Select 
          className="setting-select" 
          value={tempWallpaperMode} 
          onChange={(v: string) => handleWallpaperModeChange(v as 'none' | 'global' | 'editor')} 
          options={[
            { value: 'none', label: '无' },
            { value: 'global', label: '全局壁纸' },
            { value: 'editor', label: '编辑器背景' }
          ]} 
          ariaLabel="壁纸模式" 
        />
      </div>
    </div>

    {tempWallpaperMode === 'global' && (
      <>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">全局壁纸图片</span>
            <span className="setting-description">应用到整个应用界面（已自动清除编辑器背景）</span>
          </div>
          <div className="setting-control">
            {tempGlobalWallpaperImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tempGlobalWallpaperImage.split('/').pop() || tempGlobalWallpaperImage}
                </span>
                <button
                  className="settings-btn settings-btn-cancel"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setTempGlobalWallpaperImage('')}
                  title="清除当前壁纸"
                >
                  清除
                </button>
                <button
                  className="settings-btn settings-btn-ok"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={openWallpaperSelector}
                  title="更换壁纸"
                >
                  更换
                </button>
              </div>
            ) : (
              <button
                className="settings-btn settings-btn-ok"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={openWallpaperSelector}
              >
                选择壁纸
              </button>
            )}
          </div>
        </div>

        {tempGlobalWallpaperImage && (
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-name">壁纸透明度</span>
              <span className="setting-description">调整全局壁纸的透明度 ({tempGlobalWallpaperOpacity}%)</span>
            </div>
            <div className="setting-control">
              <Slider
                min={5}
                max={50}
                step={1}
                value={tempGlobalWallpaperOpacity}
                onChange={setTempGlobalWallpaperOpacity}
                formatValue={(v: number) => `${v}%`}
                ariaLabel="壁纸透明度"
                width={150}
              />
            </div>
          </div>
        )}
      </>
    )}

    {tempWallpaperMode === 'editor' && (
      <>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">编辑器背景图片</span>
            <span className="setting-description">仅应用于代码编辑区域（已自动清除全局壁纸）</span>
          </div>
          <div className="setting-control">
            {tempEditorBackgroundImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tempEditorBackgroundImage.split('/').pop() || tempEditorBackgroundImage}
                </span>
                <button
                  className="settings-btn settings-btn-cancel"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setTempEditorBackgroundImage('')}
                  title="清除当前背景"
                >
                  清除
                </button>
                <button
                  className="settings-btn settings-btn-ok"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={openEditorBgSelector}
                  title="更换背景"
                >
                  更换
                </button>
              </div>
            ) : (
              <button
                className="settings-btn settings-btn-ok"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={openEditorBgSelector}
              >
                选择背景图
              </button>
            )}
          </div>
        </div>

        {tempEditorBackgroundImage && (
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-name">背景透明度</span>
              <span className="setting-description">调整编辑器背景的透明度 ({tempEditorBackgroundOpacity}%)</span>
            </div>
            <div className="setting-control">
              <Slider
                min={5}
                max={50}
                step={1}
                value={tempEditorBackgroundOpacity}
                onChange={setTempEditorBackgroundOpacity}
                formatValue={(v: number) => `${v}%`}
                ariaLabel="背景透明度"
                width={150}
              />
            </div>
          </div>
        )}
      </>
    )}
  </div>;
};