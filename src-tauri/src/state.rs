use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::auth::MinecraftSession;
use crate::error::LauncherError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum AuthPersistence {
    OneWeek,
    TwoWeeks,
    OneMonth,
    AlwaysAsk,
}

impl AuthPersistence {
    pub fn maximum_age_seconds(self) -> Option<i64> {
        match self {
            Self::OneWeek => Some(7 * 86_400),
            Self::TwoWeeks => Some(14 * 86_400),
            Self::OneMonth => Some(30 * 86_400),
            Self::AlwaysAsk => None,
        }
    }
}

impl Default for AuthPersistence {
    fn default() -> Self {
        Self::OneMonth
    }
}

/// Optional launcher-wide settings, read from `<data_dir>/settings.json`.
#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// Legacy plaintext CurseForge key. New values are migrated to DPAPI storage.
    pub curseforge_api_key: Option<String>,
    /// Fallback Java executable when an instance has no override.
    pub default_java_path: Option<String>,
    /// How long the Windows-encrypted Microsoft refresh token may be reused.
    pub auth_persistence: AuthPersistence,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsStatus {
    pub curseforge_configured: bool,
    pub auth_persistence: AuthPersistence,
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
    /// A persistent IPC connection is required; Discord clears presence when
    /// the client disconnects, so this cannot be a short-lived local variable.
    pub discord_rpc: std::sync::Mutex<Option<crate::discord_rpc::DiscordIpc>>,
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
            discord_rpc: std::sync::Mutex::new(None),
        }
    }

    pub fn instances_dir(&self) -> PathBuf {
        self.data_dir.join("instances")
    }

    /// Launcher-managed Java runtimes, one folder per major version
    /// (e.g. `java/21/`). See system/java.rs.
    pub fn java_dir(&self) -> PathBuf {
        self.data_dir.join("java")
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
            .filter(|key| !key.trim().is_empty())
            .or_else(|| {
                let encrypted = std::fs::read(self.curseforge_secret_path()).ok()?;
                let plain = crate::secure_store::unprotect_for_current_user(&encrypted).ok()?;
                String::from_utf8(plain)
                    .ok()
                    .filter(|key| !key.trim().is_empty())
            })
            .or_else(|| self.settings().curseforge_api_key)
    }

    fn curseforge_secret_path(&self) -> PathBuf {
        self.data_dir.join("secrets").join("curseforge-core.key")
    }

}

#[tauri::command]
pub fn get_settings_status(state: tauri::State<'_, AppState>) -> SettingsStatus {
    let settings = state.settings();
    SettingsStatus {
        curseforge_configured: state.curseforge_api_key().is_some(),
        auth_persistence: settings.auth_persistence,
    }
}

#[tauri::command]
pub fn set_curseforge_api_key(
    state: tauri::State<'_, AppState>,
    api_key: Option<String>,
) -> Result<SettingsStatus, LauncherError> {
    let mut settings = state.settings();
    let normalized = api_key
        .map(|key| key.trim().to_owned())
        .filter(|key| !key.is_empty());
    let secret_path = state.curseforge_secret_path();
    match normalized {
        Some(key) => {
            let key = crate::modplatform::commands::validate_curseforge_key(key)?;
            let encrypted = crate::secure_store::protect_for_current_user(key.as_bytes())?;
            if let Some(parent) = secret_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&secret_path, encrypted)?;
        }
        None => match std::fs::remove_file(&secret_path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        },
    }

    // Never keep a newly entered key in the JSON settings file. Clearing this
    // field also migrates an older plaintext configuration on the next save.
    settings.curseforge_api_key = None;

    std::fs::create_dir_all(&state.data_dir)?;
    let settings_json = serde_json::to_string_pretty(&settings)?;
    std::fs::write(state.data_dir.join("settings.json"), settings_json)?;

    Ok(SettingsStatus {
        curseforge_configured: state.curseforge_api_key().is_some(),
        auth_persistence: state.settings().auth_persistence,
    })
}

#[tauri::command]
pub async fn set_auth_persistence(
    state: tauri::State<'_, AppState>,
    persistence: AuthPersistence,
) -> Result<SettingsStatus, LauncherError> {
    let mut settings = state.settings();
    settings.auth_persistence = persistence;
    std::fs::create_dir_all(&state.data_dir)?;
    std::fs::write(
        state.data_dir.join("settings.json"),
        serde_json::to_string_pretty(&settings)?,
    )?;

    if persistence == AuthPersistence::AlwaysAsk {
        crate::auth::session_store::remove(&state.data_dir)?;
    } else if let Some(refresh_token) = state
        .session
        .read()
        .await
        .as_ref()
        .and_then(|session| session.msa_refresh_token.as_deref())
    {
        crate::auth::session_store::save(
            &state.data_dir,
            refresh_token,
            chrono::Utc::now().timestamp(),
        )?;
    }

    Ok(SettingsStatus {
        curseforge_configured: state.curseforge_api_key().is_some(),
        auth_persistence: persistence,
    })
}
