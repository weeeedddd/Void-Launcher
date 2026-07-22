//! Instance (= modpack/profile) model and persistence.
//!
//! On-disk layout under `<data_dir>/instances/`:
//! ```text
//! instances/
//! └── <uuid>/
//!     ├── instance.json   ← the Instance struct, pretty-printed
//!     ├── mods/           ← installed jars ("*.jar.disabled" = deactivated)
//!     └── (.minecraft world/config folders appear here after first launch)
//! ```

pub mod commands;

use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::LauncherError;
use crate::modplatform::{ModLoader, Platform};

/// What the instance runs on. Superset of `ModLoader` (adds vanilla).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstanceLoader {
    Vanilla,
    Fabric,
    Forge,
    Neoforge,
    Quilt,
}

impl InstanceLoader {
    /// The matching mod-platform loader (vanilla has none).
    pub fn as_mod_loader(self) -> Option<ModLoader> {
        match self {
            InstanceLoader::Vanilla => None,
            InstanceLoader::Fabric => Some(ModLoader::Fabric),
            InstanceLoader::Forge => Some(ModLoader::Forge),
            InstanceLoader::Neoforge => Some(ModLoader::Neoforge),
            InstanceLoader::Quilt => Some(ModLoader::Quilt),
        }
    }
}

/// A mod that was installed into this instance via the launcher.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledMod {
    pub platform: Platform,
    pub project_id: String,
    pub version_id: String,
    pub name: String,
    pub file_name: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Instance {
    pub id: Uuid,
    pub name: String,
    /// e.g. "1.21.1"
    pub game_version: String,
    pub loader: InstanceLoader,
    /// Specific loader build (e.g. Fabric "0.16.9"); None = latest stable.
    pub loader_version: Option<String>,
    /// JVM heap (-Xmx) in megabytes.
    pub memory_mb: u32,
    /// Per-instance Java override; None = launcher default.
    pub java_path: Option<String>,
    /// Extra JVM flags appended after the launcher defaults.
    #[serde(default)]
    pub extra_java_args: Vec<String>,
    #[serde(default)]
    pub mods: Vec<InstalledMod>,
    pub created_at: DateTime<Utc>,
    pub last_played_at: Option<DateTime<Utc>>,
}

impl Instance {
    pub fn dir(&self, instances_root: &Path) -> PathBuf {
        instances_root.join(self.id.to_string())
    }

    pub fn mods_dir(&self, instances_root: &Path) -> PathBuf {
        self.dir(instances_root).join("mods")
    }

    /// Persists the instance (creates its folder structure on first save).
    pub fn save(&self, instances_root: &Path) -> Result<(), LauncherError> {
        let dir = self.dir(instances_root);
        std::fs::create_dir_all(dir.join("mods"))?;
        std::fs::write(
            dir.join("instance.json"),
            serde_json::to_string_pretty(self)?,
        )?;
        Ok(())
    }

    pub fn load(manifest_path: &Path) -> Result<Instance, LauncherError> {
        Ok(serde_json::from_str(&std::fs::read_to_string(
            manifest_path,
        )?)?)
    }

    /// Loads every instance; corrupt folders are skipped (with a log line)
    /// instead of taking the whole launcher down.
    pub fn load_all(instances_root: &Path) -> Vec<Instance> {
        let mut instances = Vec::new();
        let Ok(entries) = std::fs::read_dir(instances_root) else {
            return instances;
        };
        for entry in entries.flatten() {
            let manifest = entry.path().join("instance.json");
            if !manifest.exists() {
                continue;
            }
            match Self::load(&manifest) {
                Ok(instance) => instances.push(instance),
                Err(err) => eprintln!("skipping broken instance {:?}: {err}", entry.path()),
            }
        }
        instances.sort_by_key(|instance| std::cmp::Reverse(instance.created_at));
        instances
    }

    pub fn find(instances_root: &Path, id: Uuid) -> Result<Instance, LauncherError> {
        Self::load(&instances_root.join(id.to_string()).join("instance.json"))
            .map_err(|_| LauncherError::NotFound(format!("Instance {id} not found")))
    }
}
