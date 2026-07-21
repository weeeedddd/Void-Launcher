//! Direct Discord Rich Presence IPC bridge.
//!
//! Discord Desktop exposes a local named pipe on Windows. Keeping this small
//! protocol implementation in Rust avoids exposing a client secret to React
//! and avoids a second long-lived helper process.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Write};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

use crate::error::LauncherError;
use crate::state::AppState;

/// Public Discord application ID for Void Launcher Rich Presence.
/// This identifier is intentionally embedded in the client. It is not a secret.
pub const VOID_DISCORD_APPLICATION_ID: &str = "1456456347397652512";

#[derive(Debug)]
pub struct DiscordIpc {
    stream: File,
    pub client_id: String,
    started_at_ms: u128,
}

impl DiscordIpc {
    fn open_pipe() -> io::Result<File> {
        #[cfg(windows)]
        {
            for index in 0..10 {
                let path = format!(r"\\?\pipe\discord-ipc-{index}");
                if let Ok(stream) = OpenOptions::new().read(true).write(true).open(path) {
                    return Ok(stream);
                }
            }
            Err(io::Error::new(
                io::ErrorKind::NotFound,
                "Discord IPC named pipe not found",
            ))
        }
        #[cfg(unix)]
        {
            let candidates = [
                format!("/run/user/{}/discord-ipc-0", std::process::id()),
                "/tmp/discord-ipc-0".to_owned(),
            ];
            candidates
                .into_iter()
                .find_map(|path| OpenOptions::new().read(true).write(true).open(path).ok())
                .ok_or_else(|| {
                    io::Error::new(io::ErrorKind::NotFound, "Discord IPC socket not found")
                })
        }
    }

    pub fn connect(client_id: String) -> Result<Self, String> {
        let mut client = Self {
            stream: Self::open_pipe().map_err(|error| error.to_string())?,
            client_id: client_id.clone(),
            started_at_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
        };
        client.send(0, json!({ "v": 1, "client_id": client_id }))?;
        let _ = client.receive()?;
        Ok(client)
    }

    fn send(&mut self, opcode: u32, payload: Value) -> Result<(), String> {
        let bytes = serde_json::to_vec(&payload).map_err(|error| error.to_string())?;
        self.stream
            .write_all(&opcode.to_le_bytes())
            .map_err(|error| error.to_string())?;
        self.stream
            .write_all(&(bytes.len() as u32).to_le_bytes())
            .map_err(|error| error.to_string())?;
        self.stream
            .write_all(&bytes)
            .map_err(|error| error.to_string())?;
        self.stream.flush().map_err(|error| error.to_string())
    }

    fn receive(&mut self) -> Result<Value, String> {
        let mut header = [0u8; 8];
        self.stream
            .read_exact(&mut header)
            .map_err(|error| error.to_string())?;
        let length = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;
        if length > 1_048_576 {
            return Err("Discord IPC response exceeded the safety limit".into());
        }
        let mut body = vec![0u8; length];
        self.stream
            .read_exact(&mut body)
            .map_err(|error| error.to_string())?;
        serde_json::from_slice(&body).map_err(|error| error.to_string())
    }

    fn nonce() -> String {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
            .to_string()
    }

    pub fn set_activity(&mut self, details: String, state: String) -> Result<(), String> {
        self.send(1, json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": std::process::id(),
                "activity": {
                    "details": details,
                    "state": state,
                    "timestamps": { "start": self.started_at_ms },
                    "assets": {
                        "large_image": "void_logo",
                        "large_text": "Void Launcher"
                    }
                }
            },
            "nonce": Self::nonce()
        }))?;
        let _ = self.receive()?;
        Ok(())
    }

    pub fn clear_activity(&mut self) -> Result<(), String> {
        self.send(1, json!({ "cmd": "SET_ACTIVITY", "args": { "pid": std::process::id(), "activity": Value::Null }, "nonce": Self::nonce() }))?;
        let _ = self.receive()?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordRpcUpdate {
    pub enabled: bool,
    pub hide_when_idle: bool,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub details: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordRpcStatus {
    pub configured: bool,
    pub connected: bool,
    pub application_id: Option<String>,
    pub message: String,
}

fn status(state: &AppState, message: String) -> DiscordRpcStatus {
    let connected = state
        .discord_rpc
        .lock()
        .map(|client| client.is_some())
        .unwrap_or(false);
    DiscordRpcStatus {
        configured: true,
        connected,
        application_id: Some(VOID_DISCORD_APPLICATION_ID.to_owned()),
        message,
    }
}

#[tauri::command]
pub fn get_discord_rpc_status(state: State<'_, AppState>) -> DiscordRpcStatus {
    status(
        &state,
        if state
            .discord_rpc
            .lock()
            .map(|client| client.is_some())
            .unwrap_or(false)
        {
            "Discord Rich Presence is connected.".into()
        } else {
            "Void Launcher is ready to connect to the Discord desktop app.".into()
        },
    )
}

#[tauri::command]
pub fn update_discord_rpc(
    state: State<'_, AppState>,
    request: DiscordRpcUpdate,
) -> Result<DiscordRpcStatus, LauncherError> {
    let application_id = VOID_DISCORD_APPLICATION_ID.to_owned();
    let mut guard = state
        .discord_rpc
        .lock()
        .map_err(|_| LauncherError::Internal("Discord RPC lock was poisoned".into()))?;
    if !request.enabled || request.hide_when_idle {
        if let Some(client) = guard.as_mut() {
            client.clear_activity().map_err(LauncherError::Internal)?;
        }
        *guard = None;
        drop(guard);
        return Ok(status(&state, "Discord presence cleared.".into()));
    }
    let needs_new_client = guard
        .as_ref()
        .map(|client| client.client_id != application_id)
        .unwrap_or(true);
    if needs_new_client {
        *guard = Some(DiscordIpc::connect(application_id).map_err(LauncherError::Internal)?);
    }
    let details = request
        .details
        .unwrap_or_else(|| "Step Beyond the Ordinary Client".into());
    let state_text = request.state.unwrap_or_else(|| {
        match request.language.as_str() {
            "german" => "Im Void Launcher",
            "russian" => "В Void Launcher",
            "japanese" => "Void Launcher を起動中",
            _ => "In the Void Launcher",
        }
        .into()
    });
    guard
        .as_mut()
        .expect("Discord IPC initialized")
        .set_activity(details, state_text)
        .map_err(LauncherError::Internal)?;
    drop(guard);
    Ok(status(&state, "Discord presence is live.".into()))
}

#[cfg(test)]
mod tests {
    use super::VOID_DISCORD_APPLICATION_ID;

    #[test]
    fn embeds_the_public_void_discord_application_id() {
        assert_eq!(VOID_DISCORD_APPLICATION_ID, "1456456347397652512");
        assert!(VOID_DISCORD_APPLICATION_ID.bytes().all(|byte| byte.is_ascii_digit()));
    }
}
