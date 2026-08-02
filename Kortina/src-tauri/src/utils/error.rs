pub fn format_command_error(error: &str, _command: &str, shell: &str) -> String {
    match error {
        e if e.contains("timeout") => "命令执行超时，请检查网络连接或命令复杂度".to_string(),
        e if e.contains("NotFound") => {
            format!("未找到{}命令，请确保已安装并添加到系统PATH中", shell)
        }
        e if e.contains("拒绝访问") || e.contains("Access is denied") => {
            "权限不足，无法执行命令".to_string()
        }
        e if e.contains("找不到文件") || e.contains("cannot find") => {
            "找不到指定的文件或程序".to_string()
        }
        _ => format!("执行命令失败: {}", error),
    }
}
