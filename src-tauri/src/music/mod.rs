//! Native Spotify and Google/YouTube OAuth integration.
//!
//! Both providers use Authorization Code + PKCE in the system browser. The
//! loopback callback is bound only while a login is in progress. Tokens never
//! cross the Tauri IPC boundary and are encrypted for the current Windows user
//! with DPAPI before they are written to disk.

use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use url::Url;

use crate::error::LauncherError;
use crate::secure_store::{protect_for_current_user, unprotect_for_current_user};
use crate::state::AppState;

const SPOTIFY_CLIENT_ID: &str = "4a455df6caa84500841a4399ae409b78";
const GOOGLE_CLIENT_ID: &str =
    "54356634062-dtpod5434ag8pljp6g2bokqpko3ucnfj.apps.googleusercontent.com";
// Supplied only to release builds. Keeping it out of the repository prevents
// accidental publication in source, although installed-app OAuth credentials
// must still be treated as public because they can be extracted from a binary.
const GOOGLE_CLIENT_SECRET: Option<&str> = option_env!("VOID_GOOGLE_CLIENT_SECRET");
const REDIRECT_URI: &str = "http://127.0.0.1:8888/callback";
const CALLBACK_TIMEOUT_SECONDS: u64 = 180;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MusicProvider {
    Spotify,
    Youtube,
}

