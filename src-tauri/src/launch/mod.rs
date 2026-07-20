//! Launching: Java argument assembly & process spawning.
//!
//! ── Scaffold status ─────────────────────────────────────────────────────
//! IMPLEMENTED here: JVM/game argument builders and the process spawn —
//! the parts that are identical for every setup.
//!
//! STILL TODO (Roadmap → Milestone 3, see docs/CONCEPT.md):
//!   1. Download the version manifest:
//!      https://piston-meta.mojang.com/mc/game/version_manifest_v2.json
//!   2. Download client.jar, libraries (respecting per-OS rules) and assets;
//!      verify each file's SHA-1; extract LWJGL natives.
//!   3. For modded instances, merge the loader profile:
//!        Fabric:   https://meta.fabricmc.net/v2/versions/loader/<mc>  (easy)
//!        NeoForge/Forge: run their installer processors           (involved)
//!   4. Resolve a Java runtime (Mojang ships per-version JREs).
//!   Shortcut worth evaluating: the `lyceris` crate implements this whole
//!   pipeline (vanilla + Fabric/Forge/NeoForge/Quilt) and is MIT-licensed.

pub mod commands;

use std::path::{Path, PathBuf};

use crate::auth::MinecraftSession;
use crate::instance::Instance;

/// Classpath separator differs per OS (`;` on Windows, `:` elsewhere).
const CLASSPATH_SEP: &str = if cfg!(windows) { ";" } else { ":" };

/// JVM arguments: memory, GC tuning, natives dir, user flags, classpath.
pub fn build_jvm_args(
    instance: &Instance,
    natives_dir: &Path,
    classpath: &[PathBuf],
) -> Vec<String> {
    let classpath_joined = classpath
        .iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join(CLASSPATH_SEP);

    let mut args = vec![
        // Heap: start at half of the allocation (min 1 GiB), cap at the
        // per-instance setting from the UI.
        format!("-Xms{}M", (instance.memory_mb / 2).max(1024)),
        format!("-Xmx{}M", instance.memory_mb),
        // G1 settings that work well for (modded) Minecraft.
        "-XX:+UseG1GC".to_string(),
        "-XX:G1NewSizePercent=20".to_string(),
        "-XX:G1ReservePercent=20".to_string(),
        "-XX:MaxGCPauseMillis=50".to_string(),
        "-XX:G1HeapRegionSize=32M".to_string(),
        // Where the extracted LWJGL natives live.
        format!("-Djava.library.path={}", natives_dir.to_string_lossy()),
    ];

    // Per-instance user flags from the settings UI.
    args.extend(instance.extra_java_args.iter().cloned());

    args.push("-cp".to_string());
    args.push(classpath_joined);
    args
}

/// Game arguments — the values Minecraft's `mainClass` expects. These are
/// the resolved forms of the `${auth_player_name}`-style placeholders in
/// the version JSON.
pub fn build_game_args(
    instance: &Instance,
    session: &MinecraftSession,
    game_dir: &Path,
    assets_dir: &Path,
    asset_index_id: &str,
) -> Vec<String> {
    vec![
        "--username".into(),
        session.profile.name.clone(),
        "--uuid".into(),
        session.profile.uuid.clone(),
        "--accessToken".into(),
        session.access_token.clone(),
        "--userType".into(),
        "msa".into(), // Microsoft account
        "--version".into(),
        instance.game_version.clone(),
        "--gameDir".into(),
        game_dir.to_string_lossy().into_owned(),
        "--assetsDir".into(),
        assets_dir.to_string_lossy().into_owned(),
        "--assetIndex".into(),
        asset_index_id.into(),
    ]
}

/// Spawns the game process, detached from the launcher UI thread.
/// `main_class` is `net.minecraft.client.main.Main` for vanilla, or the
/// loader's entry point (Fabric: `net.fabricmc.loader.impl.launch.knot.KnotClient`).
pub fn spawn_game(
    java_executable: &str,
    jvm_args: Vec<String>,
    main_class: &str,
    game_args: Vec<String>,
    working_dir: &Path,
) -> Result<tokio::process::Child, crate::error::LauncherError> {
    let mut command = tokio::process::Command::new(java_executable);
    command
        .args(jvm_args)
        .arg(main_class)
        .args(game_args)
        .current_dir(working_dir);
    Ok(command.spawn()?)
}
