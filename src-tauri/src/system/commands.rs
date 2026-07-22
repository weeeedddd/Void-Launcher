//! Commands for the Performance Optimizer & Java management.

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::task;
use uuid::Uuid;

use super::hardware::{self, HardwareReport};
use super::java::{self, JavaRuntime};
use super::optimizer::{self, LogKind, OptimizationLogEntry, OptimizationTier};
use crate::error::LauncherError;
use crate::instance::Instance;
use crate::state::AppState;

const MINECRAFT_VERSION_MANIFEST_URL: &str =
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

#[derive(Debug, Deserialize)]
struct MojangVersionManifest {
    latest: MojangLatestVersions,
    versions: Vec<MojangManifestVersion>,
}

#[derive(Debug, Deserialize)]
struct MojangLatestVersions {
    release: String,
}

#[derive(Debug, Deserialize)]
struct MojangManifestVersion {
    id: String,
    #[serde(rename = "type")]
    kind: String,
    #[serde(rename = "releaseTime")]
    release_time: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftReleaseVersion {
    id: String,
    release_time: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftVersionCatalog {
    latest_release: String,
    releases: Vec<MinecraftReleaseVersion>,
    fetched_at: String,
}

/// Fetches Mojang's authoritative Java version manifest and exposes stable
/// releases only. Snapshots, pre-releases and release candidates stay out of
/// normal player profiles.
#[tauri::command]
pub async fn get_minecraft_version_catalog(
    state: State<'_, AppState>,
) -> Result<MinecraftVersionCatalog, LauncherError> {
    let manifest = state
        .http
        .get(MINECRAFT_VERSION_MANIFEST_URL)
        .send()
        .await?
        .error_for_status()?
        .json::<MojangVersionManifest>()
        .await?;

    let releases = manifest
        .versions
        .into_iter()
        .filter(|version| version.kind == "release")
        .filter(|version| is_supported_profile_release(&version.id))
        .map(|version| MinecraftReleaseVersion {
            id: version.id,
            release_time: version.release_time,
        })
        .collect();

    Ok(MinecraftVersionCatalog {
        latest_release: manifest.latest.release,
        releases,
        fetched_at: chrono::Utc::now().to_rfc3339(),
    })
}

fn is_supported_profile_release(version: &str) -> bool {
    let parsed = version
        .split('.')
        .map(str::parse::<u32>)
        .collect::<Result<Vec<_>, _>>();
    let Ok(parts) = parsed else {
        return false;
    };
    let first = parts.first().copied();
    let second = parts.get(1).copied();
    matches!((first, second), (Some(1), Some(minor)) if minor >= 1)
        || matches!(first, Some(year) if year >= 26)
}

fn join_err(err: task::JoinError) -> LauncherError {
    LauncherError::Internal(format!("background task failed: {err}"))
}

/// Hardware snapshot — runs on a worker thread because sysinfo refreshes
/// and the GPU child processes are blocking.
#[tauri::command]
pub async fn get_hardware_report(
    state: State<'_, AppState>,
) -> Result<HardwareReport, LauncherError> {
    let data_dir = state.data_dir.clone();
    task::spawn_blocking(move || hardware::scan(&data_dir))
        .await
        .map_err(join_err)
}

/// Returns one real host CPU/RAM sample. The frontend never fabricates these
/// values; this command is the source for the live performance panel.
#[tauri::command]
pub async fn get_live_system_metrics() -> Result<hardware::LiveSystemMetrics, LauncherError> {
    task::spawn_blocking(hardware::sample_live)
        .await
        .map_err(join_err)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkLatency {
    pub reachable: bool,
    pub latency_ms: Option<u64>,
    pub sampled_at: String,
}

/// Measures a real HTTPS round trip to Minecraft Services. A 401 response is
/// still a successful connectivity sample: the endpoint was reached, but no
/// access token was intentionally sent. This is labelled "MC API RTT" in the
/// UI and must not be confused with in-game server ping.
#[tauri::command]
pub async fn get_network_latency(
    state: State<'_, AppState>,
) -> Result<NetworkLatency, LauncherError> {
    let started = Instant::now();
    let request = state
        .http
        .get("https://api.minecraftservices.com/minecraft/profile")
        .send();
    let reachable = matches!(
        tokio::time::timeout(Duration::from_secs(5), request).await,
        Ok(Ok(_))
    );
    let latency_ms =
        reachable.then(|| u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX));

    Ok(NetworkLatency {
        reachable,
        latency_ms,
        sampled_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaStatus {
    pub required_major: u32,
    pub installed: Option<InstalledJavaInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledJavaInfo {
    pub java_executable: String,
    pub release_name: String,
}

/// Which Java the instance's Minecraft version needs, and whether a
/// launcher-managed runtime for it is already installed.
#[tauri::command]
pub fn get_java_status(
    state: State<'_, AppState>,
    instance_id: Uuid,
) -> Result<JavaStatus, LauncherError> {
    let instance = Instance::find(&state.instances_dir(), instance_id)?;
    let required_major = java::required_java_major(&instance.game_version);

    let installed =
        java::find_managed(&state.java_dir(), required_major).map(|bin| InstalledJavaInfo {
            java_executable: bin.to_string_lossy().into_owned(),
            release_name: java::read_release_marker(&state.java_dir(), required_major)
                .unwrap_or_else(|| format!("Temurin {required_major}")),
        });

    Ok(JavaStatus {
        required_major,
        installed,
    })
}

/// Makes sure the right Java exists for an instance (downloading Temurin in
/// the background if needed) and pins the instance to it. Progress is
/// streamed to the UI as "java-download-progress" events.
#[tauri::command]
pub async fn ensure_java_for_instance(
    app: AppHandle,
    state: State<'_, AppState>,
    instance_id: Uuid,
) -> Result<JavaRuntime, LauncherError> {
    let instances_root = state.instances_dir();
    let mut instance = Instance::find(&instances_root, instance_id)?;
    let required_major = java::required_java_major(&instance.game_version);

    let runtime = java::ensure_java(&state.http, &state.java_dir(), required_major, |progress| {
        let _ = app.emit("java-download-progress", &progress);
    })
    .await?;

    instance.java_path = Some(runtime.java_executable.to_string_lossy().into_owned());
    instance.save(&instances_root)?;
    Ok(runtime)
}

/// Everything the optimizer changed, plus the transparent log for the UI.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizationOutcome {
    pub log: Vec<OptimizationLogEntry>,
    pub memory_mb: u32,
    pub jvm_args: Vec<String>,
    pub java: JavaRuntime,
}

/// The full optimization pass for one instance:
///   1. hardware snapshot          → context for all decisions
///   2. heap size per tier         → instance.memory_mb
///   3. JVM flags per tier         → instance.extra_java_args (replaced)
///   4. Java runtime               → auto-download Temurin if missing
///   5. GPU preference (Windows)   → registry hint for hybrid graphics
/// Every step appends a human-readable log entry.
#[tauri::command]
pub async fn optimize_instance(
    app: AppHandle,
    state: State<'_, AppState>,
    instance_id: Uuid,
    tier: OptimizationTier,
) -> Result<OptimizationOutcome, LauncherError> {
    let instances_root = state.instances_dir();
    let mut instance = Instance::find(&instances_root, instance_id)?;
    let mut log: Vec<OptimizationLogEntry> = Vec::new();

    // 1) Hardware snapshot
    let data_dir = state.data_dir.clone();
    let report = task::spawn_blocking(move || hardware::scan(&data_dir))
        .await
        .map_err(join_err)?;
    log.push(OptimizationLogEntry::new(
        LogKind::Info,
        format!(
            "Detected {} ({} threads) with {:.1} GiB RAM — applying \"{}\" profile.",
            report.cpu_model,
            report.logical_cores,
            report.total_memory_mb as f64 / 1024.0,
            tier.label()
        ),
    ));

    // 2) Heap size
    let memory_mb = optimizer::recommended_memory_mb(report.total_memory_mb, tier);
    log.push(OptimizationLogEntry::new(
        LogKind::Memory,
        format!(
            "RAM allocation set to {memory_mb} MB (was {} MB).",
            instance.memory_mb
        ),
    ));
    instance.memory_mb = memory_mb;

    // 3) JVM flags
    let jvm_args = optimizer::jvm_args_for(tier);
    log.push(OptimizationLogEntry::new(
        LogKind::Jvm,
        if jvm_args.is_empty() {
            "JVM flags: launcher G1 baseline only (stability first).".to_string()
        } else {
            format!(
                "Applied {} tuned JVM flags: {}.",
                jvm_args.len(),
                jvm_args.join(" ")
            )
        },
    ));
    instance.extra_java_args = jvm_args.clone();

    // 4) Java runtime (auto-download if missing)
    let required_major = java::required_java_major(&instance.game_version);
    let runtime = java::ensure_java(&state.http, &state.java_dir(), required_major, |progress| {
        let _ = app.emit("java-download-progress", &progress);
    })
    .await?;
    log.push(OptimizationLogEntry::new(
        LogKind::Java,
        if runtime.freshly_installed {
            format!(
                "Downloaded and installed Temurin JRE {required_major} ({}) — isolated in the launcher directory.",
                runtime.release_name
            )
        } else {
            format!(
                "Java {required_major} runtime verified ({}), already managed by the launcher.",
                runtime.release_name
            )
        },
    ));
    instance.java_path = Some(runtime.java_executable.to_string_lossy().into_owned());

    // 5) GPU preference (real on Windows, honest no-op elsewhere)
    log.push(optimizer::apply_gpu_preference(&runtime.java_executable));

    instance.save(&instances_root)?;
    Ok(OptimizationOutcome {
        log,
        memory_mb,
        jvm_args,
        java: runtime,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameVideoSettings {
    pub render_distance: u32,
    pub simulation_distance: u32,
    pub graphics_mode: String,
    pub max_fps: u32,
}

/// Applies benchmark recommendations to the selected instance's real
/// `options.txt` while preserving unrelated user settings.
#[tauri::command]
pub fn apply_game_video_settings(
    state: State<'_, AppState>,
    instance_id: Uuid,
    settings: GameVideoSettings,
) -> Result<GameVideoSettings, LauncherError> {
    let instance = Instance::find(&state.instances_dir(), instance_id)?;
    let normalized = GameVideoSettings {
        render_distance: settings.render_distance.clamp(2, 64),
        simulation_distance: settings.simulation_distance.clamp(2, 32),
        graphics_mode: match settings.graphics_mode.as_str() {
            "fast" | "fancy" | "fabulous" => settings.graphics_mode,
            _ => {
                return Err(LauncherError::InvalidData(
                    "Graphics mode must be fast, fancy, or fabulous.".into(),
                ))
            }
        },
        max_fps: settings.max_fps.clamp(30, 360),
    };
    let options_path = instance.dir(&state.instances_dir()).join("options.txt");
    let existing = std::fs::read_to_string(&options_path).unwrap_or_default();
    let graphics_index = match normalized.graphics_mode.as_str() {
        "fast" => "0",
        "fancy" => "1",
        _ => "2",
    };
    let replacements = [
        ("renderDistance", normalized.render_distance.to_string()),
        (
            "simulationDistance",
            normalized.simulation_distance.to_string(),
        ),
        ("graphicsMode", graphics_index.to_owned()),
        (
            "fancyGraphics",
            (normalized.graphics_mode != "fast").to_string(),
        ),
        ("maxFps", normalized.max_fps.to_string()),
    ];
    let updated = replace_options(&existing, &replacements);
    std::fs::create_dir_all(instance.dir(&state.instances_dir()))?;
    std::fs::write(options_path, updated)?;
    Ok(normalized)
}

fn replace_options(existing: &str, replacements: &[(&str, String)]) -> String {
    let mut written = std::collections::HashSet::new();
    let mut lines = Vec::new();
    for line in existing.lines() {
        let key = line.split_once(':').map(|(key, _)| key);
        if let Some((replacement_key, value)) = replacements
            .iter()
            .find(|(replacement_key, _)| Some(*replacement_key) == key)
        {
            lines.push(format!("{replacement_key}:{value}"));
            written.insert(*replacement_key);
        } else if !line.trim().is_empty() {
            lines.push(line.to_owned());
        }
    }
    for (key, value) in replacements {
        if !written.contains(key) {
            lines.push(format!("{key}:{value}"));
        }
    }
    format!("{}\n", lines.join("\n"))
}

#[cfg(test)]
mod video_settings_tests {
    use super::{is_supported_profile_release, replace_options};

    #[test]
    fn replaces_known_options_and_preserves_unrelated_lines() {
        let updated = replace_options(
            "renderDistance:8\nmusic:0.5\n",
            &[("renderDistance", "16".into()), ("maxFps", "120".into())],
        );
        assert!(updated.contains("renderDistance:16"));
        assert!(updated.contains("music:0.5"));
        assert!(updated.contains("maxFps:120"));
    }

    #[test]
    fn stable_profile_release_filter_accepts_modern_numbering() {
        assert!(is_supported_profile_release("26.2"));
        assert!(is_supported_profile_release("26.1.2"));
        assert!(is_supported_profile_release("1.21.11"));
        assert!(is_supported_profile_release("1.1"));
        assert!(!is_supported_profile_release("1.0"));
        assert!(!is_supported_profile_release("26.3-snapshot-5"));
    }
}
