use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

use crate::fs::file_ops::FileOperationResult;

#[cfg(windows)]
const WINDOWS_CREATION_FLAGS: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub file_path: String,
    pub original_file_path: Option<String>,
    pub worktree_status: String,
    pub index_status: String,
    pub is_staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub short_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiff {
    pub file_path: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
}

pub async fn git_status(repo_path: String) -> Result<Vec<GitStatus>, String> {
    let output = execute_git_command(&["status", "--porcelain"], &repo_path).await?;

    if !output.status.success() {
        return Err(format!(
            "获取Git状态失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut statuses = Vec::new();

    for line in stdout.lines() {
        if line.len() >= 3 {
            let index_status = line.chars().next().unwrap().to_string();
            let worktree_status = line.chars().nth(1).unwrap().to_string();
            let raw_path = line[3..].to_string();

            
            let (file_path, original_file_path) = if index_status == "R"
                || index_status == "C"
                || worktree_status == "R"
                || worktree_status == "C"
            {
                if let Some(sep_pos) = raw_path.find(" -> ") {
                    let original = raw_path[..sep_pos].to_string();
                    let current = raw_path[sep_pos + 4..].to_string();
                    (current, Some(original))
                } else {
                    (raw_path, None)
                }
            } else {
                (raw_path, None)
            };

            statuses.push(GitStatus {
                file_path,
                original_file_path,
                worktree_status,
                index_status: index_status.clone(),
                is_staged: index_status != " " && index_status != "?",
            });
        }
    }

    Ok(statuses)
}

pub async fn git_init(repo_path: String) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["init"], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "Git仓库初始化成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("Git仓库初始化失败: {}", error_msg),
        })
    }
}

pub async fn git_add(
    repo_path: String,
    file_paths: Vec<String>,
) -> Result<FileOperationResult, String> {
    let mut args = vec!["add"];
    for path in &file_paths {
        args.push(path);
    }

    let output = execute_git_command(&args, &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "文件已添加到暂存区".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("添加文件到暂存区失败: {}", error_msg),
        })
    }
}

pub async fn git_commit(repo_path: String, message: String) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["commit", "-m", &message], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "提交成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("提交失败: {}", error_msg),
        })
    }
}

pub async fn git_log(repo_path: String, limit: Option<u32>) -> Result<Vec<GitCommit>, String> {
    let mut args_vec = vec![
        "log".to_string(),
        "--pretty=format:%H|%h|%an|%ad|%s".to_string(),
        "--date=format:%Y-%m-%dT%H:%M:%S".to_string(),
    ];

    if let Some(limit_val) = limit {
        args_vec.push(format!("-{}", limit_val));
    }

    let args: Vec<&str> = args_vec.iter().map(|s| s.as_str()).collect();
    let output = execute_git_command(&args, &repo_path).await?;

    if !output.status.success() {
        return Err(format!(
            "获取提交历史失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 {
            commits.push(GitCommit {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
                message: parts[4].to_string(),
            });
        }
    }

    Ok(commits)
}

pub async fn git_branch_list(repo_path: String) -> Result<Vec<GitBranch>, String> {
    let output = execute_git_command(&["branch", "-a"], &repo_path).await?;

    if !output.status.success() {
        return Err(format!(
            "获取分支列表失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branches = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if !line.is_empty() {
            let is_current = line.starts_with("* ");
            let name = if is_current { &line[2..] } else { line };

            
            if name.contains("->") {
                continue;
            }

            let is_remote = name.starts_with("remotes/");
            let clean_name = if is_remote {
                name.strip_prefix("remotes/").unwrap_or(name)
            } else {
                name
            };

            branches.push(GitBranch {
                name: clean_name.to_string(),
                is_current,
                is_remote,
            });
        }
    }

    Ok(branches)
}

pub async fn git_checkout(
    repo_path: String,
    branch_name: String,
) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["checkout", &branch_name], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: format!("已切换到分支: {}", branch_name),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("切换分支失败: {}", error_msg),
        })
    }
}

