use std::{collections::HashMap, path::PathBuf};

use lyceris::auth::AuthMethod;
use lyceris::minecraft::config::{Config, ConfigBuilder, Memory, Profile};
use lyceris::minecraft::emitter::{Emitter as GameEmitter, Event};
use lyceris::minecraft::install::install;
use lyceris::minecraft::loader::{
    fabric::Fabric, forge::Forge, neoforge::NeoForge, quilt::Quilt, Loader,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::error::LauncherError;
use crate::instance::{Instance, InstanceLoader};
use crate::state::AppState;

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    #[serde(default)]
    pub fullscreen: bool,
}

impl LaunchOptions {
    fn game_arguments(self) -> Vec<String> {
        let mut arguments = Vec::with_capacity(5);
        if let (Some(width), Some(height)) = (self.width, self.height) {
            arguments.extend([
                "--width".to_owned(),
                width.clamp(800, 7_680).to_string(),
                "--height".to_owned(),
                height.clamp(600, 4_320).to_string(),
            ]);
        }
        if self.fullscreen {
            arguments.push("--fullscreen".to_owned());
        }
        arguments
    }
}

/// Installs and starts one authenticated Minecraft instance.
///
/// A real launch always requires the Microsoft -> Xbox -> Minecraft ownership
/// flow stored in native AppState. There is no preview/developer branch.
#[tauri::command]
pub async fn launch_instance(
    app: AppHandle,
    state: State<'_, AppState>,
    instance_id: Uuid,
    options: Option<LaunchOptions>,
) -> Result<(), LauncherError> {
    emit_launch_log(
        &app,
        instance_id,
        "info",
        "queued",
        "Launch request accepted by the native service.",
    );
    let result = launch_instance_inner(&app, state.inner(), instance_id, options).await;
    if let Err(error) = &result {
        emit_launch_log(&app, instance_id, "error", "failed", &error.to_string());
    }
    result
}

async fn launch_instance_inner(
    app: &AppHandle,
    state: &AppState,
    instance_id: Uuid,
    options: Option<LaunchOptions>,
) -> Result<(), LauncherError> {
    let instances_root = state.instances_dir();
    let mut instance = Instance::find(&instances_root, instance_id)?;

    emit_launch_log(
        app,
        instance_id,
        "info",
        "authentication",
        "Verifying the Microsoft Minecraft session.",
    );
    let session = crate::auth::commands::ensure_fresh_microsoft_session(state)
        .await?
        .ok_or_else(|| {
            LauncherError::Auth("Sign in with Microsoft before launching Minecraft.".into())
        })?;
    emit_launch_log(
        app,
        instance_id,
        "success",
        "authentication",
        "Microsoft ownership session verified.",
    );

    let authentication = AuthMethod::Microsoft {
        username: session.profile.name,
        xuid: session.xuid,
        uuid: session.profile.uuid,
        access_token: session.access_token,
        // Lyceris only stores this value in its in-memory config. Refreshing
        // remains owned by our auth module; an absent token is represented by
        // an empty string rather than exposing anything to React.
        refresh_token: session.msa_refresh_token.unwrap_or_default(),
    };

    let game_root = state.data_dir.join("minecraft");
    let runtime_root = state.data_dir.join("runtimes");
    let profile = Profile::new(instance.id.to_string(), instances_root.clone());
    let builder = ConfigBuilder::new(&game_root, instance.game_version.clone(), authentication)
        .memory(Memory::Megabyte(instance.memory_mb as u64))
        .profile(profile)
        .runtime_dir(runtime_root)
        .custom_java_args(instance.extra_java_args.clone())
        .custom_args(options.unwrap_or_default().game_arguments())
        .client(state.http.clone());

    let managed_java = match instance.java_path.as_deref().map(PathBuf::from) {
        Some(path) if path.is_file() => Some(path),
        Some(path) => {
            emit_launch_log(
                app,
                instance_id,
                "warning",
                "runtime",
                &format!(
                    "The configured Java runtime is missing ({}); falling back to the verified Mojang runtime.",
                    path.display()
                ),
            );
            instance.java_path = None;
            None
        }
        None => None,
    };

    emit_launch_log(
        app,
        instance_id,
        "info",
        "runtime",
        &format!(
            "Preparing Minecraft {} with {} MB RAM.",
            instance.game_version, instance.memory_mb
        ),
    );

    let process_id = match instance.loader {
        InstanceLoader::Vanilla => {
            install_and_launch(app, instance_id, builder.build(), managed_java.as_deref()).await?
        }
        InstanceLoader::Fabric => {
            emit_launch_log(
                app,
                instance_id,
                "info",
                "loader",
                "Resolving the latest compatible Fabric loader.",
            );
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(
                app,
                instance_id,
                builder.loader(Fabric(version).into()).build(),
                managed_java.as_deref(),
            )
            .await?
        }
        InstanceLoader::Forge => {
            emit_launch_log(
                app,
                instance_id,
                "info",
                "loader",
                "Resolving the latest compatible Forge loader.",
            );
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(
                app,
                instance_id,
                builder.loader(Forge(version).into()).build(),
                managed_java.as_deref(),
            )
            .await?
        }
        InstanceLoader::Neoforge => {
            emit_launch_log(
                app,
                instance_id,
                "info",
                "loader",
                "Resolving the latest compatible NeoForge loader.",
            );
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(
                app,
                instance_id,
                builder.loader(NeoForge(version).into()).build(),
                managed_java.as_deref(),
            )
            .await?
        }
        InstanceLoader::Quilt => {
            emit_launch_log(
                app,
                instance_id,
                "info",
                "loader",
                "Resolving the latest compatible Quilt loader.",
            );
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(
                app,
                instance_id,
                builder.loader(Quilt(version).into()).build(),
                managed_java.as_deref(),
            )
            .await?
        }
    };
    state.set_minecraft_pid(Some(process_id));

    instance.last_played_at = Some(chrono::Utc::now());
    instance.save(&instances_root)?;
    emit_launch_log(
        app,
        instance_id,
        "success",
        "running",
        "Minecraft process started successfully.",
    );
    Ok(())
}

