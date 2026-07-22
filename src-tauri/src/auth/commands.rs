//! Microsoft authentication commands exposed to the WebView.
//!
//! Refresh tokens and Minecraft access tokens never cross IPC. React only
//! receives profile metadata and an opaque account id derived from the
//! Minecraft UUID. All vault mutations are serialized by `auth_operation`.

use chrono::Utc;
use serde::Serialize;
use tauri::State;

use super::microsoft::RefreshFailure;
use super::session_store::{
    self, StoredMicrosoftAccount, StoredMicrosoftState, StoredMicrosoftVault,
};
use super::{microsoft, MinecraftProfile, MinecraftSession};
use crate::error::LauncherError;
use crate::state::{AppState, AuthPersistence};

const ACCOUNT_ID_PREFIX: &str = "minecraft:";

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum MicrosoftAccountStatus {
    Active,
    Available,
    ReauthRequired,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrosoftAccountSummary {
    pub id: String,
    pub uuid: String,
    pub username: String,
    pub is_active: bool,
    pub stored: bool,
    pub status: MicrosoftAccountStatus,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrosoftAccountSnapshot {
    pub accounts: Vec<MicrosoftAccountSummary>,
    pub active_account_id: Option<String>,
    pub auth_persistence: AuthPersistence,
}

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
    // Poll without holding the vault lock: browser approval can take minutes.
    let msa = microsoft::poll_for_msa_tokens(&state.http, &device_code).await?;
    let _operation = state.auth_operation.lock().await;
    let session = microsoft::login_with_msa(&state.http, msa).await?;
    let profile = session.profile.clone();
    let persistence = state.settings().auth_persistence;
    let now = Utc::now().timestamp();
    let mut vault = load_vault(&state, persistence)?;
    let refresh_token = (persistence != AuthPersistence::AlwaysAsk)
        .then(|| session.msa_refresh_token.clone())
        .flatten();
    session_store::upsert_account(
        &mut vault,
        profile.clone(),
        refresh_token,
        session.authenticated_at,
        now,
    )?;
    session_store::save_vault(&state.data_dir, &vault)?;
    *state.session.write().await = Some(session);
    Ok(profile)
}

#[tauri::command]
pub async fn list_microsoft_accounts(
    state: State<'_, AppState>,
) -> Result<MicrosoftAccountSnapshot, LauncherError> {
    let _operation = state.auth_operation.lock().await;
    let persistence = state.settings().auth_persistence;
    let vault = load_vault(&state, persistence)?;
    Ok(build_snapshot(&state, persistence, &vault).await)
}

#[tauri::command]
pub async fn activate_microsoft_account(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<MinecraftProfile, LauncherError> {
    let uuid = parse_account_id(&account_id)?;
    let _operation = state.auth_operation.lock().await;

    if let Some(session) = state.session.read().await.as_ref() {
        if !session.is_expired() && session.profile.uuid.eq_ignore_ascii_case(&uuid) {
            return Ok(session.profile.clone());
        }
    }

    let persistence = state.settings().auth_persistence;
    let vault = load_vault(&state, persistence)?;
    activate_vault_account(&state, vault, &uuid, false)
        .await?
        .map(|session| session.profile)
        .ok_or_else(|| LauncherError::Auth("This account requires Microsoft sign-in again.".into()))
}

#[tauri::command]
pub async fn remove_microsoft_account(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<MicrosoftAccountSnapshot, LauncherError> {
    let uuid = parse_account_id(&account_id)?;
    let _operation = state.auth_operation.lock().await;
    let persistence = state.settings().auth_persistence;
    let mut vault = load_vault(&state, persistence)?;
    let removed_from_vault = session_store::remove_account(&mut vault, &uuid);
    let removed_live = state
        .session
        .read()
        .await
        .as_ref()
        .is_some_and(|session| session.profile.uuid.eq_ignore_ascii_case(&uuid));
    if !removed_from_vault && !removed_live {
        return Err(LauncherError::InvalidData(
            "The selected Microsoft account no longer exists.".into(),
        ));
    }
    session_store::save_vault(&state.data_dir, &vault)?;
    if removed_live {
        *state.session.write().await = None;
    }
    Ok(build_snapshot(&state, persistence, &vault).await)
}

/// Restores the active account from the encrypted vault. This command is also
/// used at application startup, while launch code calls the same helper to
/// guarantee that a visually signed-in but expired Minecraft token is never
/// sent to `javaw.exe`.
#[tauri::command]
pub async fn restore_microsoft_session(
    state: State<'_, AppState>,
) -> Result<Option<MinecraftProfile>, LauncherError> {
    Ok(ensure_fresh_microsoft_session(&state)
        .await?
        .map(|session| session.profile))
}

pub async fn ensure_fresh_microsoft_session(
    state: &AppState,
) -> Result<Option<MinecraftSession>, LauncherError> {
    let _operation = state.auth_operation.lock().await;
    if let Some(session) = state.session.read().await.as_ref() {
        if !session.is_expired() {
            return Ok(Some(session.clone()));
        }
    }
    *state.session.write().await = None;

    let persistence = state.settings().auth_persistence;
    let Some(stored) = session_store::load(&state.data_dir, persistence)? else {
        return Ok(None);
    };
    match stored {
        StoredMicrosoftState::Legacy(legacy) => restore_legacy_account(state, legacy).await,
        StoredMicrosoftState::Vault(vault) => {
            let Some(uuid) = vault.active_uuid.clone() else {
                return Ok(None);
            };
            activate_vault_account(state, vault, &uuid, true).await
        }
    }
}

async fn restore_legacy_account(
    state: &AppState,
    legacy: session_store::StoredMicrosoftRefresh,
) -> Result<Option<MinecraftSession>, LauncherError> {
    let mut refreshed =
        match microsoft::refresh_msa_tokens(&state.http, &legacy.refresh_token).await {
            Ok(tokens) => tokens,
            Err(RefreshFailure::ReauthRequired(_)) => {
                session_store::remove(&state.data_dir)?;
                return Ok(None);
            }
            Err(RefreshFailure::Retryable(error)) => return Err(error),
        };
    let rotated = refreshed
        .refresh_token
        .clone()
        .unwrap_or_else(|| legacy.refresh_token.clone());
    refreshed.refresh_token = Some(rotated.clone());
    session_store::save_legacy(&state.data_dir, &rotated, legacy.authenticated_at)?;

    let mut session = microsoft::login_with_msa(&state.http, refreshed).await?;
    session.authenticated_at = legacy.authenticated_at;
    let now = Utc::now().timestamp();
    let mut vault = StoredMicrosoftVault::default();
    session_store::upsert_account(
        &mut vault,
        session.profile.clone(),
        Some(rotated),
        legacy.authenticated_at,
        now,
    )?;
    session_store::save_vault(&state.data_dir, &vault)?;
    *state.session.write().await = Some(session.clone());
    Ok(Some(session))
}

async fn activate_vault_account(
    state: &AppState,
    mut vault: StoredMicrosoftVault,
    uuid: &str,
    silent: bool,
) -> Result<Option<MinecraftSession>, LauncherError> {
    let Some(stored) = vault
        .accounts
        .iter()
        .find(|account| account.profile.uuid.eq_ignore_ascii_case(uuid))
        .cloned()
    else {
        return if silent {
            Ok(None)
        } else {
            Err(LauncherError::InvalidData(
                "The selected Microsoft account no longer exists.".into(),
            ))
        };
    };
    let Some(refresh_token) = stored.refresh_token.clone() else {
        return if silent {
            Ok(None)
        } else {
            Err(LauncherError::Auth(
                "This saved account requires Microsoft sign-in again.".into(),
            ))
        };
    };

    let mut refreshed = match microsoft::refresh_msa_tokens(&state.http, &refresh_token).await {
        Ok(tokens) => tokens,
        Err(RefreshFailure::ReauthRequired(message)) => {
            clear_vault_credential(&mut vault, uuid);
            session_store::save_vault(&state.data_dir, &vault)?;
            clear_live_identity(state, uuid).await;
            return if silent {
                Ok(None)
            } else {
                Err(LauncherError::Auth(message))
            };
        }
        Err(RefreshFailure::Retryable(error)) => return Err(error),
    };
    let rotated = refreshed
        .refresh_token
        .clone()
        .unwrap_or_else(|| refresh_token.clone());
    refreshed.refresh_token = Some(rotated.clone());

    // Microsoft may rotate refresh tokens. Save the rotated credential before
    // the downstream Xbox/Minecraft exchanges, which can fail independently.
    if let Some(account) = vault
        .accounts
        .iter_mut()
        .find(|account| account.profile.uuid.eq_ignore_ascii_case(uuid))
    {
        account.refresh_token = Some(rotated.clone());
    }
    session_store::save_vault(&state.data_dir, &vault)?;

    let mut session = microsoft::login_with_msa(&state.http, refreshed).await?;
    if !session.profile.uuid.eq_ignore_ascii_case(uuid) {
        clear_vault_credential(&mut vault, uuid);
        session_store::save_vault(&state.data_dir, &vault)?;
        clear_live_identity(state, uuid).await;
        return Err(LauncherError::Auth(
            "Microsoft returned a different Minecraft profile for this saved account. Sign in again to relink it safely."
                .into(),
        ));
    }
    session.authenticated_at = stored.authenticated_at;
    let now = Utc::now().timestamp();
    session_store::upsert_account(
        &mut vault,
        session.profile.clone(),
        Some(rotated),
        stored.authenticated_at,
        now,
    )?;
    session_store::save_vault(&state.data_dir, &vault)?;
    *state.session.write().await = Some(session.clone());
    Ok(Some(session))
}

fn load_vault(
    state: &AppState,
    persistence: AuthPersistence,
) -> Result<StoredMicrosoftVault, LauncherError> {
    Ok(match session_store::load(&state.data_dir, persistence)? {
        Some(StoredMicrosoftState::Vault(vault)) => vault,
        // Legacy records contain no safe public identity metadata. They are
        // migrated by restore before becoming visible in the account manager.
        Some(StoredMicrosoftState::Legacy(_)) | None => StoredMicrosoftVault::default(),
    })
}

async fn build_snapshot(
    state: &AppState,
    persistence: AuthPersistence,
    vault: &StoredMicrosoftVault,
) -> MicrosoftAccountSnapshot {
    let live = state
        .session
        .read()
        .await
        .clone()
        .filter(|session| !session.is_expired());
    let live_uuid = live.as_ref().map(|session| session.profile.uuid.as_str());
    let mut accounts = vault
        .accounts
        .iter()
        .map(|account| summary_from_stored(account, live_uuid))
        .collect::<Vec<_>>();

    if let Some(session) = live.as_ref() {
        if !accounts
            .iter()
            .any(|account| account.uuid.eq_ignore_ascii_case(&session.profile.uuid))
        {
            accounts.insert(
                0,
                MicrosoftAccountSummary {
                    id: account_id(&session.profile.uuid),
                    uuid: session.profile.uuid.clone(),
                    username: session.profile.name.clone(),
                    is_active: true,
                    stored: false,
                    status: MicrosoftAccountStatus::Active,
                },
            );
        }
    }
    let active_account_id = live.map(|session| account_id(&session.profile.uuid));
    MicrosoftAccountSnapshot {
        accounts,
        active_account_id,
        auth_persistence: persistence,
    }
}

fn summary_from_stored(
    account: &StoredMicrosoftAccount,
    live_uuid: Option<&str>,
) -> MicrosoftAccountSummary {
    let is_active = live_uuid.is_some_and(|uuid| uuid.eq_ignore_ascii_case(&account.profile.uuid));
    let status = if is_active {
        MicrosoftAccountStatus::Active
    } else if account.refresh_token.is_some() {
        MicrosoftAccountStatus::Available
    } else {
        MicrosoftAccountStatus::ReauthRequired
    };
    MicrosoftAccountSummary {
        id: account_id(&account.profile.uuid),
        uuid: account.profile.uuid.clone(),
        username: account.profile.name.clone(),
        is_active,
        stored: true,
        status,
    }
}

fn clear_vault_credential(vault: &mut StoredMicrosoftVault, uuid: &str) {
    if let Some(account) = vault
        .accounts
        .iter_mut()
        .find(|account| account.profile.uuid.eq_ignore_ascii_case(uuid))
    {
        account.refresh_token = None;
    }
    if vault
        .active_uuid
        .as_deref()
        .is_some_and(|active| active.eq_ignore_ascii_case(uuid))
    {
        vault.active_uuid = None;
    }
}

async fn clear_live_identity(state: &AppState, uuid: &str) {
    let should_clear = state
        .session
        .read()
        .await
        .as_ref()
        .is_some_and(|session| session.profile.uuid.eq_ignore_ascii_case(uuid));
    if should_clear {
        *state.session.write().await = None;
    }
}

fn account_id(uuid: &str) -> String {
    format!("{ACCOUNT_ID_PREFIX}{}", uuid.to_ascii_lowercase())
}

fn parse_account_id(account_id: &str) -> Result<String, LauncherError> {
    let Some(uuid) = account_id.strip_prefix(ACCOUNT_ID_PREFIX) else {
        return Err(LauncherError::InvalidData(
            "The Microsoft account id is invalid.".into(),
        ));
    };
    if uuid.len() != 32 || !uuid.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(LauncherError::InvalidData(
            "The Microsoft account id is invalid.".into(),
        ));
    }
    Ok(uuid.to_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_ids_are_strict_and_normalized() {
        let uuid = "ABCDEFABCDEFABCDEFABCDEFABCDEFAB";
        let id = account_id(uuid);
        assert_eq!(
            parse_account_id(&id).unwrap(),
            "abcdefabcdefabcdefabcdefabcdefab"
        );
        assert!(parse_account_id("msa-anything").is_err());
        assert!(parse_account_id("minecraft:../settings.json").is_err());
    }
}