pub async fn git_create_branch(
    repo_path: String,
    branch_name: String,
) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["branch", &branch_name], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: format!("已创建分支: {}", branch_name),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("创建分支失败: {}", error_msg),
        })
    }
}

pub async fn git_diff(
    repo_path: String,
    file_path: Option<String>,
) -> Result<Vec<GitDiff>, String> {
    let mut args = vec!["diff", "--unified=3"];

    if let Some(ref path) = file_path {
        args.push("--");
        args.push(path);
    }

    let output = execute_git_command(&args, &repo_path).await?;

    if !output.status.success() {
        return Err(format!(
            "获取差异失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let diffs = parse_diff_output(&stdout);

    Ok(diffs)
}

pub async fn git_push(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<FileOperationResult, String> {
    let mut args = vec!["push"];

    if let Some(ref r) = remote {
        args.push(r);
    } else {
        args.push("origin");
    }

    if let Some(ref b) = branch {
        args.push(b);
    }

    let output = execute_git_command(&args, &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "推送成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("推送失败: {}", error_msg),
        })
    }
}

pub async fn git_pull(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<FileOperationResult, String> {
    let mut args = vec!["pull"];

    if let Some(ref r) = remote {
        args.push(r);
    } else {
        args.push("origin");
    }

    if let Some(ref b) = branch {
        args.push(b);
    }

    let output = execute_git_command(&args, &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "拉取成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("拉取失败: {}", error_msg),
        })
    }
}

pub async fn git_remote_list(repo_path: String) -> Result<Vec<GitRemote>, String> {
    let output = execute_git_command(&["remote", "-v"], &repo_path).await?;

    if !output.status.success() {
        return Err(format!(
            "获取远程仓库列表失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut remotes = HashMap::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            let url = parts[1].to_string();

            if !remotes.contains_key(&name) {
                remotes.insert(name.clone(), url.clone());
            }
        }
    }

    let remote_list = remotes
        .into_iter()
        .map(|(name, url)| GitRemote { name, url })
        .collect();

    Ok(remote_list)
}

pub async fn git_add_remote(
    repo_path: String,
    name: String,
    url: String,
) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["remote", "add", &name, &url], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "远程仓库添加成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("添加远程仓库失败: {}", error_msg),
        })
    }
}

pub async fn git_fetch(
    repo_path: String,
    remote: Option<String>,
) -> Result<FileOperationResult, String> {
    let mut args = vec!["fetch"];
    if let Some(ref r) = remote {
        args.push(r);
    } else {
        args.push("origin");
    }

    let output = execute_git_command(&args, &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: "获取更新成功".to_string(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("获取更新失败: {}", error_msg),
        })
    }
}

pub async fn git_delete_branch(
    repo_path: String,
    branch_name: String,
    is_remote: bool,
    force: bool,
) -> Result<FileOperationResult, String> {
    if is_remote {
        
        let parts: Vec<&str> = branch_name.splitn(2, '/').collect();
        if parts.len() == 2 {
            let remote = parts[0];
            let branch = parts[1];
            let output =
                execute_git_command(&["push", remote, "--delete", branch], &repo_path).await?;
            if output.status.success() {
                Ok(FileOperationResult {
                    success: true,
                    message: format!("已删除远程分支: {}", branch_name),
                })
            } else {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                Ok(FileOperationResult {
                    success: false,
                    message: format!("删除远程分支失败: {}", error_msg),
                })
            }
        } else {
            Err(format!("无效的远程分支名称: {}", branch_name))
        }
    } else {
        let arg = if force { "-D" } else { "-d" };
        let output = execute_git_command(&["branch", arg, &branch_name], &repo_path).await?;

        if output.status.success() {
            Ok(FileOperationResult {
                success: true,
                message: format!("已删除分支: {}", branch_name),
            })
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Ok(FileOperationResult {
                success: false,
                message: format!("删除分支失败: {}", error_msg),
            })
        }
    }
}

