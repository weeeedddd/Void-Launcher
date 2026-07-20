//! Optimization heuristics: what "Light / Balanced / Strong" actually does.
//!
//! Everything here is deterministic and transparent — each decision is
//! reported back to the user as an `OptimizationLogEntry` so the launcher
//! never feels like a black box.

use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OptimizationTier {
    Light,
    Balanced,
    Strong,
}

impl OptimizationTier {
    pub fn label(self) -> &'static str {
        match self {
            OptimizationTier::Light => "Light",
            OptimizationTier::Balanced => "Balanced",
            OptimizationTier::Strong => "Strong",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogKind {
    Memory,
    Jvm,
    Java,
    Gpu,
    Info,
}

/// One line of the user-facing feedback log.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizationLogEntry {
    pub kind: LogKind,
    pub message: String,
}

impl OptimizationLogEntry {
    pub fn new(kind: LogKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
}

/// Heap size (-Xmx) heuristic, in MB, rounded down to 512 MB steps:
///
/// | Tier     | Share of RAM | Clamp      |
/// |----------|--------------|------------|
/// | Light    | 25 %         | 2–4 GiB    |
/// | Balanced | 35 %         | 3–8 GiB    |
/// | Strong   | 50 %         | 4–12 GiB   |
///
/// More heap is NOT automatically better — past ~12 GiB, G1 pause times
/// grow while Minecraft rarely benefits. We also always leave the OS at
/// least 2 GiB of physical RAM.
pub fn recommended_memory_mb(total_memory_mb: u64, tier: OptimizationTier) -> u32 {
    let (percent, min, max) = match tier {
        OptimizationTier::Light => (25, 2048, 4096),
        OptimizationTier::Balanced => (35, 3072, 8192),
        OptimizationTier::Strong => (50, 4096, 12288),
    };
    let raw = (total_memory_mb * percent / 100) as u32;
    let os_headroom = total_memory_mb.saturating_sub(2048).max(1024) as u32;
    (raw.clamp(min, max).min(os_headroom) / 512) * 512
}

/// Tier-specific JVM flags. These are *appended after* the launcher's G1
/// baseline (see launch/mod.rs) and REPLACE the instance's previous extra
/// args, so re-running the optimizer never stacks duplicates.
pub fn jvm_args_for(tier: OptimizationTier) -> Vec<String> {
    let flags: &[&str] = match tier {
        // Light: trust the baseline — stability first.
        OptimizationTier::Light => &[],
        // Balanced: cheap wins with no startup cost.
        OptimizationTier::Balanced => {
            &["-XX:+ParallelRefProcEnabled", "-XX:+UseStringDeduplication"]
        }
        // Strong: trades RAM & startup time for steadier frame times.
        OptimizationTier::Strong => &[
            "-XX:+ParallelRefProcEnabled",
            "-XX:+UseStringDeduplication",
            "-XX:+AlwaysPreTouch", // commit the heap upfront: fewer page faults mid-game
            "-XX:+PerfDisableSharedMem", // avoids hiccups from perf-data file writes
            "-XX:MaxInlineLevel=15", // deeper inlining helps modded call chains
        ],
    };
    flags.iter().map(|flag| flag.to_string()).collect()
}

/// GPU priority: on Windows we register the Java executable for the
/// high-performance GPU — the same mechanism as Settings → Display →
/// Graphics. On laptops with hybrid graphics this stops Minecraft from
/// silently running on the integrated GPU. Elsewhere it's a no-op (the
/// driver decides), and we say so instead of pretending.
pub fn apply_gpu_preference(java_executable: &Path) -> OptimizationLogEntry {
    #[cfg(windows)]
    {
        match set_gpu_preference_windows(java_executable) {
            Ok(()) => OptimizationLogEntry::new(
                LogKind::Gpu,
                format!(
                    "Registered {} for the high-performance GPU (Windows graphics settings).",
                    java_executable
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                ),
            ),
            Err(err) => OptimizationLogEntry::new(
                LogKind::Gpu,
                format!("Could not set the GPU preference: {err}"),
            ),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = java_executable;
        OptimizationLogEntry::new(
            LogKind::Gpu,
            "GPU priority hint skipped — it's Windows-only; on Linux/macOS the driver decides.",
        )
    }
}

#[cfg(windows)]
fn set_gpu_preference_windows(java_executable: &Path) -> std::io::Result<()> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    // Per-app GPU preference, exactly what the Windows Settings UI writes:
    //   HKCU\Software\Microsoft\DirectX\UserGpuPreferences
    //     "<full exe path>" = "GpuPreference=2;"   (2 = high performance)
    let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
        .create_subkey(r"Software\Microsoft\DirectX\UserGpuPreferences")?;
    key.set_value(
        java_executable.to_string_lossy().as_ref(),
        &"GpuPreference=2;",
    )?;
    Ok(())
}
