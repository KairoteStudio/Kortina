use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::path::{Component, Path};
use std::sync::Mutex;
use tauri::Manager;

static PLUGIN_REGISTRY_LOCK: Mutex<()> = Mutex::new(());

fn validate_identifier(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 128
        || !value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_'))
    {
        return Err(format!("Invalid {label}"));
    }
    Ok(())
}

fn validate_entry_path(value: &str) -> Result<PathBuf, String> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("Plugin main entry must be a safe relative path".to_string());
    }
    if path.extension().and_then(|ext| ext.to_str()) != Some("js") {
        return Err("Plugin main entry must be a JavaScript file".to_string());
    }
    Ok(path.to_path_buf())
}

fn verify_sha256(data: &[u8], expected: &str) -> Result<(), String> {
    let expected = expected.trim().to_ascii_lowercase();
    if expected.len() != 64 || !expected.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Err("Invalid SHA-256 checksum".to_string());
    }
    let actual = format!("{:x}", Sha256::digest(data));
    if actual != expected {
        return Err("Plugin package SHA-256 checksum mismatch".to_string());
    }
    Ok(())
}

fn ensure_path_within(path: &Path, root: &Path) -> Result<(), String> {
    let canonical_root = root.canonicalize().map_err(|e| e.to_string())?;
    let canonical_path = path.canonicalize().map_err(|e| e.to_string())?;
    if !canonical_path.starts_with(&canonical_root) || canonical_path == canonical_root {
        return Err("Plugin path escapes the managed plugin directory".to_string());
    }
    Ok(())
}


fn create_minimal_manifest(plugin_id: &str, version: &str) -> serde_json::Value {
    serde_json::json!({
        "id": plugin_id,
        "name": plugin_id,
        "version": version,
        "description": "Installed from marketplace",
        "author": "Unknown",
        "main": "index.js"
    })
}


fn extract_plugin_code(plugin_data: &[u8]) -> Option<Vec<u8>> {
    if plugin_data.len() <= 4 {
        return None;
    }

    let manifest_len = u32::from_le_bytes([
        plugin_data[0],
        plugin_data[1],
        plugin_data[2],
        plugin_data[3],
    ]) as usize;

    let code_start = 4 + manifest_len;
    if code_start < plugin_data.len() {
        Some(plugin_data[code_start..].to_vec())
    } else {
        None
    }
}

