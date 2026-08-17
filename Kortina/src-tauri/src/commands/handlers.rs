use crate::terminal::pty_manager::{TerminalManager, TerminalSession};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{Emitter, Manager, State};

#[allow(unused_macros)]
macro_rules! desktop_only {
    ($expr:expr) => {
        #[cfg(desktop)]
        {
            $expr
        }
        #[cfg(not(desktop))]
        {
            Ok(())
        }
    };
}

#[allow(unused_macros)]
macro_rules! desktop_only_val {
    ($expr:expr) => {
        #[cfg(desktop)]
        {
            $expr
        }
        #[cfg(not(desktop))]
        {
            ()
        }
    };
}

#[tauri::command]
pub async fn terminal_create_session(
    app_handle: tauri::AppHandle,
    manager: State<'_, TerminalManager>,
    shell: Option<String>,
    cwd: Option<String>,
) -> Result<TerminalSession, String> {
    manager
        .create_session(app_handle, shell.as_deref(), cwd.as_deref())
        .await
}

#[tauri::command]
pub async fn terminal_write(
    manager: State<'_, TerminalManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    manager.write(&session_id, data).await
}

#[tauri::command]
pub async fn terminal_resize(
    manager: State<'_, TerminalManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    manager.resize(&session_id, cols, rows).await
}

#[tauri::command]
pub async fn terminal_kill_session(
    manager: State<'_, TerminalManager>,
    session_id: String,
) -> Result<(), String> {
    manager.kill_session(&session_id).await
}

