use crate::error::BootstrapError;
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
const SHORTCUT_SCRIPT: &str = r#"
$ErrorActionPreference = 'Stop'
$target = [Environment]::GetEnvironmentVariable('VOID_BOOTSTRAPPER_TARGET', 'Process')
$workingDirectory = [Environment]::GetEnvironmentVariable('VOID_BOOTSTRAPPER_WORKDIR', 'Process')
if ([String]::IsNullOrWhiteSpace($target) -or [String]::IsNullOrWhiteSpace($workingDirectory)) {
    throw 'Required shortcut values are unavailable.'
}
if (-not [IO.File]::Exists($target)) {
    throw 'The installed client does not exist.'
}
$desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
$programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
if ([String]::IsNullOrWhiteSpace($desktop) -or [String]::IsNullOrWhiteSpace($programs)) {
    throw 'Windows shortcut folders are unavailable.'
}
$startMenuDirectory = [IO.Path]::Combine($programs, 'Void Launcher')
[IO.Directory]::CreateDirectory($startMenuDirectory) | Out-Null
$shortcutPaths = @(
    [IO.Path]::Combine($desktop, 'Void Launcher.lnk'),
    [IO.Path]::Combine($startMenuDirectory, 'Void Launcher.lnk')
)
$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in $shortcutPaths) {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $target
    $shortcut.WorkingDirectory = $workingDirectory
    $shortcut.IconLocation = $target + ',0'
    $shortcut.Description = 'Launch Void Launcher'
    $shortcut.Save()
}
$protocolRoot = 'HKCU:\Software\Classes\voidlauncher'
$protocolCommand = $protocolRoot + '\shell\open\command'
New-Item -Path $protocolCommand -Force | Out-Null
Set-Item -Path $protocolRoot -Value 'URL:Void Launcher Protocol'
New-ItemProperty -Path $protocolRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$quotedTarget = [char]34 + $target + [char]34
$quotedUrl = [char]34 + '%1' + [char]34
Set-Item -Path $protocolCommand -Value ($quotedTarget + ' ' + $quotedUrl)
"#;

#[cfg(target_os = "windows")]
fn powershell_executable() -> Result<PathBuf, BootstrapError> {
    let system_root = std::env::var_os("SystemRoot")
        .map(PathBuf::from)
        .ok_or(BootstrapError::ShortcutCreationFailed)?;
    let powershell = system_root
        .join("System32")
        .join("WindowsPowerShell")
        .join("v1.0")
        .join("powershell.exe");
    if !powershell.is_absolute() || !powershell.is_file() {
        return Err(BootstrapError::ShortcutCreationFailed);
    }
    Ok(powershell)
}

#[cfg(target_os = "windows")]
pub fn create_shortcuts(executable: &Path) -> Result<(), BootstrapError> {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    if !executable.is_absolute() || !executable.is_file() {
        return Err(BootstrapError::ShortcutCreationFailed);
    }
    let working_directory = executable
        .parent()
        .filter(|parent| parent.is_dir())
        .ok_or(BootstrapError::ShortcutCreationFailed)?;

    let status = std::process::Command::new(powershell_executable()?)
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            SHORTCUT_SCRIPT,
        ])
        .env("VOID_BOOTSTRAPPER_TARGET", executable.as_os_str())
        .env("VOID_BOOTSTRAPPER_WORKDIR", working_directory.as_os_str())
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|_| BootstrapError::ShortcutCreationFailed)?;

    if !status.success() {
        return Err(BootstrapError::ShortcutCreationFailed);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn create_shortcuts(_executable: &Path) -> Result<(), BootstrapError> {
    Err(BootstrapError::UnsupportedPlatform)
}
