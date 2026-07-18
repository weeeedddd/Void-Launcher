use thiserror::Error;

/// One error type for every Tauri command.
///
/// The `#[error("…")]` strings are exactly what the frontend receives as the
/// rejected-Promise payload, so they are written as user-facing messages.
#[derive(Debug, Error)]
pub enum LauncherError {
    #[error("Network error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("File system error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Unexpected data: {0}")]
    Json(#[from] serde_json::Error),

    /// Anything that goes wrong in the Microsoft/Xbox/Minecraft chain.
    #[error("{0}")]
    Auth(String),

    /// Missing configuration, e.g. no CurseForge API key set.
    #[error("{0}")]
    Config(String),

    #[error("{0}")]
    NotFound(String),

    /// Platform-specific restrictions, e.g. CurseForge download opt-out.
    #[error("{0}")]
    Platform(String),

    /// Failed integrity checks (hash mismatch on a downloaded file).
    #[error("{0}")]
    InvalidData(String),

    /// Features that are scaffolded but not built yet (see docs/CONCEPT.md).
    #[error("{0}")]
    NotImplemented(String),
}

// Tauri delivers command errors to the frontend as the payload of a rejected
// Promise — that payload must be serializable. Serializing to the display
// string keeps the frontend simple: `catch (e) { show(String(e)) }`.
impl serde::Serialize for LauncherError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
