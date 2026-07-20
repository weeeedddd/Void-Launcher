//! Void Launcher — Rust backend.
//!
//! Module map:
//!   auth/        Microsoft → Xbox Live → XSTS → Minecraft token chain
//!   modplatform/ Modrinth & CurseForge clients behind one unified model
//!   instance/    Instance (modpack) management: create, settings, mods
//!   launch/      Java argument assembly & process spawning
//!   system/      Hardware scan, performance optimizer, Java auto-management
//!   state.rs     Shared app state (HTTP client, data dir, session)
//!   error.rs     One error type for every command
//!
//! Everything the frontend can do goes through the `#[tauri::command]`
//! functions registered in `invoke_handler` below — the WebView has no
//! network or filesystem access of its own.

pub mod auth;
pub mod diagnostics;
pub mod error;
pub mod instance;
pub mod launch;
pub mod modplatform;
pub mod music;
pub mod state;
pub mod system;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered FIRST: when a second process starts (on Windows
        // that's how clicked voidlauncher:// links arrive once the app is
        // running), it forwards the argv here and exits — we relay any deep
        // links to the UI and refocus the existing window.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let links: Vec<String> = argv
                .into_iter()
                .filter(|arg| arg.starts_with("voidlauncher://"))
                .collect();
            if !links.is_empty() {
                let _ = app.emit("deep-link", links);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // All launcher data lives in the OS-standard app-data location:
            //   Linux:   ~/.local/share/dev.void.launcher
            //   Windows: %APPDATA%\dev.void.launcher
            //   macOS:   ~/Library/Application Support/dev.void.launcher
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve the app data directory");
            std::fs::create_dir_all(data_dir.join("instances"))?;
            std::fs::create_dir_all(data_dir.join("java"))?;
            std::fs::create_dir_all(data_dir.join("logs"))?;
            std::fs::create_dir_all(data_dir.join("assets"))?;
            std::fs::create_dir_all(data_dir.join("cache"))?;
            app.manage(state::AppState::new(data_dir));

            // voidlauncher:// links delivered while the app runs (and the
            // cold-start link on macOS). The frontend listens for the
            // "deep-link" event and routes it (see src/VoidClientApp.tsx).
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let urls: Vec<String> =
                        event.urls().iter().map(|url| url.to_string()).collect();
                    let _ = handle.emit("deep-link", urls);
                });

                // Production installs register the voidlauncher:// scheme via
                // the installer (NSIS/deb); in dev we register at runtime so
                // links work with `npm run tauri dev` too (Windows/Linux).
                #[cfg(debug_assertions)]
                if let Err(err) = app.deep_link().register_all() {
                    eprintln!("deep-link dev registration failed: {err}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // auth
            auth::commands::begin_microsoft_login,
            auth::commands::complete_microsoft_login,
            // Spotify + Google/YouTube OAuth and playback
            music::connect_music_provider,
            music::get_music_connection,
            music::control_music_playback,
            music::disconnect_music_provider,
            // mod platforms
            modplatform::commands::search_mods,
            modplatform::commands::get_mod_versions,
            // instances
            instance::commands::list_instances,
            instance::commands::create_instance,
            instance::commands::update_instance_settings,
            instance::commands::install_mod,
            instance::commands::set_mod_enabled,
            // launching
            launch::commands::launch_instance,
            // system: optimizer & java management
            system::commands::get_hardware_report,
            system::commands::get_java_status,
            system::commands::ensure_java_for_instance,
            system::commands::optimize_instance,
            // local settings
            state::get_settings_status,
            state::set_curseforge_api_key,
            // storage and native launcher controls
            diagnostics::commands::get_storage_report,
            diagnostics::commands::open_launcher_folder,
            diagnostics::commands::clear_storage_category,
            diagnostics::commands::restart_launcher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Void Launcher");
}
