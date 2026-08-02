use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Serialize, Deserialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
}

#[derive(Serialize, Deserialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub is_file: bool,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
}

pub fn path_exists(path: &str) -> bool {
    Path::new(path).exists()
}

pub fn stat_path(path: String) -> Result<FileMetadata, String> {
    let metadata = fs::metadata(&path).map_err(|e| format!("无法读取路径元数据: {e}"))?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().min(u64::MAX as u128) as u64)
        .unwrap_or(0);
    Ok(FileMetadata {
        is_file: metadata.is_file(),
        is_directory: metadata.is_dir(),
        size: metadata.len(),
        modified,
    })
}

fn copy_path(source: &Path, target: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source).map_err(|e| format!("无法读取源路径: {e}"))?;
    if metadata.file_type().is_symlink() {
        return Err("为避免跨越项目边界，不支持复制符号链接".to_string());
    }
    if metadata.is_file() {
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {e}"))?;
        }
        fs::copy(source, target).map_err(|e| format!("复制文件失败: {e}"))?;
        return Ok(());
    }
    if metadata.is_dir() {
        fs::create_dir_all(target).map_err(|e| format!("创建目标目录失败: {e}"))?;
        for entry in fs::read_dir(source).map_err(|e| format!("读取源目录失败: {e}"))? {
            let entry = entry.map_err(|e| format!("读取目录项失败: {e}"))?;
            copy_path(&entry.path(), &target.join(entry.file_name()))?;
        }
        return Ok(());
    }
    Err("不支持复制该路径类型".to_string())
}

fn remove_path(path: &Path) -> Result<(), String> {
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("删除源目录失败: {e}"))
    } else {
        fs::remove_file(path).map_err(|e| format!("删除源文件失败: {e}"))
    }
}

pub async fn copy_file(
    source_path: String,
    target_path: String,
) -> Result<FileOperationResult, String> {
    let source = PathBuf::from(source_path);
    let target = PathBuf::from(target_path);
    if !source.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "源路径不存在".into(),
        });
    }
    if target.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "目标路径已存在".into(),
        });
    }
    copy_path(&source, &target)?;
    Ok(FileOperationResult {
        success: true,
        message: "复制成功".into(),
    })
}

pub async fn read_file(path: String) -> Result<FileContent, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    if !path.is_file() {
        return Err(format!("路径不是文件: {}", path.display()));
    }

    match fs::read_to_string(path) {
        Ok(content) => Ok(FileContent {
            content,
            encoding: "utf-8".to_string(),
        }),
        Err(e) => Err(format!("读取文件失败: {}", e)),
    }
}

pub async fn write_file(path: String, content: String) -> Result<FileOperationResult, String> {
    let path = Path::new(&path);

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    match fs::write(path, content) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "文件保存成功".to_string(),
        }),
        Err(e) => Err(format!("写入文件失败: {}", e)),
    }
}

pub async fn create_file(path: String, is_directory: bool) -> Result<FileOperationResult, String> {
    let path = Path::new(&path);

    if path.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "文件已存在".to_string(),
        });
    }

    let result = if is_directory {
        fs::create_dir_all(path).map_err(|e| format!("创建目录失败: {}", e))
    } else {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
            }
        }
        fs::write(path, "").map_err(|e| format!("创建文件失败: {}", e))
    };

    match result {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: if is_directory {
                "目录创建成功"
            } else {
                "文件创建成功"
            }
            .to_string(),
        }),
        Err(e) => Err(e),
    }
}

pub async fn delete_file(path: String) -> Result<FileOperationResult, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "文件不存在".to_string(),
        });
    }

    let result = if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("删除目录失败: {}", e))
    } else {
        fs::remove_file(path).map_err(|e| format!("删除文件失败: {}", e))
    };

    match result {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "删除成功".to_string(),
        }),
        Err(e) => Err(e),
    }
}

pub async fn rename_file(
    old_path: String,
    new_path: String,
) -> Result<FileOperationResult, String> {
    let old_path = Path::new(&old_path);
    let new_path = Path::new(&new_path);

    if !old_path.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "原文件不存在".to_string(),
        });
    }

    if new_path.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "目标文件已存在".to_string(),
        });
    }

    match fs::rename(old_path, new_path) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "重命名成功".to_string(),
        }),
        Err(e) => Err(format!("重命名失败: {}", e)),
    }
}

pub async fn move_file(
    source_path: String,
    target_path: String,
) -> Result<FileOperationResult, String> {
    let source_path = Path::new(&source_path);
    let target_path = Path::new(&target_path);

    if !source_path.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: "源文件不存在".to_string(),
        });
    }

    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
        }
    }

    match fs::rename(source_path, target_path) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "文件移动成功".to_string(),
        }),
        Err(rename_error) => {
            if target_path.exists() {
                return Err(format!("移动文件失败: {rename_error}"));
            }
            copy_path(source_path, target_path)?;
            if let Err(remove_error) = remove_path(source_path) {
                let _ = remove_path(target_path);
                return Err(format!("跨卷移动失败: {remove_error}"));
            }
            Ok(FileOperationResult {
                success: true,
                message: "文件移动成功".into(),
            })
        }
    }
}
