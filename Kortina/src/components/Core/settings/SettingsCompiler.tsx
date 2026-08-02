import React from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { Select } from '../Select';
interface SettingsCompilerProps {
  tempCompilerUseSystemPath: boolean;
  setTempCompilerUseSystemPath: (use: boolean) => void;
  tempCompilerPath: string;
  setTempCompilerPath: (path: string) => void;
  tempCompilerTargetType: 'asm' | 'ir' | 'exe';
  setTempCompilerTargetType: (type: 'asm' | 'ir' | 'exe') => void;
  tempCompilerOutputFile: string;
  setTempCompilerOutputFile: (file: string) => void;
  tempCompilerShowIR: boolean;
  setTempCompilerShowIR: (show: boolean) => void;
  isTauriEnv: boolean;
  openFileSelector: () => void;
  detectCompilerPath: () => void;
}
export const SettingsCompiler: React.FC<SettingsCompilerProps> = ({
  tempCompilerUseSystemPath,
  setTempCompilerUseSystemPath,
  tempCompilerPath,
  setTempCompilerPath,
  tempCompilerTargetType,
  setTempCompilerTargetType,
  tempCompilerOutputFile,
  setTempCompilerOutputFile,
  tempCompilerShowIR,
  setTempCompilerShowIR,
  isTauriEnv,
  openFileSelector,
  detectCompilerPath
}) => <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">使用系统PATH</span>
        <span className="setting-description">使用系统PATH中的编译器，而不是指定路径</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempCompilerUseSystemPath} onChange={e => setTempCompilerUseSystemPath(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    {!tempCompilerUseSystemPath && <div className="setting-item">
        <div className="setting-info">
          <span className="setting-name">编译器路径</span>
          <span className="setting-description">KairoteLang 编译器的完整路径</span>
        </div>
        <div className="setting-control" style={{
      flexDirection: 'column',
      alignItems: 'flex-end'
    }}>
          <div className="setting-input-row">
            <input type="text" className="setting-input" value={tempCompilerPath} onChange={e => setTempCompilerPath(e.target.value)} placeholder="kairote 可执行文件路径（留空则使用系统 PATH）" />
            <button type="button" onClick={openFileSelector} className="setting-icon-btn" title="浏览文件" disabled={!isTauriEnv}>
              <FolderOpen size={16} />
            </button>
            <button type="button" onClick={detectCompilerPath} className="setting-icon-btn" title="自动检测编译器" disabled={!isTauriEnv}>
              <Search size={16} />
            </button>
          </div>
          {!isTauriEnv && <div className="setting-inline-hint">
              文件选择功能仅在桌面应用中可用
            </div>}
        </div>
      </div>}
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">目标类型</span>
        <span className="setting-description">编译输出的文件类型</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={tempCompilerTargetType} onChange={(v: string) => setTempCompilerTargetType(v as 'asm' | 'ir' | 'exe')} options={[{
        value: 'asm',
        label: '汇编代码 (asm)'
      }, {
        value: 'ir',
        label: '中间代码 (ir)'
      }, {
        value: 'exe',
        label: '可执行文件 (exe)'
      }]} ariaLabel="目标类型" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">输出文件</span>
        <span className="setting-description">编译输出文件的路径（可选）</span>
      </div>
      <div className="setting-control">
        <input type="text" className="setting-input setting-input--wide" value={tempCompilerOutputFile} onChange={e => setTempCompilerOutputFile(e.target.value)} placeholder="可选，默认为输入文件名.扩展名" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">显示IR</span>
        <span className="setting-description">编译时显示中间代码</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempCompilerShowIR} onChange={e => setTempCompilerShowIR(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  </div>;