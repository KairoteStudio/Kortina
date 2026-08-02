use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use tokio::process::Command;
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

struct TaskControl {
    token: String,
    cancel: oneshot::Sender<()>,
}

#[derive(Clone, Default)]
pub struct TaskManager {
    tasks: Arc<Mutex<HashMap<String, TaskControl>>>,
}

pub struct TaskOutput {
    pub success: bool,
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
    pub exit_code: i32,
    pub cancelled: bool,
}

impl TaskManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn stop(&self, task_id: &str) -> bool {
        self.tasks
            .lock()
            .await
            .remove(task_id)
            .map(|control| control.cancel.send(()).is_ok())
            .unwrap_or(false)
    }

    async fn register(&self, task_id: &str) -> (String, oneshot::Receiver<()>) {
        let token = Uuid::new_v4().to_string();
        let (cancel, receiver) = oneshot::channel();
        if let Some(previous) = self.tasks.lock().await.insert(
            task_id.to_string(),
            TaskControl {
                token: token.clone(),
                cancel,
            },
        ) {
            let _ = previous.cancel.send(());
        }
        (token, receiver)
    }

    async fn unregister(&self, task_id: &str, token: &str) {
        let mut tasks = self.tasks.lock().await;
        if tasks.get(task_id).map(|task| task.token.as_str()) == Some(token) {
            tasks.remove(task_id);
        }
    }

    pub async fn run(
        &self,
        task_id: &str,
        executable: &str,
        args: &[String],
        cwd: Option<&std::path::Path>,
        timeout: Duration,
    ) -> Result<TaskOutput, String> {
        let (token, mut cancel) = self.register(task_id).await;
        let mut command = Command::new(executable);
        command
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        if let Some(cwd) = cwd {
            command.current_dir(cwd);
        }
        configure_process_group(&mut command);

        let child = command
            .spawn()
            .map_err(|error| format!("Failed to start process {executable}: {error}"))?;
        let pid = child.id();
        let mut wait = Box::pin(child.wait_with_output());

        let result = tokio::select! {
            output = &mut wait => output.map(|output| (output, false)).map_err(|error| error.to_string()),
            _ = &mut cancel => {
                terminate_process_tree(pid, false).await;
                match tokio::time::timeout(Duration::from_secs(2), &mut wait).await {
                    Ok(output) => output.map(|output| (output, true)).map_err(|error| error.to_string()),
                    Err(_) => {
                        terminate_process_tree(pid, true).await;
                        wait.await.map(|output| (output, true)).map_err(|error| error.to_string())
                    }
                }
            }
            _ = tokio::time::sleep(timeout) => {
                terminate_process_tree(pid, false).await;
                let _ = tokio::time::timeout(Duration::from_secs(2), &mut wait).await;
                terminate_process_tree(pid, true).await;
                Err(format!("Process timed out after {} seconds", timeout.as_secs()))
            }
        };
        self.unregister(task_id, &token).await;
        let (output, cancelled) = result?;
        Ok(TaskOutput {
            success: output.status.success() && !cancelled,
            stdout: output.stdout,
            stderr: output.stderr,
            exit_code: output.status.code().unwrap_or(-1),
            cancelled,
        })
    }
}

#[cfg(unix)]
fn configure_process_group(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.as_std_mut().process_group(0);
}

#[cfg(windows)]
fn configure_process_group(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
    command
        .as_std_mut()
        .creation_flags(CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP);
}

#[cfg(unix)]
async fn terminate_process_tree(pid: Option<u32>, force: bool) {
    if let Some(pid) = pid {
        let signal = if force { libc::SIGKILL } else { libc::SIGTERM };
        unsafe {
            libc::kill(-(pid as i32), signal);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::TaskManager;

    #[tokio::test]
    async fn replacing_and_stopping_task_cancels_registered_work() {
        let manager = TaskManager::new();
        let (_first_token, first_cancel) = manager.register("build").await;
        let (_second_token, second_cancel) = manager.register("build").await;

        assert!(first_cancel.await.is_ok());
        assert!(manager.stop("build").await);
        assert!(second_cancel.await.is_ok());
        assert!(!manager.stop("build").await);
    }
}

#[cfg(windows)]
async fn terminate_process_tree(pid: Option<u32>, force: bool) {
    if let Some(pid) = pid {
        let mut command = Command::new("taskkill.exe");
        command.args(["/PID", &pid.to_string(), "/T"]);
        if force {
            command.arg("/F");
        }
        let _ = command.output().await;
    }
}