impl MusicProvider {
    fn key(self) -> &'static str {
        match self {
            Self::Spotify => "spotify",
            Self::Youtube => "youtube",
        }
    }

    fn client_id(self) -> &'static str {
        match self {
            Self::Spotify => SPOTIFY_CLIENT_ID,
            Self::Youtube => GOOGLE_CLIENT_ID,
        }
    }

    fn client_secret(self) -> Option<&'static str> {
        match self {
            Self::Spotify => None,
            Self::Youtube => GOOGLE_CLIENT_SECRET.filter(|secret| !secret.is_empty()),
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlaybackAction {
    Play,
    Pause,
    Next,
    Previous,
    Seek,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MusicTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub artwork_url: Option<String>,
    pub duration_ms: u64,
    pub position_ms: u64,
    pub is_playing: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MusicConnectionState {
    pub provider: MusicProvider,
    pub connected: bool,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub track: Option<MusicTrack>,
    pub message: Option<String>,
}

impl MusicConnectionState {
    fn disconnected(provider: MusicProvider) -> Self {
        Self {
            provider,
            connected: false,
            display_name: None,
            avatar_url: None,
            track: None,
            message: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredMusicSession {
    provider: MusicProvider,
    access_token: String,
    refresh_token: Option<String>,
    expires_at: i64,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default = "default_token_lifetime")]
    expires_in: i64,
}

fn default_token_lifetime() -> i64 {
    3600
}

#[tauri::command]
pub async fn connect_music_provider(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    provider: MusicProvider,
) -> Result<MusicConnectionState, LauncherError> {
    let listener = TcpListener::bind("127.0.0.1:8888").await.map_err(|error| {
        LauncherError::Auth(format!(
            "Music login could not start because port 8888 is unavailable: {error}"
        ))
    })?;

    let verifier = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let oauth_state = uuid::Uuid::new_v4().simple().to_string();
    let authorization_url = authorization_url(provider, &challenge, &oauth_state)?;

    app.opener()
        .open_url(authorization_url.as_str(), None::<&str>)
        .map_err(|error| {
            LauncherError::Auth(format!("Could not open the system browser: {error}"))
        })?;

    let code = wait_for_callback(listener, &oauth_state).await?;
    let token = exchange_authorization_code(&state.http, provider, &code, &verifier).await?;
    let session = StoredMusicSession {
        provider,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: Utc::now().timestamp() + token.expires_in,
    };
    save_session(&state.data_dir, &session)?;
    connection_state(&state, provider).await
}

#[tauri::command]
pub async fn get_music_connection(
    state: tauri::State<'_, AppState>,
    provider: MusicProvider,
) -> Result<MusicConnectionState, LauncherError> {
    if !session_path(&state.data_dir, provider).exists() {
        return Ok(MusicConnectionState::disconnected(provider));
    }
    connection_state(&state, provider).await
}

#[tauri::command]
pub async fn control_music_playback(
    state: tauri::State<'_, AppState>,
    provider: MusicProvider,
    action: PlaybackAction,
    position_ms: Option<u64>,
) -> Result<MusicConnectionState, LauncherError> {
    if provider != MusicProvider::Spotify {
        return Err(LauncherError::Platform(
            "The official YouTube API does not provide YouTube Music playback controls.".into(),
        ));
    }

    let session = active_session(&state, provider).await?;
    let (method, url) = match action {
        PlaybackAction::Play => (
            reqwest::Method::PUT,
            "https://api.spotify.com/v1/me/player/play".to_owned(),
        ),
        PlaybackAction::Pause => (
            reqwest::Method::PUT,
            "https://api.spotify.com/v1/me/player/pause".to_owned(),
        ),
        PlaybackAction::Next => (
            reqwest::Method::POST,
            "https://api.spotify.com/v1/me/player/next".to_owned(),
        ),
        PlaybackAction::Previous => (
            reqwest::Method::POST,
            "https://api.spotify.com/v1/me/player/previous".to_owned(),
        ),
        PlaybackAction::Seek => (
            reqwest::Method::PUT,
            format!(
                "https://api.spotify.com/v1/me/player/seek?position_ms={}",
                position_ms.unwrap_or(0)
            ),
        ),
    };
    let response = state
        .http
        .request(method, url)
        .bearer_auth(&session.access_token)
        .send()
        .await?;
    if !response.status().is_success() {
        return Err(provider_error("Spotify playback command", response).await);
    }
    tokio::time::sleep(Duration::from_millis(220)).await;
    connection_state(&state, provider).await
}

#[tauri::command]
pub fn disconnect_music_provider(
    state: tauri::State<'_, AppState>,
    provider: MusicProvider,
) -> Result<MusicConnectionState, LauncherError> {
    let path = session_path(&state.data_dir, provider);
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(MusicConnectionState::disconnected(provider))
}

fn authorization_url(
    provider: MusicProvider,
    challenge: &str,
    oauth_state: &str,
) -> Result<Url, LauncherError> {
    let base = match provider {
        MusicProvider::Spotify => "https://accounts.spotify.com/authorize",
        MusicProvider::Youtube => "https://accounts.google.com/o/oauth2/v2/auth",
    };
    let mut url = Url::parse(base).map_err(|error| LauncherError::Internal(error.to_string()))?;
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("client_id", provider.client_id())
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", REDIRECT_URI)
            .append_pair("state", oauth_state)
            .append_pair("code_challenge_method", "S256")
            .append_pair("code_challenge", challenge);
        match provider {
            MusicProvider::Spotify => {
                query.append_pair(
                    "scope",
                    "user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state",
                );
            }
            MusicProvider::Youtube => {
                query
                    .append_pair(
                        "scope",
                        "openid profile https://www.googleapis.com/auth/youtube.readonly",
                    )
                    .append_pair("access_type", "offline")
                    .append_pair("prompt", "consent");
            }
        }
    }
    Ok(url)
}

async fn wait_for_callback(
    listener: TcpListener,
    expected_state: &str,
) -> Result<String, LauncherError> {
    let (mut stream, _) = tokio::time::timeout(
        Duration::from_secs(CALLBACK_TIMEOUT_SECONDS),
        listener.accept(),
    )
    .await
    .map_err(|_| LauncherError::Auth("Music login timed out. Please try again.".into()))??;

    let mut buffer = [0u8; 8192];
    let read = stream.read(&mut buffer).await?;
    let request = String::from_utf8_lossy(&buffer[..read]);
    let target = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or_else(|| LauncherError::Auth("Invalid OAuth callback request.".into()))?;
    let callback = Url::parse(&format!("http://127.0.0.1{target}"))
        .map_err(|_| LauncherError::Auth("Invalid OAuth callback URL.".into()))?;
    let params: std::collections::HashMap<_, _> = callback.query_pairs().into_owned().collect();

    let result = if params.get("state").map(String::as_str) != Some(expected_state) {
        Err(LauncherError::Auth(
            "OAuth state validation failed. Login was cancelled for safety.".into(),
        ))
    } else if let Some(error) = params.get("error") {
        Err(LauncherError::Auth(format!(
            "Music authorization was denied: {error}"
        )))
    } else {
        params.get("code").cloned().ok_or_else(|| {
            LauncherError::Auth("OAuth callback did not contain an authorization code.".into())
        })
    };

    let success = result.is_ok();
    let body = if success {
        "<!doctype html><meta charset=utf-8><title>Void Launcher</title><style>body{background:#111;color:#fff;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0}div{padding:32px;border:1px solid #7b2cbf;border-radius:2px;background:#1a1a1a}</style><div>Authorization received. Void Launcher is completing the secure connection.</div>"
    } else {
        "<!doctype html><meta charset=utf-8><title>Void Launcher</title><style>body{background:#111;color:#fff;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0}div{padding:32px;border:1px solid #333;border-radius:2px;background:#1a1a1a}</style><div>Authorization failed. Return to Void Launcher and try again.</div>"
    };
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Security-Policy: default-src 'none'; style-src 'unsafe-inline'\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(), body
    );
    stream.write_all(response.as_bytes()).await?;
    result
}

async fn exchange_authorization_code(
    http: &reqwest::Client,
    provider: MusicProvider,
    code: &str,
    verifier: &str,
) -> Result<TokenResponse, LauncherError> {
    let token_url = match provider {
        MusicProvider::Spotify => "https://accounts.spotify.com/api/token",
        MusicProvider::Youtube => "https://oauth2.googleapis.com/token",
    };
    let mut form = vec![
        ("client_id", provider.client_id()),
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", REDIRECT_URI),
        ("code_verifier", verifier),
    ];
    if let Some(secret) = provider.client_secret() {
        form.push(("client_secret", secret));
    }
    let response = http.post(token_url).form(&form).send().await?;
    if !response.status().is_success() {
        return Err(provider_error("OAuth token exchange", response).await);
    }
    Ok(response.json().await?)
}

async fn active_session(
    state: &tauri::State<'_, AppState>,
    provider: MusicProvider,
) -> Result<StoredMusicSession, LauncherError> {
    let mut session = load_session(&state.data_dir, provider)?;
    if session.expires_at > Utc::now().timestamp() + 60 {
        return Ok(session);
    }
    let refresh_token = session.refresh_token.clone().ok_or_else(|| {
        LauncherError::Auth("The music session expired. Please connect the provider again.".into())
    })?;
    let token_url = match provider {
        MusicProvider::Spotify => "https://accounts.spotify.com/api/token",
        MusicProvider::Youtube => "https://oauth2.googleapis.com/token",
    };
    let mut form = vec![
        ("client_id", provider.client_id()),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token.as_str()),
    ];
    if let Some(secret) = provider.client_secret() {
        form.push(("client_secret", secret));
    }
    let response = state.http.post(token_url).form(&form).send().await?;
    if !response.status().is_success() {
        return Err(provider_error("OAuth token refresh", response).await);
    }
    let refreshed: TokenResponse = response.json().await?;
    session.access_token = refreshed.access_token;
    session.expires_at = Utc::now().timestamp() + refreshed.expires_in;
    if refreshed.refresh_token.is_some() {
        session.refresh_token = refreshed.refresh_token;
    }
    save_session(&state.data_dir, &session)?;
    Ok(session)
}

