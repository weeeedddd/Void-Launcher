use serde::ser::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BootstrapError {
    #[error("The installation path is invalid: {0}")]
    InvalidInstallPath(String),

    #[error("Another installation is already running.")]
    InstallAlreadyRunning,

    #[error("The release service returned an invalid response.")]
    InvalidReleaseResponse,

    #[error("No supported Windows client executable was found in the latest release.")]
    ClientAssetMissing,

    #[error("The release is missing the required companion SHA-256 file.")]
    ChecksumAssetMissing,

    #[error("A release download URL did not pass the security policy.")]
    UntrustedDownloadUrl,

    #[error("The release payload exceeds the permitted size.")]
    PayloadTooLarge,

    #[error("The release payload was incomplete.")]
    IncompletePayload,

    #[error("The SHA-256 companion file is invalid.")]
    InvalidChecksumFile,

    #[error("The downloaded client failed its SHA-256 integrity check.")]
    ChecksumMismatch,

    #[error("The downloaded payload is not a valid Windows executable.")]
    InvalidExecutable,

    #[error("The installed client is not ready to launch.")]
    ClientNotInstalled,

    #[allow(dead_code)]
    #[error("Shortcut creation is supported only on Windows.")]
    UnsupportedPlatform,

    #[error("The release service could not be reached: {0}")]
    Network(String),

    #[error("The installation could not access the filesystem: {0}")]
    Io(String),

    #[error("Windows shortcut creation failed.")]
    ShortcutCreationFailed,

    #[error("The installed client could not be started: {0}")]
    LaunchFailed(String),

    #[error("Internal installer state is unavailable.")]
    StateUnavailable,
}

impl Serialize for BootstrapError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for BootstrapError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}
