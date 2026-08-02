import React from 'react';
import { useUpdater } from '../../../hooks/useUpdater';
import { Select } from '../Select';
import type { UpdateChannel } from '../../../stores/UpdaterStore';

interface SettingsAboutProps {
  isTauriEnv: boolean;
  openExternalUrl?: (url: string) => void;
}

const CHANNEL_OPTIONS = [
  { value: 'stable', label: 'Stable (稳定版)' },
  { value: 'canary', label: 'Canary (预览版)' },
  { value: 'nightly', label: 'Nightly (夜晚构建)' },
];

const STATUS_LABELS: Record<string, string> = {
  idle: '等待检查',
  checking: '正在检查更新...',
  available: '发现新版本!',
  downloading: '正在下载更新...',
  ready: '下载完成，准备安装',
  error: '检查更新失败',
};

export const SettingsAbout: React.FC<SettingsAboutProps> = ({
  isTauriEnv,
  openExternalUrl
}) => {
  const {
    status,
    info,
    progress,
    error,
    channel,
    lastCheck,
    checkForUpdates,
    downloadAndInstall,
    updateChannel,
  } = useUpdater();

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return <div className="settings-scroll-container">
    <div className="about-container">
      <div className="about-header">
        <h2>Kortina IDE</h2>
        <p className="about-version">版本编号:26.V5.0</p>
        <p className="about-codename">版本代号:Tluce</p>
      </div>

      {isTauriEnv && (
        <div className="about-section">
          <h3>更新</h3>
          <div className="about-info">
            <div className="info-item">
              <span className="info-label">更新渠道:</span>
              <div className="info-value info-value-row">
                <Select
                  className="about-channel-select"
                  value={channel}
                  options={CHANNEL_OPTIONS}
                  onChange={(v: string) => updateChannel(v as UpdateChannel)}
                  ariaLabel="更新渠道"
                />
                <button
                  className="about-btn about-btn-small"
                  onClick={checkForUpdates}
                  disabled={status === 'checking' || status === 'downloading'}
                >
                  {status === 'checking' ? '检查中...' : '检查更新'}
                </button>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">更新状态:</span>
              <span className="info-value">{STATUS_LABELS[status] || status}</span>
            </div>
            <div className="info-item">
              <span className="info-label">上次检查:</span>
              <span className="info-value">{formatDate(lastCheck)}</span>
            </div>

            {status === 'downloading' && (
              <div className="info-item">
                <span className="info-label">下载进度:</span>
                <span className="info-value">
                  <progress value={progress} max={100} style={{ width: '100%' }} />
                  {progress}%
                </span>
              </div>
            )}

            {status === 'available' && info && (
              <div className="info-item">
                <span className="info-label">新版本:</span>
                <span className="info-value">{info.version}</span>
              </div>
            )}

            {status === 'error' && error && (
              <div className="info-item">
                <span className="info-label">错误信息:</span>
                <span className="info-value" style={{ color: 'var(--error-color, #f44)' }}>{error}</span>
              </div>
            )}
          </div>

          {status === 'available' && (
            <div className="update-actions">
              <button
                className="about-btn about-btn-primary"
                onClick={downloadAndInstall}
              >
                下载并安装
              </button>
            </div>
          )}
        </div>
      )}

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
};