#[tauri::command]
pub fn get_os_type(manager: State<'_, TerminalManager>) -> String {
    match manager.get_os_type() {
        crate::terminal::pty_manager::OsType::Windows => "windows".to_string(),
        crate::terminal::pty_manager::OsType::Macos => "macos".to_string(),
        crate::terminal::pty_manager::OsType::Linux => "linux".to_string(),
        crate::terminal::pty_manager::OsType::Unknown => "unknown".to_string(),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalProfileInfo {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub command: String,
}

fn find_executable(command: &str) -> Option<String> {
    use std::path::Path;

    let path = Path::new(command);
    if path.is_absolute() && path.exists() {
        return Some(command.to_string());
    }

    #[cfg(windows)]
    {
        if let Ok(output) = std::process::Command::new("where").arg(command).output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = stdout.lines().next() {
                    let trimmed = first_line.trim();
                    if !trimmed.is_empty() && Path::new(trimmed).exists() {
                        return Some(trimmed.to_string());
                    }
                }
            }
        }

        if let Ok(windir) = std::env::var("WINDIR") {
            let candidates = [
                format!(r"{}\System32\{}", windir, command),
                format!(r"{}\Sysnative\{}", windir, command),
                format!(r"{}\System32\WindowsPowerShell\v1.0\{}", windir, command),
            ];
            for c in candidates {
                if Path::new(&c).exists() {
                    return Some(c);
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        if let Ok(output) = std::process::Command::new("which").arg(command).output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = stdout.lines().next() {
                    let trimmed = first_line.trim();
                    if !trimmed.is_empty() && Path::new(trimmed).exists() {
                        return Some(trimmed.to_string());
                    }
                }
            }
        }

        let common_paths = [
            format!("/usr/bin/{}", command),
            format!("/bin/{}", command),
            format!("/usr/local/bin/{}", command),
            format!("/opt/homebrew/bin/{}", command),
        ];
        for c in common_paths {
            if Path::new(&c).exists() {
                return Some(c);
            }
        }
    }

    None
}

fn read_etc_shells() -> Vec<String> {
    use std::fs;
    use std::path::Path;

    let etc_shells = Path::new("/etc/shells");
    if !etc_shells.exists() {
        return Vec::new();
    }

    match fs::read_to_string(etc_shells) {
        Ok(contents) => contents
            .lines()
            .map(|line| {
                let index = line.find('#').unwrap_or(line.len());
                line[..index].trim().to_string()
            })
            .filter(|line| !line.is_empty() && Path::new(line).exists())
            .collect(),
        Err(_) => Vec::new(),
    }
}

fn shell_basename(path: &str) -> String {
    path.rsplit(['/', '\\']).next().unwrap_or(path).to_string()
}

fn make_profile(id: &str, name: &str, short_name: &str, command: &str) -> TerminalProfileInfo {
    TerminalProfileInfo {
        id: id.to_string(),
        name: name.to_string(),
        short_name: short_name.to_string(),
        command: command.to_string(),
    }
}

#[tauri::command]
pub fn get_terminal_profiles(manager: State<'_, TerminalManager>) -> Vec<TerminalProfileInfo> {
    use crate::terminal::pty_manager::OsType;
    use std::collections::HashSet;

    let mut profiles: Vec<TerminalProfileInfo> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    match manager.get_os_type() {
        OsType::Windows => {
            
            let candidates: Vec<(&str, &str, &str, &str)> = vec![
                ("powershell", "PowerShell", "PS", "pwsh.exe"),
                ("powershell", "PowerShell", "PS", "powershell.exe"),
                ("cmd", "Command Prompt", "CMD", "cmd.exe"),
                ("wsl", "WSL", "WSL", "wsl.exe"),
                ("bash", "Git Bash", "Bash", "bash.exe"),
                ("bash", "Bash", "Bash", "bash"),
            ];

            for (id, name, short_name, command) in candidates {
                if seen_ids.contains(id) {
                    continue;
                }
                if let Some(path) = find_executable(command) {
                    seen_ids.insert(id.to_string());
                    profiles.push(make_profile(id, name, short_name, &path));
                }
            }
        }
        OsType::Macos | OsType::Linux | OsType::Unknown => {
            
            let etc_shells = read_etc_shells();
            let known_map: HashMap<&str, (&str, &str, &str)> = [
                ("bash", ("bash", "Bash", "Bash")),
                ("zsh", ("zsh", "Zsh", "Zsh")),
                ("fish", ("fish", "Fish", "Fish")),
                ("sh", ("sh", "Shell", "sh")),
                ("dash", ("sh", "Dash", "sh")),
                ("ksh", ("sh", "Ksh", "sh")),
                ("csh", ("sh", "Csh", "sh")),
                ("tcsh", ("sh", "Tcsh", "sh")),
            ]
            .into_iter()
            .collect();

            for shell_path in &etc_shells {
                let base = shell_basename(shell_path);
                
                let base_name = base.split('-').next().unwrap_or(&base);
                if let Some((id, name, short_name)) = known_map.get(base_name) {
                    if seen_ids.contains(*id) {
                        continue;
                    }
                    seen_ids.insert(id.to_string());
                    profiles.push(make_profile(id, name, short_name, shell_path));
                }
            }

            
            let fallbacks: Vec<(&str, &str, &str, &str)> = vec![
                ("bash", "Bash", "Bash", "bash"),
                ("zsh", "Zsh", "Zsh", "zsh"),
                ("fish", "Fish", "Fish", "fish"),
                ("sh", "Shell", "sh", "sh"),
            ];

            for (id, name, short_name, command) in fallbacks {
                if seen_ids.contains(id) {
                    continue;
                }
                if let Some(path) = find_executable(command) {
                    seen_ids.insert(id.to_string());
                    profiles.push(make_profile(id, name, short_name, &path));
                }
            }
        }
    }

    
    if profiles.is_empty() {
        #[cfg(windows)]
        {
            profiles.push(make_profile("cmd", "Command Prompt", "CMD", "cmd.exe"));
        }
        #[cfg(not(windows))]
        {
            profiles.push(make_profile("sh", "Shell", "sh", "/bin/sh"));
        }
    }

    profiles
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub last_opened: String,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub async fn get_recent_projects(
    app_handle: tauri::AppHandle,
) -> Result<Vec<RecentProject>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let opened_dir = app_data_dir.join("opened");

    std::fs::create_dir_all(&opened_dir).map_err(|e| e.to_string())?;

    let recent_projects_path = opened_dir.join("recent_projects.json");

    if !recent_projects_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&recent_projects_path).map_err(|e| e.to_string())?;

    let projects: Vec<RecentProject> = match serde_json::from_str(&content) {
        Ok(projects) => projects,
        Err(_) => {
            if let Ok(paths) = serde_json::from_str::<Vec<String>>(&content) {
                paths
                    .into_iter()
                    .map(|path| {
                        let name = path.split('/').last().unwrap_or(&path).to_string();
                        RecentProject {
                            name,
                            path,
                            last_opened: "0".to_string(),
                        }
                    })
                    .collect()
            } else {
                return Err("无法解析最近项目文件格式".to_string());
            }
        }
    };

    Ok(projects)
}