pub async fn git_merge(
    repo_path: String,
    branch_name: String,
) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["merge", &branch_name], &repo_path).await?;

    if output.status.success() {
        Ok(FileOperationResult {
            success: true,
            message: format!("已成功合并分支: {}", branch_name),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("合并分支失败: {}", error_msg),
        })
    }
}

pub async fn git_stash(repo_path: String) -> Result<FileOperationResult, String> {
    let output = execute_git_command(&["stash", "push", "--include-untracked"], &repo_path).await?;

    if output.status.success() {
        let message = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(FileOperationResult {
            success: true,
            message: if message.is_empty() {
                "已保存工作区更改".to_string()
            } else {
                message
            },
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(FileOperationResult {
            success: false,
            message: format!("保存工作区更改失败: {}", error_msg.trim()),
        })
    }
}

pub async fn git_unstage(repo_path: String, file_paths: Vec<String>) -> FileOperationResult {
    if file_paths.is_empty() {
        return FileOperationResult {
            success: true,
            message: "没有需要取消暂存的文件".to_string(),
        };
    }

    let mut args = vec!["reset", "HEAD", "--"];
    for path in &file_paths {
        args.push(path.as_str());
    }

    let output = execute_git_command(&args, &repo_path).await;
    match output {
        Ok(result) => {
            if result.status.success() {
                FileOperationResult {
                    success: true,
                    message: format!("已取消暂存 {} 个文件", file_paths.len()),
                }
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr).to_string();
                FileOperationResult {
                    success: false,
                    message: format!("取消暂存失败: {}", error_msg),
                }
            }
        }
        Err(e) => FileOperationResult {
            success: false,
            message: format!("取消暂存失败: {}", e),
        },
    }
}

pub async fn git_discard(repo_path: String, file_paths: Vec<String>) -> FileOperationResult {
    if file_paths.is_empty() {
        return FileOperationResult {
            success: true,
            message: "没有需要丢弃的文件".to_string(),
        };
    }

    
    let mut tracked_paths: Vec<&str> = Vec::new();
    let mut untracked_paths: Vec<&str> = Vec::new();

    for path in &file_paths {
        let ls_output =
            execute_git_command(&["ls-files", "--error-unmatch", path], &repo_path).await;
        match ls_output {
            Ok(result) if result.status.success() => tracked_paths.push(path.as_str()),
            _ => untracked_paths.push(path.as_str()),
        }
    }

    
    if !tracked_paths.is_empty() {
        let mut reset_args = vec!["reset", "HEAD", "--"];
        reset_args.extend(tracked_paths.iter().copied());
        if let Err(e) = execute_git_command(&reset_args, &repo_path).await {
            return FileOperationResult {
                success: false,
                message: format!("取消暂存失败: {}", e),
            };
        }

        let mut checkout_args = vec!["checkout", "--"];
        checkout_args.extend(tracked_paths.iter().copied());
        match execute_git_command(&checkout_args, &repo_path).await {
            Ok(result) if !result.status.success() => {
                return FileOperationResult {
                    success: false,
                    message: format!(
                        "丢弃已跟踪文件失败: {}",
                        String::from_utf8_lossy(&result.stderr)
                    ),
                };
            }
            Err(e) => {
                return FileOperationResult {
                    success: false,
                    message: format!("丢弃已跟踪文件失败: {}", e),
                };
            }
            _ => {}
        }
    }

    
    if !untracked_paths.is_empty() {
        let mut clean_args = vec!["clean", "-f", "-d", "--"];
        clean_args.extend(untracked_paths.iter().copied());
        match execute_git_command(&clean_args, &repo_path).await {
            Ok(result) if !result.status.success() => {
                return FileOperationResult {
                    success: false,
                    message: format!(
                        "删除未跟踪文件失败: {}",
                        String::from_utf8_lossy(&result.stderr)
                    ),
                };
            }
            Err(e) => {
                return FileOperationResult {
                    success: false,
                    message: format!("删除未跟踪文件失败: {}", e),
                };
            }
            _ => {}
        }
    }

    FileOperationResult {
        success: true,
        message: format!("已丢弃 {} 个文件的更改", file_paths.len()),
    }
}

pub async fn is_git_repository(repo_path: String) -> bool {
    let output = execute_git_command(&["rev-parse", "--git-dir"], &repo_path).await;
    match output {
        Ok(result) => result.status.success(),
        Err(_) => false,
    }
}

async fn execute_git_command(
    args: &[&str],
    repo_path: &str,
) -> Result<std::process::Output, String> {
    let mut cmd = Command::new("git");
    cmd.args(args)
        .current_dir(repo_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    cmd.creation_flags(WINDOWS_CREATION_FLAGS);

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "未找到Git命令, 请确保Git已安装并添加到系统PATH中".to_string()
        } else {
            format!("执行Git命令失败: {}", e)
        }
    })?;

    Ok(output)
}

