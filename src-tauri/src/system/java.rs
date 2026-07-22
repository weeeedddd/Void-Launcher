//! Automatic Java runtime management.
//!
//! The launcher never relies on a system-wide Java. Instead it keeps
//! isolated Eclipse Temurin JREs under `<data_dir>/java/<major>/` and
//! resolves them fully automatically:
//!
//! ```text
//! required_java_major("1.21.1")  ─►  21
//!            │
//!            ▼   missing?
//! Adoptium API: latest Temurin JRE for {os, arch}
//!            │  stream download (progress events) + SHA-256 verify
//!            ▼
//! extract zip/tar.gz  ─►  <data>/java/21/…/bin/java[.exe]
//! ```
//!
//! Download source is the Adoptium project (Temurin builds):
//!   https://api.adoptium.net/v3/assets/latest/{major}/hotspot
//! — no API key required.

use std::path::{Component, Path, PathBuf};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use crate::error::LauncherError;

const MAX_JAVA_ARCHIVE_BYTES: u64 = 512 * 1024 * 1024;
const MAX_JAVA_ENTRY_BYTES: u64 = 256 * 1024 * 1024;
const MAX_JAVA_ARCHIVE_ENTRIES: usize = 20_000;

/// Which Java feature release a Minecraft version needs.
///
/// | Minecraft            | Java |
/// |----------------------|------|
/// | 26.1 and newer       | 25   |
/// | 1.20.5 – 1.21.x      | 21   |
/// | 1.17 – 1.20.4        | 17   |
/// | 1.16.5 and older     | 8    |
pub fn required_java_major(game_version: &str) -> u32 {
    let mut parts = game_version
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0));
    let major = parts.next().unwrap_or(1);
    let minor = parts.next().unwrap_or(0);
    let patch = parts.next().unwrap_or(0);

    // Mojang switched stable release numbering from 1.21.x to year-based
    // 26.x in 2026. Those releases require Java 25.
    if major >= 26 {
        return 25;
    }

    if minor == 0 {
        // Unrecognized format (snapshot, April fools, …) → assume modern.
        return 21;
    }
    match () {
        _ if minor >= 21 => 21,
        _ if minor == 20 && patch >= 5 => 21,
        _ if minor >= 17 => 17, // 1.17 needs 16+, 17 is compatible & LTS
        _ => 8,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JavaPhase {
    Download,
    Verify,
    Extract,
    Done,
}

/// Payload of the "java-download-progress" event the frontend listens to.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaProgress {
    pub phase: JavaPhase,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

/// A resolved, launcher-managed runtime.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaRuntime {
    pub major: u32,
    /// Full path to the preferred Java executable. On Windows this resolves
    /// to `javaw.exe` whenever the runtime provides it.
    pub java_executable: PathBuf,
    /// e.g. "jdk-21.0.5+11" — from Adoptium's release metadata.
    pub release_name: String,
    pub freshly_installed: bool,
}

fn java_binary_names() -> &'static [&'static str] {
    #[cfg(target_os = "windows")]
    {
        // javaw.exe starts a GUI process without leaving a console window
        // behind the launcher. java.exe remains a compatibility fallback for
        // unusual JRE archives.
        &["javaw.exe", "java.exe"]
    }
    #[cfg(not(target_os = "windows"))]
    {
        &["java"]
    }
}

/// Finds `bin/java` inside `<java_root>/<major>/`, accounting for the
/// archive's top-level folder and macOS' `Contents/Home` layout.
pub fn find_managed(java_root: &Path, major: u32) -> Option<PathBuf> {
    locate_java_binary(&java_root.join(major.to_string()))
}

