import React from 'react';
import { Select } from '../Select';
interface SettingsEditorProps {
  tempFontSize: number;
  setTempFontSize: (size: number) => void;
  tempFontFamily: string;
  setTempFontFamily: (family: string) => void;
  tempFontLigatures: boolean;
  setTempFontLigatures: (ligatures: boolean) => void;
  tempSyntaxTheme: 'default' | 'jetbrains' | 'vscode' | 'monokai';
  setTempSyntaxTheme: (theme: 'default' | 'jetbrains' | 'vscode' | 'monokai') => void;
  tempTabSize: number;
  setTempTabSize: (size: number) => void;
  tempWordWrap: boolean;
  setTempWordWrap: (wrap: boolean) => void;
  tempShowLineNumbers: boolean;
  setTempShowLineNumbers: (show: boolean) => void;
  tempShowMinimap: boolean;
  setTempShowMinimap: (show: boolean) => void;
  tempEnableCodeLens: boolean;
  setTempEnableCodeLens: (enable: boolean) => void;
}
export const SettingsEditor: React.FC<SettingsEditorProps> = ({
  tempFontSize,
  setTempFontSize,
  tempFontFamily,
  setTempFontFamily,
  tempFontLigatures,
  setTempFontLigatures,
  tempSyntaxTheme,
  setTempSyntaxTheme,
  tempTabSize,
  setTempTabSize,
  tempWordWrap,
  setTempWordWrap,
  tempShowLineNumbers,
  setTempShowLineNumbers,
  tempShowMinimap,
  setTempShowMinimap,
  tempEnableCodeLens,
  setTempEnableCodeLens
}) => <div className="settings-scroll-container">
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">字体大小</span>
        <span className="setting-description">控制编辑器中的字体大小</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={String(tempFontSize)} onChange={(v: string) => setTempFontSize(Number(v))} options={[{
        value: '12',
        label: '12px'
      }, {
        value: '14',
        label: '14px'
      }, {
        value: '16',
        label: '16px'
      }, {
        value: '18',
        label: '18px'
      }, {
        value: '20',
        label: '20px'
      }, {
        value: '22',
        label: '22px'
      }, {
        value: '24',
        label: '24px'
      }]} ariaLabel="字体大小" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">字体族</span>
        <span className="setting-description">选择编辑器字体样式</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={tempFontFamily} onChange={(v: string) => setTempFontFamily(v)} options={[{
        value: 'LitalagicaL Mono',
        label: 'Lita Mono'
      }, {
        value: 'LitalagicaL Mono NL',
        label: 'Lita Mono NL'
      }, {
        value: 'LitalagicaL Mono Variable',
        label: 'Lita Mono Variable'
      }, {
        value: 'LitalagicaL Mono Light',
        label: 'Lita Mono Light'
      }, {
        value: 'LitalagicaL Mono Medium',
        label: 'Lita Mono Medium'
      }, {
        value: 'LitalagicaL Mono SemiBold',
        label: 'Lita Mono SemiBold'
      }, {
        value: 'LitalagicaL Mono Bold',
        label: 'Lita Mono Bold'
      }, {
        value: 'LitalagicaL Mono ExtraBold',
        label: 'Lita Mono ExtraBold'
      }, {
        value: 'LitalagicaL Mono Thin',
        label: 'Lita Mono Thin'
      }, {
        value: 'LitalagicaL Mono ExtraLight',
        label: 'Lita Mono ExtraLight'
      }]} ariaLabel="字体族" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">字体连字</span>
        <span className="setting-description">启用字体连字效果</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempFontLigatures} onChange={e => setTempFontLigatures(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">语法高亮主题</span>
        <span className="setting-description">选择代码高亮配色方案</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={tempSyntaxTheme} onChange={(v: string) => setTempSyntaxTheme(v as 'default' | 'jetbrains' | 'vscode' | 'monokai')} options={[{
        value: 'default',
        label: '默认'
      }, {
        value: 'jetbrains',
        label: 'JetBrains'
      }, {
        value: 'vscode',
        label: 'VS Code'
      }, {
        value: 'monokai',
        label: 'Monokai'
      }]} ariaLabel="语法高亮主题" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">Tab 大小</span>
        <span className="setting-description">按下 Tab 键时插入的空格数量</span>
      </div>
      <div className="setting-control">
        <Select className="setting-select" value={String(tempTabSize)} onChange={(v: string) => setTempTabSize(Number(v))} options={[{
        value: '2',
        label: '2 个空格'
      }, {
        value: '4',
        label: '4 个空格'
      }, {
        value: '8',
        label: '8 个空格'
      }]} ariaLabel="Tab 大小" />
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">自动换行</span>
        <span className="setting-description">根据编辑器宽度自动换行</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempWordWrap} onChange={e => setTempWordWrap(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">显示行号</span>
        <span className="setting-description">在编辑器左侧显示行号</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempShowLineNumbers} onChange={e => setTempShowLineNumbers(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">显示小地图</span>
        <span className="setting-description">在编辑器右侧显示代码概览</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempShowMinimap} onChange={e => setTempShowMinimap(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-name">代码提示</span>
        <span className="setting-description">启用智能代码补全和提示</span>
      </div>
      <div className="setting-control">
        <label className="switch">
          <input type="checkbox" checked={tempEnableCodeLens} onChange={e => setTempEnableCodeLens(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  </div>;