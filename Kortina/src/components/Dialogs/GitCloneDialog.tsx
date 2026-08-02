import React, { useState, useCallback } from 'react';
import { ProgressDialog, PathSelectDialog, BranchInputDialog, SshKeySelectDialog } from '.';
import { DialogShell, FormField, DialogActions } from './primitives';
import './Dialogs.css';
export interface GitCloneOptions {
  repoUrl: string;
  targetPath: string;
  branch?: string;
  authType?: 'none' | 'basic' | 'token' | 'ssh';
  username?: string;
  password?: string;
  token?: string;
  sshKeyPath?: string;
}
interface GitCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: GitCloneOptions) => void;
  defaultTargetPath?: string;
}
const authOptions: Array<{
  type: GitCloneOptions['authType'];
  label: string;
  desc: string;
}> = [{
  type: 'none',
  label: '无需认证（公开仓库）',
  desc: '适用于公开的Git仓库'
}, {
  type: 'basic',
  label: '用户名/密码认证',
  desc: '使用Git账号密码'
}, {
  type: 'token',
  label: '个人访问令牌',
  desc: 'GitHub/GitLab等平台令牌'
}, {
  type: 'ssh',
  label: 'SSH密钥',
  desc: '使用SSH私钥认证'
}];
export const GitCloneDialog: React.FC<GitCloneDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultTargetPath = ''
}) => {
  const [step, setStep] = useState<'url' | 'auth' | 'ssh-key' | 'path' | 'branch'>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [targetPath, setTargetPath] = useState(defaultTargetPath);
  const [authType, setAuthType] = useState<NonNullable<GitCloneOptions['authType']>>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [sshKeyPath, setSshKeyPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      resetState();
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose, isClosing]);
  const resetState = () => {
    setStep('url');
    setRepoUrl('');
    setTargetPath('');
    setAuthType('none');
    setUsername('');
    setPassword('');
    setToken('');
    setSshKeyPath('');
    setIsProcessing(false);
    setProgressMessage('');
    setProgressPercent(0);
  };
  const handleUrlSubmit = (url: string) => {
    setRepoUrl(url);
    if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org')) {
      setStep('auth');
    } else {
      setStep('path');
    }
  };
  const handleAuthSubmit = () => {
    if (authType === 'ssh') {
      setStep('ssh-key');
    } else {
      setStep('path');
    }
  };
  const handlePathSubmit = (path: string) => {
    setTargetPath(path);
    setStep('branch');
  };
  const handleBranchSubmit = (branch: string) => {
    const finalBranch = branch.trim() || undefined;
    const options: GitCloneOptions = {
      repoUrl,
      targetPath,
      branch: finalBranch,
      authType: authType !== 'none' ? authType : undefined,
      username: authType === 'basic' ? username : undefined,
      password: authType === 'basic' ? password : undefined,
      token: authType === 'token' ? token : undefined,
      sshKeyPath: authType === 'ssh' ? sshKeyPath : undefined
    };
    setIsProcessing(true);
    setProgressMessage('正在克隆仓库...');
    setProgressPercent(0);
    onConfirm(options);
  };
  const handleSshKeySubmit = (keyPath: string) => {
    setSshKeyPath(keyPath);
    setStep('path');
  };
  const validateRepoUrl = (url: string): boolean => {
    const gitUrlPattern = /^(https?:\/\/|git@)[\w\-\.]+[:\/]([\w\-\.\/]+)\.git$/;
    const githubPattern = /^https?:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/;
    const gitlabPattern = /^https?:\/\/gitlab\.com\/[\w\-\.]+\/[\w\-\.]+$/;
    const bitbucketPattern = /^https?:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+$/;
    return gitUrlPattern.test(url) || githubPattern.test(url) || gitlabPattern.test(url) || bitbucketPattern.test(url);
  };
  if (!isOpen && !isClosing) return null;
  if (isProcessing) {
    return <div className={`dialog-backdrop ${isClosing ? 'closing' : ''}`}>
        <ProgressDialog isOpen={true} title="克隆仓库" message={progressMessage} progress={progressPercent} onCancel={handleClose} />
      </div>;
  }
  switch (step) {
    case 'url':
      return <DialogShell isOpen={isOpen} onClose={handleClose} title="从Git克隆仓库" footer={<DialogActions>
              <button className="dialog-btn dialog-btn-secondary" onClick={handleClose}>
                取消
              </button>
              <button onClick={() => handleUrlSubmit(repoUrl)} disabled={!validateRepoUrl(repoUrl)} className="dialog-btn dialog-btn-primary">
                下一步
              </button>
            </DialogActions>}>
          <FormField label="Git仓库URL" helpText="支持格式: https:// 或 git@">
            <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="请输入Git仓库URL" className="dialog-input" />
          </FormField>
        </DialogShell>;
    case 'auth':
      return <DialogShell isOpen={isOpen} onClose={handleClose} title="选择认证方式" footer={<DialogActions>
              <button onClick={() => setStep('url')} className="dialog-btn dialog-btn-secondary">
                上一步
              </button>
              <button onClick={handleAuthSubmit} className="dialog-btn dialog-btn-primary">
                下一步
              </button>
            </DialogActions>}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
            {authOptions.map(({
            type,
            label,
            desc
          }) => <div key={type} onClick={() => setAuthType(type!)} style={{
            padding: '12px',
            border: `2px solid ${authType === type ? 'var(--bg-primary)' : 'var(--border-color)'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: authType === type ? 'var(--bg-primary)' : 'var(--bg-secondary)'
          }}>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '4px'
            }}>
                  <input type="radio" name="auth-type" value={type} checked={authType === type} onChange={() => setAuthType(type!)} style={{
                marginRight: '8px'
              }} />
                  <span style={{
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>{label}</span>
                </div>
                <p style={{
              margin: '0 0 0 20px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>{desc}</p>
              </div>)}

            {authType === 'basic' && <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
                <FormField label="用户名">
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="请输入用户名" className="dialog-input" />
                </FormField>
                <FormField label="密码">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" className="dialog-input" />
                </FormField>
              </div>}

            {authType === 'token' && <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            marginTop: '16px'
          }}>
                <FormField label="个人访问令牌" helpText="支持GitHub、GitLab、Bitbucket等平台的个人访问令牌">
                  <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="请输入个人访问令牌" className="dialog-input" />
                </FormField>
              </div>}

            {authType === 'ssh' && <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            marginTop: '16px'
          }}>
                <FormField label="SSH私钥路径" helpText="请确保已将公钥添加到Git平台">
                  <input type="text" value={sshKeyPath} onChange={e => setSshKeyPath(e.target.value)} placeholder="~/.ssh/id_rsa" className="dialog-input" />
                </FormField>
              </div>}
          </div>
        </DialogShell>;
    case 'path':
      return <PathSelectDialog isOpen={true} onClose={handleClose} onConfirm={handlePathSubmit} title="选择目标路径" defaultPath={targetPath} confirmText="下一步" cancelText="上一步" />;
    case 'ssh-key':
      return <SshKeySelectDialog isOpen={true} onClose={handleClose} onConfirm={handleSshKeySubmit} title="选择SSH私钥" confirmText="下一步" cancelText="上一步" />;
    case 'branch':
      return <BranchInputDialog isOpen={true} onClose={handleClose} onConfirm={handleBranchSubmit} title="选择分支（可选）" defaultBranch="" confirmText="完成" cancelText="上一步" />;
    default:
      return null;
  }
};
export default GitCloneDialog;