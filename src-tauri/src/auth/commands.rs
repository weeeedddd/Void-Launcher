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
    // The full session (incl. the MC access token) stays on the Rust side.
    *state.session.write().await = Some(session);

    Ok(profile)
}