async fn connection_state(
    state: &tauri::State<'_, AppState>,
    provider: MusicProvider,
) -> Result<MusicConnectionState, LauncherError> {
    let session = active_session(state, provider).await?;
    match provider {
        MusicProvider::Spotify => spotify_state(&state.http, &session).await,
        MusicProvider::Youtube => youtube_state(&state.http, &session).await,
    }
}

async fn spotify_state(
    http: &reqwest::Client,
    session: &StoredMusicSession,
) -> Result<MusicConnectionState, LauncherError> {
    let profile_response = http
        .get("https://api.spotify.com/v1/me")
        .bearer_auth(&session.access_token)
        .send()
        .await?;
    if !profile_response.status().is_success() {
        return Err(provider_error("Spotify profile", profile_response).await);
    }
    let profile: serde_json::Value = profile_response.json().await?;

    let playback_response = http
        .get("https://api.spotify.com/v1/me/player")
        .bearer_auth(&session.access_token)
        .send()
        .await?;
    let track = if playback_response.status() == reqwest::StatusCode::NO_CONTENT {
        None
    } else if playback_response.status().is_success() {
        let playback: serde_json::Value = playback_response.json().await?;
        playback
            .get("item")
            .filter(|item| !item.is_null())
            .map(|item| MusicTrack {
                id: item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_owned(),
                title: item
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown track")
                    .to_owned(),
                artist: item
                    .get("artists")
                    .and_then(|v| v.as_array())
                    .map(|artists| {
                        artists
                            .iter()
                            .filter_map(|artist| artist.get("name")?.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    })
                    .unwrap_or_default(),
                album: item
                    .get("album")
                    .and_then(|v| v.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_owned(),
                artwork_url: item
                    .get("album")
                    .and_then(|v| v.get("images"))
                    .and_then(|v| v.as_array())
                    .and_then(|images| images.first())
                    .and_then(|image| image.get("url"))
                    .and_then(|v| v.as_str())
                    .map(str::to_owned),
                duration_ms: item
                    .get("duration_ms")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0),
                position_ms: playback
                    .get("progress_ms")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0),
                is_playing: playback
                    .get("is_playing")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false),
            })
    } else {
        return Err(provider_error("Spotify playback state", playback_response).await);
    };

    Ok(MusicConnectionState {
        provider: MusicProvider::Spotify,
        connected: true,
        display_name: profile
            .get("display_name")
            .and_then(|v| v.as_str())
            .map(str::to_owned),
        avatar_url: profile
            .get("images")
            .and_then(|v| v.as_array())
            .and_then(|images| images.first())
            .and_then(|image| image.get("url"))
            .and_then(|v| v.as_str())
            .map(str::to_owned),
        track,
        message: None,
    })
}

