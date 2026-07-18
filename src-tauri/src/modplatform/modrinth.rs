//! Modrinth API v2 client — https://docs.modrinth.com/api/
//!
//! No API key required. Modrinth only asks for a descriptive User-Agent,
//! which is set once on the shared `reqwest::Client` (see state.rs).
//! Rate limit: 300 requests/minute per IP.

use serde::Deserialize;

use super::{ModLoader, ModSummary, ModVersionInfo, Platform, SearchParams};
use crate::error::LauncherError;

const BASE: &str = "https://api.modrinth.com/v2";

// ── Wire types (only the fields we use — serde ignores the rest) ────────

#[derive(Debug, Deserialize)]
struct SearchResponse {
    hits: Vec<SearchHit>,
}

#[derive(Debug, Deserialize)]
struct SearchHit {
    project_id: String,
    slug: String,
    title: String,
    description: String,
    author: String,
    icon_url: Option<String>,
    downloads: u64,
    /// The curated category list shown on the website (excludes loaders).
    #[serde(default)]
    display_categories: Vec<String>,
}

/// Search projects. Filtering works via "facets" — a JSON array of arrays
/// where the outer level is AND and the inner level is OR:
///
///   [["project_type:mod"], ["versions:1.21.1"], ["categories:fabric"]]
///   ⇒ mods AND for 1.21.1 AND fabric
///
/// Note: loaders are modelled as categories in the facet syntax.
pub async fn search(
    http: &reqwest::Client,
    params: &SearchParams,
) -> Result<Vec<ModSummary>, LauncherError> {
    let mut facets: Vec<Vec<String>> = vec![vec!["project_type:mod".to_string()]];
    if let Some(version) = &params.game_version {
        facets.push(vec![format!("versions:{version}")]);
    }
    if let Some(loader) = params.loader {
        facets.push(vec![format!("categories:{}", loader.as_str())]);
    }

    let query: Vec<(&str, String)> = vec![
        ("query", params.query.clone()),
        ("limit", params.limit.to_string()),
        ("offset", params.offset.to_string()),
        ("index", "relevance".to_string()), // or: downloads, newest, updated
        ("facets", serde_json::to_string(&facets)?),
    ];

    let resp: SearchResponse = http
        .get(format!("{BASE}/search"))
        .query(&query)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(resp
        .hits
        .into_iter()
        .map(|hit| {
            let page_url = format!("https://modrinth.com/mod/{}", hit.slug);
            ModSummary {
                platform: Platform::Modrinth,
                id: hit.project_id,
                slug: hit.slug,
                name: hit.title,
                summary: hit.description,
                author: hit.author,
                icon_url: hit.icon_url,
                downloads: hit.downloads,
                categories: hit.display_categories,
                page_url,
            }
        })
        .collect())
}

// ── Versions ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct Version {
    id: String,
    name: String,
    version_number: String,
    game_versions: Vec<String>,
    loaders: Vec<String>,
    files: Vec<VersionFile>,
}

#[derive(Debug, Clone, Deserialize)]
struct VersionFile {
    url: String,
    filename: String,
    primary: bool,
    size: u64,
    hashes: FileHashes,
}

#[derive(Debug, Clone, Deserialize)]
struct FileHashes {
    #[serde(default)]
    sha1: Option<String>,
}

/// Lists a project's downloadable versions, newest first, optionally
/// filtered by game version and loader. The filters are JSON-encoded
/// string arrays in the query, e.g. `game_versions=["1.21.1"]`.
pub async fn versions(
    http: &reqwest::Client,
    project_id: &str,
    game_version: Option<&str>,
    loader: Option<ModLoader>,
) -> Result<Vec<ModVersionInfo>, LauncherError> {
    let mut query: Vec<(&str, String)> = Vec::new();
    if let Some(version) = game_version {
        query.push(("game_versions", serde_json::to_string(&[version])?));
    }
    if let Some(loader) = loader {
        query.push(("loaders", serde_json::to_string(&[loader.as_str()])?));
    }

    let versions: Vec<Version> = http
        .get(format!("{BASE}/project/{project_id}/version"))
        .query(&query)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(versions
        .into_iter()
        .filter_map(|version| {
            // Every version has one "primary" file — the actual mod jar.
            let file = version
                .files
                .iter()
                .find(|f| f.primary)
                .or_else(|| version.files.first())?
                .clone();

            Some(ModVersionInfo {
                id: version.id,
                name: version.name,
                version_number: version.version_number,
                file_name: file.filename,
                download_url: Some(file.url),
                sha1: file.hashes.sha1,
                file_size: file.size,
                game_versions: version.game_versions,
                loaders: version.loaders,
            })
        })
        .collect())
}
