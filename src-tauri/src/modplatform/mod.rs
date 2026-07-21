//! Unified mod-platform layer.
//!
//! `modrinth.rs` and `curseforge.rs` each talk to their API but return the
//! same normalized types (`ModSummary`, `ModVersionInfo`) — so the frontend
//! and the instance code never care which platform a mod came from.

pub mod commands;
pub mod curseforge;
pub mod modrinth;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Modrinth,
    Curseforge,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ProjectType {
    #[default]
    Mod,
    Modpack,
    Shader,
}

impl ProjectType {
    pub fn as_str(self) -> &'static str {
        match self {
            ProjectType::Mod => "mod",
            ProjectType::Modpack => "modpack",
            ProjectType::Shader => "shader",
        }
    }

    pub fn page_segment(self) -> &'static str {
        self.as_str()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SearchSort {
    #[default]
    Relevance,
    Downloads,
    Updated,
    Name,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModLoader {
    Fabric,
    Forge,
    Neoforge,
    Quilt,
}

impl ModLoader {
    /// The identifier both platforms (and Modrinth facets) use.
    pub fn as_str(self) -> &'static str {
        match self {
            ModLoader::Fabric => "fabric",
            ModLoader::Forge => "forge",
            ModLoader::Neoforge => "neoforge",
            ModLoader::Quilt => "quilt",
        }
    }
}

/// Search request coming from the frontend (camelCase over IPC).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams {
    pub platform: Platform,
    pub query: String,
    #[serde(default)]
    pub project_type: ProjectType,
    #[serde(default)]
    pub sort: SearchSort,
    /// e.g. "1.21.1"; None = any version
    #[serde(default)]
    pub game_version: Option<String>,
    /// None = any loader
    #[serde(default)]
    pub loader: Option<ModLoader>,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

fn default_limit() -> u32 {
    20
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultPage {
    pub items: Vec<ModSummary>,
    pub total: u64,
    pub offset: u32,
    pub limit: u32,
}

/// One search hit, identical shape for both platforms.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModSummary {
    pub platform: Platform,
    pub project_type: ProjectType,
    /// Modrinth: project id ("AANobbMI"), CurseForge: numeric id as string.
    pub id: String,
    pub slug: String,
    pub name: String,
    pub summary: String,
    pub author: String,
    pub icon_url: Option<String>,
    pub downloads: u64,
    pub categories: Vec<String>,
    /// The mod's page on the platform website (for "open in browser").
    pub page_url: String,
}

/// One downloadable file/version of a mod.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModVersionInfo {
    pub id: String,
    pub name: String,
    pub version_number: String,
    pub file_name: String,
    /// `None` ⇒ the author opted out of third-party downloads (CurseForge).
    pub download_url: Option<String>,
    /// SHA-1 for integrity verification after download, when provided.
    pub sha1: Option<String>,
    pub file_size: u64,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
}
