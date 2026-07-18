use std::path::PathBuf;

use serde::Deserialize;
use tokio::sync::RwLock;

use crate::auth::MinecraftSession;

/// Optional launcher-wide settings, read from `<data_dir>/settings.json`.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// CurseForge Core API key (alternative to the CURSEFORGE_API_KEY env var).
    pub curseforge_api_key: Option<String>,
    /// Fallback Java executable when an instance has no override.
    pub default_java_path: Option<String>,
}

/// Shared state, managed by Tauri and injected into commands via
/// `tauri::State<'_, AppState>`.
pub struct AppState {
    /// One shared HTTP client — connection pooling + the User-Agent that
    /// Modrinth's API guidelines require.
    pub http: reqwest::Client,
    /// Root of all launcher data (instances, caches, settings.json).
    pub data_dir: PathBuf,
    /// The signed-in account. `RwLock` because commands run concurrently;
    /// `None` until `complete_microsoft_login` succeeds.
    pub session: RwLock<Option<MinecraftSession>>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        let http = reqwest::Client::builder()
            // Modrinth asks every API consumer for a UA that identifies the
            // project and gives a way to reach the maintainer.
            .user_agent(concat!(
                "void-launcher/",
                env!("CARGO_PKG_VERSION"),
                " (github.com/weeeedddd/void-launcher)"
            ))
            .build()
            .expect("failed to build the HTTP client");

        Self {
            http,
            data_dir,
            session: RwLock::new(None),
        }
    }

    pub fn instances_dir(&self) -> PathBuf {
        self.data_dir.join("instances")
    }

    /// Settings are re-read on demand — cheap, and it lets users edit the
    /// file while the launcher runs.
    pub fn settings(&self) -> Settings {
        std::fs::read_to_string(self.data_dir.join("settings.json"))
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    /// CurseForge key resolution order: environment variable → settings.json.
    pub fn curseforge_api_key(&self) -> Option<String> {
        std::env::var("CURSEFORGE_API_KEY")
            .ok()
            .filter(|key| !key.is_empty())
            .or_else(|| self.settings().curseforge_api_key)
    }
}
