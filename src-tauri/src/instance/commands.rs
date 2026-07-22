//! Instance commands: the "custom modpack builder" backend.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::net::IpAddr;
use std::path::{Component, Path, PathBuf};
use tauri::State;
use url::Url;
use uuid::Uuid;

use super::{InstalledMod, Instance, InstanceLoader};
use crate::error::LauncherError;
use crate::modplatform::commands::require_curseforge_key;
use crate::modplatform::{curseforge, modrinth, ModLoader, ModVersionInfo, Platform};
use crate::state::AppState;

#[tauri::command]
pub fn list_instances(state: State<'_, AppState>) -> Result<Vec<Instance>, LauncherError> {
    Ok(Instance::load_all(&state.instances_dir()))
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InstanceContentKind {
    Mod,
    Shader,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceContentEntry {
    pub kind: InstanceContentKind,
    pub name: String,
    /// The registered base file name. Disabled mods still return `name.jar`
    /// because that is the safe identifier accepted by `set_mod_enabled`.
    pub file_name: String,
    pub enabled: bool,
}

/// Returns the real files present in an instance's managed content folders.
/// The dashboard uses this instead of a bundled/demo mod list.
#[tauri::command]
pub fn list_instance_content(
    state: State<'_, AppState>,
    instance_id: Uuid,
) -> Result<Vec<InstanceContentEntry>, LauncherError> {
    let root = state.instances_dir();
    let instance = Instance::find(&root, instance_id)?;
    scan_instance_content(&instance, &root)
}

fn scan_instance_content(
    instance: &Instance,
    instances_root: &Path,
) -> Result<Vec<InstanceContentEntry>, LauncherError> {
    const MAX_VISIBLE_CONTENT: usize = 256;

    let mut output = Vec::new();
    scan_content_directory(
        &instance.mods_dir(instances_root),
        |file_name| {
            let lower = file_name.to_ascii_lowercase();
            let (registered_name, enabled) = if lower.ends_with(".jar.disabled") {
                (&file_name[..file_name.len() - ".disabled".len()], false)
            } else if lower.ends_with(".jar") {
                (file_name, true)
            } else {
                return None;
            };
            let metadata = instance
                .mods
                .iter()
                .find(|installed| installed.file_name.eq_ignore_ascii_case(registered_name));
            Some(InstanceContentEntry {
                kind: InstanceContentKind::Mod,
                name: metadata
                    .map(|installed| installed.name.clone())
                    .unwrap_or_else(|| content_display_name(registered_name, ".jar")),
                file_name: registered_name.to_owned(),
                enabled,
            })
        },
        &mut output,
    )?;

    scan_content_directory(
        &instance.dir(instances_root).join("shaderpacks"),
        |file_name| {
            file_name
                .to_ascii_lowercase()
                .ends_with(".zip")
                .then(|| InstanceContentEntry {
                    kind: InstanceContentKind::Shader,
                    name: content_display_name(file_name, ".zip"),
                    file_name: file_name.to_owned(),
                    enabled: true,
                })
        },
        &mut output,
    )?;

    output.sort_by(|left, right| {
        let left_kind = matches!(left.kind, InstanceContentKind::Shader);
        let right_kind = matches!(right.kind, InstanceContentKind::Shader);
        left_kind
            .cmp(&right_kind)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    output.truncate(MAX_VISIBLE_CONTENT);
    Ok(output)
}

fn scan_content_directory<F>(
    directory: &Path,
    mut map_entry: F,
    output: &mut Vec<InstanceContentEntry>,
) -> Result<(), LauncherError>
where
    F: FnMut(&str) -> Option<InstanceContentEntry>,
{
    let entries = match std::fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    for entry in entries.take(512) {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if !file_type.is_file() || file_type.is_symlink() {
            continue;
        }
        let Some(file_name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if file_name.len() > 255 || file_name.chars().any(char::is_control) {
            continue;
        }
        if let Some(item) = map_entry(&file_name) {
            output.push(item);
        }
    }
    Ok(())
}

fn content_display_name(file_name: &str, extension: &str) -> String {
    file_name
        .strip_suffix(extension)
        .unwrap_or(file_name)
        .replace(['_', '-'], " ")
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
    let name = validate_instance_name(&spec.name)?;
    let game_version = validate_game_version(&spec.game_version)?;
    let instance = Instance {
        id: Uuid::new_v4(),
        name,
        game_version,
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
    let bytes = download_limited(&state.http, &url, MAX_ENTRY_BYTES).await?;

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
    let bytes = download_limited(&state.http, &url, MAX_ENTRY_BYTES).await?;
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackInstallOutcome {
    pub instance_id: Uuid,
    pub archive_version: String,
    pub files_installed: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProvisionedModpackOutcome {
    pub instance: Instance,
    pub archive_version: String,
    pub files_installed: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ModpackRuntime {
    game_version: String,
    loader: InstanceLoader,
    loader_version: Option<String>,
}

const MAX_ARCHIVE_BYTES: u64 = 512 * 1024 * 1024;
const MAX_ENTRY_BYTES: u64 = 128 * 1024 * 1024;

/// Downloads and imports a real Modrinth `.mrpack` or CurseForge manifest
/// into an existing compatible profile.
#[tauri::command]
pub async fn install_modpack(
    state: State<'_, AppState>,
    instance_id: Uuid,
    platform: Platform,
    project_id: String,
) -> Result<ModpackInstallOutcome, LauncherError> {
    let root = state.instances_dir();
    let mut instance = Instance::find(&root, instance_id)?;
    let loader = instance.loader.as_mod_loader();
    let (version, archive) = download_modpack_archive(
        state.inner(),
        platform,
        &project_id,
        Some(&instance.game_version),
        loader,
    )
    .await?;

    let files_installed = match platform {
        Platform::Modrinth => {
            import_modrinth_pack(state.inner(), &mut instance, &project_id, &archive).await?
        }
        Platform::Curseforge => {
            let api_key = require_curseforge_key(&state)?;
            import_curseforge_pack(
                state.inner(),
                &mut instance,
                &project_id,
                &api_key,
                &archive,
            )
            .await?
        }
    };
    instance.save(&root)?;
    Ok(ModpackInstallOutcome {
        instance_id,
        archive_version: version.version_number,
        files_installed,
    })
}

/// Creates a new instance directly from the newest published modpack archive.
/// The manifest is parsed before any profile is created so Minecraft and
/// loader versions always come from the pack itself. If importing any file
/// fails, the newly-created instance directory is removed in full.
#[tauri::command]
pub async fn provision_modpack(
    state: State<'_, AppState>,
    platform: Platform,
    project_id: String,
    instance_name: String,
) -> Result<ProvisionedModpackOutcome, LauncherError> {
    let name = validate_instance_name(&instance_name)?;
    let (version, archive) =
        download_modpack_archive(state.inner(), platform, &project_id, None, None).await?;
    let runtime = derive_modpack_runtime(platform, &archive)?;
    let game_version = validate_game_version(&runtime.game_version)?;
    let loader_version = runtime
        .loader_version
        .as_deref()
        .map(validate_loader_version)
        .transpose()?;
    let root = state.instances_dir();
    let mut instance = Instance {
        id: Uuid::new_v4(),
        name,
        game_version,
        loader: runtime.loader,
        loader_version,
        memory_mb: 4096,
        java_path: None,
        extra_java_args: Vec::new(),
        mods: Vec::new(),
        created_at: chrono::Utc::now(),
        last_played_at: None,
    };
    let instance_dir = instance.dir(&root);

    let import_result = async {
        let files_installed = match platform {
            Platform::Modrinth => {
                import_modrinth_pack(state.inner(), &mut instance, &project_id, &archive).await?
            }
            Platform::Curseforge => {
                let api_key = require_curseforge_key(&state)?;
                import_curseforge_pack(
                    state.inner(),
                    &mut instance,
                    &project_id,
                    &api_key,
                    &archive,
                )
                .await?
            }
        };
        instance.save(&root)?;
        Ok::<u32, LauncherError>(files_installed)
    }
    .await;

    match import_result {
        Ok(files_installed) => Ok(ProvisionedModpackOutcome {
            instance,
            archive_version: version.version_number,
            files_installed,
        }),
        Err(install_error) => {
            if instance_dir.exists() {
                if let Err(cleanup_error) = std::fs::remove_dir_all(&instance_dir) {
                    return Err(LauncherError::Internal(format!(
                        "{install_error}; failed to roll back {}: {cleanup_error}",
                        instance_dir.display()
                    )));
                }
            }
            Err(install_error)
        }
    }
}

async fn download_modpack_archive(
    state: &AppState,
    platform: Platform,
    project_id: &str,
    game_version: Option<&str>,
    loader: Option<ModLoader>,
) -> Result<(ModVersionInfo, Vec<u8>), LauncherError> {
    let versions = match platform {
        Platform::Modrinth => {
            modrinth::versions(&state.http, project_id, game_version, loader).await?
        }
        Platform::Curseforge => {
            let api_key = require_curseforge_key(state)?;
            curseforge::files(&state.http, &api_key, project_id, game_version, loader).await?
        }
    };
    let version = versions.into_iter().next().ok_or_else(|| {
        LauncherError::NotFound("No downloadable modpack version matched this request.".into())
    })?;
    let url = version.download_url.clone().ok_or_else(|| {
        LauncherError::Platform(
            "The author disabled third-party downloads for the newest modpack version. Open the project page to install it manually.".into(),
        )
    })?;
    if version.file_size > MAX_ARCHIVE_BYTES {
        return Err(LauncherError::InvalidData(
            "The modpack archive exceeds the 512 MB safety limit.".into(),
        ));
    }
    let archive = download_limited(&state.http, &url, MAX_ARCHIVE_BYTES).await?;
    if let Some(expected) = &version.sha1 {
        let actual = sha1_smol::Sha1::from(&archive).digest().to_string();
        if !actual.eq_ignore_ascii_case(expected) {
            return Err(LauncherError::InvalidData(
                "The modpack archive failed its SHA-1 integrity check.".into(),
            ));
        }
    }
    Ok((version, archive))
}

fn validate_instance_name(value: &str) -> Result<String, LauncherError> {
    let trimmed = value.trim();
    let length = trimmed.chars().count();
    if !(3..=48).contains(&length) || trimmed.chars().any(char::is_control) {
        return Err(LauncherError::InvalidData(
            "Instance names must contain 3 to 48 visible characters.".into(),
        ));
    }
    Ok(trimmed.to_owned())
}

fn validate_game_version(value: &str) -> Result<String, LauncherError> {
    let trimmed = value.trim();
    let length = trimmed.chars().count();
    if trimmed.is_empty()
        || length > 32
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains("..")
        || trimmed.starts_with('.')
        || !trimmed.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')
        })
    {
        return Err(LauncherError::InvalidData(
            "Minecraft versions may contain only letters, numbers, dots, dashes and underscores."
                .into(),
        ));
    }
    Ok(trimmed.to_owned())
}

fn validate_loader_version(value: &str) -> Result<String, LauncherError> {
    let trimmed = value.trim();
    let length = trimmed.chars().count();
    if trimmed.is_empty()
        || length > 64
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains("..")
        || trimmed.starts_with('.')
        || !trimmed.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')
        })
    {
        return Err(LauncherError::InvalidData(
            "The modpack contains an unsafe loader version.".into(),
        ));
    }
    Ok(trimmed.to_owned())
}

fn derive_modpack_runtime(
    platform: Platform,
    archive: &[u8],
) -> Result<ModpackRuntime, LauncherError> {
    let mut zip = open_zip(archive)?;
    match platform {
        Platform::Modrinth => {
            let index = read_zip_json::<ModrinthIndex>(&mut zip, "modrinth.index.json")?;
            derive_modrinth_runtime(&index.dependencies)
        }
        Platform::Curseforge => {
            let manifest = read_zip_json::<CurseForgeManifest>(&mut zip, "manifest.json")?;
            derive_curseforge_runtime(&manifest.minecraft)
        }
    }
}

#[derive(Debug, Deserialize)]
struct ModrinthIndex {
    /// Modrinth packs declare the exact Minecraft and loader versions they
    /// were built for.  Keeping these values lets the native importer reject
    /// a pack before writing files into a mismatched instance.
    #[serde(default)]
    dependencies: HashMap<String, String>,
    #[serde(default)]
    files: Vec<ModrinthFile>,
    #[serde(default = "default_overrides")]
    overrides: String,
}

#[derive(Debug, Deserialize)]
struct ModrinthFile {
    path: String,
    downloads: Vec<String>,
    #[serde(default)]
    hashes: HashMap<String, String>,
    #[serde(default)]
    env: Option<ModrinthEnvironment>,
}

#[derive(Debug, Deserialize)]
struct ModrinthEnvironment {
    #[serde(default)]
    client: Option<String>,
}

fn default_overrides() -> String {
    "overrides".into()
}

#[derive(Debug, Deserialize)]
struct CurseForgeManifest {
    #[serde(default)]
    minecraft: CurseForgeMinecraft,
    #[serde(default)]
    files: Vec<CurseForgeManifestFile>,
    #[serde(default = "default_overrides")]
    overrides: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurseForgeMinecraft {
    #[serde(default)]
    version: String,
    #[serde(default)]
    mod_loaders: Vec<CurseForgeLoader>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurseForgeLoader {
    id: String,
    #[serde(default)]
    primary: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurseForgeManifestFile {
    project_id: u64,
    file_id: u64,
    #[serde(default = "default_required")]
    required: bool,
}

fn default_required() -> bool {
    true
}

fn derive_modrinth_runtime(
    dependencies: &HashMap<String, String>,
) -> Result<ModpackRuntime, LauncherError> {
    let game_version = dependencies
        .get("minecraft")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            LauncherError::InvalidData(
                "The Modrinth pack is missing its required Minecraft dependency.".into(),
            )
        })?
        .to_owned();
    let declared_loaders = [
        ("fabric-loader", InstanceLoader::Fabric),
        ("forge", InstanceLoader::Forge),
        ("neoforge", InstanceLoader::Neoforge),
        ("quilt-loader", InstanceLoader::Quilt),
    ]
    .into_iter()
    .filter_map(|(key, loader)| {
        dependencies
            .get(key)
            .map(|version| (key, loader, version.trim()))
    })
    .collect::<Vec<_>>();

    if declared_loaders.len() > 1 {
        return Err(LauncherError::InvalidData(
            "The Modrinth pack declares multiple incompatible mod loaders.".into(),
        ));
    }
    if let Some((key, loader, version)) = declared_loaders.first() {
        if version.is_empty() {
            return Err(LauncherError::InvalidData(format!(
                "The Modrinth pack declares {key} without an exact version."
            )));
        }
        return Ok(ModpackRuntime {
            game_version,
            loader: *loader,
            loader_version: Some((*version).to_owned()),
        });
    }

    Ok(ModpackRuntime {
        game_version,
        loader: InstanceLoader::Vanilla,
        loader_version: None,
    })
}

fn derive_curseforge_runtime(
    minecraft: &CurseForgeMinecraft,
) -> Result<ModpackRuntime, LauncherError> {
    let game_version = minecraft.version.trim();
    if game_version.is_empty() {
        return Err(LauncherError::InvalidData(
            "The CurseForge pack manifest does not declare a Minecraft version.".into(),
        ));
    }
    let Some(loader) = minecraft
        .mod_loaders
        .iter()
        .find(|loader| loader.primary)
        .or_else(|| minecraft.mod_loaders.first())
    else {
        return Ok(ModpackRuntime {
            game_version: game_version.to_owned(),
            loader: InstanceLoader::Vanilla,
            loader_version: None,
        });
    };
    let (loader_kind, loader_version) = parse_curseforge_loader_id(&loader.id)?;
    Ok(ModpackRuntime {
        game_version: game_version.to_owned(),
        loader: loader_kind,
        loader_version: Some(loader_version),
    })
}

fn parse_curseforge_loader_id(value: &str) -> Result<(InstanceLoader, String), LauncherError> {
    let value = value.trim();
    let lower = value.to_ascii_lowercase();
    let prefixes = [
        ("neoforge-", InstanceLoader::Neoforge),
        ("fabricloader-", InstanceLoader::Fabric),
        ("fabric-", InstanceLoader::Fabric),
        ("forge-", InstanceLoader::Forge),
        ("quiltloader-", InstanceLoader::Quilt),
        ("quilt-", InstanceLoader::Quilt),
    ];
    for (prefix, loader) in prefixes {
        if lower.starts_with(prefix) {
            let version = value[prefix.len()..].trim();
            if version.is_empty() {
                break;
            }
            return Ok((loader, version.to_owned()));
        }
    }
    Err(LauncherError::InvalidData(format!(
        "The CurseForge pack uses an unsupported or versionless loader id: {value}."
    )))
}

async fn import_modrinth_pack(
    state: &AppState,
    instance: &mut Instance,
    project_id: &str,
    archive: &[u8],
) -> Result<u32, LauncherError> {
    let mut zip = open_zip(archive)?;
    let index = read_zip_json::<ModrinthIndex>(&mut zip, "modrinth.index.json")?;
    validate_modrinth_dependencies(&index.dependencies, instance)?;
    let mut installed = 0;
    for file in index.files {
        if file.env.as_ref().and_then(|env| env.client.as_deref()) == Some("unsupported") {
            continue;
        }
        let url = file.downloads.first().ok_or_else(|| {
            LauncherError::InvalidData(format!(
                "Modrinth manifest entry has no download URL: {}",
                file.path
            ))
        })?;
        let bytes = download_pack_file(
            &state.http,
            url,
            file.hashes.get("sha1").map(String::as_str),
            None,
        )
        .await?;
        let relative = safe_relative_path(&file.path)?;
        write_instance_file(instance, &state.instances_dir(), &relative, &bytes)?;
        record_pack_mod(instance, "modrinth", project_id, &relative);
        installed += 1;
    }
    extract_overrides(
        &mut zip,
        &index.overrides,
        instance,
        &state.instances_dir(),
        "modrinth",
        project_id,
        &mut installed,
    )?;
    Ok(installed)
}

/// Verifies the pack's declared runtime against the instance selected by the
/// user.  The Modrinth format uses exact dependency keys (for example
/// `minecraft`, `fabric-loader`, and `neoforge`), so silently importing a
/// 1.20/Fabric pack into a 1.21/Forge profile would otherwise leave a profile
/// that cannot launch reliably.
fn validate_modrinth_dependencies(
    dependencies: &HashMap<String, String>,
    instance: &Instance,
) -> Result<(), LauncherError> {
    let runtime = derive_modrinth_runtime(dependencies)?;
    if runtime.game_version != instance.game_version {
        return Err(LauncherError::InvalidData(format!(
            "This Modrinth pack targets Minecraft {}, but the selected instance is {}.",
            runtime.game_version, instance.game_version
        )));
    }
    if runtime.loader != instance.loader {
        return Err(LauncherError::InvalidData(format!(
            "This Modrinth pack requires {:?}, but the selected instance uses {:?}.",
            runtime.loader, instance.loader
        )));
    }
    Ok(())
}

async fn import_curseforge_pack(
    state: &AppState,
    instance: &mut Instance,
    project_id: &str,
    api_key: &str,
    archive: &[u8],
) -> Result<u32, LauncherError> {
    let mut zip = open_zip(archive)?;
    let manifest = read_zip_json::<CurseForgeManifest>(&mut zip, "manifest.json")?;
    let runtime = derive_curseforge_runtime(&manifest.minecraft)?;
    if runtime.game_version != instance.game_version {
        return Err(LauncherError::InvalidData(format!(
            "This modpack targets Minecraft {}, but the selected instance is {}.",
            runtime.game_version, instance.game_version
        )));
    }
    if runtime.loader != instance.loader {
        return Err(LauncherError::InvalidData(format!(
            "This modpack requires {:?}, but the selected instance uses {:?}.",
            runtime.loader, instance.loader
        )));
    }
    let mut installed = 0;
    for file in manifest.files.into_iter().filter(|file| file.required) {
        let project = file.project_id.to_string();
        let file_info = curseforge::file_download_info(
            state_http(state),
            api_key,
            &project,
            &file.file_id.to_string(),
        )
        .await?;
        let url = file_info.download_url.ok_or_else(|| {
            LauncherError::Platform(format!(
                "CurseForge file {} has no public download URL.",
                file.file_id
            ))
        })?;
        let bytes = download_pack_file(
            &state.http,
            &url,
            file_info.sha1.as_deref(),
            Some(file_info.file_size),
        )
        .await?;
        let relative = PathBuf::from("mods").join(safe_file_name(&file_info.file_name)?);
        write_instance_file(instance, &state.instances_dir(), &relative, &bytes)?;
        record_pack_mod(instance, "curseforge", &project, &relative);
        installed += 1;
    }
    extract_overrides(
        &mut zip,
        &manifest.overrides,
        instance,
        &state.instances_dir(),
        "curseforge",
        project_id,
        &mut installed,
    )?;
    Ok(installed)
}

fn state_http(state: &AppState) -> &reqwest::Client {
    &state.http
}

fn open_zip(archive: &[u8]) -> Result<zip::ZipArchive<Cursor<&[u8]>>, LauncherError> {
    zip::ZipArchive::new(Cursor::new(archive))
        .map_err(|error| LauncherError::InvalidData(format!("Invalid modpack archive: {error}")))
}

fn read_zip_json<T: for<'de> Deserialize<'de>>(
    zip: &mut zip::ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<T, LauncherError> {
    let mut entry = zip
        .by_name(name)
        .map_err(|_| LauncherError::InvalidData(format!("Modpack is missing {name}.")))?;
    if entry.size() > MAX_ENTRY_BYTES {
        return Err(LauncherError::InvalidData(format!(
            "Manifest {name} is too large."
        )));
    }
    let mut bytes = Vec::new();
    entry
        .read_to_end(&mut bytes)
        .map_err(|error| LauncherError::InvalidData(format!("Could not read {name}: {error}")))?;
    serde_json::from_slice(&bytes).map_err(LauncherError::from)
}

async fn download_pack_file(
    http: &reqwest::Client,
    url: &str,
    expected_sha1: Option<&str>,
    expected_size: Option<u64>,
) -> Result<Vec<u8>, LauncherError> {
    if expected_size.is_some_and(|size| size > MAX_ENTRY_BYTES) {
        return Err(LauncherError::InvalidData(
            "A modpack file exceeds the 128 MB safety limit.".into(),
        ));
    }
    let bytes = download_limited(http, url, MAX_ENTRY_BYTES).await?;
    if let Some(expected) = expected_sha1 {
        let actual = sha1_smol::Sha1::from(&bytes).digest().to_string();
        if !actual.eq_ignore_ascii_case(expected) {
            return Err(LauncherError::InvalidData(
                "A modpack dependency failed its SHA-1 integrity check.".into(),
            ));
        }
    }
    Ok(bytes)
}

/// Downloads an archive or dependency without allowing an untrusted manifest
/// to address a local service or consume unbounded memory. Modrinth and
/// CurseForge both publish HTTPS URLs, so plaintext HTTP is intentionally not
/// accepted for files written into a Minecraft profile.
async fn download_limited(
    http: &reqwest::Client,
    raw_url: &str,
    max_bytes: u64,
) -> Result<Vec<u8>, LauncherError> {
    let url = validate_download_url(raw_url)?;
    let mut response = http.get(url).send().await?.error_for_status()?;
    if response
        .content_length()
        .is_some_and(|length| length > max_bytes)
    {
        return Err(LauncherError::InvalidData(format!(
            "The download exceeds the {} MB safety limit.",
            max_bytes / (1024 * 1024)
        )));
    }

    let capacity = response.content_length().unwrap_or_default().min(max_bytes) as usize;
    let mut bytes = Vec::with_capacity(capacity);
    while let Some(chunk) = response.chunk().await? {
        if bytes.len() as u64 + chunk.len() as u64 > max_bytes {
            return Err(LauncherError::InvalidData(format!(
                "The download exceeds the {} MB safety limit.",
                max_bytes / (1024 * 1024)
            )));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

fn validate_download_url(raw_url: &str) -> Result<Url, LauncherError> {
    let url = Url::parse(raw_url).map_err(|error| {
        LauncherError::InvalidData(format!(
            "The platform returned an invalid download URL: {error}"
        ))
    })?;
    if url.scheme() != "https" {
        return Err(LauncherError::InvalidData(
            "The platform returned a non-HTTPS download URL.".into(),
        ));
    }
    let host = url.host_str().ok_or_else(|| {
        LauncherError::InvalidData("The platform returned a download URL without a host.".into())
    })?;
    let normalized_host = host.trim_end_matches('.').to_ascii_lowercase();
    let local_hostname = normalized_host == "localhost"
        || normalized_host.ends_with(".localhost")
        || normalized_host.ends_with(".local");
    let local_ip = host
        .parse::<IpAddr>()
        .map(|ip| match ip {
            IpAddr::V4(ip) => {
                ip.is_loopback()
                    || ip.is_private()
                    || ip.is_link_local()
                    || ip.is_unspecified()
                    || ip.is_broadcast()
            }
            IpAddr::V6(ip) => {
                ip.is_loopback()
                    || ip.is_unique_local()
                    || ip.is_unicast_link_local()
                    || ip.is_unspecified()
            }
        })
        .unwrap_or(false);
    if local_hostname || local_ip {
        return Err(LauncherError::InvalidData(
            "The platform returned a local or private download host.".into(),
        ));
    }
    Ok(url)
}

fn extract_overrides(
    zip: &mut zip::ZipArchive<Cursor<&[u8]>>,
    override_dir: &str,
    instance: &mut Instance,
    instances_root: &Path,
    platform: &str,
    project_id: &str,
    installed: &mut u32,
) -> Result<(), LauncherError> {
    let prefix = format!("{}/", override_dir.trim_matches('/'));
    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(|error| {
            LauncherError::InvalidData(format!("Could not read modpack entry: {error}"))
        })?;
        let name = entry.name().to_owned();
        if !name.starts_with(&prefix) || name.ends_with('/') || entry.size() > MAX_ENTRY_BYTES {
            continue;
        }
        let relative = safe_relative_path(name.trim_start_matches(&prefix))?;
        if relative == Path::new("instance.json") {
            continue;
        }
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|error| {
            LauncherError::InvalidData(format!("Could not extract modpack entry: {error}"))
        })?;
        write_instance_file(instance, instances_root, &relative, &bytes)?;
        record_pack_mod(instance, platform, project_id, &relative);
        *installed += 1;
    }
    Ok(())
}

fn write_instance_file(
    instance: &Instance,
    instances_root: &Path,
    relative: &Path,
    bytes: &[u8],
) -> Result<(), LauncherError> {
    let path = instance.dir(instances_root).join(relative);
    if path.file_name().and_then(|name| name.to_str()) == Some("instance.json") {
        return Err(LauncherError::InvalidData(
            "A modpack cannot overwrite instance.json.".into(),
        ));
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, bytes)?;
    Ok(())
}

fn record_pack_mod(instance: &mut Instance, platform: &str, project_id: &str, relative: &Path) {
    if relative
        .extension()
        .and_then(|extension| extension.to_str())
        != Some("jar")
    {
        return;
    }
    let Some(file_name) = relative.file_name().and_then(|name| name.to_str()) else {
        return;
    };
    if instance
        .mods
        .iter()
        .any(|entry| entry.file_name == file_name)
    {
        return;
    }
    instance.mods.push(InstalledMod {
        platform: if platform == "curseforge" {
            Platform::Curseforge
        } else {
            Platform::Modrinth
        },
        project_id: project_id.to_owned(),
        version_id: "manifest".into(),
        name: file_name.trim_end_matches(".jar").to_owned(),
        file_name: file_name.to_owned(),
        enabled: true,
    });
}

fn safe_relative_path(value: &str) -> Result<PathBuf, LauncherError> {
    if value.is_empty()
        || value.contains('\0')
        || value.contains('\\')
        || Path::new(value).is_absolute()
    {
        return Err(LauncherError::InvalidData(
            "The modpack contains an unsafe file path.".into(),
        ));
    }
    let mut path = PathBuf::new();
    for component in Path::new(value).components() {
        match component {
            Component::Normal(part) => path.push(part),
            Component::CurDir => {}
            _ => {
                return Err(LauncherError::InvalidData(
                    "The modpack contains a path traversal entry.".into(),
                ))
            }
        }
    }
    if path.as_os_str().is_empty() {
        return Err(LauncherError::InvalidData(
            "The modpack contains an empty file path.".into(),
        ));
    }
    Ok(path)
}

fn safe_file_name(value: &str) -> Result<PathBuf, LauncherError> {
    let path = safe_relative_path(value)?;
    if path.components().count() != 1 {
        return Err(LauncherError::InvalidData(
            "The modpack returned an invalid dependency file name.".into(),
        ));
    }
    Ok(path)
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
    use super::{
        derive_curseforge_runtime, derive_modrinth_runtime, safe_relative_path,
        scan_instance_content, validate_game_version, validate_instance_name,
        validate_loader_version, validate_mod_file_name, validate_modrinth_dependencies,
        validate_shader_file_name, CurseForgeLoader, CurseForgeMinecraft, InstanceContentKind,
    };
    use crate::instance::{Instance, InstanceLoader};
    use chrono::Utc;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn test_instance(loader: InstanceLoader) -> Instance {
        Instance {
            id: Uuid::new_v4(),
            name: "test".into(),
            game_version: "1.21.1".into(),
            loader,
            loader_version: None,
            memory_mb: 4096,
            java_path: None,
            extra_java_args: Vec::new(),
            mods: Vec::new(),
            created_at: Utc::now(),
            last_played_at: None,
        }
    }

    #[test]
    fn accepts_single_component_jar_names() {
        assert!(validate_mod_file_name("sodium-fabric-0.6.0.jar").is_ok());
        assert!(validate_mod_file_name("Example.JAR").is_ok());
    }

    #[test]
    fn scans_real_mod_and_shader_files_without_exposing_disabled_suffixes() {
        let root = std::env::temp_dir().join(format!("void-content-scan-{}", Uuid::new_v4()));
        let instance = test_instance(InstanceLoader::Fabric);
        let instance_dir = instance.dir(&root);
        std::fs::create_dir_all(instance_dir.join("mods")).expect("create mods directory");
        std::fs::create_dir_all(instance_dir.join("shaderpacks"))
            .expect("create shaderpacks directory");
        std::fs::write(instance_dir.join("mods/sodium.jar"), b"jar").expect("write enabled mod");
        std::fs::write(instance_dir.join("mods/lithium.jar.disabled"), b"jar")
            .expect("write disabled mod");
        std::fs::write(instance_dir.join("shaderpacks/Complementary.zip"), b"zip")
            .expect("write shader archive");
        std::fs::write(instance_dir.join("mods/ignore.txt"), b"text").expect("write ignored file");

        let content = scan_instance_content(&instance, &root).expect("scan content");
        assert_eq!(content.len(), 3);
        let disabled = content
            .iter()
            .find(|entry| entry.name == "lithium")
            .expect("disabled mod entry");
        assert_eq!(disabled.kind, InstanceContentKind::Mod);
        assert_eq!(disabled.file_name, "lithium.jar");
        assert!(!disabled.enabled);
        assert!(content.iter().any(|entry| {
            entry.kind == InstanceContentKind::Shader && entry.name == "Complementary"
        }));

        std::fs::remove_dir_all(&root).expect("remove test directory");
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

    #[test]
    fn runtime_identifiers_cannot_escape_native_paths() {
        assert!(validate_game_version("1.21.1").is_ok());
        assert!(validate_game_version("24w14a").is_ok());
        assert!(validate_game_version("../outside").is_err());
        assert!(validate_game_version("1.21\\mods").is_err());
        assert!(validate_game_version("..").is_err());
        assert!(validate_game_version("1..21").is_err());
        assert!(validate_loader_version("0.16.10").is_ok());
        assert!(validate_loader_version("../../loader").is_err());
        assert!(validate_loader_version("..").is_err());
        assert!(validate_loader_version("0..16").is_err());
        assert!(validate_instance_name("Competitive Fabric").is_ok());
        assert!(validate_instance_name("ab").is_err());
    }

    #[test]
    fn modpack_paths_stay_inside_the_instance() {
        assert_eq!(
            safe_relative_path("config/sodium-options.json").expect("normal manifest path"),
            PathBuf::from("config").join("sodium-options.json")
        );
        for path in [
            "../instance.json",
            "/absolute/mod.jar",
            "mods\\evil.jar",
            "",
        ] {
            assert!(
                safe_relative_path(path).is_err(),
                "{path} should be rejected"
            );
        }
    }

    #[test]
    fn modrinth_dependencies_must_match_instance_runtime() {
        let mut dependencies = HashMap::from([
            ("minecraft".to_string(), "1.21.1".to_string()),
            ("fabric-loader".to_string(), "0.16.9".to_string()),
        ]);
        assert!(validate_modrinth_dependencies(
            &dependencies,
            &test_instance(InstanceLoader::Fabric)
        )
        .is_ok());

        dependencies.insert("minecraft".into(), "1.20.1".into());
        assert!(validate_modrinth_dependencies(
            &dependencies,
            &test_instance(InstanceLoader::Fabric)
        )
        .is_err());
        dependencies.insert("minecraft".into(), "1.21.1".into());
        assert!(validate_modrinth_dependencies(
            &dependencies,
            &test_instance(InstanceLoader::Forge)
        )
        .is_err());
    }

    #[test]
    fn derives_exact_modrinth_runtime_from_manifest_dependencies() {
        let dependencies = HashMap::from([
            ("minecraft".to_string(), "1.21.1".to_string()),
            ("fabric-loader".to_string(), "0.16.10".to_string()),
        ]);
        let runtime = derive_modrinth_runtime(&dependencies).expect("valid Modrinth runtime");
        assert_eq!(runtime.game_version, "1.21.1");
        assert_eq!(runtime.loader, InstanceLoader::Fabric);
        assert_eq!(runtime.loader_version.as_deref(), Some("0.16.10"));

        let ambiguous = HashMap::from([
            ("minecraft".to_string(), "1.21.1".to_string()),
            ("fabric-loader".to_string(), "0.16.10".to_string()),
            ("neoforge".to_string(), "21.1.90".to_string()),
        ]);
        assert!(derive_modrinth_runtime(&ambiguous).is_err());
    }

    #[test]
    fn derives_primary_curseforge_loader_without_confusing_neoforge_with_forge() {
        let minecraft = CurseForgeMinecraft {
            version: "1.21.1".into(),
            mod_loaders: vec![
                CurseForgeLoader {
                    id: "forge-52.0.1".into(),
                    primary: false,
                },
                CurseForgeLoader {
                    id: "neoforge-21.1.90".into(),
                    primary: true,
                },
            ],
        };
        let runtime = derive_curseforge_runtime(&minecraft).expect("valid CurseForge runtime");
        assert_eq!(runtime.game_version, "1.21.1");
        assert_eq!(runtime.loader, InstanceLoader::Neoforge);
        assert_eq!(runtime.loader_version.as_deref(), Some("21.1.90"));
    }
}
