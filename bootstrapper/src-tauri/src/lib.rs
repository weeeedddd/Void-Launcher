mod commands;
mod error;
mod installer;
mod shortcuts;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(state::InstallerState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_default_install_path,
            commands::install_client,
            commands::finish_and_launch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Void Bootstrapper");
}
