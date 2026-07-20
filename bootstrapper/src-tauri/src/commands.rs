use crate::{
    error::BootstrapError,
    installer::{
        default_install_path, emit_progress, install_release, validate_installation_directory,
        InstallGuard,
    },
    shortcuts::create_shortcuts,
    state::InstallerState,
};
use serde::Serialize;
use std::{fs::File, io::Read, path::Path};
use tauri::{AppHandle, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub installed_executable: String,
    pub version: String,
    pub shortcut_warning: Option<String>,
}

#[tauri::command]
pub fn get_default_install_path() -> String {
    default_install_path().to_string_lossy().into_owned()
}

#[tauri::command(rename_all = "camelCase")]
pub async fn install_client(
    app: AppHandle,
    state: State<'_, InstallerState>,
    installation_dir: String,
) -> Result<InstallResult, BootstrapError> {
    let _install_guard = InstallGuard::acquire(&state.install_in_progress)?;
    let installation_directory = validate_installation_directory(&installation_dir)?;

    {
        let mut installed = state
            .installed_executable
            .lock()
            .map_err(|_| BootstrapError::StateUnavailable)?;
        *installed = None;
    }

    let (installed_executable, version) = install_release(&app, &installation_directory).await?;
    verify_installed_executable(&installed_executable)?;

    let trusted_executable = std::fs::canonicalize(&installed_executable)?;

    {
        let mut installed = state
            .installed_executable
            .lock()
            .map_err(|_| BootstrapError::StateUnavailable)?;
        *installed = Some(trusted_executable);
    }

    emit_progress(
        &app,
        0,
        0,
        97,
        "Creating Desktop and Start Menu shortcuts...",
    );
    let shortcut_warning = create_shortcuts(&installed_executable)
        .err()
        .map(|_| "The client was installed, but Windows did not allow shortcut creation. You can launch it directly from the installation folder.".to_owned());

    let final_status = if shortcut_warning.is_some() {
        "Void Launcher is ready. Shortcut creation was skipped."
    } else {
        "Void Launcher is ready."
    };
    emit_progress(&app, 0, 0, 100, final_status);
    Ok(InstallResult {
        installed_executable: installed_executable.to_string_lossy().into_owned(),
        version,
        shortcut_warning,
    })
}

#[tauri::command]
pub fn finish_and_launch(
    app: AppHandle,
    state: State<'_, InstallerState>,
) -> Result<(), BootstrapError> {
    let executable = state
        .installed_executable
        .lock()
        .map_err(|_| BootstrapError::StateUnavailable)?
        .clone()
        .ok_or(BootstrapError::ClientNotInstalled)?;

    verify_installed_executable(&executable)?;
    launch_installed_client(&executable)?;
    app.exit(0);
    Ok(())
}

fn verify_installed_executable(executable: &Path) -> Result<(), BootstrapError> {
    if !executable.is_absolute()
        || executable.file_name().and_then(|name| name.to_str()) != Some("Void Launcher.exe")
        || !executable.is_file()
    {
        return Err(BootstrapError::ClientNotInstalled);
    }

    let mut file = File::open(executable)?;
    let mut signature = [0u8; 2];
    file.read_exact(&mut signature)
        .map_err(|_| BootstrapError::InvalidExecutable)?;
    if signature != *b"MZ" {
        return Err(BootstrapError::InvalidExecutable);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch_installed_client(executable: &Path) -> Result<(), BootstrapError> {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let working_directory = executable
        .parent()
        .ok_or(BootstrapError::ClientNotInstalled)?;
    std::process::Command::new(executable)
        .current_dir(working_directory)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| BootstrapError::LaunchFailed(error.to_string()))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn launch_installed_client(_executable: &Path) -> Result<(), BootstrapError> {
    Err(BootstrapError::UnsupportedPlatform)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temporary_directory() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("void-bootstrapper-command-test-{nonce}"))
    }

    #[test]
    fn executable_validation_requires_fixed_name_and_mz_header() {
        let directory = temporary_directory();
        fs::create_dir_all(&directory).unwrap();
        let executable = directory.join("Void Launcher.exe");
        fs::write(&executable, b"MZvalid-for-bootstrapper-test").unwrap();
        assert!(verify_installed_executable(&executable).is_ok());

        let wrong_name = directory.join("Other.exe");
        fs::write(&wrong_name, b"MZvalid-for-bootstrapper-test").unwrap();
        assert!(verify_installed_executable(&wrong_name).is_err());

        fs::write(&executable, b"not-an-executable").unwrap();
        assert!(verify_installed_executable(&executable).is_err());
        fs::remove_dir_all(directory).unwrap();
    }
}