async fn youtube_state(
    http: &reqwest::Client,
    session: &StoredMusicSession,
) -> Result<MusicConnectionState, LauncherError> {
    let response = http
        .get("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true")
        .bearer_auth(&session.access_token)
        .send()
        .await?;
    if !response.status().is_success() {
        return Err(provider_error("YouTube channel", response).await);
    }
    let payload: serde_json::Value = response.json().await?;
    let snippet = payload
        .get("items")
        .and_then(|v| v.as_array())
        .and_then(|items| items.first())
        .and_then(|item| item.get("snippet"));
    Ok(MusicConnectionState {
        provider: MusicProvider::Youtube,
        connected: true,
        display_name: snippet.and_then(|v| v.get("title")).and_then(|v| v.as_str()).map(str::to_owned),
        avatar_url: snippet
            .and_then(|v| v.get("thumbnails"))
            .and_then(|v| v.get("default"))
            .and_then(|v| v.get("url"))
            .and_then(|v| v.as_str())
            .map(str::to_owned),
        track: None,
        message: Some(
            "YouTube account linked. The official YouTube API does not expose external YouTube Music playback state."
                .into(),
        ),
    })
}

async fn provider_error(context: &str, response: reqwest::Response) -> LauncherError {
    let status = response.status();
    let detail = response.text().await.unwrap_or_default();
    let safe_detail = serde_json::from_str::<serde_json::Value>(&detail)
        .ok()
        .and_then(|value| {
            value
                .get("error_description")
                .or_else(|| value.get("error").and_then(|v| v.get("message")))
                .or_else(|| value.get("error"))
                .and_then(|v| v.as_str())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| status.to_string());
    LauncherError::Auth(format!("{context} failed: {safe_detail}"))
}

fn session_path(data_dir: &Path, provider: MusicProvider) -> PathBuf {
    data_dir
        .join("auth")
        .join(format!("{}.token", provider.key()))
}

fn save_session(data_dir: &Path, session: &StoredMusicSession) -> Result<(), LauncherError> {
    let path = session_path(data_dir, session.provider);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_vec(session)?;
    let encrypted = protect_for_current_user(&json)?;
    std::fs::write(path, encrypted)?;
    Ok(())
}

fn load_session(
    data_dir: &Path,
    provider: MusicProvider,
) -> Result<StoredMusicSession, LauncherError> {
    let encrypted = std::fs::read(session_path(data_dir, provider)).map_err(|_| {
        LauncherError::Auth("Music provider is not connected. Please sign in again.".into())
    })?;
    let json = unprotect_for_current_user(&encrypted)?;
    Ok(serde_json::from_slice(&json)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spotify_authorization_uses_pkce_and_registered_loopback() {
        let url = authorization_url(MusicProvider::Spotify, "challenge", "state-token").unwrap();
        let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
        assert_eq!(url.host_str(), Some("accounts.spotify.com"));
        assert_eq!(
            params.get("client_id").map(String::as_str),
            Some(SPOTIFY_CLIENT_ID)
        );
        assert_eq!(
            params.get("redirect_uri").map(String::as_str),
            Some(REDIRECT_URI)
        );
        assert_eq!(
            params.get("code_challenge_method").map(String::as_str),
            Some("S256")
        );
        assert_eq!(params.get("state").map(String::as_str), Some("state-token"));
        assert_eq!(MusicProvider::Spotify.client_secret(), None);
    }

    #[test]
    fn youtube_authorization_requests_only_read_access() {
        let url = authorization_url(MusicProvider::Youtube, "challenge", "state-token").unwrap();
        let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
        assert_eq!(url.host_str(), Some("accounts.google.com"));
        assert!(params.get("scope").unwrap().contains("youtube.readonly"));
        assert_eq!(
            params.get("access_type").map(String::as_str),
            Some("offline")
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn dpapi_round_trip_is_bound_to_the_current_windows_user() {
        let plain = b"oauth-token-test-value";
        let encrypted = protect_for_current_user(plain).unwrap();
        assert_ne!(encrypted, plain);
        assert_eq!(unprotect_for_current_user(&encrypted).unwrap(), plain);
    }
}