#[tauri::command]
pub async fn save_recent_projects(
    app_handle: tauri::AppHandle,
    projects: Vec<RecentProject>,
) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let opened_dir = app_data_dir.join("opened");

    std::fs::create_dir_all(&opened_dir).map_err(|e| e.to_string())?;

    let recent_projects_path = opened_dir.join("recent_projects.json");

    let content = serde_json::to_string_pretty(&projects).map_err(|e| e.to_string())?;

    std::fs::write(&recent_projects_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_current_project_path(
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let opened_dir = app_data_dir.join("opened");

    std::fs::create_dir_all(&opened_dir).map_err(|e| e.to_string())?;

    let current_project_path = opened_dir.join("current_project.json");

    if !current_project_path.exists() {
        return Ok(None);
    }

    let content = match std::fs::read_to_string(&current_project_path) {
        Ok(content) => content,
        Err(_) => {
            return Ok(None);
        }
    };

    let path_map: HashMap<String, String> = match serde_json::from_str(&content) {
        Ok(map) => map,
        Err(_) => {
            return Ok(None);
        }
    };

    let path = path_map.get("path").cloned();

    Ok(path)
}

#[tauri::command]
pub async fn save_current_project_path(
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let opened_dir = app_data_dir.join("opened");

    std::fs::create_dir_all(&opened_dir).map_err(|e| e.to_string())?;

    let current_project_path = opened_dir.join("current_project.json");

    
    if path.is_empty() {
        if current_project_path.exists() {
            std::fs::remove_file(&current_project_path).map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    let mut path_map = HashMap::new();
    path_map.insert("path".to_string(), path.clone());

    let content = serde_json::to_string_pretty(&path_map).map_err(|e| e.to_string())?;

    std::fs::write(&current_project_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn read_directory(
    path: String,
    save_to_recents: bool,
) -> Result<Vec<crate::fs::directory_ops::FileItem>, String> {
    crate::fs::directory_ops::read_directory(path, save_to_recents).await
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<crate::fs::file_ops::FileContent, String> {
    crate::fs::file_ops::read_file(path).await
}

#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::write_file(path, content).await
}

#[tauri::command]
pub async fn create_file(
    path: String,
    is_directory: bool,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::create_file(path, is_directory).await
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::delete_file(path).await
}

#[tauri::command]
pub async fn rename_file(
    old_path: String,
    new_path: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::rename_file(old_path, new_path).await
}

#[tauri::command]
pub async fn get_current_dir() -> Result<String, String> {
    crate::fs::directory_ops::get_current_dir().await
}

#[tauri::command]
pub async fn move_file(
    source_path: String,
    target_path: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::move_file(source_path, target_path).await
}

#[tauri::command]
pub async fn copy_file(
    source_path: String,
    target_path: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::fs::file_ops::copy_file(source_path, target_path).await
}

#[tauri::command]
pub fn stat_path(path: String) -> Result<crate::fs::file_ops::FileMetadata, String> {
    crate::fs::file_ops::stat_path(path)
}

#[tauri::command]
pub async fn git_clone(
    repo_url: String,
    target_path: String,
    branch: Option<String>,
    auth_type: Option<String>,
    username: Option<String>,
    password: Option<String>,
    token: Option<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::clone::git_clone(
        repo_url,
        target_path,
        branch,
        auth_type,
        username,
        password,
        token,
    )
    .await
}

#[tauri::command]
pub async fn execute_terminal_command(
    terminal_type: &str,
    command: &str,
) -> Result<crate::terminal::executor::SimpleTerminalResult, String> {
    crate::terminal::executor::execute_terminal_command(terminal_type, command).await
}

#[tauri::command]
pub async fn execute_terminal_command_realtime(
    terminal_type: &str,
    command: &str,
    window: tauri::Window,
) -> Result<(), String> {
    use std::sync::{Arc, Mutex};

    let window_clone = window.clone();

    let callback = move |event: crate::terminal::executor::TerminalEvent| {
        let _ = window_clone.emit("terminal_output", event);
    };

    let result = crate::terminal::executor::execute_terminal_command_realtime(
        terminal_type,
        command,
        Arc::new(Mutex::new(callback)),
    )
    .await;

    let _ = window.emit("terminal_complete", &result);

    Ok(())
}

#[tauri::command]
pub async fn compile(
    task_manager: State<'_, crate::compiler::task_manager::TaskManager>,
    file_path: String,
    options: Vec<String>,
    compiler_path: Option<String>,
    use_system_path: Option<bool>,
) -> Result<crate::compiler::kairote::CompileResult, String> {
    crate::compiler::kairote::compile_with_settings(
        task_manager.inner(),
        file_path,
        options,
        compiler_path,
        use_system_path.unwrap_or(false),
    )
    .await
}

#[tauri::command]
pub async fn stop_task(
    task_manager: State<'_, crate::compiler::task_manager::TaskManager>,
    task_id: Option<String>,
) -> Result<bool, String> {
    Ok(task_manager
        .stop(task_id.as_deref().unwrap_or("build"))
        .await)
}

#[tauri::command]
pub async fn run_program(
    task_manager: State<'_, crate::compiler::task_manager::TaskManager>,
    program: String,
    cwd: String,
    args: Option<Vec<String>>,
) -> Result<crate::compiler::kairote::CompileResult, String> {
    let cwd_path = std::path::PathBuf::from(&cwd);
    let program_path = std::path::PathBuf::from(&program);
    let resolved = if program_path.is_absolute() {
        program_path
    } else {
        cwd_path.join(program_path)
    };
    if !resolved.is_file() {
        return Err(format!("可执行程序不存在: {}", resolved.display()));
    }
    let output = task_manager
        .run(
            "run",
            &resolved.to_string_lossy(),
            &args.unwrap_or_default(),
            Some(&cwd_path),
            std::time::Duration::from_secs(24 * 60 * 60),
        )
        .await?;
    Ok(crate::compiler::kairote::CompileResult {
        success: output.success,
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        errors: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.exit_code,
    })
}

#[tauri::command]
pub async fn clean_project(
    project_path: String,
    output_file: Option<String>,
) -> Result<String, String> {
    use std::path::{Component, Path, PathBuf};

    let project = PathBuf::from(project_path);
    if !project.is_dir() {
        return Err("项目目录不存在".to_string());
    }
    let managed_build = project.join(".kortina").join("build");
    if managed_build.exists() {
        std::fs::remove_dir_all(&managed_build)
            .map_err(|e| format!("清理 Kortina 构建目录失败: {e}"))?;
    }

    if let Some(output) = output_file.filter(|value| !value.trim().is_empty()) {
        let relative = Path::new(&output);
        if relative.is_absolute()
            || relative
                .components()
                .any(|component| !matches!(component, Component::Normal(_)))
        {
            return Err("输出文件必须是项目内的安全相对路径".to_string());
        }
        let artifact = project.join(relative);
        if artifact.is_file() {
            std::fs::remove_file(&artifact).map_err(|e| format!("删除构建产物失败: {e}"))?;
        }
    }
    Ok("已清理 Kortina 管理的构建产物".to_string())
}

#[tauri::command]
pub async fn check_file_exists(path: String) -> Result<bool, String> {
    Ok(crate::fs::file_ops::path_exists(&path))
}

#[tauri::command]
pub async fn detect_compiler_path() -> Result<Option<String>, String> {
    use std::path::{Path, PathBuf};
    use std::process::Command;

    let exe_names: &[&str] = if cfg!(windows) {
        &["kairote.exe", "kairote"]
    } else {
        &["kairote"]
    };

    for name in exe_names {
        #[cfg(windows)]
        {
            if let Ok(output) = Command::new("where").arg(name).output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(line) = stdout.lines().next() {
                        let p = line.trim();
                        if !p.is_empty() && Path::new(p).exists() {
                            return Ok(Some(p.to_string()));
                        }
                    }
                }
            }
        }
        #[cfg(not(windows))]
        {
            if let Ok(output) = Command::new("which").arg(name).output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(line) = stdout.lines().next() {
                        let p = line.trim();
                        if !p.is_empty() && Path::new(p).exists() {
                            return Ok(Some(p.to_string()));
                        }
                    }
                }
            }
        }
    }

    #[allow(unused_mut)]
    let mut candidates: Vec<PathBuf> = Vec::new();
    #[cfg(windows)]
    {
        if let Ok(pf) = std::env::var("ProgramFiles") {
            candidates.push(PathBuf::from(pf).join("KairoteLang").join("kairote.exe"));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            candidates.push(PathBuf::from(pf86).join("KairoteLang").join("kairote.exe"));
        }
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            candidates.push(PathBuf::from(local).join("KairoteLang").join("kairote.exe"));
        }
    }
    #[cfg(not(windows))]
    {
        candidates.push(PathBuf::from("/usr/local/bin/kairote"));
        candidates.push(PathBuf::from("/usr/bin/kairote"));
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(PathBuf::from(&home).join(".local/bin/kairote"));
            candidates.push(PathBuf::from(&home).join("bin/kairote"));
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for name in exe_names {
                candidates.push(dir.join(name));
                if let Some(parent) = dir.parent() {
                    candidates.push(parent.join(name));
                }
            }
        }
    }

    for path in candidates {
        if path.exists() {
            return Ok(Some(path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn start_fs_watch(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    crate::fs::watcher::start_watch(app_handle, path)
}

#[tauri::command]
pub async fn stop_fs_watch(path: String) -> Result<(), String> {
    crate::fs::watcher::stop_watch(path)
}

#[tauri::command]
pub async fn vcs_is_git_repository(repo_path: String) -> Result<bool, String> {
    Ok(crate::git::operations::is_git_repository(repo_path).await)
}

#[tauri::command]
pub async fn vcs_init(
    repo_path: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_init(repo_path).await
}

#[tauri::command]
pub async fn vcs_status(
    repo_path: String,
) -> Result<Vec<crate::git::operations::GitStatus>, String> {
    crate::git::operations::git_status(repo_path).await
}

#[tauri::command]
pub async fn vcs_add(
    repo_path: String,
    file_paths: Vec<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_add(repo_path, file_paths).await
}

#[tauri::command]
pub async fn vcs_unstage(
    repo_path: String,
    file_paths: Vec<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    Ok(crate::git::operations::git_unstage(repo_path, file_paths).await)
}

#[tauri::command]
pub async fn vcs_discard(
    repo_path: String,
    file_paths: Vec<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    Ok(crate::git::operations::git_discard(repo_path, file_paths).await)
}

#[tauri::command]
pub async fn vcs_commit(
    repo_path: String,
    message: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_commit(repo_path, message).await
}

#[tauri::command]
pub async fn vcs_log(
    repo_path: String,
    limit: Option<u32>,
) -> Result<Vec<crate::git::operations::GitCommit>, String> {
    crate::git::operations::git_log(repo_path, limit).await
}

#[tauri::command]
pub async fn vcs_branch_list(
    repo_path: String,
) -> Result<Vec<crate::git::operations::GitBranch>, String> {
    crate::git::operations::git_branch_list(repo_path).await
}

#[tauri::command]
pub async fn vcs_checkout(
    repo_path: String,
    branch_name: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_checkout(repo_path, branch_name).await
}

#[tauri::command]
pub async fn vcs_create_branch(
    repo_path: String,
    branch_name: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_create_branch(repo_path, branch_name).await
}

#[tauri::command]
pub async fn vcs_diff(
    repo_path: String,
    file_path: Option<String>,
) -> Result<Vec<crate::git::operations::GitDiff>, String> {
    crate::git::operations::git_diff(repo_path, file_path).await
}

#[tauri::command]
pub async fn vcs_commit_diff(
    repo_path: String,
    commit_hash: String,
) -> Result<Vec<crate::git::operations::GitDiff>, String> {
    crate::git::operations::git_commit_diff(repo_path, commit_hash).await
}

#[tauri::command]
pub async fn vcs_push(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_push(repo_path, remote, branch).await
}

#[tauri::command]
pub async fn vcs_pull(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_pull(repo_path, remote, branch).await
}

#[tauri::command]
pub async fn vcs_remote_list(
    repo_path: String,
) -> Result<Vec<crate::git::operations::GitRemote>, String> {
    crate::git::operations::git_remote_list(repo_path).await
}

#[tauri::command]
pub async fn vcs_add_remote(
    repo_path: String,
    name: String,
    url: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_add_remote(repo_path, name, url).await
}

#[tauri::command]
pub async fn vcs_fetch(
    repo_path: String,
    remote: Option<String>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_fetch(repo_path, remote).await
}

#[tauri::command]
pub async fn vcs_delete_branch(
    repo_path: String,
    branch_name: String,
    is_remote: Option<bool>,
    force: Option<bool>,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_delete_branch(
        repo_path,
        branch_name,
        is_remote.unwrap_or(false),
        force.unwrap_or(false),
    )
    .await
}

#[tauri::command]
pub async fn vcs_merge(
    repo_path: String,
    branch_name: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_merge(repo_path, branch_name).await
}

#[tauri::command]
pub async fn vcs_stash(
    repo_path: String,
) -> Result<crate::fs::file_ops::FileOperationResult, String> {
    crate::git::operations::git_stash(repo_path).await
}

#[tauri::command]
pub async fn launch_vcs_panel(
    app_handle: tauri::AppHandle,
    theme: String,
    project_path: Option<String>,
) -> Result<String, String> {
    let (window, is_new) = if let Some(vcs_window) = app_handle.get_webview_window("vcs") {
        (vcs_window, false)
    } else {
        let mut builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "vcs",
            tauri::WebviewUrl::App("index.html?window=vcs".into()),
        )
        .title("版本控制")
        .inner_size(400.0, 700.0)
        .visible(false);
        #[cfg(desktop)]
        {
            builder = builder
                .min_inner_size(300.0, 400.0)
                .decorations(false)
                .center();
        }
        let created = builder
            .build()
            .map_err(|e| format!("无法创建VCS窗口: {}", e))?;
        (created, true)
    };

    window.show().map_err(|e| format!("无法显示窗口: {}", e))?;
    window
        .set_focus()
        .map_err(|e| format!("无法聚焦窗口: {}", e))?;

    let payload = serde_json::json!({
        "theme": theme,
        "projectPath": project_path
    });

    let window_clone = window.clone();
    let theme_clone = theme.clone();
    let path_clone = project_path.clone();
    let init_delay_ms = if is_new { 280 } else { 80 };

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(init_delay_ms)).await;
        let _ = window_clone.emit("vcs-initial-data", payload);
        if let Some(path) = path_clone {
            let _ = window_clone.emit("vcs-project-path-changed", path);
        }
        let _ = window_clone.emit("vcs-theme-update", theme_clone);
    });

    Ok("vcs-window".to_string())
}

