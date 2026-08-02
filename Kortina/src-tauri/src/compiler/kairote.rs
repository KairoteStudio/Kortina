use serde::{Deserialize, Serialize};
use std::time::Duration;

use super::task_manager::TaskManager;

#[derive(Serialize, Deserialize)]
pub struct CompileResult {
    pub success: bool,
    pub output: String,
    pub errors: String,
    pub exit_code: i32,
}

pub async fn compile_with_settings(
    task_manager: &TaskManager,
    file_path: String,
    options: Vec<String>,
    compiler_path: Option<String>,
    use_system_path: bool,
) -> Result<CompileResult, String> {
    let compiler_exe = if use_system_path {
        
        if cfg!(windows) {
            "kairote.exe".to_string()
        } else {
            "kairote".to_string()
        }
    } else if let Some(path) = compiler_path.filter(|p| !p.trim().is_empty()) {
        path
    } else {
        
        let exe_name = if cfg!(windows) {
            "kairote.exe"
        } else {
            "kairote"
        };
        let default_path = std::env::current_exe()
            .map_err(|e| format!("无法获取应用路径: {}", e))?
            .parent()
            .ok_or("无法获取应用目录")?
            .join(exe_name);

        if !default_path.exists() {
            
            let alt = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()))
                .and_then(|d| d.parent().map(|p| p.join(exe_name)));
            if let Some(alt) = alt {
                if alt.exists() {
                    alt.to_string_lossy().to_string()
                } else {
                    return Err(format!(
                        "编译器未找到。请在设置中指定路径，或将 {} 加入 PATH。",
                        exe_name
                    ));
                }
            } else {
                return Err(format!(
                    "编译器未找到。请在设置中指定路径，或将 {} 加入 PATH。",
                    exe_name
                ));
            }
        } else {
            default_path.to_string_lossy().to_string()
        }
    };

    let mut args = vec![file_path.clone()];
    args.extend(options);

    let output = task_manager
        .run("build", &compiler_exe, &args, None, Duration::from_secs(30))
        .await
        .map_err(|e| {
            if use_system_path {
                format!(
                    "执行编译器失败: {}。请确保 kairote 在系统 PATH 中，或在设置中指定编译器路径。",
                    e
                )
            } else {
                format!(
                    "执行编译器失败: {}。请检查编译器路径是否正确: {}",
                    e, compiler_exe
                )
            }
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.exit_code;

    Ok(CompileResult {
        success: output.success,
        output: stdout,
        errors: stderr,
        exit_code,
    })
}
