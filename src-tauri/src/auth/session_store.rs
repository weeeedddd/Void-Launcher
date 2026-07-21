use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::error::LauncherError;
use crate::secure_store::{protect_for_current_user, unprotect_for_current_user};
use crate::state::AuthPersistence;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredMicrosoftRefresh {
    pub refresh_token: String,
    pub authenticated_at: i64,
}

fn session_path(data_dir: &Path) -> PathBuf {
    data_dir.join("auth").join("microsoft.token")
}

pub fn save(
    data_dir: &Path,
    refresh_token: &str,
    authenticated_at: i64,
) -> Result<(), LauncherError> {
    let path = session_path(data_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let payload = StoredMicrosoftRefresh {
        refresh_token: refresh_token.to_owned(),
        authenticated_at,
    };
    let encrypted = protect_for_current_user(&serde_json::to_vec(&payload)?)?;
    std::fs::write(path, encrypted)?;
    Ok(())
}

pub fn load(
    data_dir: &Path,
    persistence: AuthPersistence,
) -> Result<Option<StoredMicrosoftRefresh>, LauncherError> {
    if persistence == AuthPersistence::AlwaysAsk {
        remove(data_dir)?;
        return Ok(None);
    }
    let path = session_path(data_dir);
    let encrypted = match std::fs::read(&path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    let plain = unprotect_for_current_user(&encrypted)?;
    let stored: StoredMicrosoftRefresh = serde_json::from_slice(&plain)?;
    let maximum_age = persistence.maximum_age_seconds().unwrap_or_default();
    let age = Utc::now()
        .timestamp()
        .saturating_sub(stored.authenticated_at);
    if age > maximum_age {
        remove(data_dir)?;
        return Ok(None);
    }
    Ok(Some(stored))
}

pub fn remove(data_dir: &Path) -> Result<(), LauncherError> {
    match std::fs::remove_file(session_path(data_dir)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}
