use crate::fs::file_ops::FileOperationResult;
use std::fs;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};

#[cfg(windows)]
const WINDOWS_CREATION_FLAGS: u32 = 0x08000000;

pub async fn git_clone(
    repo_url: String,
    target_path: String,
    branch: Option<String>,
    auth_type: Option<String>,
    username: Option<String>,
    password: Option<String>,
    token: Option<String>,
) -> Result<FileOperationResult, String> {
    let target = Path::new(&target_path);
    if target.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "目标路径已存在".to_string(),
        });
    }

    if let Some(parent) = target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建父目录失败: {}", e))?;
        }
    }

    let mut args = vec!["clone"];

    if let Some(ref branch_name) = branch {
        args.push("--branch");
        args.push(branch_name);
        args.push("--single-branch");
    }

    let final_repo_url = match auth_type.as_deref() {
        Some("basic") => {
            if let (Some(user), Some(pwd)) = (username.as_ref(), password.as_ref()) {
                if repo_url.starts_with("https://") {
                    let encoded_user = urlencoding::encode(user);
                    let encoded_pwd = urlencoding::encode(pwd);
                    repo_url.replacen(
                        "https://",
                        &format!("https://{}:{}@", encoded_user, encoded_pwd),
                        1,
                    )
                } else {
                    repo_url.clone()
                }
            } else {
                repo_url.clone()
            }
        }
        Some("token") => {
            if let Some(token_str) = token.as_ref() {
                if repo_url.starts_with("https://") {
                    repo_url.replacen("https://", &format!("https://{}@", token_str), 1)
                } else if repo_url.starts_with("http://") {
                    repo_url.replacen("http://", &format!("http://{}@", token_str), 1)
                } else {
                    repo_url.clone()
                }
            } else {
                repo_url.clone()
            }
        }
        _ => repo_url.clone(),
    };

    args.push(&final_repo_url);
    args.push(&target_path);

    println!("[Git] Cloning repository into {}", target_path);

    let output = tokio::time::timeout(std::time::Duration::from_secs(300), async {
        let mut cmd = Command::new("git");
        cmd.args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(WINDOWS_CREATION_FLAGS);

        cmd.output()
    })
    .await
    .map_err(|_| "Git克隆超时, 请检查网络连接或仓库大小")?
    .map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "未找到Git命令, 请确保Git已安装并添加到系统PATH中".to_string()
        } else {
            format!("执行Git命令失败: {}", e)
        }
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        eprintln!(
            "[Git] Clone failed with exit code {:?}",
            output.status.code()
        );
    }

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: format!("Git克隆成功: {}", repo_url),
        })
    } else {
        let error_msg = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "Git克隆失败, 未知错误".to_string()
        };

        Ok(FileOperationResult {
            success: false,
            message: format!("Git克隆失败: {}", error_msg.trim()),
        })
    }
}
