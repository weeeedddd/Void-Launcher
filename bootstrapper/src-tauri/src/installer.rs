use crate::error::BootstrapError;
use futures_util::StreamExt;
use reqwest::{redirect::Policy, Client, Response};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    ffi::OsStr,
    path::{Component, Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{AppHandle, Emitter};
use tokio::{
    fs::{self, OpenOptions},
    io::AsyncWriteExt,
};
use url::Url;

const LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/weeeedddd/Void-Launcher/releases/latest";
const CLIENT_RELEASE_ASSET_NAME: &str = "Void-Launcher-Client.exe";
const CHECKSUM_RELEASE_ASSET_NAME: &str = "Void-Launcher-Client.exe.sha256";
const CLIENT_FILE_NAME: &str = "Void Launcher.exe";
const MAX_RELEASE_METADATA_BYTES: u64 = 1024 * 1024;
const MAX_CHECKSUM_BYTES: u64 = 16 * 1024;
const MAX_CLIENT_BYTES: u64 = 512 * 1024 * 1024;
const MAX_REDIRECTS: usize = 6;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15 * 60);

#[derive(Debug, Clone, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub size: u64,
    pub browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Clone)]
pub struct SelectedAssets {
    pub client: ReleaseAsset,
    pub checksum: ReleaseAsset,
}

pub struct InstallGuard<'a> {
    flag: &'a AtomicBool,
}

impl<'a> InstallGuard<'a> {
    pub fn acquire(flag: &'a AtomicBool) -> Result<Self, BootstrapError> {
        flag.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| BootstrapError::InstallAlreadyRunning)?;
        Ok(Self { flag })
    }
}

impl Drop for InstallGuard<'_> {
    fn drop(&mut self) {
        self.flag.store(false, Ordering::Release);
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallerProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
    pub status: String,
}

pub fn emit_progress(
    app: &AppHandle,
    downloaded_bytes: u64,
    total_bytes: u64,
    percentage: u8,
    status: impl Into<String>,
) {
    let _ = app.emit(
        "installer-progress",
        InstallerProgress {
            downloaded_bytes,
            total_bytes,
            percentage: percentage.min(100),
            status: status.into(),
        },
    );
}

pub fn default_install_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        return local_app_data.join("Programs").join("Void Launcher");
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        return home.join("Applications").join("Void Launcher");
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let data_home = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME")
                    .map(PathBuf::from)
                    .map(|home| home.join(".local").join("share"))
            })
            .unwrap_or_else(std::env::temp_dir);
        data_home.join("Void Launcher")
    }
}

pub fn validate_installation_directory(raw: &str) -> Result<PathBuf, BootstrapError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > 512 || trimmed.chars().any(char::is_control) {
        return Err(BootstrapError::InvalidInstallPath(
            "choose a non-empty local directory".into(),
        ));
    }

    let candidate = PathBuf::from(trimmed);
    if !candidate.is_absolute() {
        return Err(BootstrapError::InvalidInstallPath(
            "the directory must be an absolute path".into(),
        ));
    }

    let mut normal_component_count = 0usize;
    for component in candidate.components() {
        match component {
            Component::Normal(segment) => {
                normal_component_count += 1;
                validate_path_segment(segment)?;
            }
            Component::Prefix(_) | Component::RootDir => {}
            Component::CurDir | Component::ParentDir => {
                return Err(BootstrapError::InvalidInstallPath(
                    "relative path segments are not permitted".into(),
                ));
            }
        }
    }

    if normal_component_count == 0 || candidate.parent().is_none() {
        return Err(BootstrapError::InvalidInstallPath(
            "a filesystem root cannot be used as the installation directory".into(),
        ));
    }

    #[cfg(target_os = "windows")]
    validate_windows_path(&candidate)?;

    if candidate.exists() {
        let metadata = std::fs::symlink_metadata(&candidate)?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(BootstrapError::InvalidInstallPath(
                "the destination must be a real local directory".into(),
            ));
        }
    }

    Ok(candidate)
}

