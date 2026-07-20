//! Mod-platform commands: one entry point per operation, dispatching to the
//! right API client based on `Platform`.

use tauri::State;

use super::{curseforge, modrinth, ModLoader, ModSummary, ModVersionInfo, Platform, SearchParams};
use crate::error::LauncherError;
use crate::state::AppState;

/// Fetches the CurseForge key or explains how to configure one.
pub(crate) fn require_curseforge_key(state: &AppState) -> Result<String, LauncherError> {
    state.curseforge_api_key().ok_or_else(|| {
        LauncherError::Config(
            "No CurseForge API key configured. Get a free key at console.curseforge.com and \
             set the CURSEFORGE_API_KEY environment variable (or settings.json). \
             Tip: Modrinth works without a key."
                .into(),
        )
    })
}

/// THE unified mod search — same call, same result shape for both platforms.
#[tauri::command]
pub async fn search_mods(
    state: State<'_, AppState>,
    params: SearchParams,
) -> Result<Vec<ModSummary>, LauncherError> {
    match params.platform {
        Platform::Modrinth => modrinth::search(&state.http, &params).await,
        Platform::Curseforge => {
            let api_key = require_curseforge_key(&state)?;
            curseforge::search(&state.http, &api_key, &params).await
        }
    }
}

/// All downloadable versions of a project (newest first) — used by the UI
/// for version pickers and by `install_mod` to resolve "latest compatible".
#[tauri::command]
pub async fn get_mod_versions(
    state: State<'_, AppState>,
    platform: Platform,
    project_id: String,
    game_version: Option<String>,
    loader: Option<ModLoader>,
) -> Result<Vec<ModVersionInfo>, LauncherError> {
    match platform {
        Platform::Modrinth => {
            modrinth::versions(&state.http, &project_id, game_version.as_deref(), loader).await
        }
        Platform::Curseforge => {
            let api_key = require_curseforge_key(&state)?;
            curseforge::files(
                &state.http,
                &api_key,
                &project_id,
                game_version.as_deref(),
                loader,
            )
            .await
        }
    }
}