#[tauri::command]
pub async fn get_plugins_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

    Ok(plugin_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_plugins_json(
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    let plugins_json_path = plugin_dir.join("plugins.json");

    if !plugins_json_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;

    let plugins: Vec<serde_json::Value> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(plugins)
}


#[tauri::command]
pub async fn install_plugin(
    app_handle: tauri::AppHandle,
    plugin_id: String,
    version: String,
    plugin_data: Vec<u8>,
    expected_checksum: Option<String>,
) -> Result<String, String> {
    validate_identifier(&plugin_id, "plugin id")?;
    validate_identifier(&version, "plugin version")?;
    if let Some(expected) = expected_checksum {
        verify_sha256(&plugin_data, &expected)?;
    }
    let _registry_guard = PLUGIN_REGISTRY_LOCK
        .lock()
        .map_err(|_| "Plugin registry lock is poisoned")?;
    println!(
        "[Plugin] Installing plugin: {} v{} ({} bytes)",
        plugin_id,
        version,
        plugin_data.len()
    );

    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

    
    let plugin_specific_dir = plugin_dir.join(format!("{}-{}", plugin_id, version));
    std::fs::create_dir_all(&plugin_specific_dir).map_err(|e| e.to_string())?;

    
    let package_path = plugin_specific_dir.join("package.bin");
    std::fs::write(&package_path, &plugin_data)
        .map_err(|e| format!("Failed to write plugin package: {}", e))?;

    
    
    
    
    
    let plugin_manifest = if plugin_data.len() > 4 {
        
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&plugin_data) {
            json
        } else {
            
            let manifest_len = u32::from_le_bytes([
                plugin_data[0],
                plugin_data[1],
                plugin_data[2],
                plugin_data[3],
            ]) as usize;

            if manifest_len > 0 && manifest_len < plugin_data.len().saturating_sub(4) {
                if let Ok(manifest) =
                    serde_json::from_slice::<serde_json::Value>(&plugin_data[4..4 + manifest_len])
                {
                    manifest
                } else {
                    create_minimal_manifest(&plugin_id, &version)
                }
            } else {
                
                create_minimal_manifest(&plugin_id, &version)
            }
        }
    } else if plugin_data.len() > 0 {
        
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&plugin_data) {
            json
        } else {
            create_minimal_manifest(&plugin_id, &version)
        }
    } else {
        return Err("Empty plugin data".to_string());
    };

    if let Some(manifest_id) = plugin_manifest.get("id").and_then(|value| value.as_str()) {
        if manifest_id != plugin_id {
            return Err("Plugin package id does not match requested plugin id".to_string());
        }
    }
    if let Some(manifest_version) = plugin_manifest
        .get("version")
        .and_then(|value| value.as_str())
    {
        if manifest_version != version {
            return Err("Plugin package version does not match requested version".to_string());
        }
    }
    let main_entry = validate_entry_path(
        plugin_manifest
            .get("main")
            .and_then(|value| value.as_str())
            .unwrap_or("index.js"),
    )?;

    
    let mut code_extracted = false;
    if let Some(code) = extract_plugin_code(&plugin_data) {
        let code_path = plugin_specific_dir.join(&main_entry);
        if let Some(parent) = code_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&code_path, &code)
            .map_err(|e| format!("Failed to write plugin code: {}", e))?;
        println!("[Plugin] Extracted plugin code: {} bytes", code.len());
        code_extracted = true;
    }

    
    if !code_extracted {
        
        let code_path = plugin_specific_dir.join(&main_entry);
        if !code_path.exists() {
            let plugin_name = plugin_manifest
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or(&plugin_id);
            let default_code = format!(
                r#"

'use strict';

module.exports = {{
    id: "{}",
    name: "{}",
    version: "{}",
    activate: function(api) {{
        console.log("[Plugin] {} v{} activated");
    }},
    deactivate: function() {{
        console.log("[Plugin] {} v{} deactivated");
    }}
}};
"#,
                plugin_id, plugin_name, version, plugin_id, version, plugin_id, version
            );
            std::fs::write(&code_path, default_code)
                .map_err(|e| format!("Failed to write default plugin code: {}", e))?;
            println!(
                "[Plugin] Created default plugin module: {}",
                main_entry.display()
            );
        }
    }

    
    let plugins_json_path = plugin_dir.join("plugins.json");
    let mut plugins: Vec<serde_json::Value> = if plugins_json_path.exists() {
        let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    
    plugins.retain(|p| p["id"] != plugin_id);

    
    let mut manifest_with_meta = plugin_manifest.clone();
    if let Some(obj) = manifest_with_meta.as_object_mut() {
        obj.insert(
            "installedAt".to_string(),
            serde_json::json!(chrono::Utc::now().to_rfc3339()),
        );
        obj.insert(
            "installPath".to_string(),
            serde_json::json!(plugin_specific_dir.to_string_lossy().to_string()),
        );
    }
    plugins.push(manifest_with_meta);

    let output = serde_json::to_string_pretty(&plugins).map_err(|e| e.to_string())?;
    std::fs::write(&plugins_json_path, output).map_err(|e| e.to_string())?;

    println!(
        "[Plugin] Plugin {} v{} installed successfully at {:?}",
        plugin_id, version, plugin_specific_dir
    );
    Ok(format!(
        "Plugin {} v{} installed successfully",
        plugin_id, version
    ))
}

#[tauri::command]
pub async fn uninstall_plugin(
    app_handle: tauri::AppHandle,
    plugin_id: String,
) -> Result<String, String> {
    validate_identifier(&plugin_id, "plugin id")?;
    let _registry_guard = PLUGIN_REGISTRY_LOCK
        .lock()
        .map_err(|_| "Plugin registry lock is poisoned")?;
    println!("[Plugin] Uninstalling plugin: {}", plugin_id);

    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    
    let plugins_json_path = plugin_dir.join("plugins.json");
    let mut install_path: Option<String> = None;

    if plugins_json_path.exists() {
        let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;
        let mut plugins: Vec<serde_json::Value> =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;

        
        if let Some(plugin) = plugins.iter().find(|p| p["id"] == plugin_id) {
            if let Some(path) = plugin["installPath"].as_str() {
                install_path = Some(path.to_string());
            }
        }

        plugins.retain(|p| p["id"] != plugin_id);

        let output = serde_json::to_string_pretty(&plugins).map_err(|e| e.to_string())?;
        std::fs::write(&plugins_json_path, output).map_err(|e| e.to_string())?;
    }

    
    if let Some(path) = install_path {
        let plugin_specific_path = PathBuf::from(&path);
        if plugin_specific_path.exists() {
            ensure_path_within(&plugin_specific_path, &plugin_dir)?;
            std::fs::remove_dir_all(&plugin_specific_path)
                .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;
            println!(
                "[Plugin] Removed plugin directory: {:?}",
                plugin_specific_path
            );
        }
    } else {
        
        let plugin_pattern = format!("{}-*", plugin_id);
        let pattern_path = plugin_dir.join(&plugin_pattern);
        let matches =
            glob::glob(pattern_path.to_string_lossy().as_ref()).map_err(|e| e.to_string())?;

        for entry in matches {
            if let Ok(path) = entry {
                std::fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
                println!("[Plugin] Removed plugin directory: {:?}", path);
            }
        }
    }

    println!("[Plugin] Plugin {} uninstalled successfully", plugin_id);
    Ok(format!("Plugin {} uninstalled successfully", plugin_id))
}


