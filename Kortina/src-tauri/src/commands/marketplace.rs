use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};








#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceCompatibility {
    pub min_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplacePlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloads: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_notes: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub permissions: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compatibility: Option<MarketplaceCompatibility>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub main: Option<String>,
    
    #[serde(skip)]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceHealth {
    pub ok: bool,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub catalog_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plugin_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceListResponse {
    pub items: Vec<serde_json::Value>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceLatestResponse {
    pub plugin_id: String,
    pub version: String,
    pub download_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
    pub checksum: MarketplaceChecksum,
}

#[derive(Debug, Clone, Serialize)]
pub struct MarketplaceChecksum {
    pub algorithm: String,
    pub value: String,
}

fn builtin_catalog() -> Vec<MarketplacePlugin> {
    vec![]
}

fn plugin_to_json(plugin: &MarketplacePlugin) -> serde_json::Value {
    json!({
        "id": plugin.id,
        "name": plugin.name,
        "version": plugin.version,
        "description": plugin.description,
        "author": plugin.author,
        "license": plugin.license,
        "category": plugin.category,
        "tags": plugin.tags,
        "homepage": plugin.homepage,
        "repository": plugin.repository,
        "downloads": plugin.downloads,
        "updatedAt": plugin.updated_at,
        "releaseNotes": plugin.release_notes,
        "permissions": plugin.permissions,
        "downloadUrl": plugin.download_url,
        "compatibility": plugin.compatibility.as_ref().map(|c| json!({
            "minVersion": c.min_version,
            "maxVersion": c.max_version,
        })),
        "main": plugin.main,
    })
}

fn find_plugin(plugin_id: &str) -> Option<MarketplacePlugin> {
    builtin_catalog().into_iter().find(|p| p.id == plugin_id)
}


fn pack_plugin(plugin: &MarketplacePlugin) -> Result<Vec<u8>, String> {
    let mut manifest = plugin_to_json(plugin);
    if let Some(obj) = manifest.as_object_mut() {
        obj.insert(
            "main".to_string(),
            json!(plugin.main.clone().unwrap_or_else(|| "index.js".into())),
        );
    }

    let manifest_bytes = serde_json::to_vec(&manifest).map_err(|e| e.to_string())?;
    let code = plugin
        .source
        .clone()
        .unwrap_or_else(|| "exports.activate=function(){};exports.deactivate=function(){};".into());
    let code_bytes = code.into_bytes();

    let mut out = Vec::with_capacity(4 + manifest_bytes.len() + code_bytes.len());
    let len = manifest_bytes.len() as u32;
    out.extend_from_slice(&len.to_le_bytes());
    out.extend_from_slice(&manifest_bytes);
    out.extend_from_slice(&code_bytes);
    Ok(out)
}

#[tauri::command]
pub async fn marketplace_health() -> Result<MarketplaceHealth, String> {
    let catalog = builtin_catalog();
    Ok(MarketplaceHealth {
        ok: true,
        source: "tauri".into(),
        message: Some("内置扩展市场目录可用".into()),
        catalog_version: Some("builtin-1".into()),
        plugin_count: Some(catalog.len()),
    })
}

#[tauri::command]
pub async fn marketplace_list(
    query: Option<String>,
    category: Option<String>,
    page: Option<usize>,
    page_size: Option<usize>,
    sort: Option<String>,
) -> Result<MarketplaceListResponse, String> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 50);
    let mut items = builtin_catalog();

    if let Some(q) = query
        .as_ref()
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
    {
        items.retain(|p| {
            p.name.to_lowercase().contains(&q)
                || p.id.to_lowercase().contains(&q)
                || p.description
                    .as_ref()
                    .map(|d| d.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || p.tags.iter().any(|t| t.to_lowercase().contains(&q))
        });
    }

    if let Some(cat) = category
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
    {
        items.retain(|p| p.category.as_deref() == Some(cat.as_str()));
    }

    match sort.as_deref() {
        Some("name") => items.sort_by(|a, b| a.name.cmp(&b.name)),
        Some("downloads") => {
            items.sort_by(|a, b| b.downloads.unwrap_or(0).cmp(&a.downloads.unwrap_or(0)))
        }
        Some("updated") => items.sort_by(|a, b| b.updated_at.cmp(&a.updated_at)),
        _ => {}
    }

    let total = items.len();
    let start = (page - 1).saturating_mul(page_size);
    let page_items: Vec<serde_json::Value> = items
        .into_iter()
        .skip(start)
        .take(page_size)
        .map(|p| plugin_to_json(&p))
        .collect();

    Ok(MarketplaceListResponse {
        items: page_items,
        total,
        page,
        page_size,
        source: "tauri".into(),
    })
}

#[tauri::command]
pub async fn marketplace_get(plugin_id: String) -> Result<serde_json::Value, String> {
    find_plugin(&plugin_id)
        .map(|p| plugin_to_json(&p))
        .ok_or_else(|| format!("Plugin not found: {}", plugin_id))
}

#[tauri::command]
pub async fn marketplace_latest(plugin_id: String) -> Result<MarketplaceLatestResponse, String> {
    let plugin =
        find_plugin(&plugin_id).ok_or_else(|| format!("Plugin not found: {}", plugin_id))?;
    let package = pack_plugin(&plugin)?;
    Ok(MarketplaceLatestResponse {
        plugin_id: plugin.id.clone(),
        version: plugin.version.clone(),
        download_url: plugin.download_url.unwrap_or_else(|| {
            format!(
                "kortina://marketplace/download/{}?version={}",
                plugin.id, plugin.version
            )
        }),
        release_notes: plugin.release_notes,
        published_at: plugin.updated_at,
        checksum: MarketplaceChecksum {
            algorithm: "sha256".to_string(),
            value: format!("{:x}", Sha256::digest(&package)),
        },
    })
}

#[tauri::command]
pub async fn marketplace_download(plugin_id: String, version: String) -> Result<Vec<u8>, String> {
    let plugin =
        find_plugin(&plugin_id).ok_or_else(|| format!("Plugin not found: {}", plugin_id))?;
    if plugin.version != version {
        return Err(format!(
            "Plugin version not found: {}@{} (available: {})",
            plugin_id, version, plugin.version
        ));
    }
    pack_plugin(&plugin)
}