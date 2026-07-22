//! Account handling: Microsoft OAuth2 → Xbox Live → XSTS → Minecraft.
//! The heavy lifting lives in `microsoft.rs`; `commands.rs` exposes it to
//! the frontend.

pub mod commands;
pub mod microsoft;
pub mod session_store;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// The public part of a signed-in account — safe to hand to the WebView.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftProfile {
    /// Player UUID (undashed, as returned by the profile endpoint).
    pub uuid: String,
    /// In-game name.
    pub name: String,
}

/// Full session, held **only** in Rust state (`AppState::session`).
///
/// Security note: the Minecraft access token deliberately never crosses the
/// IPC boundary into the WebView — the UI only ever sees `MinecraftProfile`.
/// For production, persist `msa_refresh_token` in the OS credential store
/// (e.g. the `keyring` crate), never in a plain file.
#[derive(Debug, Clone)]
pub struct MinecraftSession {
    pub profile: MinecraftProfile,
    /// Xbox user id used by modern launch arguments. It remains native-only.
    pub xuid: String,
    /// Bearer token used when launching the game (valid ~24 h).
    pub access_token: String,
    pub expires_at: DateTime<Utc>,
    /// Original interactive authorization time. Silent refreshes preserve
    /// this value so the configured re-login interval cannot be extended
    /// indefinitely just by switching accounts.
    pub authenticated_at: i64,
    /// Lets us silently re-run the chain when the access token expires.
    pub msa_refresh_token: Option<String>,
}

impl MinecraftSession {
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}