fn locate_java_binary(dir: &Path) -> Option<PathBuf> {
    for binary_name in java_binary_names() {
        let direct = dir.join("bin").join(binary_name);
        if direct.is_file() {
            return Some(direct);
        }
    }
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let sub = entry.path();
        if !sub.is_dir() {
            continue;
        }
        for binary_name in java_binary_names() {
            for candidate in [
                sub.join("bin").join(binary_name),
                sub.join("Contents/Home/bin").join(binary_name),
            ] {
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

/// The release name we stored next to an installed runtime.
pub fn read_release_marker(java_root: &Path, major: u32) -> Option<String> {
    std::fs::read_to_string(java_root.join(major.to_string()).join(".release"))
        .ok()
        .map(|s| s.trim().to_string())
}

// ── Adoptium API wire types (subset) ────────────────────────────────────

#[derive(serde::Deserialize)]
struct AdoptiumAsset {
    binary: AdoptiumBinary,
    release_name: String,
}

#[derive(serde::Deserialize)]
struct AdoptiumBinary {
    package: AdoptiumPackage,
}

#[derive(serde::Deserialize)]
struct AdoptiumPackage {
    link: String,
    /// SHA-256 of the archive, hex-encoded.
    checksum: String,
    /// Archive file name (".zip" on Windows, ".tar.gz" elsewhere).
    name: String,
    size: u64,
}

fn validate_package_name(name: &str) -> Result<(), LauncherError> {
    let path = Path::new(name);
    let supported_extension = name.ends_with(".zip") || name.ends_with(".tar.gz");
    let one_component = path.components().count() == 1 && path.file_name().is_some();
    if !one_component
        || !supported_extension
        || name
            .chars()
            .any(|character| matches!(character, '/' | '\\' | ':' | '\0') || character.is_control())
    {
        return Err(LauncherError::InvalidData(
            "Adoptium returned an unsafe Java archive name.".into(),
        ));
    }
    Ok(())
}

fn adoptium_os() -> &'static str {
    if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "mac"
    } else {
        "linux"
    }
}

fn adoptium_arch() -> &'static str {
    if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x64"
    }
}