async fn install_and_launch<T: Loader>(
    app: &AppHandle,
    instance_id: Uuid,
    config: Config<T>,
    managed_java: Option<&std::path::Path>,
) -> Result<u32, LauncherError> {
    // The launch adapter exposes the game's stdout and stderr through the
    // Lyceris emitter. Keep one
    // listener alive for the whole install/launch operation so Mission
    // Control receives actual Minecraft output instead of only launcher
    // phase messages.  `launch` clones the emitter into its stdout reader,
    // therefore the listener also remains active after this function returns.
    let emitter = GameEmitter::default();
    let log_app = app.clone();
    emitter
        .on(Event::Console, move |line: String| {
            emit_game_console_line(&log_app, instance_id, line);
        })
        .await;

    emit_launch_log(
        app,
        instance_id,
        "info",
        "install",
        "Downloading and verifying required game files.",
    );
    install(&config, Some(&emitter)).await.map_err(|error| {
        LauncherError::Internal(format!("Minecraft installation failed: {error}"))
    })?;
    emit_launch_log(
        app,
        instance_id,
        "success",
        "install",
        "Game files and libraries verified.",
    );

    // On Windows the launch adapter prefers javaw.exe, so no console window
    // is opened. Dropping tokio::process::Child does not terminate the game.
    emit_launch_log(
        app,
        instance_id,
        "info",
        "process",
        "Starting the windowless Java game process.",
    );
    let child = super::managed_launch::launch(&config, Some(&emitter), managed_java).await?;
    let process_id = child.id().ok_or_else(|| {
        LauncherError::Internal("Minecraft process did not expose a process id.".into())
    })?;
    drop(child);
    Ok(process_id)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LauncherLogEvent {
    timestamp: String,
    level: String,
    phase: String,
    message: String,
    instance_id: String,
}

fn emit_launch_log(app: &AppHandle, instance_id: Uuid, level: &str, phase: &str, message: &str) {
    let _ = app.emit(
        "launcher-log",
        LauncherLogEvent {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_owned(),
            phase: phase.to_owned(),
            message: message.to_owned(),
            instance_id: instance_id.to_string(),
        },
    );
}

fn emit_game_console_line(app: &AppHandle, instance_id: Uuid, line: String) {
    let message = line.trim_end_matches(['\r', '\n']);
    if message.trim().is_empty() {
        return;
    }
    emit_launch_log(app, instance_id, "info", "game", message);
}

async fn resolve_loader_version(
    http: &reqwest::Client,
    instance: &Instance,
) -> Result<String, LauncherError> {
    if let Some(version) = instance
        .loader_version
        .as_deref()
        .map(str::trim)
        .filter(|version| !version.is_empty())
    {
        return Ok(version.to_owned());
    }

    match instance.loader {
        InstanceLoader::Vanilla => Ok(String::new()),
        InstanceLoader::Fabric => resolve_fabric(http, &instance.game_version).await,
        InstanceLoader::Quilt => resolve_quilt(http, &instance.game_version).await,
        InstanceLoader::Forge => resolve_forge(http, &instance.game_version).await,
        InstanceLoader::Neoforge => resolve_neoforge(http, &instance.game_version).await,
    }
}

#[derive(Deserialize)]
struct FabricEntry {
    loader: LoaderVersion,
}

#[derive(Deserialize)]
struct LoaderVersion {
    version: String,
}

async fn resolve_fabric(
    http: &reqwest::Client,
    game_version: &str,
) -> Result<String, LauncherError> {
    let url = format!("https://meta.fabricmc.net/v2/versions/loader/{game_version}");
    let entries: Vec<FabricEntry> = http
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    entries
        .into_iter()
        .next()
        .map(|entry| entry.loader.version)
        .ok_or_else(|| {
            LauncherError::NotFound(format!(
                "No Fabric loader supports Minecraft {game_version}."
            ))
        })
}

#[derive(Deserialize)]
struct QuiltEntry {
    loader: LoaderVersion,
}

async fn resolve_quilt(
    http: &reqwest::Client,
    game_version: &str,
) -> Result<String, LauncherError> {
    let url = format!("https://meta.quiltmc.org/v3/versions/loader/{game_version}");
    let entries: Vec<QuiltEntry> = http
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    entries
        .into_iter()
        .next()
        .map(|entry| entry.loader.version)
        .ok_or_else(|| {
            LauncherError::NotFound(format!(
                "No Quilt loader supports Minecraft {game_version}."
            ))
        })
}

#[derive(Deserialize)]
struct ForgePromotions {
    promos: HashMap<String, String>,
}

async fn resolve_forge(
    http: &reqwest::Client,
    game_version: &str,
) -> Result<String, LauncherError> {
    let promotions: ForgePromotions = http
        .get("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let recommended = format!("{game_version}-recommended");
    let latest = format!("{game_version}-latest");
    let loader = promotions
        .promos
        .get(&recommended)
        .or_else(|| promotions.promos.get(&latest))
        .ok_or_else(|| {
            LauncherError::NotFound(format!(
                "No Forge loader supports Minecraft {game_version}."
            ))
        })?;
    Ok(format!("{game_version}-{loader}"))
}

async fn resolve_neoforge(
    http: &reqwest::Client,
    game_version: &str,
) -> Result<String, LauncherError> {
    let metadata = http
        .get("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml")
        .send()
        .await?
        .error_for_status()?
        .text()
        .await?;

    // NeoForge maps Minecraft 1.21.1 -> loader 21.1.x, 1.21.4 -> 21.4.x.
    let mut parts = game_version.split('.');
    let _major = parts.next();
    let minor = parts.next().unwrap_or_default();
    let patch = parts.next().unwrap_or("0");
    let prefix = format!("{minor}.{patch}.");

    metadata
        .split("<version>")
        .skip(1)
        .filter_map(|part| part.split("</version>").next())
        .filter(|version| version.starts_with(&prefix))
        .last()
        .map(str::to_owned)
        .ok_or_else(|| {
            LauncherError::NotFound(format!(
                "No NeoForge loader supports Minecraft {game_version}."
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::LaunchOptions;

    #[test]
    fn launch_options_emit_bounded_minecraft_arguments() {
        let arguments = LaunchOptions {
            width: Some(100),
            height: Some(10_000),
            fullscreen: true,
        }
        .game_arguments();

        assert_eq!(
            arguments,
            ["--width", "800", "--height", "4320", "--fullscreen"]
        );
    }

    #[test]
    fn launch_options_do_not_emit_partial_resolution() {
        assert!(LaunchOptions {
            width: Some(1_920),
            height: None,
            fullscreen: false,
        }
        .game_arguments()
        .is_empty());
    }
}
