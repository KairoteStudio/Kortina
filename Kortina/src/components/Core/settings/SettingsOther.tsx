import React from 'react';
interface SettingsOtherProps {
  onReset: () => void;
}
export const SettingsOther: React.FC<SettingsOtherProps> = ({
  onReset
}) => <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">重置所有设置</span>
        <span className="setting-description">将所有设置恢复为默认值</span>
      </div>
      <div className="setting-control">
        <button className="settings-btn settings-btn-reset" onClick={onReset}>
          重置
        </button>
      </div>
    </div>
  </div>;