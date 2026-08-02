import React from 'react';
import { Slider } from '../Slider';
interface SettingsFilesProps {
  tempAutoSave: boolean;
  setTempAutoSave: (auto: boolean) => void;
  tempAutoSaveInterval: number;
  setTempAutoSaveInterval: (interval: number) => void;
}
export const SettingsFiles: React.FC<SettingsFilesProps> = ({
  tempAutoSave,
  setTempAutoSave,
  tempAutoSaveInterval,
  setTempAutoSaveInterval
}) => <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">自动保存</span>
        <span className="setting-description">失去焦点或更改后自动保存文件</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempAutoSave} onChange={e => setTempAutoSave(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    {tempAutoSave && <div className="setting-item">
        <div className="setting-info">
          <span className="setting-name">保存间隔</span>
          <span className="setting-description">自动保存的时间间隔（秒）</span>
        </div>
        <div className="setting-control setting-range-container">
          <Slider min={10} max={300} step={10} value={tempAutoSaveInterval} onChange={setTempAutoSaveInterval} formatValue={(v: number) => `${v}s`} ariaLabel="自动保存间隔" width={150} />
        </div>
      </div>}
  </div>;