//! Auth commands exposed to the frontend.
//!
//! The login is split in two so the UI can show the device code while the
//! user is busy in the browser:
//!   1. `begin_microsoft_login`    → returns code + URL immediately
//!   2. `complete_microsoft_login` → resolves when the chain finished

use tauri::State;

use super::{microsoft, MinecraftProfile};
use crate::error::LauncherError;
use crate::state::AppState;

#[tauri::command]
pub async fn begin_microsoft_login(
    state: State<'_, AppState>,
) -> Result<microsoft::DeviceCodeResponse, LauncherError> {
    microsoft::request_device_code(&state.http).await
}

#[tauri::command]
pub async fn complete_microsoft_login(
    state: State<'_, AppState>,
    device_code: String,
) -> Result<MinecraftProfile, LauncherError> {
    // Blocks (asynchronously) until the user approves in the browser…
    let msa = microsoft::poll_for_msa_tokens(&state.http, &device_code).await?;
    // …then runs Xbox Live → XSTS → Minecraft → profile.
    let session = microsoft::login_with_msa(&state.http, msa).await?;

    let profile = session.profile.clone();
    let persistence = state.settings().auth_persistence;
    if persistence != crate::state::AuthPersistence::AlwaysAsk {
        if let Some(refresh_token) = session.msa_refresh_token.as_deref() {
            super::session_store::save(
                &state.data_dir,
                refresh_token,
                chrono::Utc::now().timestamp(),
            )?;
        }
    }
    // The full session (incl. the MC access token) stays on the Rust side.
    *state.session.write().await = Some(session);

    Ok(profile)
}

/// Restores the Microsoft session from a DPAPI-encrypted refresh token when
/// the user's selected re-login interval still permits it.
#[tauri::command]
pub async fn restore_microsoft_session(
    state: State<'_, AppState>,
) -> Result<Option<MinecraftProfile>, LauncherError> {
    if let Some(session) = state.session.read().await.as_ref() {
        if !session.is_expired() {
            return Ok(Some(session.profile.clone()));
        }
    }

    let persistence = state.settings().auth_persistence;
    let Some(stored) = super::session_store::load(&state.data_dir, persistence)? else {
        return Ok(None);
    };

    let mut refreshed =
        match microsoft::refresh_msa_tokens(&state.http, &stored.refresh_token).await {
            Ok(tokens) => tokens,
            Err(_) => {
                super::session_store::remove(&state.data_dir)?;
                return Ok(None);
            }
        };
    if refreshed.refresh_token.is_none() {
        refreshed.refresh_token = Some(stored.refresh_token.clone());
    }
    let session = match microsoft::login_with_msa(&state.http, refreshed).await {
        Ok(value) => value,
        Err(_) => {
            super::session_store::remove(&state.data_dir)?;
            return Ok(None);
        }
    };
    if let Some(refresh_token) = session.msa_refresh_token.as_deref() {
        super::session_store::save(&state.data_dir, refresh_token, stored.authenticated_at)?;
    }
    let profile = session.profile.clone();
    *state.session.write().await = Some(session);
    Ok(Some(profile))
}