fn validate_path_segment(segment: &OsStr) -> Result<(), BootstrapError> {
    let value = segment.to_string_lossy();
    if value.is_empty() || value == "." || value == ".." {
        return Err(BootstrapError::InvalidInstallPath(
            "the path contains an invalid segment".into(),
        ));
    }

    #[cfg(target_os = "windows")]
    if value
        .chars()
        .any(|character| matches!(character, '<' | '>' | ':' | '"' | '|' | '?' | '*'))
    {
        return Err(BootstrapError::InvalidInstallPath(
            "the path contains characters Windows does not permit".into(),
        ));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn validate_windows_path(candidate: &Path) -> Result<(), BootstrapError> {
    use std::path::Prefix;

    match candidate.components().next() {
        Some(Component::Prefix(prefix))
            if matches!(prefix.kind(), Prefix::Disk(_) | Prefix::VerbatimDisk(_)) => {}
        _ => {
            return Err(BootstrapError::InvalidInstallPath(
                "network and device paths are not permitted".into(),
            ));
        }
    }

    if let Some(system_root) = std::env::var_os("SystemRoot").map(PathBuf::from) {
        if path_starts_with_case_insensitive(candidate, &system_root) {
            return Err(BootstrapError::InvalidInstallPath(
                "the Windows system directory cannot be used".into(),
            ));
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn path_starts_with_case_insensitive(candidate: &Path, prefix: &Path) -> bool {
    let candidate = candidate
        .to_string_lossy()
        .replace('/', "\\")
        .to_lowercase();
    let prefix = prefix.to_string_lossy().replace('/', "\\").to_lowercase();
    candidate == prefix || candidate.starts_with(&(prefix + "\\"))
}

pub fn is_allowed_release_url(url: &Url) -> bool {
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port_or_known_default() != Some(443)
        || url.fragment().is_some()
    {
        return false;
    }

    let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
        return false;
    };

    matches!(
        host.as_str(),
        "github.com" | "api.github.com" | "objects.githubusercontent.com" | "githubusercontent.com"
    ) || host.ends_with(".githubusercontent.com")
}

pub fn select_release_assets(assets: &[ReleaseAsset]) -> Result<SelectedAssets, BootstrapError> {
    let client = assets
        .iter()
        .find(|asset| {
            asset.name == CLIENT_RELEASE_ASSET_NAME
                && asset.size > 2
                && asset.size <= MAX_CLIENT_BYTES
        })
        .ok_or(BootstrapError::ClientAssetMissing)?;

    let checksum = assets
        .iter()
        .find(|asset| {
            asset.name == CHECKSUM_RELEASE_ASSET_NAME
                && asset.size > 0
                && asset.size <= MAX_CHECKSUM_BYTES
        })
        .cloned()
        .ok_or(BootstrapError::ChecksumAssetMissing)?;

    Ok(SelectedAssets {
        client: client.clone(),
        checksum,
    })
}

pub fn parse_checksum(document: &[u8]) -> Result<[u8; 32], BootstrapError> {
    let document = std::str::from_utf8(document)
        .map_err(|_| BootstrapError::InvalidChecksumFile)?
        .trim();
    if document.is_empty() || document.len() > MAX_CHECKSUM_BYTES as usize {
        return Err(BootstrapError::InvalidChecksumFile);
    }

    let token = document
        .split_whitespace()
        .next()
        .ok_or(BootstrapError::InvalidChecksumFile)?;
    if token.len() != 64 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(BootstrapError::InvalidChecksumFile);
    }

    let mut output = [0u8; 32];
    for (index, pair) in token.as_bytes().chunks_exact(2).enumerate() {
        let pair = std::str::from_utf8(pair).map_err(|_| BootstrapError::InvalidChecksumFile)?;
        output[index] =
            u8::from_str_radix(pair, 16).map_err(|_| BootstrapError::InvalidChecksumFile)?;
    }
    Ok(output)
}

fn build_http_client() -> Result<Client, BootstrapError> {
    let redirect_policy = Policy::custom(|attempt| {
        if attempt.previous().len() >= MAX_REDIRECTS {
            return attempt.error("too many release download redirects");
        }
        if !is_allowed_release_url(attempt.url()) {
            return attempt.error("release redirect host is not allowed");
        }
        attempt.follow()
    });

    Client::builder()
        .https_only(true)
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .redirect(redirect_policy)
        .user_agent("Void-Bootstrapper/0.1.0")
        .build()
        .map_err(|_| BootstrapError::Network("HTTP client initialization failed".into()))
}

fn map_network_error(error: reqwest::Error) -> BootstrapError {
    let message = if error.is_timeout() {
        "the GitHub request timed out"
    } else if error.is_connect() {
        "a secure connection to GitHub could not be established"
    } else if error.is_status() {
        "GitHub returned an unsuccessful response"
    } else {
        "the GitHub request failed"
    };
    BootstrapError::Network(message.into())
}

async fn checked_response(client: &Client, raw_url: &str) -> Result<Response, BootstrapError> {
    let url = Url::parse(raw_url).map_err(|_| BootstrapError::UntrustedDownloadUrl)?;
    if !is_allowed_release_url(&url) {
        return Err(BootstrapError::UntrustedDownloadUrl);
    }

    let response = client
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(map_network_error)?;

    if !is_allowed_release_url(response.url()) {
        return Err(BootstrapError::UntrustedDownloadUrl);
    }

    response.error_for_status().map_err(map_network_error)
}

async fn read_limited_response(
    response: Response,
    maximum_bytes: u64,
) -> Result<Vec<u8>, BootstrapError> {
    if response
        .content_length()
        .is_some_and(|length| length > maximum_bytes)
    {
        return Err(BootstrapError::PayloadTooLarge);
    }

    let mut bytes = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(map_network_error)?;
        if bytes.len() as u64 + chunk.len() as u64 > maximum_bytes {
            return Err(BootstrapError::PayloadTooLarge);
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

async fn get_latest_release(client: &Client) -> Result<GithubRelease, BootstrapError> {
    let response = checked_response(client, LATEST_RELEASE_URL).await?;
    let bytes = read_limited_response(response, MAX_RELEASE_METADATA_BYTES).await?;
    serde_json::from_slice(&bytes).map_err(|_| BootstrapError::InvalidReleaseResponse)
}

fn validated_version(tag_name: &str) -> Result<String, BootstrapError> {
    let value = tag_name.trim();
    if value.is_empty() || value.len() > 128 || value.chars().any(char::is_control) {
        return Err(BootstrapError::InvalidReleaseResponse);
    }
    Ok(value.to_owned())
}

async fn download_client_payload(
    app: &AppHandle,
    client: &Client,
    asset: &ReleaseAsset,
    part_path: &Path,
    expected_checksum: [u8; 32],
) -> Result<(), BootstrapError> {
    if asset.size <= 2 || asset.size > MAX_CLIENT_BYTES {
        return Err(BootstrapError::PayloadTooLarge);
    }

    let response = checked_response(client, &asset.browser_download_url).await?;
    if response
        .content_length()
        .is_some_and(|length| length != asset.size || length > MAX_CLIENT_BYTES)
    {
        return Err(BootstrapError::IncompletePayload);
    }

    if fs::try_exists(part_path).await? {
        fs::remove_file(part_path).await?;
    }

    let mut output = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(part_path)
        .await?;
    let mut stream = response.bytes_stream();
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    let mut signature = Vec::with_capacity(2);
    let mut last_emitted_percentage = 0u8;

    let download_result: Result<(), BootstrapError> = async {
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(map_network_error)?;
            downloaded = downloaded
                .checked_add(chunk.len() as u64)
                .ok_or(BootstrapError::PayloadTooLarge)?;
            if downloaded > asset.size || downloaded > MAX_CLIENT_BYTES {
                return Err(BootstrapError::PayloadTooLarge);
            }

            if signature.len() < 2 {
                let missing = 2 - signature.len();
                signature.extend_from_slice(&chunk[..chunk.len().min(missing)]);
            }
            hasher.update(&chunk);
            output.write_all(&chunk).await?;

            let percentage = (5 + ((downloaded.saturating_mul(85) / asset.size) as u8)).min(90);
            if percentage > last_emitted_percentage {
                last_emitted_percentage = percentage;
                emit_progress(
                    app,
                    downloaded,
                    asset.size,
                    percentage,
                    "Downloading Void Client payload...",
                );
            }
        }

        output.flush().await?;
        output.sync_all().await?;

        if downloaded != asset.size {
            return Err(BootstrapError::IncompletePayload);
        }
        if signature.as_slice() != b"MZ" {
            return Err(BootstrapError::InvalidExecutable);
        }
        let actual_checksum: [u8; 32] = hasher.finalize().into();
        if actual_checksum != expected_checksum {
            return Err(BootstrapError::ChecksumMismatch);
        }
        Ok(())
    }
    .await;

    drop(output);
    if download_result.is_err() {
        let _ = fs::remove_file(part_path).await;
    }
    download_result
}

pub async fn install_release(
    app: &AppHandle,
    installation_directory: &Path,
) -> Result<(PathBuf, String), BootstrapError> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        let _ = installation_directory;
        return Err(BootstrapError::UnsupportedPlatform);
    }

    #[cfg(target_os = "windows")]
    {
        emit_progress(app, 0, 0, 1, "Locating the latest trusted release...");
        let http_client = build_http_client()?;
        let release = get_latest_release(&http_client).await?;
        let version = validated_version(&release.tag_name)?;
        let selected = select_release_assets(&release.assets)?;

        let client_url = Url::parse(&selected.client.browser_download_url)
            .map_err(|_| BootstrapError::UntrustedDownloadUrl)?;
        let checksum_url = Url::parse(&selected.checksum.browser_download_url)
            .map_err(|_| BootstrapError::UntrustedDownloadUrl)?;
        if !is_allowed_release_url(&client_url) || !is_allowed_release_url(&checksum_url) {
            return Err(BootstrapError::UntrustedDownloadUrl);
        }

        emit_progress(
            app,
            0,
            selected.client.size,
            3,
            "Downloading the signed checksum...",
        );
        let checksum_response =
            checked_response(&http_client, &selected.checksum.browser_download_url).await?;
        let checksum_document =
            read_limited_response(checksum_response, MAX_CHECKSUM_BYTES).await?;
        if checksum_document.len() as u64 != selected.checksum.size {
            return Err(BootstrapError::IncompletePayload);
        }
        let expected_checksum = parse_checksum(&checksum_document)?;

        fs::create_dir_all(installation_directory).await?;
        let executable_path = installation_directory.join(CLIENT_FILE_NAME);
        let part_path = installation_directory.join("Void Launcher.exe.part");
        let backup_path = installation_directory.join("Void Launcher.exe.previous");

        download_client_payload(
            app,
            &http_client,
            &selected.client,
            &part_path,
            expected_checksum,
        )
        .await?;

        emit_progress(
            app,
            selected.client.size,
            selected.client.size,
            93,
            "Integrity verified. Activating the client...",
        );
        activate_download(&part_path, &executable_path, &backup_path)?;
        Ok((executable_path, version))
    }
}

fn activate_download(
    part_path: &Path,
    executable_path: &Path,
    backup_path: &Path,
) -> Result<(), BootstrapError> {
    let had_previous = executable_path.exists();
    if had_previous {
        let metadata = std::fs::symlink_metadata(executable_path)?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(BootstrapError::InvalidInstallPath(
                "the client destination is not a regular file".into(),
            ));
        }
    }

    if backup_path.exists() {
        let metadata = std::fs::symlink_metadata(backup_path)?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(BootstrapError::InvalidInstallPath(
                "the previous client backup is not a regular file".into(),
            ));
        }
        std::fs::remove_file(backup_path)?;
    }

    if had_previous {
        std::fs::rename(executable_path, backup_path)?;
    }

    if let Err(error) = std::fs::rename(part_path, executable_path) {
        if had_previous {
            let _ = std::fs::rename(backup_path, executable_path);
        }
        return Err(BootstrapError::Io(error.to_string()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn asset(name: &str, size: u64, url: &str) -> ReleaseAsset {
        ReleaseAsset {
            name: name.into(),
            size,
            browser_download_url: url.into(),
        }
    }

    #[test]
    fn accepts_only_https_github_release_hosts() {
        for accepted in [
            "https://api.github.com/repos/weeeedddd/Void-Launcher/releases/latest",
            "https://github.com/weeeedddd/Void-Launcher/releases/download/v1/client.exe",
            "https://objects.githubusercontent.com/object/client.exe?signature=abc",
            "https://release-assets.githubusercontent.com/client.exe?signature=abc",
        ] {
            assert!(is_allowed_release_url(&Url::parse(accepted).unwrap()));
        }

        for rejected in [
            "http://github.com/client.exe",
            "https://github.com.evil.example/client.exe",
            "https://evilgithubusercontent.com/client.exe",
            "https://user@github.com/client.exe",
            "https://github.com:444/client.exe",
            "https://github.com/client.exe#fragment",
        ] {
            assert!(!is_allowed_release_url(&Url::parse(rejected).unwrap()));
        }
    }

    #[test]
    fn selects_only_the_exact_published_client_contract() {
        let assets = vec![
            asset("Void-Bootstrapper.exe", 90_000_000, "https://github.com/a"),
            asset("Void-Client.exe", 40_000_000, "https://github.com/b"),
            asset(
                "Void-Launcher-Client.exe.sha256",
                96,
                "https://github.com/c",
            ),
            asset(
                "Void-Launcher-Client.exe",
                30_000_000,
                "https://github.com/d",
            ),
        ];
        let selected = select_release_assets(&assets).unwrap();
        assert_eq!(selected.client.name, "Void-Launcher-Client.exe");
        assert_eq!(selected.checksum.name, "Void-Launcher-Client.exe.sha256");
    }

    #[test]
    fn refuses_release_without_companion_checksum() {
        let assets = vec![asset(
            "Void-Launcher-Client.exe",
            20_000_000,
            "https://github.com/client",
        )];
        assert!(matches!(
            select_release_assets(&assets),
            Err(BootstrapError::ChecksumAssetMissing)
        ));
    }

    #[test]
    fn parses_sha256sum_format_case_insensitively() {
        let expected = [0xabu8; 32];
        let text = format!("{}  Void-Client.exe\n", "AB".repeat(32));
        assert_eq!(parse_checksum(text.as_bytes()).unwrap(), expected);
    }

    #[test]
    fn refuses_malformed_checksum_documents() {
        assert!(parse_checksum(b"").is_err());
        assert!(parse_checksum(b"not-a-hash").is_err());
        assert!(parse_checksum(&vec![b'a'; 65]).is_err());
        assert!(parse_checksum(&vec![b'z'; 64]).is_err());
    }

    #[test]
    fn validates_absolute_install_paths_and_rejects_traversal() {
        let valid = std::env::temp_dir().join("void-bootstrapper-path-test");
        assert!(validate_installation_directory(&valid.to_string_lossy()).is_ok());
        assert!(validate_installation_directory("relative/Void Launcher").is_err());

        let traversal = std::env::temp_dir()
            .join("void-parent")
            .join("..")
            .join("void-target");
        assert!(validate_installation_directory(&traversal.to_string_lossy()).is_err());
    }

    #[test]
    fn validates_sha256_against_known_bytes() {
        let digest: [u8; 32] = Sha256::digest(b"Void Launcher").into();
        let encoded = digest
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        assert_eq!(parse_checksum(encoded.as_bytes()).unwrap(), digest);
        let tampered: [u8; 32] = Sha256::digest(b"tampered").into();
        assert_ne!(digest, tampered);
    }
}
