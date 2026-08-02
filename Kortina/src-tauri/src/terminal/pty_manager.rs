use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::Emitter;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub shell: String,
    pub shell_type: String,
    pub cwd: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutputPayload {
    pub session_id: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSessionClosedPayload {
    pub session_id: String,
}

pub struct PtySession {
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    pub session: TerminalSession,
}

pub struct TerminalManager {
    sessions: Arc<RwLock<HashMap<String, PtySession>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OsType {
    Windows,
    Macos,
    Linux,
    Unknown,
}

impl OsType {
    pub fn current() -> Self {
        if cfg!(target_os = "windows") {
            OsType::Windows
        } else if cfg!(target_os = "macos") {
            OsType::Macos
        } else if cfg!(target_os = "linux") {
            OsType::Linux
        } else {
            OsType::Unknown
        }
    }
}


fn resolve_shell_command(shell_type: Option<&str>) -> (String, String) {
    let os = OsType::current();
    let shell_type = shell_type.unwrap_or_else(|| match os {
        OsType::Windows => "powershell",
        OsType::Macos => "zsh",
        OsType::Linux | OsType::Unknown => "bash",
    });

    let command = match os {
        OsType::Windows => match shell_type.to_ascii_lowercase().as_str() {
            "powershell" | "pwsh" => "powershell.exe",
            "cmd" => "cmd.exe",
            "wsl" => "wsl.exe",
            "bash" => "bash",
            _ => shell_type,
        },
        OsType::Macos => match shell_type.to_ascii_lowercase().as_str() {
            "zsh" => "zsh",
            "bash" => "bash",
            "fish" => "fish",
            "sh" => "sh",
            _ => shell_type,
        },
        OsType::Linux | OsType::Unknown => match shell_type.to_ascii_lowercase().as_str() {
            "bash" => "bash",
            "zsh" => "zsh",
            "fish" => "fish",
            "sh" => "sh",
            _ => shell_type,
        },
    };

    (shell_type.to_string(), command.to_string())
}

impl TerminalManager {
    pub fn new() -> Self {
        TerminalManager {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_session(
        &self,
        app_handle: tauri::AppHandle,
        shell_type: Option<&str>,
        cwd: Option<&str>,
    ) -> Result<TerminalSession, String> {
        let id = Uuid::new_v4().to_string();
        let (shell_type, shell_command) = resolve_shell_command(shell_type);
        let cwd = cwd.unwrap_or(".").to_string();

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let mut cmd = CommandBuilder::new(&shell_command);
        cmd.cwd(&cwd);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Unable to spawn {} ({}): {}", shell_type, shell_command, e))?;

        let master = Arc::new(Mutex::new(pair.master));
        let writer = Arc::new(Mutex::new({
            let m = master.lock().unwrap();
            m.take_writer()
                .map_err(|e| format!("Failed to take PTY writer: {}", e))?
        }));
        let child = Arc::new(Mutex::new(child));
        let session = TerminalSession {
            id: id.clone(),
            shell: shell_command.clone(),
            shell_type: shell_type.clone(),
            cwd: cwd.clone(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        
        let master_clone = Arc::clone(&master);
        let child_clone = Arc::clone(&child);
        let session_id_clone = id.clone();
        let app_handle_clone = app_handle.clone();

        tokio::task::spawn_blocking(move || {
            let mut reader = match {
                let m = master_clone.lock().unwrap();
                m.try_clone_reader()
            } {
                Ok(reader) => reader,
                Err(e) => {
                    eprintln!(
                        "[TerminalManager] Failed to clone reader for {}: {}",
                        session_id_clone, e
                    );
                    let _ = app_handle_clone.emit(
                        "terminal:session:closed",
                        TerminalSessionClosedPayload {
                            session_id: session_id_clone,
                        },
                    );
                    return;
                }
            };

            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buffer[..n].to_vec();
                        let _ = app_handle_clone.emit(
                            "terminal:output",
                            TerminalOutputPayload {
                                session_id: session_id_clone.clone(),
                                data,
                            },
                        );
                    }
                    Err(e) => {
                        eprintln!(
                            "[TerminalManager] Reader error for {}: {}",
                            session_id_clone, e
                        );
                        break;
                    }
                }
            }

            
            if let Ok(mut c) = child_clone.lock() {
                let _ = c.wait();
            }

            let _ = app_handle_clone.emit(
                "terminal:session:closed",
                TerminalSessionClosedPayload {
                    session_id: session_id_clone,
                },
            );
        });

        let mut sessions = self.sessions.write().await;
        sessions.insert(
            id.clone(),
            PtySession {
                master,
                writer,
                child,
                session: session.clone(),
            },
        );

        Ok(session)
    }

    pub async fn write(&self, session_id: &str, data: Vec<u8>) -> Result<(), String> {
        let sessions = self.sessions.read().await;
        if let Some(pty) = sessions.get(session_id) {
            let mut writer = pty.writer.lock().unwrap();
            writer
                .write_all(&data)
                .map_err(|e| format!("Failed to write to terminal: {}", e))?;
            writer
                .flush()
                .map_err(|e| format!("Failed to flush terminal: {}", e))?;
            Ok(())
        } else {
            Err(format!("Session not found: {}", session_id))
        }
    }

    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.read().await;
        if let Some(pty) = sessions.get(session_id) {
            let m = pty.master.lock().unwrap();
            m.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize terminal: {}", e))?;
            Ok(())
        } else {
            Err(format!("Session not found: {}", session_id))
        }
    }

    pub async fn kill_session(&self, session_id: &str) -> Result<(), String> {
        let session = {
            let sessions = self.sessions.read().await;
            sessions.get(session_id).cloned()
        };

        if let Some(pty) = session {
            if let Ok(mut c) = pty.child.lock() {
                let _ = c.kill();
                let _ = c.wait();
            }
        }

        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id);
        Ok(())
    }

    pub async fn list_sessions(&self) -> Vec<TerminalSession> {
        let sessions = self.sessions.read().await;
        sessions.values().map(|s| s.session.clone()).collect()
    }

    pub fn get_os_type(&self) -> OsType {
        OsType::current()
    }
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for PtySession {
    fn clone(&self) -> Self {
        Self {
            master: Arc::clone(&self.master),
            writer: Arc::clone(&self.writer),
            child: Arc::clone(&self.child),
            session: self.session.clone(),
        }
    }
}
