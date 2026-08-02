use crate::utils::cache::{cache_command_result, get_cached_command_result};
use crate::utils::error::format_command_error;
use regex::Regex;
use serde::{Deserialize, Serialize};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tokio::io::AsyncReadExt;
use tokio::process::Command as TokioCommand;

#[cfg(windows)]
const WINDOWS_CREATION_FLAGS: u32 = 0x08000000;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalOutput {
    pub content: String,
    pub is_stderr: bool,
    pub is_ansi: bool,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalControl {
    pub clear: bool,
    pub cursor_to: Option<(u16, u16)>,
    pub cursor_up: Option<u16>,
    pub cursor_down: Option<u16>,
    pub cursor_left: Option<u16>,
    pub cursor_right: Option<u16>,
    pub scroll_up: Option<u16>,
    pub scroll_down: Option<u16>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalEvent {
    pub output: TerminalOutput,
    pub control: Option<TerminalControl>,
}

#[derive(Serialize, Deserialize)]
pub struct SimpleTerminalResult {
    pub output: String,
    pub exit_code: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RealtimeTerminalResult {
    pub events: Vec<TerminalEvent>,
    pub exit_code: i32,
    pub completed: bool,
}

fn parse_ansi_sequence(input: &str) -> (String, Option<TerminalControl>) {
    let mut output = String::new();
    let mut control = TerminalControl {
        clear: false,
        cursor_to: None,
        cursor_up: None,
        cursor_down: None,
        cursor_left: None,
        cursor_right: None,
        scroll_up: None,
        scroll_down: None,
    };

    let ansi_regex = Regex::new(r"\x1b\[([0-9;]*)([A-Za-z])").unwrap();

    let mut last_end = 0;

    if input.contains('\r') {
        control.cursor_to = Some((0, 0));

        let parts: Vec<&str> = input.split('\r').collect();
        if parts.len() > 1 {
            let last_part = parts.last().unwrap_or(&"");
            if !last_part.is_empty() {
                let (clean_content, additional_control) = parse_ansi_sequence(last_part);
                output = clean_content;

                if let Some(additional) = additional_control {
                    if additional.clear {
                        control.clear = true;
                    }
                    if let Some(pos) = additional.cursor_to {
                        control.cursor_to = Some(pos);
                    }
                    if let Some(up) = additional.cursor_up {
                        control.cursor_up = Some(up);
                    }
                    if let Some(down) = additional.cursor_down {
                        control.cursor_down = Some(down);
                    }
                    if let Some(left) = additional.cursor_left {
                        control.cursor_left = Some(left);
                    }
                    if let Some(right) = additional.cursor_right {
                        control.cursor_right = Some(right);
                    }
                    if let Some(scroll_up) = additional.scroll_up {
                        control.scroll_up = Some(scroll_up);
                    }
                    if let Some(scroll_down) = additional.scroll_down {
                        control.scroll_down = Some(scroll_down);
                    }
                }
            } else {
                output = String::new();
            }
        } else {
            output = String::new();
        }

        return (output, Some(control));
    }

    if input == "\r" {
        return (String::new(), Some(control));
    }

    if input == "\n" {
        return (input.to_string(), None);
    }

    if input.contains("\r\n") {
        let parts: Vec<&str> = input.split("\r\n").collect();
        let mut result = String::new();

        for (i, part) in parts.iter().enumerate() {
            if i > 0 {
                result.push('\n');
            }

            if !part.is_empty() {
                let (clean_content, _) = parse_ansi_sequence(part);
                result.push_str(&clean_content);
            }
        }

        return (result, None);
    }

    for cap in ansi_regex.captures_iter(input) {
        if let Some(range) = cap.get(0) {
            if range.start() > last_end {
                output.push_str(&input[last_end..range.start()]);
            }
            last_end = range.end();
        }

        let params = cap.get(1).map_or("", |m| m.as_str());
        let command = cap.get(2).map_or("", |m| m.as_str());

        match command {
            "A" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.cursor_up = Some(n as u16);
                } else if params.is_empty() {
                    control.cursor_up = Some(1);
                }
            }
            "B" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.cursor_down = Some(n as u16);
                } else if params.is_empty() {
                    control.cursor_down = Some(1);
                }
            }
            "C" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.cursor_right = Some(n as u16);
                } else if params.is_empty() {
                    control.cursor_right = Some(1);
                }
            }
            "D" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.cursor_left = Some(n as u16);
                } else if params.is_empty() {
                    control.cursor_left = Some(1);
                }
            }
            "H" | "f" => {
                let parts: Vec<&str> = params.split(';').collect();
                if parts.len() >= 2 {
                    if let (Ok(row), Ok(col)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
                        control.cursor_to = Some((row as u16, col as u16));
                    }
                } else if parts.len() == 1 {
                    if let Ok(row) = parts[0].parse::<u32>() {
                        control.cursor_to = Some((row as u16, 1));
                    }
                }
            }

            "J" => {
                if params == "2" || params.is_empty() {
                    control.clear = true;
                }
            }
            "K" => {
                if params == "0" || params.is_empty() {
                    control.cursor_right = Some(1000u16);
                } else if params == "1" {
                    control.cursor_left = Some(1000u16);
                } else if params == "2" {
                    control.cursor_to = Some((0, 0));
                    control.cursor_right = Some(1000u16);
                }
            }

            "S" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.scroll_up = Some(n as u16);
                } else if params.is_empty() {
                    control.scroll_up = Some(1);
                }
            }
            "T" => {
                if let Ok(n) = params.parse::<u32>() {
                    control.scroll_down = Some(n as u16);
                } else if params.is_empty() {
                    control.scroll_down = Some(1);
                }
            }

            "m" => {
                let full_sequence = format!("\x1b[{}m", params);
                output.push_str(&full_sequence);
            }

            _ => {
                let full_sequence = format!("\x1b[{}{}", params, command);
                output.push_str(&full_sequence);
            }
        }
    }

    if last_end < input.len() {
        output.push_str(&input[last_end..]);
    }

    let has_control = control.clear
        || control.cursor_to.is_some()
        || control.cursor_up.is_some()
        || control.cursor_down.is_some()
        || control.cursor_left.is_some()
        || control.cursor_right.is_some()
        || control.scroll_up.is_some()
        || control.scroll_down.is_some();

    if has_control {
        (output, Some(control))
    } else {
        (output, None)
    }
}