#[tauri::command]
pub async fn update_vcs_theme(app_handle: tauri::AppHandle, theme: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("vcs") {
        window
            .emit("vcs-theme-update", theme)
            .map_err(|e| format!("无法发送主题更新: {}", e))?;
        Ok(())
    } else {
        Err("VCS窗口未运行".to_string())
    }
}

#[tauri::command]
pub async fn send_theme_to_vcs_panel(
    app_handle: tauri::AppHandle,
    theme: String,
) -> Result<(), String> {
    update_vcs_theme(app_handle, theme).await
}

#[tauri::command]
pub async fn merge_vcs_to_main(
    app_handle: tauri::AppHandle,
    _vcs_width: u32,
    _main_width: u32,
    _main_height: u32,
    _main_x: i32,
    _main_y: i32,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let main_window = app_handle
            .get_webview_window("main")
            .ok_or("找不到主窗口")?;

        let new_main_width = _main_width + _vcs_width;

        main_window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: new_main_width,
                height: _main_height,
            }))
            .map_err(|e| format!("调整主窗口大小失败: {}", e))?;

        main_window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: _main_x,
                y: _main_y,
            }))
            .map_err(|e| format!("设置主窗口位置失败: {}", e))?;

        if let Some(vcs_window) = app_handle.get_webview_window("vcs") {
            vcs_window
                .hide()
                .map_err(|e| format!("隐藏VCS窗口失败: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn dock_vcs_to_main(
    app_handle: tauri::AppHandle,
    _vcs_width: u32,
    _main_width: u32,
    _main_height: u32,
    _main_x: i32,
    _main_y: i32,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let main_window = app_handle
            .get_webview_window("main")
            .ok_or("找不到主窗口")?;

        let new_main_width = _main_width + _vcs_width;

        main_window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: new_main_width,
                height: _main_height,
            }))
            .map_err(|e| format!("调整主窗口大小失败: {}", e))?;

        main_window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: _main_x,
                y: _main_y,
            }))
            .map_err(|e| format!("设置主窗口位置失败: {}", e))?;

        main_window
            .set_decorations(false)
            .map_err(|e| format!("隐藏主窗口装饰失败: {}", e))?;

        if let Some(vcs_window) = app_handle.get_webview_window("vcs") {
            vcs_window
                .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: _vcs_width,
                    height: _main_height,
                }))
                .map_err(|e| format!("调整VCS窗口大小失败: {}", e))?;

            vcs_window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: _main_x + _main_width as i32,
                    y: _main_y,
                }))
                .map_err(|e| format!("设置VCS窗口位置失败: {}", e))?;

            vcs_window
                .show()
                .map_err(|e| format!("显示VCS窗口失败: {}", e))?;

            vcs_window
                .emit("vcs-docked", true)
                .map_err(|e| format!("发送停靠消息失败: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn undock_vcs_from_main(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let main_window = app_handle
            .get_webview_window("main")
            .ok_or("找不到主窗口")?;

        main_window
            .set_decorations(true)
            .map_err(|e| format!("恢复主窗口装饰失败: {}", e))?;

        if let Some(vcs_window) = app_handle.get_webview_window("vcs") {
            vcs_window
                .set_decorations(true)
                .map_err(|e| format!("恢复VCS窗口装饰失败: {}", e))?;

            vcs_window
                .set_always_on_top(false)
                .map_err(|e| format!("取消VCS窗口置顶失败: {}", e))?;

            vcs_window
                .emit("vcs-undocked", true)
                .map_err(|e| format!("发送分离消息失败: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn launch_settings_window(
    app_handle: tauri::AppHandle,
    theme: String,
    category: Option<String>,
) -> Result<String, String> {
    let (window, is_new) = if let Some(settings_window) = app_handle.get_webview_window("settings")
    {
        (settings_window, false)
    } else {
        let mut builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "settings",
            tauri::WebviewUrl::App("index.html?window=settings".into()),
        )
        .title("设置")
        .inner_size(800.0, 600.0)
        .visible(false);
        #[cfg(desktop)]
        {
            builder = builder
                .min_inner_size(600.0, 400.0)
                .decorations(false)
                .resizable(false)
                .center();
        }
        let created = builder
            .build()
            .map_err(|e| format!("无法创建设置窗口: {}", e))?;
        (created, true)
    };

    window.show().map_err(|e| format!("无法显示窗口: {}", e))?;
    window
        .set_focus()
        .map_err(|e| format!("无法聚焦窗口: {}", e))?;

    let payload = serde_json::json!({
        "theme": theme,
        "category": category.unwrap_or_else(|| "general".to_string())
    });

    let window_clone = window.clone();
    let theme_clone = theme.clone();
    let init_delay_ms = if is_new { 280 } else { 80 };

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(init_delay_ms)).await;
        let _ = window_clone.emit("settings-initial-data", payload);
        let _ = window_clone.emit("settings-theme-update", theme_clone);
    });

    Ok("settings-window".to_string())
}

