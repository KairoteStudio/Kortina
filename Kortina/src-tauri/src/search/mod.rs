use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Default)]
pub struct SearchManager {
    active: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl SearchManager {
    pub fn new() -> Self {
        Self::default()
    }

    fn start(&self, search_id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        if let Some(previous) = self
            .active
            .lock()
            .expect("search registry poisoned")
            .insert(search_id.into(), flag.clone())
        {
            previous.store(true, Ordering::Release);
        }
        flag
    }

    fn cancel(&self, search_id: &str) -> bool {
        self.active
            .lock()
            .expect("search registry poisoned")
            .remove(search_id)
            .map(|flag| {
                flag.store(true, Ordering::Release);
                true
            })
            .unwrap_or(false)
    }

    fn finish(&self, search_id: &str, flag: &Arc<AtomicBool>) {
        let mut active = self.active.lock().expect("search registry poisoned");
        if active.get(search_id).map(Arc::as_ptr) == Some(Arc::as_ptr(flag)) {
            active.remove(search_id);
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchMatch {
    pub start: usize,
    pub end: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchOptions {
    pub query: String,
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub use_regex: bool,
    pub include_pattern: String,
    pub exclude_pattern: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchBatchPayload {
    search_id: String,
    results: Vec<SearchResult>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchDonePayload {
    search_id: String,
    total: usize,
    truncated: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchErrorPayload {
    search_id: String,
    message: String,
}

const MAX_RESULTS: usize = 1000;

const BATCH_SIZE: usize = 20;

fn is_text_file(path: &Path) -> bool {
    let text_extensions = [
        "krt",
        "kairote",
        "txt",
        "md",
        "markdown",
        "json",
        "jsonc",
        "xml",
        "yaml",
        "yml",
        "js",
        "mjs",
        "cjs",
        "ts",
        "jsx",
        "tsx",
        "vue",
        "svelte",
        "html",
        "htm",
        "css",
        "scss",
        "sass",
        "less",
        "py",
        "java",
        "cpp",
        "cc",
        "cxx",
        "c",
        "h",
        "hpp",
        "hxx",
        "cs",
        "go",
        "rs",
        "rb",
        "php",
        "swift",
        "kt",
        "scala",
        "r",
        "m",
        "mm",
        "es",
        "esh",
        "toml",
        "ini",
        "cfg",
        "conf",
        "env",
        "sh",
        "bash",
        "zsh",
        "fish",
        "sql",
        "graphql",
        "gql",
        "lua",
        "dart",
        "zig",
        "nim",
        "ex",
        "exs",
        "erl",
        "plist",
        "gradle",
        "properties",
        "lock",
        "log",
        "csv",
        "tsv",
    ];

    
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        let lower = name.to_lowercase();
        if matches!(
            lower.as_str(),
            "makefile"
                | "dockerfile"
                | "cmakelists.txt"
                | "readme"
                | "license"
                | "licence"
                | "changelog"
                | "authors"
                | "copying"
                | "gemfile"
                | "rakefile"
                | "procfile"
                | "vagrantfile"
        ) {
            return true;
        }
    }

    if let Some(ext) = path.extension() {
        let ext = ext.to_string_lossy().to_lowercase();
        return text_extensions.contains(&ext.as_str());
    }
    false
}

fn should_include_file(filename: &str, include_pattern: &str, exclude_pattern: &str) -> bool {
    let exclude_list: Vec<&str> = exclude_pattern
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    let include_list: Vec<&str> = include_pattern
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    for exclude in &exclude_list {
        if filename.to_lowercase().contains(&exclude.to_lowercase()) {
            return false;
        }
    }

    if include_list.is_empty() || (include_list.len() == 1 && include_list[0] == "*") {
        return true;
    }

    for pattern in &include_list {
        if pattern.contains('*') {
            let regex_str = pattern.replace('*', ".*");
            if let Ok(regex) = Regex::new(&format!("^{}$", regex_str)) {
                if regex.is_match(filename) {
                    return true;
                }
            }
        } else if filename.to_lowercase().contains(&pattern.to_lowercase()) {
            return true;
        }
    }

    false
}

fn search_in_file(
    file_path: &Path,
    project_path: &str,
    options: &SearchOptions,
    cancelled: &AtomicBool,
) -> Vec<SearchResult> {
    let mut results = Vec::new();

    let filename = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("");

    if !should_include_file(filename, &options.include_pattern, &options.exclude_pattern) {
        return results;
    }

    if !is_text_file(file_path) {
        return results;
    }

    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return results,
    };

    let flags = if options.case_sensitive { "" } else { "(?i)" };
    let pattern = if options.use_regex {
        format!("{}{}", flags, options.query)
    } else {
        let escaped = regex::escape(&options.query);
        if options.whole_word {
            format!(r"{}\b{}\b", flags, escaped)
        } else {
            format!("{}{}", flags, escaped)
        }
    };

    let regex = match Regex::new(&pattern) {
        Ok(r) => r,
        Err(_) => return results,
    };

    for (line_idx, line) in content.lines().enumerate() {
        if cancelled.load(Ordering::Acquire) {
            break;
        }
        let mut matches = Vec::new();

        for mat in regex.find_iter(line) {
            matches.push(SearchMatch {
                start: mat.start(),
                end: mat.end(),
            });
        }

        if !matches.is_empty() {
            let relative_path = file_path
                .strip_prefix(project_path)
                .unwrap_or(file_path)
                .to_string_lossy()
                .to_string();

            let leading_whitespace = line.len() - line.trim_start().len();
            let trimmed_matches: Vec<SearchMatch> = matches
                .iter()
                .map(|m| SearchMatch {
                    start: m.start.saturating_sub(leading_whitespace),
                    end: m.end.saturating_sub(leading_whitespace),
                })
                .collect();

            results.push(SearchResult {
                file: relative_path,
                line: line_idx + 1,
                column: trimmed_matches[0].start + 1,
                content: line.trim_start().to_string(),
                matches: trimmed_matches,
            });
        }
    }

    results
}

struct StreamCtx<'a> {
    app: &'a AppHandle,
    search_id: &'a str,
    total: AtomicUsize,
    batch: std::sync::Mutex<Vec<SearchResult>>,
    truncated: AtomicUsize,
    cancelled: Arc<AtomicBool>,
}

impl<'a> StreamCtx<'a> {
    fn flush(&self, force: bool) {
        let mut batch = self.batch.lock().unwrap();
        if batch.is_empty() {
            return;
        }
        if !force && batch.len() < BATCH_SIZE {
            return;
        }
        let results = std::mem::take(&mut *batch);
        let _ = self.app.emit(
            "search:results",
            SearchBatchPayload {
                search_id: self.search_id.to_string(),
                results,
            },
        );
    }

    fn push_results(&self, mut file_results: Vec<SearchResult>) -> bool {
        if file_results.is_empty() {
            return true;
        }

        let mut remaining = MAX_RESULTS.saturating_sub(self.total.load(Ordering::Relaxed));
        if remaining == 0 {
            self.truncated.store(1, Ordering::Relaxed);
            return false;
        }

        if file_results.len() > remaining {
            file_results.truncate(remaining);
            self.truncated.store(1, Ordering::Relaxed);
        }

        let added = file_results.len();
        {
            let mut batch = self.batch.lock().unwrap();
            batch.extend(file_results);
        }
        self.total.fetch_add(added, Ordering::Relaxed);
        self.flush(false);

        remaining = MAX_RESULTS.saturating_sub(self.total.load(Ordering::Relaxed));
        remaining > 0
    }
}

fn search_directory_stream(
    dir_path: &Path,
    project_path: &str,
    options: &SearchOptions,
    ctx: &StreamCtx<'_>,
) -> Result<(), String> {
    let entries = match fs::read_dir(dir_path) {
        Ok(e) => e,
        Err(e) => return Err(format!("读取目录失败: {}", e)),
    };

    for entry in entries {
        if ctx.cancelled.load(Ordering::Acquire) {
            break;
        }
        if ctx.total.load(Ordering::Relaxed) >= MAX_RESULTS {
            ctx.truncated.store(1, Ordering::Relaxed);
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        let filename = entry.file_name();
        let filename_str = filename.to_string_lossy();

        let exclude_list: Vec<&str> = options
            .exclude_pattern
            .split(',')
            .map(|s| s.trim())
            .collect();
        if path.is_dir() {
            if exclude_list
                .iter()
                .any(|e| filename_str.to_lowercase().contains(&e.to_lowercase()))
            {
                continue;
            }
            let _ = search_directory_stream(&path, project_path, options, ctx);
        } else {
            let file_results = search_in_file(&path, project_path, options, &ctx.cancelled);
            if !ctx.push_results(file_results) {
                break;
            }
        }
    }

    Ok(())
}


#[tauri::command]
pub async fn search_files(
    app: AppHandle,
    manager: State<'_, SearchManager>,
    project_path: String,
    options: SearchOptions,
    search_id: String,
) -> Result<(), String> {
    let path = Path::new(&project_path);

    if !path.exists() {
        let _ = app.emit(
            "search:error",
            SearchErrorPayload {
                search_id: search_id.clone(),
                message: format!("项目路径不存在: {}", project_path),
            },
        );
        return Err(format!("项目路径不存在: {}", project_path));
    }

    if !path.is_dir() {
        let _ = app.emit(
            "search:error",
            SearchErrorPayload {
                search_id: search_id.clone(),
                message: format!("项目路径不是目录: {}", project_path),
            },
        );
        return Err(format!("项目路径不是目录: {}", project_path));
    }

    let app_clone = app.clone();
    let search_id_clone = search_id.clone();
    let project_path_clone = project_path.clone();
    let manager = manager.inner().clone();
    let cancelled = manager.start(&search_id);
    let cancelled_for_task = cancelled.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let ctx = StreamCtx {
            app: &app_clone,
            search_id: &search_id_clone,
            total: AtomicUsize::new(0),
            batch: std::sync::Mutex::new(Vec::new()),
            truncated: AtomicUsize::new(0),
            cancelled: cancelled_for_task.clone(),
        };

        let path = Path::new(&project_path_clone);
        if let Err(e) = search_directory_stream(path, &project_path_clone, &options, &ctx) {
            let _ = app_clone.emit(
                "search:error",
                SearchErrorPayload {
                    search_id: search_id_clone.clone(),
                    message: e.clone(),
                },
            );
            manager.finish(&search_id_clone, &cancelled_for_task);
            return Err(e);
        }

        if !ctx.cancelled.load(Ordering::Acquire) {
            ctx.flush(true);
        }

        let total = ctx.total.load(Ordering::Relaxed);
        let truncated = ctx.truncated.load(Ordering::Relaxed) == 1;
        if !ctx.cancelled.load(Ordering::Acquire) {
            let _ = app_clone.emit(
                "search:done",
                SearchDonePayload {
                    search_id: search_id_clone.clone(),
                    total,
                    truncated,
                },
            );
        }
        manager.finish(&search_id_clone, &cancelled_for_task);
        Ok(())
    })
    .await
    .map_err(|e| format!("搜索任务失败: {}", e))?;

    result
}

#[tauri::command]
pub fn cancel_search(manager: State<'_, SearchManager>, search_id: String) -> bool {
    manager.cancel(&search_id)
}
