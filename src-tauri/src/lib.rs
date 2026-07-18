//! Void Launcher — Rust backend.
//!
//! Module map:
//!   auth/        Microsoft → Xbox Live → XSTS → Minecraft token chain
//!   modplatform/ Modrinth & CurseForge clients behind one unified model
//!   instance/    Instance (modpack) management: create, settings, mods
//!   launch/      Java argument assembly & process spawning
//!   state.rs     Shared app state (HTTP client, data dir, session)
//!   error.rs     One error type for every command
//!
//! Everything the frontend can do goes through the `#[tauri::command]`
//! functions registered in `invoke_handler` below — the WebView has no
//! network or filesystem access of its own.

pub mod auth;
pub mod error;
pub mod instance;
pub mod launch;
pub mod modplatform;
pub mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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

            app.manage(state::AppState::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // auth
            auth::commands::begin_microsoft_login,
            auth::commands::complete_microsoft_login,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Void Launcher");
}