/// Returns a ready-to-use Java runtime for `major`, downloading and
/// installing it into `<java_root>/<major>/` if it isn't there yet.
///
/// `on_progress` is called throughout (throttled to ~1 event per MB) so the
/// UI can render a live progress bar; the command layer forwards it as a
/// Tauri event.
pub async fn ensure_java<F: Fn(JavaProgress)>(
    http: &reqwest::Client,
    java_root: &Path,
    major: u32,
    on_progress: F,
) -> Result<JavaRuntime, LauncherError> {
    // Fast path: we already manage a matching runtime.
    if let Some(java_executable) = find_managed(java_root, major) {
        return Ok(JavaRuntime {
            major,
            java_executable,
            release_name: read_release_marker(java_root, major)
                .unwrap_or_else(|| format!("Temurin {major}")),
            freshly_installed: false,
        });
    }

    // 1) Resolve the newest Temurin JRE build for this platform.
    let url = format!(
        "https://api.adoptium.net/v3/assets/latest/{major}/hotspot\
         ?os={}&architecture={}&image_type=jre&vendor=eclipse",
        adoptium_os(),
        adoptium_arch()
    );
    let assets: Vec<AdoptiumAsset> = http
        .get(&url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let asset = assets.into_iter().next().ok_or_else(|| {
        LauncherError::NotFound(format!(
            "Adoptium offers no Java {major} JRE for {}/{}",
            adoptium_os(),
            adoptium_arch()
        ))
    })?;
    validate_package_name(&asset.binary.package.name)?;
    if asset.binary.package.size == 0 || asset.binary.package.size > MAX_JAVA_ARCHIVE_BYTES {
        return Err(LauncherError::InvalidData(
            "The Java runtime archive has an invalid or unsupported size.".into(),
        ));
    }

    // 2) Stream the archive to disk, hashing on the fly.
    std::fs::create_dir_all(java_root)?;
    let archive_path = java_root.join(&asset.binary.package.name);
    let mut response = http
        .get(&asset.binary.package.link)
        .send()
        .await?
        .error_for_status()?;
    let total_bytes = response
        .content_length()
        .unwrap_or(asset.binary.package.size);
    if total_bytes > MAX_JAVA_ARCHIVE_BYTES {
        return Err(LauncherError::InvalidData(
            "The Java runtime download exceeds the 512 MB safety limit.".into(),
        ));
    }

    let mut file = tokio::fs::File::create(&archive_path).await?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_emit: u64 = 0;
    while let Some(chunk) = response.chunk().await? {
        hasher.update(&chunk);
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        if downloaded > asset.binary.package.size || downloaded > MAX_JAVA_ARCHIVE_BYTES {
            drop(file);
            let _ = std::fs::remove_file(&archive_path);
            return Err(LauncherError::InvalidData(
                "The Java runtime download exceeded its declared size.".into(),
            ));
        }
        if downloaded - last_emit >= 1_000_000 || downloaded == total_bytes {
            last_emit = downloaded;
            on_progress(JavaProgress {
                phase: JavaPhase::Download,
                downloaded_bytes: downloaded,
                total_bytes,
            });
        }
    }
    file.flush().await?;
    drop(file);
    if downloaded != asset.binary.package.size {
        let _ = std::fs::remove_file(&archive_path);
        return Err(LauncherError::InvalidData(
            "The Java runtime download was incomplete.".into(),
        ));
    }

    // 3) Verify against the checksum Adoptium publishes.
    on_progress(JavaProgress {
        phase: JavaPhase::Verify,
        downloaded_bytes: downloaded,
        total_bytes,
    });
    let actual: String = hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    if !actual.eq_ignore_ascii_case(&asset.binary.package.checksum) {
        let _ = std::fs::remove_file(&archive_path);
        return Err(LauncherError::InvalidData(format!(
            "Java download corrupted: SHA-256 mismatch for {}",
            asset.binary.package.name
        )));
    }

    // 4) Extract on a worker thread (zip/tar are blocking APIs).
    on_progress(JavaProgress {
        phase: JavaPhase::Extract,
        downloaded_bytes: downloaded,
        total_bytes,
    });
    let install_dir = java_root.join(major.to_string());
    let staging_dir = java_root.join(format!(".{major}.extracting"));
    if staging_dir.exists() {
        std::fs::remove_dir_all(&staging_dir)?;
    }
    let extraction_result = {
        let archive = archive_path.clone();
        let destination = staging_dir.clone();
        tokio::task::spawn_blocking(move || extract_archive(&archive, &destination))
            .await
            .map_err(|error| {
                LauncherError::Internal(format!("Java extraction task failed: {error}"))
            })?
    };
    let _ = std::fs::remove_file(&archive_path);
    if let Err(error) = extraction_result {
        let _ = std::fs::remove_dir_all(&staging_dir);
        return Err(error);
    }
    if install_dir.exists() {
        std::fs::remove_dir_all(&install_dir)?;
    }
    std::fs::rename(&staging_dir, &install_dir)?;
    std::fs::write(install_dir.join(".release"), &asset.release_name)?;

    let java_executable = locate_java_binary(&install_dir).ok_or_else(|| {
        LauncherError::InvalidData("Extracted Java archive contains no bin/java executable".into())
    })?;

    on_progress(JavaProgress {
        phase: JavaPhase::Done,
        downloaded_bytes: downloaded,
        total_bytes,
    });
    Ok(JavaRuntime {
        major,
        java_executable,
        release_name: asset.release_name,
        freshly_installed: true,
    })
}

/// Unpacks a Temurin archive (.zip on Windows, .tar.gz elsewhere).
fn extract_archive(archive: &Path, dest: &Path) -> Result<(), LauncherError> {
    std::fs::create_dir_all(dest)?;
    let file = std::fs::File::open(archive)?;
    let name = archive
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default();

    if name.ends_with(".zip") {
        extract_zip(file, dest, name)?;
    } else if name.ends_with(".tar.gz") {
        extract_tar_gz(file, dest, name)?;
    } else {
        return Err(LauncherError::InvalidData(
            "The Java archive format is not supported.".into(),
        ));
    }
    Ok(())
}

fn extract_zip(
    file: std::fs::File,
    destination: &Path,
    archive_name: &str,
) -> Result<(), LauncherError> {
    let mut archive = zip::ZipArchive::new(file).map_err(|error| {
        LauncherError::InvalidData(format!("Could not open {archive_name}: {error}"))
    })?;
    if archive.len() > MAX_JAVA_ARCHIVE_ENTRIES {
        return Err(LauncherError::InvalidData(
            "The Java archive contains too many entries.".into(),
        ));
    }

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| {
            LauncherError::InvalidData(format!(
                "Could not read Java archive entry {index}: {error}"
            ))
        })?;
        if entry.size() > MAX_JAVA_ENTRY_BYTES {
            return Err(LauncherError::InvalidData(
                "A Java archive entry exceeds the 256 MB safety limit.".into(),
            ));
        }
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err(LauncherError::InvalidData(
                "Java archives may not contain symbolic links.".into(),
            ));
        }

        let relative = safe_archive_relative(Path::new(entry.name()))?;
        let output_path = destination.join(relative);
        if entry.is_dir() {
            std::fs::create_dir_all(&output_path)?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut output = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&output_path)?;
        let copied = std::io::copy(
            &mut std::io::Read::take(&mut entry, MAX_JAVA_ENTRY_BYTES + 1),
            &mut output,
        )?;
        if copied > MAX_JAVA_ENTRY_BYTES {
            return Err(LauncherError::InvalidData(
                "A Java archive entry exceeded the 256 MB safety limit while extracting.".into(),
            ));
        }
    }
    Ok(())
}

