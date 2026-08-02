
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use uuid::Uuid;



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugSession {
    pub id: String,
    pub adapter_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartDebugRequest {
    pub session_id: String,
    pub adapter_type: String,
    pub program: String,
    pub cwd: Option<String>,
    pub args: Option<Vec<String>>,
    pub extra: Option<HashMap<String, Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DapRequestPayload {
    pub session_id: String,
    pub command: String,
    pub arguments: Option<Value>,
    pub client_seq: Option<u64>,
}


struct DebugSessionInternal {
    child: std::process::Child,
    writer: std::process::ChildStdin,
    seq: u64,
}

impl DebugSessionInternal {
    fn send_dap_message(&mut self, msg: &serde_json::Value) -> Result<(), String> {
        let json = serde_json::to_string(msg).map_err(|e| e.to_string())?;
        let header = format!("Content-Length: {}\r\n\r\n", json.len());
        self.writer
            .write_all(header.as_bytes())
            .map_err(|e| e.to_string())?;
        self.writer
            .write_all(json.as_bytes())
            .map_err(|e| e.to_string())?;
        self.writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn next_seq(&mut self) -> u64 {
        self.seq += 1;
        self.seq
    }
}



pub struct DebugSessionManager {
    sessions: Arc<RwLock<HashMap<String, Arc<Mutex<DebugSessionInternal>>>>>,
}

impl DebugSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    
    fn spawn_reader_thread(
        app_handle: AppHandle,
        session_id: String,
        child: &mut std::process::Child,
    ) {
        let stdout = child.stdout.take().expect("failed to take stdout");
        let mut reader = BufReader::new(stdout);
        let sid = session_id.clone();

        thread::spawn(move || {
            let mut line = String::new();
            loop {
                
                let mut content_length: Option<usize> = None;
                loop {
                    line.clear();
                    match reader.read_line(&mut line) {
                        Ok(0) | Err(_) => {
                            
                            let _ = app_handle.emit(
                                &format!("debug:{}:terminated", sid),
                                serde_json::json!({ "session_id": sid }),
                            );
                            return;
                        }
                        _ => {}
                    };
                    if line.trim().is_empty() {
                        break;
                    }
                    if let Some(rest) = line.strip_prefix("Content-Length:") {
                        content_length = rest.trim().parse().ok();
                    }
                }

                let len = match content_length {
                    Some(l) => l,
                    None => continue,
                };

                
                let mut buf = vec![0u8; len];
                if reader.read_exact(&mut buf).is_err() {
                    let _ = app_handle.emit(
                        &format!("debug:{}:terminated", sid),
                        serde_json::json!({ "session_id": sid }),
                    );
                    return;
                }

                let json_str = match String::from_utf8(buf) {
                    Ok(s) => s,
                    Err(_) => continue,
                };

                let parsed: Value = match serde_json::from_str(&json_str) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                
                let msg_type = parsed.get("type").and_then(|v| v.as_str());

                match msg_type {
                    Some("response") => {
                        let command = parsed.get("command").and_then(|v| v.as_str()).unwrap_or("");
                        let success = parsed
                            .get("success")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let request_seq = parsed
                            .get("request_seq")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0);

                        
                        let _ = app_handle.emit(
                            &format!("debug:{}:response", sid),
                            serde_json::json!({
                                "session_id": sid,
                                "request_seq": request_seq,
                                "command": command,
                                "success": success,
                                "body": parsed.get("body").cloned().unwrap_or(Value::Null),
                                "message": parsed.get("message").cloned().unwrap_or(Value::Null),
                            }),
                        );
                    }
                    Some("event") => {
                        let event_name = parsed.get("event").and_then(|v| v.as_str()).unwrap_or("");
                        let body = parsed.get("body").cloned().unwrap_or(Value::Null);

                        
                        let _ = app_handle.emit(
                            &format!("debug:{}:event", sid),
                            serde_json::json!({
                                "session_id": sid,
                                "event": event_name,
                                "body": body,
                            }),
                        );

                        
                        match event_name {
                            "stopped" => {
                                let _ = app_handle.emit(
                                    &format!("debug:{}:stopped", sid),
                                    serde_json::json!({
                                        "session_id": sid,
                                        "body": body,
                                    }),
                                );
                            }
                            "continued" => {
                                let _ = app_handle.emit(
                                    &format!("debug:{}:continued", sid),
                                    serde_json::json!({
                                        "session_id": sid,
                                        "body": body,
                                    }),
                                );
                            }
                            "terminated" | "exited" => {
                                let _ = app_handle.emit(
                                    &format!("debug:{}:terminated", sid),
                                    serde_json::json!({
                                        "session_id": sid,
                                        "body": body,
                                    }),
                                );
                            }
                            "output" => {
                                let _ = app_handle.emit(
                                    &format!("debug:{}:output", sid),
                                    serde_json::json!({
                                        "session_id": sid,
                                        "body": body,
                                    }),
                                );
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
        });
    }
}




fn resolve_adapter_command(adapter_type: &str) -> Result<(String, Vec<String>), String> {
    match adapter_type.to_lowercase().as_str() {
        "node" | "nodejs" => {
            which::which("js-debug-adapter")
                .or_else(|_| which::which("vscode-js-debug"))
                .map(|p| (p.to_string_lossy().to_string(), Vec::new()))
                .map_err(|_| "JavaScript DAP adapter not found. Install vscode-js-debug and expose js-debug-adapter in PATH".to_string())
        }
        "python" | "debugpy" => {
            let python = which::which("python3")
                .or_else(|_| which::which("python"))
                .map_err(|_| "Python not found. Install Python and debugpy (python -m pip install debugpy)".to_string())?;
            let available = Command::new(&python)
                .args(["-c", "import debugpy.adapter"])
                .status()
                .map(|status| status.success())
                .unwrap_or(false);
            if !available {
                return Err("debugpy is not installed (python -m pip install debugpy)".to_string());
            }
            Ok((python.to_string_lossy().to_string(), vec!["-m".into(), "debugpy.adapter".into()]))
        }
        "cppdbg" | "gdb" => {
            which::which("OpenDebugAD7")
                .map(|p| (p.to_string_lossy().to_string(), Vec::new()))
                .or_else(|_| {
                    which::which("gdb").and_then(|p| {
                        let supports_dap = Command::new(&p)
                            .args(["--batch", "-ex", "python import gdb.dap"])
                            .status()
                            .map(|status| status.success())
                            .unwrap_or(false);
                        if supports_dap {
                            Ok((p.to_string_lossy().to_string(), vec!["--interpreter=dap".into(), "--quiet".into()]))
                        } else {
                            Err(which::Error::CannotFindBinaryPath)
                        }
                    })
                })
                .map_err(|_| "C/C++ DAP adapter not found. Install OpenDebugAD7 or a GDB build with DAP support".to_string())
        }
        "lldb" | "lldb-dap" => {
            which::which("lldb-dap")
                .or_else(|_| which::which("lldb-vscode"))
                .map(|p| (p.to_string_lossy().to_string(), Vec::new()))
                .map_err(|_| "LLDB DAP adapter not found (expected lldb-dap or lldb-vscode)".to_string())
        }
        custom => {
            which::which(custom)
                .map(|p| (p.to_string_lossy().to_string(), Vec::new()))
                .map_err(|_| format!("Unknown debug adapter: {}", custom))
        }
    }
}

#[tauri::command]
pub async fn debug_start_session(
    app_handle: AppHandle,
    manager: State<'_, DebugSessionManager>,
    request: StartDebugRequest,
) -> Result<DebugSession, String> {
    let (adapter_cmd, adapter_args) = resolve_adapter_command(&request.adapter_type)?;

    let mut cmd = Command::new(&adapter_cmd);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    cmd.args(adapter_args);

    if let Some(cwd) = &request.cwd {
        cmd.current_dir(cwd);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn debug adapter: {}", e))?;

    let stdin = child.stdin.take().ok_or("Failed to open stdin")?;
    let session_id = request.session_id.clone();

    let mut session_internal = DebugSessionInternal {
        child,
        writer: stdin,
        seq: 0,
    };

    let child_ref = &mut session_internal.child;
    DebugSessionManager::spawn_reader_thread(app_handle.clone(), session_id.clone(), child_ref);

    let init_seq = session_internal.next_seq();
    let init_msg = serde_json::json!({
        "seq": init_seq,
        "type": "request",
        "command": "initialize",
        "arguments": {
            "clientID": "kortina",
            "clientName": "Kortina IDE",
            "adapterID": request.adapter_type,
            "pathFormat": "path",
            "linesStartAt1": true,
            "columnsStartAt1": true,
            "supportsVariableType": true,
            "supportsVariablePaging": true,
            "supportsRunInTerminalRequest": true,
            "locale": "en-US"
        }
    });
    let session = Arc::new(Mutex::new(session_internal));
    let mut sessions = manager.sessions.write().await;
    sessions.insert(session_id.clone(), session.clone());
    drop(sessions);

    let initialize_result = {
        let mut session = session.lock().map_err(|e| e.to_string())?;
        session.send_dap_message(&init_msg)
    };
    if let Err(error) = initialize_result {
        manager.sessions.write().await.remove(&session_id);
        return Err(error);
    }

    Ok(DebugSession {
        id: session_id,
        adapter_id: request.adapter_type,
        status: "starting".to_string(),
    })
}

#[tauri::command]
pub async fn debug_send_request(
    manager: State<'_, DebugSessionManager>,
    request: DapRequestPayload,
) -> Result<u64, String> {
    let sessions = manager.sessions.read().await;
    let session = sessions
        .get(&request.session_id)
        .ok_or("Session not found")?
        .clone();
    drop(sessions);

    let mut session = session.lock().map_err(|e| e.to_string())?;
    let seq = request.client_seq.unwrap_or_else(|| session.next_seq());
    if seq > session.seq {
        session.seq = seq;
    }

    let msg = serde_json::json!({
        "seq": seq,
        "type": "request",
        "command": request.command,
        "arguments": request.arguments.unwrap_or(Value::Null)
    });

    session.send_dap_message(&msg)?;
    Ok(seq)
}

#[tauri::command]
pub async fn debug_stop_session(
    app_handle: AppHandle,
    manager: State<'_, DebugSessionManager>,
    session_id: String,
) -> Result<(), String> {
    let sessions = manager.sessions.read().await;
    if let Some(session) = sessions.get(&session_id) {
        if let Ok(mut session) = session.lock() {
            let seq = session.next_seq();
            let disconnect_msg = serde_json::json!({
                "seq": seq,
                "type": "request",
                "command": "disconnect",
                "arguments": {
                    "restart": false,
                    "terminateDebuggee": true
                }
            });
            let _ = session.send_dap_message(&disconnect_msg);
        }
    }
    drop(sessions);

    let mut sessions = manager.sessions.write().await;
    if let Some(session) = sessions.remove(&session_id) {
        if let Ok(mut session) = session.lock() {
            let _ = session.child.kill();
        }
    }

    let _ = app_handle.emit(
        &format!("debug:{}:terminated", session_id),
        serde_json::json!({ "session_id": session_id, "reason": "user_stopped" }),
    );

    Ok(())
}

#[tauri::command]
pub async fn debug_list_sessions(
    manager: State<'_, DebugSessionManager>,
) -> Result<Vec<DebugSession>, String> {
    let sessions = manager.sessions.read().await;
    let mut result = Vec::new();
    for (id, session) in sessions.iter() {
        if let Ok(_session) = session.lock() {
            result.push(DebugSession {
                id: id.clone(),
                adapter_id: id.clone(),
                status: "active".to_string(),
            });
        }
    }
    Ok(result)
}


#[tauri::command]
pub fn debug_new_session_id() -> String {
    Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::{DapRequestPayload, StartDebugRequest};

    #[test]
    fn deserializes_frontend_start_request() {
        let request: StartDebugRequest = serde_json::from_value(serde_json::json!({
            "sessionId": "session-1",
            "adapterType": "debugpy",
            "program": "/workspace/main.py",
            "cwd": "/workspace",
            "args": ["--verbose"],
            "extra": null
        }))
        .expect("frontend start request should deserialize");

        assert_eq!(request.session_id, "session-1");
        assert_eq!(request.adapter_type, "debugpy");
    }

    #[test]
    fn deserializes_frontend_dap_request_sequence() {
        let request: DapRequestPayload = serde_json::from_value(serde_json::json!({
            "sessionId": "session-1",
            "command": "threads",
            "arguments": null,
            "clientSeq": 1001
        }))
        .expect("frontend DAP request should deserialize");

        assert_eq!(request.client_seq, Some(1001));
    }
}
