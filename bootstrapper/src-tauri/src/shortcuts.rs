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
$programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
if ([String]::IsNullOrWhiteSpace($programs)) {
    $appData = [Environment]::GetEnvironmentVariable('APPDATA', 'Process')
    if (-not [String]::IsNullOrWhiteSpace($appData)) {
        $programs = [IO.Path]::Combine($appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    }
}
if ([String]::IsNullOrWhiteSpace($programs)) {
    throw 'The Windows Start Menu folder is unavailable.'
}
$startMenuDirectory = [IO.Path]::Combine($programs, 'Void Launcher')
[IO.Directory]::CreateDirectory($startMenuDirectory) | Out-Null

function Resolve-DesktopDirectory {
    $candidates = [Collections.Generic.List[string]]::new()
    $specialFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    if (-not [String]::IsNullOrWhiteSpace($specialFolder)) {
        $candidates.Add($specialFolder)
    }

    try {
        $registryDesktop = (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -Name Desktop -ErrorAction Stop).Desktop
        if (-not [String]::IsNullOrWhiteSpace($registryDesktop)) {
            $candidates.Add([Environment]::ExpandEnvironmentVariables($registryDesktop))
        }
    } catch {}

    foreach ($oneDriveVariable in @('OneDrive', 'OneDriveConsumer')) {
        $oneDrive = [Environment]::GetEnvironmentVariable($oneDriveVariable, 'Process')
        if (-not [String]::IsNullOrWhiteSpace($oneDrive)) {
            $candidates.Add([IO.Path]::Combine($oneDrive, 'Desktop'))
        }
    }

    $userProfile = [Environment]::GetEnvironmentVariable('USERPROFILE', 'Process')
    if (-not [String]::IsNullOrWhiteSpace($userProfile)) {
        $candidates.Add([IO.Path]::Combine($userProfile, 'Desktop'))
    }

    foreach ($candidate in $candidates) {
        if (-not [String]::IsNullOrWhiteSpace($candidate) -and [IO.Directory]::Exists($candidate)) {
            return $candidate
        }
    }
    return $null
}

$desktop = Resolve-DesktopDirectory
$shell = New-Object -ComObject WScript.Shell
function Save-Shortcut([string]$shortcutPath) {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $target
    $shortcut.WorkingDirectory = $workingDirectory
    $shortcut.IconLocation = $target + ',0'
    $shortcut.Description = 'Launch Void Launcher'
    $shortcut.Save()
}

# The Start Menu entry is the reliable, required launcher entry point.
Save-Shortcut ([IO.Path]::Combine($startMenuDirectory, 'Void Launcher.lnk'))

# Desktop folders can be redirected, removed or managed by OneDrive. A missing
# or unwritable Desktop must not make an otherwise valid client install fail.
if (-not [String]::IsNullOrWhiteSpace($desktop)) {
    try {
        Save-Shortcut ([IO.Path]::Combine($desktop, 'Void Launcher.lnk'))
    } catch {}
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