#[tauri::command]
pub async fn list_installed_plugins(
    app_handle: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    let plugins_json_path = plugin_dir.join("plugins.json");

    if !plugins_json_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;

    let plugins: Vec<serde_json::Value> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(plugins)
}


#[tauri::command]
pub async fn set_plugin_enabled(
    app_handle: tauri::AppHandle,
    plugin_id: String,
    enabled: bool,
) -> Result<String, String> {
    validate_identifier(&plugin_id, "plugin id")?;
    let _registry_guard = PLUGIN_REGISTRY_LOCK
        .lock()
        .map_err(|_| "Plugin registry lock is poisoned")?;
    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    let plugins_json_path = plugin_dir.join("plugins.json");

    if !plugins_json_path.exists() {
        return Err("No plugins installed".to_string());
    }

    let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;
    let mut plugins: Vec<serde_json::Value> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(plugin) = plugins.iter_mut().find(|p| p["id"] == plugin_id) {
        if let Some(obj) = plugin.as_object_mut() {
            obj.insert("isEnabled".to_string(), serde_json::json!(enabled));
        }
        let output = serde_json::to_string_pretty(&plugins).map_err(|e| e.to_string())?;
        std::fs::write(&plugins_json_path, output).map_err(|e| e.to_string())?;
        Ok(format!(
            "Plugin {} {} successfully",
            plugin_id,
            if enabled { "enabled" } else { "disabled" }
        ))
    } else {
        Err(format!("Plugin {} not found", plugin_id))
    }
}


#[tauri::command]
pub async fn update_plugin_states(
    app_handle: tauri::AppHandle,
    states: Vec<serde_json::Value>,
) -> Result<String, String> {
    let _registry_guard = PLUGIN_REGISTRY_LOCK
        .lock()
        .map_err(|_| "Plugin registry lock is poisoned")?;
    let plugin_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;
    let plugins_json_path = plugin_dir.join("plugins.json");

    let mut plugins: Vec<serde_json::Value> = if plugins_json_path.exists() {
        let content = std::fs::read_to_string(&plugins_json_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    let mut updated = 0usize;
    for state in states {
        let plugin_id = match state.get("pluginId").and_then(|v| v.as_str()) {
            Some(id) => id.to_string(),
            None => continue,
        };

        if let Some(plugin) = plugins.iter_mut().find(|p| p["id"] == plugin_id) {
            if let Some(obj) = plugin.as_object_mut() {
                if let Some(enabled) = state.get("enabled").and_then(|v| v.as_bool()) {
                    obj.insert("isEnabled".to_string(), serde_json::json!(enabled));
                }
                if let Some(permissions) = state.get("permissions") {
                    obj.insert("permissions".to_string(), permissions.clone());
                }
                updated += 1;
            }
        }
    }

    let output = serde_json::to_string_pretty(&plugins).map_err(|e| e.to_string())?;
    std::fs::write(&plugins_json_path, output).map_err(|e| e.to_string())?;
    Ok(format!("Updated {} plugin state(s)", updated))
}


#[tauri::command]
pub async fn read_file_as_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::{validate_entry_path, validate_identifier, verify_sha256};

    #[test]
    fn validates_plugin_identifiers_and_entry_paths() {
        assert!(validate_identifier("vendor.plugin-name_1", "plugin id").is_ok());
        assert!(validate_identifier("../plugin", "plugin id").is_err());
        assert!(validate_entry_path("dist/index.js").is_ok());
        assert!(validate_entry_path("../index.js").is_err());
        assert!(validate_entry_path("index.ts").is_err());
    }

    #[test]
    fn verifies_sha256_before_installation() {
        let digest = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
        assert!(verify_sha256(b"hello", digest).is_ok());
        assert!(verify_sha256(b"modified", digest).is_err());
        assert!(verify_sha256(b"hello", "not-a-digest").is_err());
    }
}
