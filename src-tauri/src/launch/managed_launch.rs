//! Lyceris-compatible process launch with support for a launcher-managed Java
//! executable.
//!
//! Lyceris 1.1.3 correctly installs Minecraft, assets, libraries and loader
//! metadata, but its public launch function always selects the Mojang runtime
//! below `Config::runtime_dir`. Void Launcher also offers verified Temurin
//! runtimes per instance. This module mirrors Lyceris' public argument
//! assembly and changes only the executable selection, so an instance's
//! persisted `java_path` is actually honored.

use std::{collections::HashMap, fs::create_dir_all, path::Path, process::Stdio};

use lyceris::{
    auth::AuthMethod,
    json::version::meta::vanilla::{Arguments, Element, Value, VersionMeta},
    minecraft::{
        config::{Config, Memory},
        emitter::{Emitter, Event},
        loader::Loader,
        parse::ParseRule,
        CLASSPATH_SEPARATOR,
    },
    read_json,
};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::{Child, Command},
};
use uuid::Uuid;

use crate::error::LauncherError;

/// Starts an installed Minecraft configuration. When `managed_java` is set,
/// that exact executable is used; otherwise the standard Lyceris/Mojang
/// runtime resolution remains the fallback.
pub async fn launch<T: Loader>(
    config: &Config<T>,
    emitter: Option<&Emitter>,
    managed_java: Option<&Path>,
) -> Result<Child, LauncherError> {
    let version_name = config.get_version_name();
    let mut arguments = Vec::<String>::with_capacity(100);
    let meta: VersionMeta = read_json(&config.get_version_json_path())
        .await
        .map_err(|error| {
            LauncherError::Internal(format!(
                "Could not read installed Minecraft metadata: {error}"
            ))
        })?;
    let profile_dir = config
        .profile
        .clone()
        .map(|profile| profile.root.join(profile.name));
    let current_dir = profile_dir.as_ref().unwrap_or(&config.game_dir);

    let meta_arguments = meta.arguments.unwrap_or_else(|| Arguments {
        game: meta
            .minecraft_arguments
            .unwrap_or_default()
            .split_whitespace()
            .map(|argument| Element::String(argument.to_owned()))
            .collect(),
        jvm: vec![
            Element::String("-Djava.library.path=${natives_directory}".to_owned()),
            Element::String("-cp".to_owned()),
            Element::String("${classpath}".to_owned()),
        ],
    });

    let mut variables = HashMap::<&'static str, String>::with_capacity(20);
    let mut insert_variable = |key: &'static str, value: String| {
        variables.insert(key, value);
    };

    match &config.authentication {
        AuthMethod::Microsoft {
            username,
            xuid,
            uuid,
            access_token,
            ..
        } => {
            insert_variable("${auth_player_name}", username.clone());
            insert_variable("${auth_xuid}", xuid.clone());
            insert_variable("${auth_uuid}", uuid.clone());
            insert_variable("${auth_access_token}", access_token.clone());
            insert_variable("${user_type}", "msa".to_owned());
        }
        AuthMethod::Offline { username, uuid } => {
            // Void Launcher never builds an offline AuthMethod. Keeping the
            // upstream branch makes the generic argument builder exhaustive.
            let uuid = uuid.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
            insert_variable("${auth_player_name}", username.clone());
            insert_variable("${auth_xuid}", uuid.clone());
            insert_variable("${auth_uuid}", uuid);
            insert_variable("${auth_access_token}", "token".to_owned());
            insert_variable("${user_type}", "mojang".to_owned());
        }
    }

    insert_variable("${clientid}", "00000000402b5328".to_owned());
    insert_variable("${user_properties}", String::new());
    insert_variable("${launcher_name}", "Void Launcher".to_owned());
    insert_variable("${launcher_version}", env!("CARGO_PKG_VERSION").to_owned());
    insert_variable("${version_name}", version_name);
    insert_variable(
        "${game_directory}",
        current_dir.to_string_lossy().into_owned(),
    );

    let assets_dir = config.get_assets_path();
    insert_variable("${assets_root}", assets_dir.to_string_lossy().into_owned());
    insert_variable(
        "${game_assets}",
        assets_dir
            .join("virtual")
            .join("legacy")
            .to_string_lossy()
            .into_owned(),
    );
    insert_variable("${assets_index_name}", meta.asset_index.id);
    insert_variable("${version_type}", meta.r#type);
    insert_variable(
        "${natives_directory}",
        config
            .get_natives_path()
            .join(&config.version)
            .to_string_lossy()
            .into_owned(),
    );

    let libraries_path = config.get_libraries_path();
    let mut classpath: Vec<String> = meta
        .libraries
        .iter()
        .filter_map(|library| {
            if library.skip_args {
                return None;
            }
            library.downloads.as_ref().and_then(|downloads| {
                downloads.artifact.as_ref().and_then(|artifact| {
                    artifact.path.as_ref().and_then(|path| {
                        if library.rules.parse_rule() && library.natives.is_none() {
                            Some(libraries_path.join(path).to_string_lossy().into_owned())
                        } else {
                            None
                        }
                    })
                })
            })
        })
        .collect();
    classpath.push(config.get_version_jar_path().to_string_lossy().into_owned());
    insert_variable("${classpath}", classpath.join(CLASSPATH_SEPARATOR));
    insert_variable(
        "${library_directory}",
        libraries_path.to_string_lossy().into_owned(),
    );
    insert_variable("${classpath_separator}", CLASSPATH_SEPARATOR.to_owned());

    match &config.memory {
        Some(Memory::Gigabyte(value)) => arguments.push(format!("-Xmx{value}G")),
        Some(Memory::Megabyte(value)) => arguments.push(format!("-Xmx{value}M")),
        None => arguments.push("-Xmx2G".to_owned()),
    }

    for argument in meta_arguments.jvm {
        match argument {
            Element::String(value) => arguments.push(replace_variables(&variables, value)),
            Element::Class(class) if class.rules.parse_rule() => match class.value {
                Value::Single(value) => arguments.push(replace_variables(&variables, value)),
                Value::Multiple(values) => arguments.extend(
                    values
                        .into_iter()
                        .map(|value| replace_variables(&variables, value)),
                ),
            },
            Element::Class(_) => {}
        }
    }
    arguments.extend(
        config
            .custom_java_args
            .iter()
            .cloned()
            .map(|argument| replace_variables(&variables, argument)),
    );
    arguments.push(meta.main_class);
    for argument in meta_arguments.game {
        if let Element::String(value) = argument {
            arguments.push(replace_variables(&variables, value));
        }
    }
    arguments.extend(
        config
            .custom_args
            .iter()
            .cloned()
            .map(|argument| replace_variables(&variables, argument)),
    );

    let java_path = match managed_java {
        Some(path) => preferred_java_binary(path)?,
        None => config
            .get_java_path(&meta.java_version.unwrap_or_default())
            .await
            .map_err(|error| {
                LauncherError::Internal(format!(
                    "Could not resolve the Minecraft Java runtime: {error}"
                ))
            })?,
    };

    create_dir_all(current_dir)?;
    let mut command = Command::new(&java_path);
    command.args(arguments).current_dir(current_dir);
    if emitter.is_some() {
        command.stdout(Stdio::piped()).stderr(Stdio::piped());
    } else {
        command.stdout(Stdio::null()).stderr(Stdio::null());
    }
    let mut child = command.spawn().map_err(|error| {
        LauncherError::Internal(format!(
            "Could not start Java at {}: {error}",
            java_path.display()
        ))
    })?;

    if let Some(emitter) = emitter {
        if let Some(stdout) = child.stdout.take() {
            forward_lines(stdout, emitter.clone());
        }
        if let Some(stderr) = child.stderr.take() {
            forward_lines(stderr, emitter.clone());
        }
    }

    Ok(child)
}

