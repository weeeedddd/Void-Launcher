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

use std::path::{Path, PathBuf};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use crate::error::LauncherError;

/// Which Java feature release a Minecraft version needs.
///
/// | Minecraft            | Java |
/// |----------------------|------|
/// | 1.20.5 and newer     | 21   |
/// | 1.17 – 1.20.4        | 17   |
/// | 1.16.5 and older     | 8    |
pub fn required_java_major(game_version: &str) -> u32 {
    let mut parts = game_version.split('.').map(|part| part.parse::<u32>().unwrap_or(0));
    let _major = parts.next().unwrap_or(1); // the leading "1"
    let minor = parts.next().unwrap_or(0);
    let patch = parts.next().unwrap_or(0);

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
    /// Full path to `bin/java` (use `javaw.exe` next to it on Windows to
    /// launch without a console window).
    pub java_executable: PathBuf,
    /// e.g. "jdk-21.0.5+11" — from Adoptium's release metadata.
    pub release_name: String,
    pub freshly_installed: bool,
}

fn java_binary_name() -> &'static str {
    if cfg!(windows) { "java.exe" } else { "java" }
}

/// Finds `bin/java` inside `<java_root>/<major>/`, accounting for the
/// archive's top-level folder and macOS' `Contents/Home` layout.
pub fn find_managed(java_root: &Path, major: u32) -> Option<PathBuf> {
    locate_java_binary(&java_root.join(major.to_string()))
}

fn locate_java_binary(dir: &Path) -> Option<PathBuf> {
    let direct = dir.join("bin").join(java_binary_name());
    if direct.is_file() {
        return Some(direct);
    }
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let sub = entry.path();
        if !sub.is_dir() {
            continue;
        }
        for candidate in [
            sub.join("bin").join(java_binary_name()),
            sub.join("Contents/Home/bin").join(java_binary_name()),
        ] {
            if candidate.is_file() {
                return Some(candidate);
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
    if cfg!(target_arch = "aarch64") { "aarch64" } else { "x64" }
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
    let assets: Vec<AdoptiumAsset> =
        http.get(&url).send().await?.error_for_status()?.json().await?;
    let asset = assets.into_iter().next().ok_or_else(|| {
        LauncherError::NotFound(format!(
            "Adoptium offers no Java {major} JRE for {}/{}",
            adoptium_os(),
            adoptium_arch()
        ))
    })?;

    // 2) Stream the archive to disk, hashing on the fly.
    std::fs::create_dir_all(java_root)?;
    let archive_path = java_root.join(&asset.binary.package.name);
    let mut response = http.get(&asset.binary.package.link).send().await?.error_for_status()?;
    let total_bytes = response.content_length().unwrap_or(asset.binary.package.size);

    let mut file = tokio::fs::File::create(&archive_path).await?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_emit: u64 = 0;
    while let Some(chunk) = response.chunk().await? {
        hasher.update(&chunk);
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
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

    // 3) Verify against the checksum Adoptium publishes.
    on_progress(JavaProgress {
        phase: JavaPhase::Verify,
        downloaded_bytes: downloaded,
        total_bytes,
    });
    let actual: String = hasher.finalize().iter().map(|b| format!("{b:02x}")).collect();
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
    {
        let archive = archive_path.clone();
        let dest = install_dir.clone();
        tokio::task::spawn_blocking(move || extract_archive(&archive, &dest))
            .await
            .map_err(|e| LauncherError::Internal(format!("extract task failed: {e}")))??;
    }
    let _ = std::fs::remove_file(&archive_path);
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
    let name = archive.file_name().and_then(|n| n.to_str()).unwrap_or_default();

    if name.ends_with(".zip") {
        zip::ZipArchive::new(file)
            .and_then(|mut zip| zip.extract(dest))
            .map_err(|e| LauncherError::InvalidData(format!("Could not extract {name}: {e}")))?;
    } else {
        tar::Archive::new(flate2::read::GzDecoder::new(file)).unpack(dest)?;
    }
    Ok(())
}
