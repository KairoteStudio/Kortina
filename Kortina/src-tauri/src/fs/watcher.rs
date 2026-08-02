

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};


pub const FS_CHANGED_EVENT: &str = "fs-changed";

struct WatchEntry {
    _watcher: RecommendedWatcher,
}

static WATCHERS: Lazy<Mutex<HashMap<String, WatchEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));


static LAST_EMIT: Lazy<Mutex<HashMap<String, Instant>>> = Lazy::new(|| Mutex::new(HashMap::new()));

const DEBOUNCE: Duration = Duration::from_millis(300);

fn should_emit(key: &str) -> bool {
    let mut map = LAST_EMIT.lock().unwrap_or_else(|e| e.into_inner());
    let now = Instant::now();
    if let Some(prev) = map.get(key) {
        if now.duration_since(*prev) < DEBOUNCE {
            return false;
        }
    }
    map.insert(key.to_string(), now);
    true
}

fn emit_change(app: &AppHandle, root: &Path) {
    let key = root.to_string_lossy().to_string();
    if !should_emit(&key) {
        return;
    }
    let payload = serde_json::json!({ "path": key });
    let _ = app.emit(FS_CHANGED_EVENT, payload);
}


pub fn start_watch(app_handle: AppHandle, path: String) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    if !root.is_dir() {
        return Err(format!("路径不是目录: {}", path));
    }

    stop_watch(path.clone()).ok();

    let app = app_handle.clone();
    let root_for_cb = root.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    
                    match event.kind {
                        EventKind::Access(_) => return,
                        EventKind::Other => return,
                        _ => {}
                    }
                    emit_change(&app, &root_for_cb);
                }
                Err(e) => {
                    eprintln!("[fs-watch] error: {}", e);
                }
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(2)),
    )
    .map_err(|e| format!("创建文件监听失败: {}", e))?;

    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| format!("监听目录失败: {}", e))?;

    let mut map = WATCHERS.lock().map_err(|e| e.to_string())?;
    map.insert(path, WatchEntry { _watcher: watcher });
    Ok(())
}

pub fn stop_watch(path: String) -> Result<(), String> {
    let mut map = WATCHERS.lock().map_err(|e| e.to_string())?;
    map.remove(&path);
    
    if let Ok(mut last) = LAST_EMIT.lock() {
        last.remove(&path);
    }
    Ok(())
}


#[allow(dead_code)]
pub fn stop_all() {
    if let Ok(mut map) = WATCHERS.lock() {
        map.clear();
    }
    if let Ok(mut last) = LAST_EMIT.lock() {
        last.clear();
    }
}
