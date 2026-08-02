import React from 'react';
import { Select } from '../Select';
import { Slider } from '../Slider';
interface SettingsGeneralProps {
  tempTheme: 'light' | 'dark';
  setTempTheme: (theme: 'light' | 'dark') => void;
  tempThemeGroup: 'default' | 'islandtheme';
  setTempThemeGroup: (group: 'default' | 'islandtheme') => void;
  tempUiZoom: number;
  setTempUiZoom: (zoom: number) => void;
}
export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({
  tempTheme,
  setTempTheme,
  tempThemeGroup,
  setTempThemeGroup,
  tempUiZoom,
  setTempUiZoom
}) => <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">主题</span>
        <span className="setting-description">选择主题（每套包含明/暗两套配色）</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={tempThemeGroup} onChange={(v: string) => setTempThemeGroup(v as 'default' | 'islandtheme')} options={[{
        value: 'default',
        label: 'Kortina Theme(默认主题)'
      }, {
        value: 'islandtheme',
        label: 'IslandTheme (岛屿主题)'
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
        <span className="setting-name">界面缩放</span>
        <span className="setting-description">整体界面缩放比例</span>
      </div>
      <div className="setting-control setting-range-container">
        <Slider min={0.6} max={1.25} step={0.05} value={tempUiZoom} onChange={setTempUiZoom} formatValue={(v: number) => `${Math.round(v * 100)}%`} ariaLabel="界面缩放" width={150} />
      </div>
    </div>
  </div>;