#[tauri::command]
pub async fn update_settings_theme(
    app_handle: tauri::AppHandle,
    theme: String,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("settings") {
        window
            .emit("settings-theme-update", theme)
            .map_err(|e| format!("无法发送主题更新: {}", e))?;
        Ok(())
    } else {
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InputDialogOptions {
    pub title: String,
    pub placeholder: Option<String>,
    pub default_value: Option<String>,
    pub confirm_text: Option<String>,
    pub cancel_text: Option<String>,
    pub request_id: String,
    pub theme: Option<String>,
}

static PENDING_INPUT_DIALOG: std::sync::Mutex<Option<serde_json::Value>> =
    std::sync::Mutex::new(None);

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompileOptionsWindowOptions {
    pub theme: Option<String>,
    pub theme_group: Option<String>,
    pub compiler_path: Option<String>,
    pub compiler_use_system_path: bool,
    pub compiler_target_type: String,
    pub compiler_output_file: Option<String>,
    #[serde(rename = "compilerShowIR")]
    pub compiler_show_ir: bool,
}

static PENDING_COMPILE_OPTIONS: std::sync::Mutex<Option<serde_json::Value>> =
    std::sync::Mutex::new(None);

#[tauri::command]
pub async fn launch_input_dialog(
    app_handle: tauri::AppHandle,
    options: InputDialogOptions,
) -> Result<String, String> {
    let payload = serde_json::json!({
        "title": options.title,
        "placeholder": options.placeholder.unwrap_or_default(),
        "defaultValue": options.default_value.unwrap_or_default(),
        "confirmText": options.confirm_text.unwrap_or_else(|| "确定".to_string()),
        "cancelText": options.cancel_text.unwrap_or_else(|| "取消".to_string()),
        "requestId": options.request_id,
        "theme": options.theme.unwrap_or_else(|| "dark".to_string()),
    });

    if let Ok(mut guard) = PENDING_INPUT_DIALOG.lock() {
        *guard = Some(payload.clone());
    }

    let window = if let Some(existing) = app_handle.get_webview_window("input-dialog") {
        existing
    } else {
        let mut builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "input-dialog",
            tauri::WebviewUrl::App("index.html?window=input-dialog".into()),
        )
        .title(&options.title)
        .inner_size(420.0, 180.0);
        #[cfg(desktop)]
        {
            builder = builder
                .min_inner_size(360.0, 160.0)
                .max_inner_size(560.0, 240.0)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .center();
        }
        builder
            .visible(false)
            .build()
            .map_err(|e| format!("无法创建输入对话框窗口: {}", e))?
    };

    let _ = window.set_title(&options.title);
    window.show().map_err(|e| format!("无法显示窗口: {}", e))?;
    window
        .set_focus()
        .map_err(|e| format!("无法聚焦窗口: {}", e))?;

    let window_clone = window.clone();
    tauri::async_runtime::spawn(async move {
        for delay in [50u64, 150, 350] {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
            let payload = PENDING_INPUT_DIALOG.lock().ok().and_then(|g| g.clone());
            if let Some(payload) = payload {
                let _ = window_clone.emit("input-dialog-initial-data", payload);
            }
        }
    });

    Ok("input-dialog".to_string())
}

#[tauri::command]
pub async fn get_input_dialog_state() -> Result<Option<serde_json::Value>, String> {
    PENDING_INPUT_DIALOG
        .lock()
        .map(|g| g.clone())
        .map_err(|e| format!("读取输入对话框状态失败: {}", e))
}

#[tauri::command]
pub async fn close_input_dialog(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("input-dialog") {
        window
            .close()
            .map_err(|e| format!("无法关闭输入对话框: {}", e))?;
    }
    if let Ok(mut guard) = PENDING_INPUT_DIALOG.lock() {
        *guard = None;
    }
    Ok(())
}

#[tauri::command]
pub async fn launch_compile_options(
    app_handle: tauri::AppHandle,
    options: CompileOptionsWindowOptions,
) -> Result<String, String> {
    let payload = serde_json::json!({
        "theme": options.theme.unwrap_or_else(|| "dark".to_string()),
        "themeGroup": options.theme_group.unwrap_or_else(|| "default".to_string()),
        "compilerPath": options.compiler_path.unwrap_or_default(),
        "compilerUseSystemPath": options.compiler_use_system_path,
        "compilerTargetType": options.compiler_target_type,
        "compilerOutputFile": options.compiler_output_file.unwrap_or_default(),
        "compilerShowIR": options.compiler_show_ir,
    });

    if let Ok(mut guard) = PENDING_COMPILE_OPTIONS.lock() {
        *guard = Some(payload.clone());
    }

    let window = if let Some(existing) = app_handle.get_webview_window("compile-options") {
        existing
    } else {
        let mut builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "compile-options",
            tauri::WebviewUrl::App("index.html?window=compile-options".into()),
        )
        .title("编译选项")
        .inner_size(460.0, 420.0);
        #[cfg(desktop)]
        {
            builder = builder
                .min_inner_size(400.0, 360.0)
                .max_inner_size(560.0, 560.0)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .center();
        }
        builder
            .visible(false)
            .build()
            .map_err(|e| format!("无法创建编译选项窗口: {}", e))?
    };

    let _ = window.set_title("编译选项");
    window.show().map_err(|e| format!("无法显示窗口: {}", e))?;
    window
        .set_focus()
        .map_err(|e| format!("无法聚焦窗口: {}", e))?;

    let window_clone = window.clone();
    tauri::async_runtime::spawn(async move {
        for delay in [50u64, 150, 350] {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
            let payload = PENDING_COMPILE_OPTIONS.lock().ok().and_then(|g| g.clone());
            if let Some(payload) = payload {
                let _ = window_clone.emit("compile-options-initial-data", payload);
            }
        }
    });

    Ok("compile-options".to_string())
}

