use std::collections::HashMap;

use lyceris::auth::AuthMethod;
use lyceris::minecraft::config::{Config, ConfigBuilder, Memory, Profile};
use lyceris::minecraft::install::install;
use lyceris::minecraft::launch::launch;
use lyceris::minecraft::loader::{
    fabric::Fabric, forge::Forge, neoforge::NeoForge, quilt::Quilt, Loader,
};
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::error::LauncherError;
use crate::instance::{Instance, InstanceLoader};
use crate::state::AppState;

/// Installs and starts one authenticated Minecraft instance.
///
/// Offline/developer profiles continue to use `developer_test_mode`, which is
/// intentionally a UI-only simulation. A real launch always requires the
/// Microsoft -> Xbox -> Minecraft ownership flow stored in native AppState.
#[tauri::command]
pub async fn launch_instance(
    state: State<'_, AppState>,
    instance_id: Uuid,
    developer_test_mode: bool,
) -> Result<(), LauncherError> {
    let instances_root = state.instances_dir();
    let mut instance = Instance::find(&instances_root, instance_id)?;

    if developer_test_mode {
        tokio::time::sleep(std::time::Duration::from_millis(1_250)).await;
        return Ok(());
    }

    let session = state.session.read().await.clone().ok_or_else(|| {
        LauncherError::Auth("Sign in with Microsoft before launching Minecraft.".into())
    })?;
    if session.is_expired() {
        return Err(LauncherError::Auth(
            "Your Minecraft session expired. Sign in with Microsoft again.".into(),
        ));
    }

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
        .client(state.http.clone());

    match instance.loader {
        InstanceLoader::Vanilla => install_and_launch(builder.build()).await?,
        InstanceLoader::Fabric => {
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(builder.loader(Fabric(version).into()).build()).await?;
        }
        InstanceLoader::Forge => {
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(builder.loader(Forge(version).into()).build()).await?;
        }
        InstanceLoader::Neoforge => {
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(builder.loader(NeoForge(version).into()).build()).await?;
        }
        InstanceLoader::Quilt => {
            let version = resolve_loader_version(&state.http, &instance).await?;
            install_and_launch(builder.loader(Quilt(version).into()).build()).await?;
        }
    }

    instance.last_played_at = Some(chrono::Utc::now());
    instance.save(&instances_root)?;
    Ok(())
}

async fn install_and_launch<T: Loader>(config: Config<T>) -> Result<(), LauncherError> {
    install(&config, None).await.map_err(|error| {
        LauncherError::Internal(format!("Minecraft installation failed: {error}"))
    })?;

    // On Windows Lyceris resolves javaw.exe, so no console window is opened.
    // Dropping tokio::process::Child does not terminate the spawned game.
    let child = launch(&config, None)
        .await
        .map_err(|error| LauncherError::Internal(format!("Minecraft launch failed: {error}")))?;
    drop(child);
    Ok(())
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