fn extract_tar_gz(
    file: std::fs::File,
    destination: &Path,
    archive_name: &str,
) -> Result<(), LauncherError> {
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    let entries = archive.entries().map_err(|error| {
        LauncherError::InvalidData(format!("Could not open {archive_name}: {error}"))
    })?;

    for (index, entry) in entries.enumerate() {
        if index >= MAX_JAVA_ARCHIVE_ENTRIES {
            return Err(LauncherError::InvalidData(
                "The Java archive contains too many entries.".into(),
            ));
        }
        let mut entry = entry.map_err(|error| {
            LauncherError::InvalidData(format!(
                "Could not read Java archive entry {index}: {error}"
            ))
        })?;
        if entry.size() > MAX_JAVA_ENTRY_BYTES {
            return Err(LauncherError::InvalidData(
                "A Java archive entry exceeds the 256 MB safety limit.".into(),
            ));
        }
        let entry_type = entry.header().entry_type();
        let supported = entry_type.is_file()
            || entry_type.is_dir()
            || entry_type.is_symlink()
            || entry_type.is_hard_link()
            || entry_type.is_pax_global_extensions()
            || entry_type.is_pax_local_extensions()
            || entry_type.is_gnu_longname()
            || entry_type.is_gnu_longlink();
        if !supported {
            return Err(LauncherError::InvalidData(
                "The Java archive contains an unsupported special entry.".into(),
            ));
        }
        let relative = safe_archive_relative(&entry.path().map_err(|error| {
            LauncherError::InvalidData(format!("Invalid Java archive path: {error}"))
        })?)?;
        if entry_type.is_symlink() || entry_type.is_hard_link() {
            let target = entry.link_name().map_err(|error| {
                LauncherError::InvalidData(format!("Invalid Java archive link target: {error}"))
            })?;
            let target = target.ok_or_else(|| {
                LauncherError::InvalidData(
                    "The Java archive contains a link without a target.".into(),
                )
            })?;
            validate_archive_link(&relative, &target, entry_type.is_hard_link())?;
        }
        let unpacked = entry.unpack_in(destination).map_err(|error| {
            LauncherError::InvalidData(format!("Could not extract {archive_name}: {error}"))
        })?;
        if !unpacked {
            return Err(LauncherError::InvalidData(
                "The Java archive attempted to write outside its staging directory.".into(),
            ));
        }
    }
    Ok(())
}