fn replace_variables(variables: &HashMap<&'static str, String>, argument: String) -> String {
    variables
        .iter()
        .fold(argument, |value, (key, replacement)| {
            value.replace(*key, replacement)
        })
}

fn preferred_java_binary(path: &Path) -> Result<std::path::PathBuf, LauncherError> {
    let mut candidate = path.to_path_buf();

    #[cfg(target_os = "windows")]
    if path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("java.exe"))
    {
        let javaw = path.with_file_name("javaw.exe");
        if javaw.is_file() {
            candidate = javaw;
        }
    }

    if !candidate.is_file() {
        return Err(LauncherError::NotFound(format!(
            "The configured Java executable no longer exists: {}",
            candidate.display()
        )));
    }
    Ok(candidate)
}

fn forward_lines<R>(reader: R, emitter: Emitter)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(reader).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            emitter.emit(Event::Console, line).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{preferred_java_binary, replace_variables};
    use std::{collections::HashMap, fs};

    #[test]
    fn replaces_launcher_variables_without_shell_interpolation() {
        let variables = HashMap::from([
            ("${game_directory}", "C:/Void/profile".to_owned()),
            ("${auth_player_name}", "VerifiedPlayer".to_owned()),
        ]);
        assert_eq!(
            replace_variables(
                &variables,
                "--gameDir=${game_directory};name=${auth_player_name}".to_owned()
            ),
            "--gameDir=C:/Void/profile;name=VerifiedPlayer"
        );
    }

    #[test]
    fn managed_java_must_be_a_real_file() {
        let missing = std::env::temp_dir().join("void-managed-java-does-not-exist");
        let _ = fs::remove_file(&missing);
        assert!(preferred_java_binary(&missing).is_err());
    }
}
