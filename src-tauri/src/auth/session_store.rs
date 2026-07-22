use std::collections::HashSet;
use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};

use super::MinecraftProfile;
use crate::error::LauncherError;
use crate::secure_store::{protect_for_current_user, unprotect_for_current_user};
use crate::state::AuthPersistence;

const VAULT_VERSION: u8 = 1;
const MAX_STORED_ACCOUNTS: usize = 8;
const MAX_VAULT_BYTES: u64 = 1024 * 1024;
const MAX_REFRESH_TOKEN_BYTES: usize = 16 * 1024;

/// Legacy v0 payload. It intentionally remains readable so an existing user
/// can refresh once and migrate without losing their Microsoft session.
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredMicrosoftRefresh {
    pub refresh_token: String,
    pub authenticated_at: i64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredMicrosoftAccount {
    pub profile: MinecraftProfile,
    pub refresh_token: Option<String>,
    pub authenticated_at: i64,
    pub last_used_at: i64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredMicrosoftVault {
    pub version: u8,
    pub active_uuid: Option<String>,
    pub accounts: Vec<StoredMicrosoftAccount>,
}

impl Default for StoredMicrosoftVault {
    fn default() -> Self {
        Self {
            version: VAULT_VERSION,
            active_uuid: None,
            accounts: Vec::new(),
        }
    }
}

#[derive(Clone)]
pub enum StoredMicrosoftState {
    Vault(StoredMicrosoftVault),
    Legacy(StoredMicrosoftRefresh),
}

#[derive(Deserialize)]
#[serde(untagged)]
enum PersistedMicrosoftState {
    Vault(StoredMicrosoftVault),
    Legacy(StoredMicrosoftRefresh),
}

fn session_path(data_dir: &Path) -> PathBuf {
    data_dir.join("auth").join("microsoft.token")
}

fn pending_path(data_dir: &Path) -> PathBuf {
    data_dir.join("auth").join("microsoft.token.new")
}

fn backup_path(data_dir: &Path) -> PathBuf {
    data_dir.join("auth").join("microsoft.token.backup")
}

pub fn load(
    data_dir: &Path,
    persistence: AuthPersistence,
) -> Result<Option<StoredMicrosoftState>, LauncherError> {
    let Some(persisted) = read_persisted_state(data_dir)? else {
        return Ok(None);
    };
    let maximum_age = persistence.maximum_age_seconds();
    let now = Utc::now().timestamp();

    match persisted {
        PersistedMicrosoftState::Legacy(legacy) => {
            if maximum_age.is_some_and(|maximum_age| {
                refresh_is_usable(
                    &legacy.refresh_token,
                    legacy.authenticated_at,
                    maximum_age,
                    now,
                )
            }) {
                Ok(Some(StoredMicrosoftState::Legacy(legacy)))
            } else {
                remove(data_dir)?;
                Ok(None)
            }
        }
        PersistedMicrosoftState::Vault(mut vault) => {
            if vault.version != VAULT_VERSION {
                return Err(LauncherError::InvalidData(format!(
                    "Microsoft account vault version {} is not supported.",
                    vault.version
                )));
            }

            for account in &mut vault.accounts {
                account.profile.uuid.make_ascii_lowercase();
            }
            vault.active_uuid = vault.active_uuid.map(|uuid| uuid.to_ascii_lowercase());
            let before = vault.accounts.len();
            let mut seen = HashSet::with_capacity(before);
            vault.accounts.retain(|account| {
                valid_profile(&account.profile) && seen.insert(account.profile.uuid.clone())
            });
            let mut changed = vault.accounts.len() != before;
            for account in &mut vault.accounts {
                let usable = maximum_age.is_some_and(|maximum_age| {
                    account.refresh_token.as_deref().is_some_and(|token| {
                        refresh_is_usable(token, account.authenticated_at, maximum_age, now)
                    })
                });
                if !usable && account.refresh_token.take().is_some() {
                    changed = true;
                }
            }
            if vault.active_uuid.as_ref().is_some_and(|active| {
                !vault
                    .accounts
                    .iter()
                    .any(|account| account.profile.uuid == *active)
            }) {
                vault.active_uuid = None;
                changed = true;
            }

            if vault.accounts.is_empty() {
                remove(data_dir)?;
                return Ok(None);
            }
            if changed {
                save_vault(data_dir, &vault)?;
            }
            Ok(Some(StoredMicrosoftState::Vault(vault)))
        }
    }
}

pub fn save_vault(data_dir: &Path, vault: &StoredMicrosoftVault) -> Result<(), LauncherError> {
    if vault.accounts.is_empty() {
        return remove(data_dir);
    }
    let mut normalized = vault.clone();
    normalized.version = VAULT_VERSION;
    normalized.accounts.truncate(MAX_STORED_ACCOUNTS);
    let encrypted = protect_for_current_user(&serde_json::to_vec(&normalized)?)?;
    write_atomically(data_dir, &encrypted)
}

/// Persists the pre-vault payload after a legacy refresh token rotates. This
/// prevents a successful OAuth refresh followed by a temporary Xbox or
/// Minecraft outage from stranding the user with an already-consumed token.
pub fn save_legacy(
    data_dir: &Path,
    refresh_token: &str,
    authenticated_at: i64,
) -> Result<(), LauncherError> {
    if refresh_token.trim().is_empty()
        || refresh_token.len() > MAX_REFRESH_TOKEN_BYTES
        || authenticated_at <= 0
    {
        return Err(LauncherError::InvalidData(
            "Microsoft returned an invalid legacy session for local storage.".into(),
        ));
    }
    let payload = StoredMicrosoftRefresh {
        refresh_token: refresh_token.to_owned(),
        authenticated_at,
    };
    let encrypted = protect_for_current_user(&serde_json::to_vec(&payload)?)?;
    write_atomically(data_dir, &encrypted)
}

pub fn upsert_account(
    vault: &mut StoredMicrosoftVault,
    mut profile: MinecraftProfile,
    refresh_token: Option<String>,
    authenticated_at: i64,
    last_used_at: i64,
) -> Result<(), LauncherError> {
    if !valid_profile(&profile)
        || authenticated_at <= 0
        || last_used_at <= 0
        || refresh_token
            .as_ref()
            .is_some_and(|token| token.trim().is_empty() || token.len() > MAX_REFRESH_TOKEN_BYTES)
    {
        return Err(LauncherError::InvalidData(
            "Microsoft returned invalid account metadata for local storage.".into(),
        ));
    }

    profile.uuid.make_ascii_lowercase();
    vault
        .accounts
        .retain(|account| !account.profile.uuid.eq_ignore_ascii_case(&profile.uuid));
    vault.active_uuid = Some(profile.uuid.clone());
    vault.accounts.insert(
        0,
        StoredMicrosoftAccount {
            profile,
            refresh_token,
            authenticated_at,
            last_used_at,
        },
    );
    vault.accounts.truncate(MAX_STORED_ACCOUNTS);
    Ok(())
}

pub fn remove_account(vault: &mut StoredMicrosoftVault, uuid: &str) -> bool {
    let before = vault.accounts.len();
    vault
        .accounts
        .retain(|account| !account.profile.uuid.eq_ignore_ascii_case(uuid));
    if vault
        .active_uuid
        .as_deref()
        .is_some_and(|active| active.eq_ignore_ascii_case(uuid))
    {
        vault.active_uuid = None;
    }
    before != vault.accounts.len()
}

pub fn remove(data_dir: &Path) -> Result<(), LauncherError> {
    remove_if_exists(&session_path(data_dir))?;
    remove_if_exists(&pending_path(data_dir))?;
    remove_if_exists(&backup_path(data_dir))?;
    Ok(())
}

fn read_persisted_state(data_dir: &Path) -> Result<Option<PersistedMicrosoftState>, LauncherError> {
    let primary = session_path(data_dir);
    let backup = backup_path(data_dir);

    if primary.exists() {
        match decode_state(&primary) {
            Ok(state) => {
                remove_if_exists(&backup)?;
                return Ok(Some(state));
            }
            Err(primary_error) if backup.exists() => {
                let state = decode_state(&backup).map_err(|backup_error| {
                    LauncherError::Auth(format!(
                        "The Microsoft account vault and its recovery copy are unreadable: {primary_error}; {backup_error}"
                    ))
                })?;
                remove_if_exists(&primary)?;
                std::fs::rename(&backup, &primary)?;
                return Ok(Some(state));
            }
            Err(error) => return Err(error),
        }
    }

    if backup.exists() {
        let state = decode_state(&backup)?;
        if let Some(parent) = primary.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::rename(&backup, &primary)?;
        return Ok(Some(state));
    }

    Ok(None)
}

fn decode_state(path: &Path) -> Result<PersistedMicrosoftState, LauncherError> {
    let metadata = std::fs::metadata(path)?;
    if metadata.len() > MAX_VAULT_BYTES {
        return Err(LauncherError::InvalidData(
            "The Microsoft account vault exceeds its 1 MB safety limit.".into(),
        ));
    }
    let encrypted = std::fs::read(path)?;
    let plain = unprotect_for_current_user(&encrypted)?;
    Ok(serde_json::from_slice(&plain)?)
}

fn write_atomically(data_dir: &Path, encrypted: &[u8]) -> Result<(), LauncherError> {
    let primary = session_path(data_dir);
    let pending = pending_path(data_dir);
    let backup = backup_path(data_dir);
    let parent = primary.parent().ok_or_else(|| {
        LauncherError::Internal("Microsoft account vault path has no parent directory.".into())
    })?;
    std::fs::create_dir_all(parent)?;
    remove_if_exists(&pending)?;
    remove_if_exists(&backup)?;

    {
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&pending)?;
        file.write_all(encrypted)?;
        file.sync_all()?;
    }

    if primary.exists() {
        std::fs::rename(&primary, &backup)?;
    }
    if let Err(error) = std::fs::rename(&pending, &primary) {
        if backup.exists() {
            let _ = std::fs::rename(&backup, &primary);
        }
        let _ = remove_if_exists(&pending);
        return Err(error.into());
    }
    remove_if_exists(&backup)?;
    Ok(())
}

fn remove_if_exists(path: &Path) -> Result<(), LauncherError> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

fn refresh_is_usable(token: &str, authenticated_at: i64, maximum_age: i64, now: i64) -> bool {
    if token.trim().is_empty()
        || token.len() > MAX_REFRESH_TOKEN_BYTES
        || authenticated_at <= 0
        || authenticated_at > now.saturating_add(300)
    {
        return false;
    }
    now.saturating_sub(authenticated_at) <= maximum_age
}

fn valid_profile(profile: &MinecraftProfile) -> bool {
    profile.uuid.len() == 32
        && profile.uuid.bytes().all(|byte| byte.is_ascii_hexdigit())
        && !profile.name.is_empty()
        && profile.name.len() <= 64
        && !profile.name.chars().any(char::is_control)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(uuid: &str, name: &str) -> MinecraftProfile {
        MinecraftProfile {
            uuid: uuid.to_owned(),
            name: name.to_owned(),
        }
    }

    #[test]
    fn upsert_replaces_one_identity_and_keeps_other_accounts() {
        let mut vault = StoredMicrosoftVault::default();
        upsert_account(
            &mut vault,
            profile("11111111111111111111111111111111", "FirstPlayer"),
            Some("refresh-one".into()),
            100,
            100,
        )
        .unwrap();
        upsert_account(
            &mut vault,
            profile("22222222222222222222222222222222", "SecondPlayer"),
            Some("refresh-two".into()),
            200,
            200,
        )
        .unwrap();
        upsert_account(
            &mut vault,
            profile("11111111111111111111111111111111", "RenamedPlayer"),
            Some("rotated-one".into()),
            100,
            300,
        )
        .unwrap();

        assert_eq!(vault.accounts.len(), 2);
        assert_eq!(
            vault.active_uuid.as_deref(),
            Some("11111111111111111111111111111111")
        );
        assert_eq!(vault.accounts[0].profile.name, "RenamedPlayer");
        assert_eq!(
            vault.accounts[0].refresh_token.as_deref(),
            Some("rotated-one")
        );
    }

    #[test]
    fn removing_the_restore_identity_does_not_silently_select_another() {
        let mut vault = StoredMicrosoftVault::default();
        upsert_account(
            &mut vault,
            profile("11111111111111111111111111111111", "FirstPlayer"),
            Some("refresh-one".into()),
            100,
            100,
        )
        .unwrap();
        upsert_account(
            &mut vault,
            profile("22222222222222222222222222222222", "SecondPlayer"),
            Some("refresh-two".into()),
            200,
            200,
        )
        .unwrap();

        assert!(remove_account(
            &mut vault,
            "22222222222222222222222222222222"
        ));
        assert_eq!(vault.accounts.len(), 1);
        assert_eq!(vault.active_uuid, None);
    }

    #[test]
    fn refresh_age_cannot_be_extended_by_future_or_empty_values() {
        assert!(refresh_is_usable("token", 1_000, 500, 1_500));
        assert!(!refresh_is_usable("token", 999, 500, 1_500));
        assert!(!refresh_is_usable("", 1_000, 500, 1_100));
        assert!(!refresh_is_usable("token", 2_000, 500, 1_000));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn encrypted_vault_round_trips_and_never_writes_the_refresh_token_plainly() {
        let directory = std::env::temp_dir().join(format!(
            "void-microsoft-vault-test-{}",
            uuid::Uuid::new_v4()
        ));
        let mut vault = StoredMicrosoftVault::default();
        let now = Utc::now().timestamp();
        upsert_account(
            &mut vault,
            profile("11111111111111111111111111111111", "StoredPlayer"),
            Some("highly-sensitive-refresh-token".into()),
            now,
            now,
        )
        .unwrap();
        save_vault(&directory, &vault).unwrap();

        let raw = std::fs::read(session_path(&directory)).unwrap();
        assert!(!raw
            .windows("highly-sensitive-refresh-token".len())
            .any(|window| window == b"highly-sensitive-refresh-token"));
        let loaded = load(&directory, AuthPersistence::OneMonth).unwrap();
        let StoredMicrosoftState::Vault(loaded) = loaded.unwrap() else {
            panic!("expected a vault payload");
        };
        assert_eq!(loaded.accounts[0].profile.name, "StoredPlayer");
        assert_eq!(
            loaded.accounts[0].refresh_token.as_deref(),
            Some("highly-sensitive-refresh-token")
        );

        remove(&directory).unwrap();
        std::fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn always_ask_keeps_identity_metadata_but_strips_every_credential() {
        let directory = std::env::temp_dir().join(format!(
            "void-microsoft-always-ask-test-{}",
            uuid::Uuid::new_v4()
        ));
        let mut vault = StoredMicrosoftVault::default();
        let now = Utc::now().timestamp();
        upsert_account(
            &mut vault,
            profile("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "FirstStoredPlayer"),
            Some("first-sensitive-token".into()),
            now,
            now,
        )
        .unwrap();
        upsert_account(
            &mut vault,
            profile("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "SecondStoredPlayer"),
            Some("second-sensitive-token".into()),
            now,
            now,
        )
        .unwrap();
        save_vault(&directory, &vault).unwrap();

        let loaded = load(&directory, AuthPersistence::AlwaysAsk).unwrap();
        let StoredMicrosoftState::Vault(loaded) = loaded.unwrap() else {
            panic!("expected a vault payload");
        };
        assert_eq!(loaded.accounts.len(), 2);
        assert!(loaded
            .accounts
            .iter()
            .all(|account| account.refresh_token.is_none()));

        let raw = std::fs::read(session_path(&directory)).unwrap();
        let plain = unprotect_for_current_user(&raw).unwrap();
        assert!(!plain
            .windows("sensitive-token".len())
            .any(|window| window == b"sensitive-token"));

        remove(&directory).unwrap();
        std::fs::remove_dir_all(directory).unwrap();
    }
}
