//! Mod-platform commands: one entry point per operation, dispatching to the
//! right API client based on `Platform`.

use tauri::State;

use super::{
    curseforge, modrinth, ModLoader, ModVersionInfo, Platform, SearchParams, SearchResultPage,
};
use crate::error::LauncherError;
use crate::state::AppState;

/// Fetches the CurseForge key or explains how to configure one.
pub(crate) fn require_curseforge_key(state: &AppState) -> Result<String, LauncherError> {
    let key = state.curseforge_api_key().ok_or_else(|| {
        LauncherError::Config(
            "No CurseForge API key configured. Get a free key at console.curseforge.com and \
             save it in the launcher's CurseForge key panel or set CURSEFORGE_API_KEY. \
             Tip: Modrinth works without a key."
                .into(),
        )
    })?;
    validate_curseforge_key(key)
}

pub(crate) fn validate_curseforge_key(key: String) -> Result<String, LauncherError> {
    let trimmed = key.trim().to_owned();
    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("api_key") {
        return Err(LauncherError::Config(
            "The saved CurseForge API key is empty or a placeholder. Generate a real key in the CurseForge developer console."
                .into(),
        ));
    }
    if trimmed.len() > 512 || trimmed.chars().any(char::is_control) {
        return Err(LauncherError::Config(
            "The CurseForge API key contains invalid characters or is unexpectedly long. Copy it again from the CurseForge developer console."
                .into(),
        ));
    }
    Ok(trimmed)
}

#[cfg(test)]
mod tests {
    use super::validate_curseforge_key;

    #[test]
    fn accepts_current_curseforge_console_key_shape() {
        let key = "$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12";
        assert_eq!(validate_curseforge_key(key.into()).unwrap(), key);
    }

    #[test]
    fn accepts_opaque_curseforge_keys_without_guessing_their_format() {
        assert_eq!(
            validate_curseforge_key("opaque-console-key".into()).unwrap(),
            "opaque-console-key"
        );
    }

    #[test]
    fn rejects_placeholders_and_control_characters() {
        assert!(validate_curseforge_key("API_KEY".into()).is_err());
        assert!(validate_curseforge_key("valid-looking-key\nsecond-line".into()).is_err());
    }
}

/// THE unified mod search — same call, same result shape for both platforms.
#[tauri::command]
pub async fn search_mods(
    state: State<'_, AppState>,
    params: SearchParams,
) -> Result<SearchResultPage, LauncherError> {
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