fn parse_diff_output(diff_output: &str) -> Vec<GitDiff> {
    let mut diffs = Vec::new();
    let lines: Vec<&str> = diff_output.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        if lines[i].starts_with("diff --git") {
            let file_path = extract_file_path_from_diff_header(lines[i]);
            let mut hunks = Vec::new();
            i += 1;

            while i < lines.len() && !lines[i].starts_with("diff --git") {
                if lines[i].starts_with("@@") {
                    match parse_diff_hunk(&lines[i..]) {
                        Some((hunk, consumed_lines)) => {
                            hunks.push(hunk);
                            i += consumed_lines;
                        }
                        None => i += 1,
                    }
                } else {
                    i += 1;
                }
            }

            diffs.push(GitDiff { file_path, hunks });
        } else {
            i += 1;
        }
    }

    diffs
}

fn extract_file_path_from_diff_header(header: &str) -> String {
    let parts: Vec<&str> = header.split_whitespace().collect();
    if parts.len() >= 4 {
        parts[3].to_string().trim_start_matches("a/").to_string()
    } else {
        "unknown".to_string()
    }
}

fn parse_diff_hunk(lines: &[&str]) -> Option<(DiffHunk, usize)> {
    let header = *lines.first()?;
    let re = regex::Regex::new(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@").ok()?;
    let caps = re.captures(header)?;
    let old_start = caps.get(1)?.as_str().parse::<u32>().ok()?;
    let old_lines = caps
        .get(2)
        .map(|m| m.as_str().parse::<u32>())
        .transpose()
        .ok()?
        .unwrap_or(1);
    let new_start = caps.get(3)?.as_str().parse::<u32>().ok()?;
    let new_lines = caps
        .get(4)
        .map(|m| m.as_str().parse::<u32>())
        .transpose()
        .ok()?
        .unwrap_or(1);

    let mut hunk_lines = Vec::new();
    let mut consumed = 1;

    while consumed < lines.len()
        && (lines[consumed].starts_with(" ")
            || lines[consumed].starts_with("-")
            || lines[consumed].starts_with("+"))
    {
        hunk_lines.push(lines[consumed].to_string());
        consumed += 1;
    }

    Some((
        DiffHunk {
            old_start,
            old_lines,
            new_start,
            new_lines,
            lines: hunk_lines,
        },
        consumed,
    ))
}

#[cfg(test)]
mod tests {
    use super::{parse_diff_hunk, parse_diff_output};

    #[test]
    fn parses_valid_diff_hunk() {
        let lines = ["@@ -3,2 +4,3 @@", " unchanged", "-old", "+new"];
        let (hunk, consumed) = parse_diff_hunk(&lines).expect("valid hunk");

        assert_eq!(hunk.old_start, 3);
        assert_eq!(hunk.old_lines, 2);
        assert_eq!(hunk.new_start, 4);
        assert_eq!(hunk.new_lines, 3);
        assert_eq!(consumed, 4);
    }

    #[test]
    fn malformed_hunk_is_skipped_without_panicking() {
        let diff = "diff --git a/file.krt b/file.krt\n@@ malformed @@\n+line\n";
        let parsed = parse_diff_output(diff);

        assert_eq!(parsed.len(), 1);
        assert!(parsed[0].hunks.is_empty());
    }
}