pub async fn execute_terminal_command(
    terminal_type: &str,
    command: &str,
) -> Result<SimpleTerminalResult, String> {
    let cache_key = format!("{}:{}", terminal_type, command);
    if let Some(cached_result) = get_cached_command_result(cache_key.clone()) {
        println!("使用缓存的命令结果: {}", cache_key);
        return Ok(SimpleTerminalResult {
            output: cached_result,
            exit_code: 0,
        });
    }

    let shell = match terminal_type.to_lowercase().as_str() {
        "powershell" | "ps" => "powershell",
        "cmd" => "cmd",
        "bash" => "bash",
        _ => "cmd",
    };

    let (shell_cmd, shell_args) = match shell {
        "powershell" => ("powershell", vec!["-Command", command]),
        "cmd" => ("cmd", vec!["/C", command]),
        "bash" => ("bash", vec!["-c", command]),
        _ => ("cmd", vec!["/C", command]),
    };

    println!("执行终端命令 - 类型: {}, 命令: {}", shell, command);

    let output = tokio::time::timeout(std::time::Duration::from_secs(30), async {
        let mut cmd = Command::new(shell_cmd);
        cmd.args(&shell_args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(WINDOWS_CREATION_FLAGS);

        cmd.output()
    })
    .await
    .map_err(|_| format_command_error("timeout", command, shell))?
    .map_err(|e| format_command_error(&e.to_string(), command, shell))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let mut full_output = stdout;
    if !stderr.is_empty() {
        if !full_output.is_empty() {
            full_output.push('\n');
        }
        full_output.push_str(&stderr);
    }

    println!(
        "命令执行结果 - 退出码: {}, 输出长度: {}",
        exit_code,
        full_output.len()
    );

    if exit_code == 0 && !full_output.is_empty() {
        cache_command_result(cache_key, full_output.clone());
    }

    Ok(SimpleTerminalResult {
        output: full_output,
        exit_code,
    })
}

pub async fn execute_terminal_command_realtime(
    terminal_type: &str,
    command: &str,
    callback: Arc<Mutex<dyn FnMut(TerminalEvent) + Send>>,
) -> Result<RealtimeTerminalResult, String> {
    let shell = match terminal_type.to_lowercase().as_str() {
        "powershell" | "ps" => "powershell",
        "cmd" => "cmd",
        "bash" => "bash",
        _ => "cmd",
    };

    let (shell_cmd, shell_args) = match shell {
        "powershell" => ("powershell", vec!["-Command", command]),
        "cmd" => ("cmd", vec!["/C", command]),
        "bash" => ("bash", vec!["-c", command]),
        _ => ("cmd", vec!["/C", command]),
    };

    println!("执行实时终端命令 - 类型: {}, 命令: {}", shell, command);

    let mut cmd = TokioCommand::new(shell_cmd);
    cmd.args(&shell_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    cmd.creation_flags(WINDOWS_CREATION_FLAGS);

    let mut child = cmd.spawn().map_err(|e| format!("启动命令失败: {}", e))?;

    let stdout = child.stdout.take().ok_or("无法获取stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取stderr")?;

    let events = Arc::new(Mutex::new(Vec::new()));

    let events_clone = events.clone();
    let callback_clone = callback.clone();
    let stdout_handle = tokio::spawn(async move {
        let mut reader = stdout;
        let mut buffer = vec![0u8; 1024];
        let mut ansi_buffer = String::new();

        loop {
            match reader.read(&mut buffer).await {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buffer[..n]);

                    for ch in chunk.chars() {
                        if ch == '\x1b' || !ansi_buffer.is_empty() {
                            ansi_buffer.push(ch);

                            if ch == 'm'
                                || ch == 'H'
                                || ch == 'f'
                                || ch == 'A'
                                || ch == 'B'
                                || ch == 'C'
                                || ch == 'D'
                                || ch == 'J'
                                || ch == 'K'
                                || ch == 'S'
                                || ch == 'T'
                            {
                                let (clean_text, control) = parse_ansi_sequence(&ansi_buffer);

                                let event = TerminalEvent {
                                    output: TerminalOutput {
                                        content: clean_text.clone(),
                                        is_stderr: false,
                                        is_ansi: control.is_some(),
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_secs(),
                                    },
                                    control,
                                };

                                if let Ok(mut ev) = events_clone.lock() {
                                    ev.push(event.clone());
                                }

                                if let Ok(mut cb) = callback_clone.lock() {
                                    cb(event);
                                }

                                ansi_buffer.clear();
                            }
                        } else {
                            let event = TerminalEvent {
                                output: TerminalOutput {
                                    content: ch.to_string(),
                                    is_stderr: false,
                                    is_ansi: false,
                                    timestamp: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_secs(),
                                },
                                control: None,
                            };

                            if let Ok(mut cb) = callback_clone.lock() {
                                cb(event);
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }

        if !ansi_buffer.is_empty() {
            let (clean_text, control) = parse_ansi_sequence(&ansi_buffer);
            let event = TerminalEvent {
                output: TerminalOutput {
                    content: clean_text,
                    is_stderr: false,
                    is_ansi: control.is_some(),
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                },
                control,
            };

            if let Ok(mut cb) = callback_clone.lock() {
                cb(event);
            }
        }
    });

    let exit_code = match child.wait().await {
        Ok(status) => status.code().unwrap_or(-1),
        Err(e) => return Err(format!("等待命令完成失败: {}", e)),
    };

    let events_clone = events.clone();
    let callback_clone = callback.clone();
    let stderr_handle = tokio::spawn(async move {
        let mut reader = stderr;
        let mut buffer = vec![0u8; 1024];
        let mut ansi_buffer = String::new();

        loop {
            match reader.read(&mut buffer).await {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buffer[..n]);

                    for ch in chunk.chars() {
                        if ch == '\x1b' || !ansi_buffer.is_empty() {
                            ansi_buffer.push(ch);

                            if ch == 'm'
                                || ch == 'H'
                                || ch == 'f'
                                || ch == 'A'
                                || ch == 'B'
                                || ch == 'C'
                                || ch == 'D'
                                || ch == 'J'
                                || ch == 'K'
                                || ch == 'S'
                                || ch == 'T'
                            {
                                let (clean_text, control) = parse_ansi_sequence(&ansi_buffer);

                                let event = TerminalEvent {
                                    output: TerminalOutput {
                                        content: clean_text.clone(),
                                        is_stderr: true,
                                        is_ansi: control.is_some(),
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_secs(),
                                    },
                                    control,
                                };

                                if let Ok(mut ev) = events_clone.lock() {
                                    ev.push(event.clone());
                                }

                                if let Ok(mut cb) = callback_clone.lock() {
                                    cb(event);
                                }

                                ansi_buffer.clear();
                            }
                        } else {
                            let event = TerminalEvent {
                                output: TerminalOutput {
                                    content: ch.to_string(),
                                    is_stderr: true,
                                    is_ansi: false,
                                    timestamp: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_secs(),
                                },
                                control: None,
                            };

                            if let Ok(mut cb) = callback_clone.lock() {
                                cb(event);
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }

        if !ansi_buffer.is_empty() {
            let (clean_text, control) = parse_ansi_sequence(&ansi_buffer);
            let event = TerminalEvent {
                output: TerminalOutput {
                    content: clean_text,
                    is_stderr: true,
                    is_ansi: control.is_some(),
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                },
                control,
            };

            if let Ok(mut cb) = callback_clone.lock() {
                cb(event);
            }
        }
    });

    let _ = tokio::join!(stdout_handle, stderr_handle);

    let all_events = events.lock().unwrap().clone();

    Ok(RealtimeTerminalResult {
        events: all_events,
        exit_code,
        completed: true,
    })
}
