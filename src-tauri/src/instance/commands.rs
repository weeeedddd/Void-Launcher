//! Instance commands: the "custom modpack builder" backend.

use serde::{Deserialize, Serialize};
use std::path::{Component, Path};
use tauri::State;
use uuid::Uuid;

use super::{InstalledMod, Instance, InstanceLoader};
use crate::error::LauncherError;
use crate::modplatform::commands::require_curseforge_key;
use crate::modplatform::{curseforge, modrinth, Platform};
use crate::state::AppState;

#[tauri::command]
pub fn list_instances(state: State<'_, AppState>) -> Result<Vec<Instance>, LauncherError> {
    Ok(Instance::load_all(&state.instances_dir()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInstanceSpec {
    pub name: String,
    pub game_version: String,
    pub loader: InstanceLoader,
}

#[tauri::command]
pub fn create_instance(
    state: State<'_, AppState>,
    spec: CreateInstanceSpec,
) -> Result<Instance, LauncherError> {
    let instance = Instance {
        id: Uuid::new_v4(),
        name: spec.name,
        game_version: spec.game_version,
        loader: spec.loader,
        loader_version: None, // resolved to latest stable at first launch
        memory_mb: 4096,      // sensible default for modded Minecraft
        java_path: None,
        extra_java_args: Vec::new(),
        mods: Vec::new(),
        created_at: chrono::Utc::now(),
        last_played_at: None,
    };
    instance.save(&state.instances_dir())?;
    Ok(instance)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceSettings {
    pub memory_mb: u32,
    pub java_path: Option<String>,
    #[serde(default)]
    pub extra_java_args: Vec<String>,
}

/// Per-instance settings: RAM allocation, Java path, extra JVM flags.
#[tauri::command]
pub fn update_instance_settings(
    state: State<'_, AppState>,
    instance_id: Uuid,
    settings: InstanceSettings,
) -> Result<Instance, LauncherError> {
    let root = state.instances_dir();
    let mut instance = Instance::find(&root, instance_id)?;

    instance.memory_mb = settings.memory_mb.clamp(1024, 65536);
    instance.java_path = settings.java_path;
    instance.extra_java_args = settings.extra_java_args;

    instance.save(&root)?;
    Ok(instance)
}

/// One-click install: resolves the newest version of `project_id` that is
/// compatible with the instance (game version + loader), downloads the jar
/// into the instance's mods folder, verifies it and records it.
#[tauri::command]
pub async fn install_mod(
    state: State<'_, AppState>,
    instance_id: Uuid,
    platform: Platform,
    project_id: String,
) -> Result<InstalledMod, LauncherError> {
    let root = state.instances_dir();
    let mut instance = Instance::find(&root, instance_id)?;
    let loader = instance.loader.as_mod_loader();

    // 1) Ask the platform for versions matching this instance (newest first).
    let versions = match platform {
        Platform::Modrinth => {
            modrinth::versions(
                &state.http,
                &project_id,
                Some(&instance.game_version),
                loader,
            )
            .await?
        }
        Platform::Curseforge => {
            let api_key = require_curseforge_key(&state)?;
            curseforge::files(
                &state.http,
                &api_key,
                &project_id,
                Some(&instance.game_version),
                loader,
            )
            .await?
        }
    };

    let version = versions.into_iter().next().ok_or_else(|| {
        LauncherError::NotFound(format!(
            "No compatible version found for Minecraft {} ({:?}).",
            instance.game_version, instance.loader
        ))
    })?;

    // 2) Download the jar. CurseForge authors can opt out of API downloads.
    let url = version.download_url.clone().ok_or_else(|| {
        LauncherError::Platform(
            "The author of this mod disabled third-party downloads — \
             please install it from the CurseForge website instead."
                .into(),
        )
    })?;
    let bytes = state
        .http
        .get(&url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;

    // 3) Verify integrity when the platform provided a hash.
    if let Some(expected) = &version.sha1 {
        let actual = sha1_smol::Sha1::from(&bytes).digest().to_string();
        if !actual.eq_ignore_ascii_case(expected) {
            return Err(LauncherError::InvalidData(format!(
                "Download corrupted: SHA-1 mismatch for {} (expected {expected}, got {actual})",
                version.file_name
            )));
        }
    }

    let mods_dir = instance.mods_dir(&root);
    validate_mod_file_name(&version.file_name)?;
    tokio::fs::create_dir_all(&mods_dir).await?;
    tokio::fs::write(mods_dir.join(&version.file_name), &bytes).await?;

    // 4) Record it in instance.json (re-installing replaces the old entry).
    let installed = InstalledMod {
        platform,
        project_id,
        version_id: version.id,
        name: version.name,
        file_name: version.file_name,
        enabled: true,
    };
    instance
        .mods
        .retain(|m| m.project_id != installed.project_id);
    instance.mods.push(installed.clone());
    instance.save(&root)?;

    Ok(installed)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledShader {
    pub platform: Platform,
    pub project_id: String,
    pub version_id: String,
    pub name: String,
    pub file_name: String,
}

/// Downloads the newest compatible shader archive into the selected
/// instance's `shaderpacks` directory. Shader versions are not filtered by a
/// Java mod loader because platforms classify them with Iris/OptiFine tags.
#[tauri::command]
pub async fn install_shader(
    state: State<'_, AppState>,
    instance_id: Uuid,
    platform: Platform,
    project_id: String,
) -> Result<InstalledShader, LauncherError> {
    let root = state.instances_dir();
    let instance = Instance::find(&root, instance_id)?;
    let versions = match platform {
        Platform::Modrinth => {
            modrinth::versions(&state.http, &project_id, Some(&instance.game_version), None).await?
        }
        Platform::Curseforge => {
            let api_key = require_curseforge_key(&state)?;
            curseforge::files(
                &state.http,
                &api_key,
                &project_id,
                Some(&instance.game_version),
                None,
            )
            .await?
        }
    };
    let version = versions.into_iter().next().ok_or_else(|| {
        LauncherError::NotFound(format!(
            "No shader version supports Minecraft {}.",
            instance.game_version
        ))
    })?;
    let url = version.download_url.clone().ok_or_else(|| {
        LauncherError::Platform(
            "The author disabled third-party downloads. Open the project page to install it manually."
                .into(),
        )
    })?;
    validate_shader_file_name(&version.file_name)?;
    let bytes = state
        .http
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;
    if let Some(expected) = &version.sha1 {
        let actual = sha1_smol::Sha1::from(&bytes).digest().to_string();
        if !actual.eq_ignore_ascii_case(expected) {
            return Err(LauncherError::InvalidData(format!(
                "Download corrupted: SHA-1 mismatch for {}.",
                version.file_name
            )));
        }
    }
    let shaderpacks_dir = instance.dir(&root).join("shaderpacks");
    tokio::fs::create_dir_all(&shaderpacks_dir).await?;
    tokio::fs::write(shaderpacks_dir.join(&version.file_name), bytes).await?;
    Ok(InstalledShader {
        platform,
        project_id,
        version_id: version.id,
        name: version.name,
        file_name: version.file_name,
    })
}

/// Toggle a mod without deleting it. Disabled mods keep their file but get
/// a ".disabled" suffix — every loader (Fabric/Forge/NeoForge/Quilt) only
/// loads `*.jar`, so the rename cleanly deactivates the mod.
#[tauri::command]
pub fn set_mod_enabled(
    state: State<'_, AppState>,
    instance_id: Uuid,
    file_name: String,
    enabled: bool,
) -> Result<(), LauncherError> {
    let root = state.instances_dir();
    let mut instance = Instance::find(&root, instance_id)?;
    let mods_dir = instance.mods_dir(&root);

    validate_mod_file_name(&file_name)?;
    if !instance
        .mods
        .iter()
        .any(|entry| entry.file_name == file_name)
    {
        return Err(LauncherError::NotFound(
            "The requested mod file is not registered in this instance.".into(),
        ));
    }

    let enabled_path = mods_dir.join(&file_name);
    let disabled_path = mods_dir.join(format!("{file_name}.disabled"));
    let (from, to) = if enabled {
        (disabled_path, enabled_path)
    } else {
        (enabled_path, disabled_path)
    };
    if from.exists() {
        std::fs::rename(&from, &to)?;
    }

    if let Some(entry) = instance.mods.iter_mut().find(|m| m.file_name == file_name) {
        entry.enabled = enabled;
    }
    instance.save(&root)?;
    Ok(())
}

fn validate_mod_file_name(file_name: &str) -> Result<(), LauncherError> {
    if file_name.is_empty()
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains('\0')
        || !file_name.to_ascii_lowercase().ends_with(".jar")
    {
        return Err(LauncherError::InvalidData(
            "The mod platform returned an unsafe file name.".into(),
        ));
    }

    let mut components = Path::new(file_name).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err(LauncherError::InvalidData(
            "The mod platform returned an unsafe file name.".into(),
        ));
    }
    Ok(())
}

fn validate_shader_file_name(file_name: &str) -> Result<(), LauncherError> {
    if file_name.is_empty()
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains('\0')
        || !file_name.to_ascii_lowercase().ends_with(".zip")
    {
        return Err(LauncherError::InvalidData(
            "The mod platform returned an unsafe shader archive name.".into(),
        ));
    }
    let mut components = Path::new(file_name).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err(LauncherError::InvalidData(
            "The mod platform returned an unsafe shader archive name.".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{validate_mod_file_name, validate_shader_file_name};

    #[test]
    fn accepts_single_component_jar_names() {
        assert!(validate_mod_file_name("sodium-fabric-0.6.0.jar").is_ok());
        assert!(validate_mod_file_name("Example.JAR").is_ok());
    }

    #[test]
    fn rejects_traversal_and_non_jar_names() {
        for file_name in [
            "../settings.json",
            "..\\settings.json",
            "mods/evil.jar",
            "mods\\evil.jar",
            "evil.exe",
            "",
        ] {
            assert!(
                validate_mod_file_name(file_name).is_err(),
                "{file_name} should be rejected"
            );
        }
    }

    #[test]
    fn shader_archives_must_be_safe_zip_files() {
        assert!(validate_shader_file_name("Complementary.zip").is_ok());
        assert!(validate_shader_file_name("../shader.zip").is_err());
        assert!(validate_shader_file_name("shader.jar").is_err());
    }
}
