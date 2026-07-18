//! CurseForge Core API client — https://docs.curseforge.com/rest-api/
//!
//! Requires a (free) API key from https://console.curseforge.com/, sent as
//! the `x-api-key` header on every request. The key is resolved in
//! `AppState::curseforge_api_key()` (env var or settings.json).

use serde::Deserialize;

use super::{ModLoader, ModSummary, ModVersionInfo, Platform, SearchParams};
use crate::error::LauncherError;

const BASE: &str = "https://api.curseforge.com/v1";

/// CurseForge hosts many games — 432 is Minecraft.
const GAME_ID_MINECRAFT: &str = "432";
/// Class 6 = "Mods". (Other classes: 4471 = modpacks, 12 = resource packs.)
const CLASS_ID_MODS: &str = "6";

/// CurseForge encodes loaders as an enum:
/// 0=Any 1=Forge 2=Cauldron 3=LiteLoader 4=Fabric 5=Quilt 6=NeoForge
fn loader_id(loader: ModLoader) -> &'static str {
    match loader {
        ModLoader::Forge => "1",
        ModLoader::Fabric => "4",
        ModLoader::Quilt => "5",
        ModLoader::Neoforge => "6",
    }
}

// ── Wire types (subset — serde ignores unknown fields) ──────────────────

/// Every CurseForge response wraps its payload in `{ "data": … }`.
#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    data: T,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Mod {
    id: u64,
    slug: String,
    name: String,
    summary: String,
    download_count: f64,
    links: ModLinks,
    #[serde(default)]
    logo: Option<Logo>,
    #[serde(default)]
    authors: Vec<Author>,
    #[serde(default)]
    categories: Vec<Category>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModLinks {
    website_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Logo {
    thumbnail_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Author {
    name: String,
}

#[derive(Debug, Deserialize)]
struct Category {
    name: String,
}

/// Search Minecraft mods, sorted by popularity.
pub async fn search(
    http: &reqwest::Client,
    api_key: &str,
    params: &SearchParams,
) -> Result<Vec<ModSummary>, LauncherError> {
    let mut query: Vec<(&str, String)> = vec![
        ("gameId", GAME_ID_MINECRAFT.into()),
        ("classId", CLASS_ID_MODS.into()),
        ("searchFilter", params.query.clone()),
        ("sortField", "2".into()), // 2 = Popularity (6 = TotalDownloads, 3 = LastUpdated)
        ("sortOrder", "desc".into()),
        ("pageSize", params.limit.to_string()),
        ("index", params.offset.to_string()),
    ];
    if let Some(version) = &params.game_version {
        query.push(("gameVersion", version.clone()));
    }
    if let Some(loader) = params.loader {
        query.push(("modLoaderType", loader_id(loader).into()));
    }

    let resp: ApiResponse<Vec<Mod>> = http
        .get(format!("{BASE}/mods/search"))
        .header("x-api-key", api_key)
        .query(&query)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(resp
        .data
        .into_iter()
        .map(|m| {
            let page_url = m.links.website_url.unwrap_or_else(|| {
                format!("https://www.curseforge.com/minecraft/mc-mods/{}", m.slug)
            });
            ModSummary {
                platform: Platform::Curseforge,
                id: m.id.to_string(),
                slug: m.slug,
                name: m.name,
                summary: m.summary,
                author: m.authors.first().map(|a| a.name.clone()).unwrap_or_default(),
                icon_url: m.logo.and_then(|logo| logo.thumbnail_url),
                downloads: m.download_count as u64,
                categories: m.categories.into_iter().map(|c| c.name).collect(),
                page_url,
            }
        })
        .collect())
}

// ── Files (= versions) ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct File {
    id: u64,
    display_name: String,
    file_name: String,
    /// `None` when the author disabled third-party distribution — those
    /// files can only be downloaded from the CurseForge website.
    download_url: Option<String>,
    #[serde(default)]
    file_length: u64,
    #[serde(default)]
    hashes: Vec<FileHash>,
    /// ⚠ CurseForge mixes game versions AND loader names in this list,
    /// e.g. ["1.21.1", "Fabric"].
    #[serde(default)]
    game_versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct FileHash {
    value: String,
    /// 1 = SHA-1, 2 = MD5
    algo: u8,
}

/// Lists a mod's files (newest first), optionally filtered by game
/// version and loader.
pub async fn files(
    http: &reqwest::Client,
    api_key: &str,
    mod_id: &str,
    game_version: Option<&str>,
    loader: Option<ModLoader>,
) -> Result<Vec<ModVersionInfo>, LauncherError> {
    let mut query: Vec<(&str, String)> = vec![("pageSize", "20".into())];
    if let Some(version) = game_version {
        query.push(("gameVersion", version.into()));
    }
    if let Some(loader) = loader {
        query.push(("modLoaderType", loader_id(loader).into()));
    }

    let resp: ApiResponse<Vec<File>> = http
        .get(format!("{BASE}/mods/{mod_id}/files"))
        .header("x-api-key", api_key)
        .query(&query)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(resp
        .data
        .into_iter()
        .map(|file| {
            let sha1 = file
                .hashes
                .iter()
                .find(|hash| hash.algo == 1)
                .map(|hash| hash.value.clone());
            ModVersionInfo {
                id: file.id.to_string(),
                name: file.display_name.clone(),
                version_number: file.display_name,
                file_name: file.file_name,
                download_url: file.download_url,
                sha1,
                file_size: file.file_length,
                game_versions: file.game_versions,
                loaders: Vec::new(), // CF doesn't separate loaders from versions
            }
        })
        .collect())
}
