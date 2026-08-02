import React from 'react';
interface SettingsAboutProps {
  isTauriEnv: boolean;
  openExternalUrl?: (url: string) => void;
}
export const SettingsAbout: React.FC<SettingsAboutProps> = ({
  isTauriEnv,
  openExternalUrl
}) => <div className="settings-scroll-container">
    <div className="about-container">
      <div className="about-header">
        <h2>Kortina IDE</h2>
        <p className="about-version">版本编号:26.V5.0</p>
        <p className="about-codename">版本代号:Tluce</p>
      </div>
      <div className="about-section">
        <h3>关于 Kortina</h3>
        <p>Kortina 是一个现代化的集成开发环境，专为提高开发效率而设计。</p>
        <p>我们致力于提供简洁、高效、可定制的编程体验。</p>
      </div>
      <div className="about-section">
        <h3>关于我们</h3>
        <p>KairoteStudio是一家普通团队，项目有：
          <ul>
            <li>Kortina IDE</li>
            <li>KairoteLang 编程语言</li>
          </ul>
          <button className="about-btn" onClick={() => openExternalUrl ? openExternalUrl('https://kairot.es') : window.open('https://kairot.es', '_blank')}>
            访问我们的网站
          </button>
        </p>
      </div>
      <div className="about-section">
        <h3>技术信息</h3>
        <div className="about-info">
          <div className="info-item">
            <span className="info-label">构建版本:</span>
            <span className="info-value">26.V5.0 (Tluce) | beta/PreRelease/Nightly</span>
          </div>
          <div className="info-item">
            <span className="info-label">运行环境:</span>
            <span className="info-value">{isTauriEnv ? '桌面应用' : 'Web 应用'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">运行目录类型:</span>
            <span className="info-value">{isTauriEnv ? '本地文件系统' : '浏览器存储'}</span>
          </div>
        </div>
      </div>
      <div className="about-footer">
        <p>© 2026 Kortina IDE. 保留所有权利。</p>
      </div>
    </div>
  </div>;