#[tauri::command]
pub async fn get_compile_options_state() -> Result<Option<serde_json::Value>, String> {
    PENDING_COMPILE_OPTIONS
        .lock()
        .map(|g| g.clone())
        .map_err(|e| format!("读取编译选项状态失败: {}", e))
}

#[tauri::command]
pub async fn close_compile_options(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("compile-options") {
        window
            .close()
            .map_err(|e| format!("无法关闭编译选项窗口: {}", e))?;
    }
    if let Ok(mut guard) = PENDING_COMPILE_OPTIONS.lock() {
        *guard = None;
    }
    Ok(())
}

#[tauri::command]
pub async fn close_vcs_panel(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("vcs") {
        window
            .close()
            .map_err(|e| format!("无法关闭VCS窗口: {}", e))?;
        Ok(())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub async fn get_running_vcs_panels() -> Result<Vec<String>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn handle_vcs_panel_message(_message: String) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn open_folder_picker_android() -> Result<Option<String>, String> {
    use jni::objects::JString;
    use jni::signature::JavaType;
    use jni::signature::Primitive;
    use jni::JavaVM;
    use std::sync::Arc;

    let ctx = ndk_context::android_context();
    let vm = Arc::new(unsafe { JavaVM::from_raw(ctx.vm().cast()).map_err(|e| format!("获取 JVM 失败: {}", e))? });
    let activity = unsafe { jni::objects::JObject::from_raw(ctx.context().cast()) };

    let mut env = vm.attach_current_thread().map_err(|e| format!("附加线程失败: {}", e))?;

    let activity_class = env.get_object_class(&activity)
        .map_err(|e| format!("获取 Activity 类失败: {}", e))?;

    let method_id = env.get_method_id(
        &activity_class,
        "openFolderPicker",
        "()Ljava/lang/String;",
    ).map_err(|e| format!("找不到方法: {}", e))?;

    let result = unsafe {
        env.call_method_unchecked(
            &activity,
            method_id,
            jni::signature::ReturnType::Object,
            &[],
        )
    }.map_err(|e| format!("调用方法失败: {}", e))?;

    let jstring = result.l()
        .map_err(|e| format!("转换结果失败: {}", e))?;

    if jstring.is_null() {
        Ok(None)
    } else {
        let jstring_obj = JString::from(jstring);
        let string = env.get_string(&jstring_obj)
            .map_err(|e| format!("获取字符串失败: {}", e))?;
        Ok(Some(string.to_string_lossy().to_string()))
    }
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn open_folder_picker_android() -> Result<Option<String>, String> {
    Ok(None)
}