fn safe_archive_relative(value: &Path) -> Result<PathBuf, LauncherError> {
    if value.as_os_str().is_empty() || value.is_absolute() {
        return Err(LauncherError::InvalidData(
            "The Java archive contains an unsafe path.".into(),
        ));
    }
    let mut relative = PathBuf::new();
    for component in value.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(segment)
                if !segment
                    .to_string_lossy()
                    .chars()
                    .any(|character| character == '\0' || character.is_control()) =>
            {
                relative.push(segment)
            }
            _ => {
                return Err(LauncherError::InvalidData(
                    "The Java archive contains a path traversal entry.".into(),
                ))
            }
        }
    }
    if relative.as_os_str().is_empty() {
        return Err(LauncherError::InvalidData(
            "The Java archive contains an empty path.".into(),
        ));
    }
    Ok(relative)
}

/// Validates tar link targets without requiring the target to exist yet.
/// Symlink targets are relative to the link's parent, while tar hard-link
/// targets are relative to the archive root. Parent components are permitted
/// only while they remain inside that logical root (Temurin commonly uses
/// links such as `lib/src.zip -> ../../src.zip`).
fn validate_archive_link(
    entry_path: &Path,
    link_target: &Path,
    hard_link: bool,
) -> Result<(), LauncherError> {
    if link_target.as_os_str().is_empty() || link_target.is_absolute() {
        return Err(LauncherError::InvalidData(
            "The Java archive contains an unsafe link target.".into(),
        ));
    }

    let mut resolved = if hard_link {
        PathBuf::new()
    } else {
        entry_path
            .parent()
            .unwrap_or_else(|| Path::new(""))
            .to_path_buf()
    };
    for component in link_target.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(segment)
                if !segment
                    .to_string_lossy()
                    .chars()
                    .any(|character| character == '\0' || character.is_control()) =>
            {
                resolved.push(segment);
            }
            Component::ParentDir if resolved.pop() => {}
            _ => {
                return Err(LauncherError::InvalidData(
                    "The Java archive contains a link target outside its staging directory.".into(),
                ));
            }
        }
    }
    if resolved.as_os_str().is_empty() {
        return Err(LauncherError::InvalidData(
            "The Java archive contains an empty link destination.".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        required_java_major, safe_archive_relative, validate_archive_link, validate_package_name,
    };
    use std::path::{Path, PathBuf};

    #[test]
    fn maps_minecraft_release_numbering_to_the_required_java_runtime() {
        assert_eq!(required_java_major("26.2"), 25);
        assert_eq!(required_java_major("26.1.2"), 25);
        assert_eq!(required_java_major("1.21.11"), 21);
        assert_eq!(required_java_major("1.20.6"), 21);
        assert_eq!(required_java_major("1.20.4"), 17);
        assert_eq!(required_java_major("1.16.5"), 8);
    }

    #[test]
    fn java_archive_paths_stay_inside_the_staging_directory() {
        assert_eq!(
            safe_archive_relative(Path::new("jdk-21/bin/java")).unwrap(),
            PathBuf::from("jdk-21").join("bin").join("java")
        );
        for unsafe_path in ["", "../outside", "jdk/../../outside", "/absolute/java"] {
            assert!(safe_archive_relative(Path::new(unsafe_path)).is_err());
        }
    }

    #[test]
    fn java_archive_links_may_navigate_only_inside_the_staging_root() {
        assert!(validate_archive_link(
            Path::new("jdk-21/lib/src.zip"),
            Path::new("../../src.zip"),
            false,
        )
        .is_ok());
        assert!(validate_archive_link(
            Path::new("jdk-21/bin/java"),
            Path::new("../../../outside"),
            false,
        )
        .is_err());
        assert!(validate_archive_link(
            Path::new("jdk-21/bin/java"),
            Path::new("../lib/java"),
            true,
        )
        .is_err());
        assert!(validate_archive_link(
            Path::new("jdk-21/bin/java"),
            Path::new("jdk-21/lib/java"),
            true,
        )
        .is_ok());
    }

    #[test]
    fn adoptium_archive_names_are_single_supported_files() {
        assert!(validate_package_name("OpenJDK21U-jre_x64_windows_hotspot.zip").is_ok());
        assert!(validate_package_name("OpenJDK21U-jre_x64_linux_hotspot.tar.gz").is_ok());
        assert!(validate_package_name("../runtime.zip").is_err());
        assert!(validate_package_name("runtime.exe").is_err());
    }
}
