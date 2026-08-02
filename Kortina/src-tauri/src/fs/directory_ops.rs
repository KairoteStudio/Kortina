use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub last_opened: String,
}

#[derive(Serialize, Deserialize)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub size: Option<u64>,
    pub modified: Option<u64>,
    pub children: Option<Vec<FileItem>>,
}

pub async fn read_directory(path: String, save_to_recents: bool) -> Result<Vec<FileItem>, String> {
    read_directory_recursive(&path, save_to_recents).await
}

async fn read_directory_recursive(
    path: &str,
    save_to_recents: bool,
) -> Result<Vec<FileItem>, String> {
    let normalized_path = path.replace("\\", "/");
    let path_obj = Path::new(&normalized_path);

    if !path_obj.exists() {
        return Err(format!("路径不存在: {}", path_obj.display()));
    }

    if !path_obj.is_dir() {
        return Err(format!("路径不是目录: {}", path_obj.display()));
    }

    let mut items = Vec::new();

    match fs::read_dir(path_obj) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let name = entry.file_name().to_string_lossy().to_string();
                        let entry_path = entry.path();

                        let path_str = entry_path.to_string_lossy().replace("\\", "/");
                        let metadata = entry
                            .metadata()
                            .map_err(|e| format!("获取文件元数据失败: {}", e))?;

                        let item_type = if metadata.is_dir() {
                            "directory"
                        } else {
                            "file"
                        };

                        
                        let children = if metadata.is_dir() {
                            Some(vec![])
                        } else {
                            None
                        };

                        items.push(FileItem {
                            name,
                            path: path_str,
                            item_type: item_type.to_string(),
                            size: if metadata.is_file() {
                                Some(metadata.len())
                            } else {
                                None
                            },
                            modified: metadata
                                .modified()
                                .ok()
                                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|duration| duration.as_secs()),
                            children,
                        });
                    }
                    Err(e) => {
                        eprintln!("读取目录项失败: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("读取目录失败: {}", e));
        }
    }

    
    items.sort_by(|a, b| match (a.item_type.as_str(), b.item_type.as_str()) {
        ("directory", "file") => std::cmp::Ordering::Less,
        ("file", "directory") => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    if save_to_recents {
        if let Err(e) = save_to_recent_projects(&normalized_path).await {
            eprintln!("保存到最近项目失败: {}", e);
        }
    }

    Ok(items)
}

pub async fn get_current_dir() -> Result<String, String> {
    match std::env::current_dir() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("获取当前目录失败: {}", e)),
    }
}

pub async fn save_to_recent_projects(path: &str) -> Result<(), String> {
    let app_data_dir =
        std::env::var("TAURI_APP_DATA_DIR").map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    let opened_dir = std::path::Path::new(&app_data_dir).join("opened");
    fs::create_dir_all(&opened_dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let recent_projects_path = opened_dir.join("recent_projects.json");
    let mut recent_projects: Vec<RecentProject> = if recent_projects_path.exists() {
        let content = fs::read_to_string(&recent_projects_path)
            .map_err(|e| format!("读取最近项目列表失败: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    let project_name = Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(path)
        .to_string();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("获取时间失败: {}", e))?
        .as_secs();

    let new_project = RecentProject {
        path: path.to_string(),
        name: project_name,
        last_opened: now.to_string(),
    };

    if let Some(pos) = recent_projects.iter().position(|p| p.path == path) {
        recent_projects.remove(pos);
    }

    recent_projects.insert(0, new_project);

    if recent_projects.len() > 10 {
        recent_projects.truncate(10);
    }

    let json_content = serde_json::to_string_pretty(&recent_projects)
        .map_err(|e| format!("序列化JSON失败: {}", e))?;

    let mut file =
        File::create(&recent_projects_path).map_err(|e| format!("创建文件失败: {}", e))?;

    file.write_all(json_content.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    println!("已保存项目路径到最近项目列表: {}", path);
    Ok(())
}
