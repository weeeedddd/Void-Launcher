use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::error::LauncherError;
use crate::state::AppState;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StorageCategory {
    Logs,
    Profiles,
    Assets,
    Cache,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSegment {
    pub category: StorageCategory,
    pub bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageReport {
    pub segments: Vec<StorageSegment>,
    pub total_bytes: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LauncherFolderKind {
    LauncherLogs,
    GameLogs,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ClearableStorageCategory {
    Logs,
    Cache,
}

#[tauri::command]
pub fn get_storage_report(state: State<'_, AppState>) -> Result<StorageReport, LauncherError> {
    let categories = [
        (StorageCategory::Logs, state.data_dir.join("logs")),
        (StorageCategory::Profiles, state.instances_dir()),
        (StorageCategory::Assets, state.data_dir.join("assets")),
        (StorageCategory::Cache, state.data_dir.join("cache")),
    ];

    let mut total_bytes = 0_u64;
    let mut segments = Vec::with_capacity(categories.len());
    for (category, directory) in categories {
        let bytes = directory_size(&directory)?;
        total_bytes = total_bytes.saturating_add(bytes);
        segments.push(StorageSegment { category, bytes });
    }

    Ok(StorageReport {
        segments,
        total_bytes,
    })
}

#[tauri::command]
pub fn open_launcher_folder(
    state: State<'_, AppState>,
    kind: LauncherFolderKind,
    instance_id: Option<Uuid>,
) -> Result<(), LauncherError> {
    let directory = match kind {
        LauncherFolderKind::LauncherLogs => state.data_dir.join("logs"),
        LauncherFolderKind::GameLogs => {
            let id = instance_id.ok_or_else(|| {
                LauncherError::NotFound(
                    "Select a Minecraft instance before opening game logs.".into(),
                )
            })?;
            state.instances_dir().join(id.to_string()).join("logs")
        }
    };

    fs::create_dir_all(&directory)?;
    tauri_plugin_opener::open_path(&directory, None::<&str>).map_err(|error| {
        LauncherError::Internal(format!(
            "Could not open the requested launcher folder: {error}"
        ))
    })
}

#[tauri::command]
pub fn clear_storage_category(
    state: State<'_, AppState>,
    category: ClearableStorageCategory,
) -> Result<StorageReport, LauncherError> {
    let directory = match category {
        ClearableStorageCategory::Logs => state.data_dir.join("logs"),
        ClearableStorageCategory::Cache => state.data_dir.join("cache"),
    };

    clear_directory_contents(&directory)?;
    get_storage_report(state)
}

#[tauri::command]
pub fn restart_launcher(app: AppHandle) {
    app.restart();
}

fn directory_size(directory: &Path) -> Result<u64, LauncherError> {
    if !directory.exists() {
        return Ok(0);
    }

    let mut total = 0_u64;
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let metadata = fs::symlink_metadata(entry.path())?;
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            total = total.saturating_add(directory_size(&entry.path())?);
        } else if metadata.is_file() {
            total = total.saturating_add(metadata.len());
        }
    }
    Ok(total)
}

fn clear_directory_contents(directory: &Path) -> Result<(), LauncherError> {
    fs::create_dir_all(directory)?;
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path)?;
        if metadata.is_dir() && !metadata.file_type().is_symlink() {
            fs::remove_dir_all(path)?;
        } else {
            fs::remove_file(path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{clear_directory_contents, directory_size};

    #[test]
    fn measures_and_clears_only_the_given_directory() {
        let directory =
            std::env::temp_dir().join(format!("void-storage-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(directory.join("nested")).expect("create test directory");
        std::fs::write(directory.join("one.log"), b"1234").expect("write first test file");
        std::fs::write(directory.join("nested").join("two.log"), b"56789")
            .expect("write second test file");

        assert_eq!(directory_size(&directory).expect("measure directory"), 9);
        clear_directory_contents(&directory).expect("clear directory");
        assert_eq!(
            directory_size(&directory).expect("measure cleared directory"),
            0
        );

        std::fs::remove_dir_all(directory).expect("remove test directory");
    }
}
