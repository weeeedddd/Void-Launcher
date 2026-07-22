//! Native controls for the Minecraft process launched by this app.
//!
//! The launcher records only the PID it created. It never accepts arbitrary
//! process names or PIDs from the WebView, which keeps priority changes scoped
//! to the current Minecraft session.

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{error::LauncherError, state::AppState};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProcessPriority {
    Normal,
    High,
}

impl ProcessPriority {
    fn label(self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::High => "high",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftProcessStatus {
    pub pid: Option<u32>,
    pub running: bool,
    pub priority: String,
    pub supported: bool,
    pub message: String,
}

#[tauri::command]
pub fn get_minecraft_process(state: State<'_, AppState>) -> MinecraftProcessStatus {
    let status = process_status(state.minecraft_pid());
    if status.pid.is_some() && !status.running {
        // Do not keep exposing a recycled/stale Windows PID after Minecraft
        // exits. Future priority requests must require a newly launched game.
        state.set_minecraft_pid(None);
    }
    status
}

#[tauri::command]
pub fn set_minecraft_process_priority(
    state: State<'_, AppState>,
    priority: ProcessPriority,
) -> Result<MinecraftProcessStatus, LauncherError> {
    let pid = state.minecraft_pid().ok_or_else(|| {
        LauncherError::NotFound("Minecraft is not running from this launcher session.".into())
    })?;
    set_priority(pid, priority)?;
    Ok(process_status(Some(pid)))
}

fn process_status(pid: Option<u32>) -> MinecraftProcessStatus {
    let Some(pid) = pid else {
        return MinecraftProcessStatus {
            pid: None,
            running: false,
            priority: "normal".into(),
            supported: cfg!(windows),
            message: "Minecraft has not been launched by this session.".into(),
        };
    };

    #[cfg(windows)]
    {
        let Some(priority) = read_priority(pid) else {
            return MinecraftProcessStatus {
                pid: Some(pid),
                running: false,
                priority: "normal".into(),
                supported: true,
                message: "The Minecraft process is no longer running.".into(),
            };
        };
        MinecraftProcessStatus {
            pid: Some(pid),
            running: true,
            priority,
            supported: true,
            message: "Minecraft process is managed by Void Launcher.".into(),
        }
    }

    #[cfg(not(windows))]
    {
        MinecraftProcessStatus {
            pid: Some(pid),
            running: false,
            priority: "normal".into(),
            supported: false,
            message: "Process priority controls are currently implemented for Windows only.".into(),
        }
    }
}

#[cfg(windows)]
fn set_priority(pid: u32, priority: ProcessPriority) -> Result<(), LauncherError> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, SetPriorityClass, HIGH_PRIORITY_CLASS, NORMAL_PRIORITY_CLASS,
        PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_INFORMATION,
    };

    let handle = unsafe {
        OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SET_INFORMATION,
            0,
            pid,
        )
    };
    if handle.is_null() {
        return Err(LauncherError::Internal(format!(
            "Could not open Minecraft process {pid} for priority control."
        )));
    }
    let class = match priority {
        ProcessPriority::Normal => NORMAL_PRIORITY_CLASS,
        ProcessPriority::High => HIGH_PRIORITY_CLASS,
    };
    let result = unsafe { SetPriorityClass(handle, class) };
    unsafe { CloseHandle(handle) };
    if result == 0 {
        return Err(LauncherError::Internal(format!(
            "Windows rejected the {} priority for Minecraft.",
            priority.label()
        )));
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_priority(_pid: u32, _priority: ProcessPriority) -> Result<(), LauncherError> {
    Err(LauncherError::NotImplemented(
        "Process priority controls are currently implemented for Windows only.".into(),
    ))
}

#[cfg(windows)]
fn read_priority(pid: u32) -> Option<String> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{
        GetPriorityClass, OpenProcess, HIGH_PRIORITY_CLASS, NORMAL_PRIORITY_CLASS,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };

    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return None;
    }
    let class = unsafe { GetPriorityClass(handle) };
    unsafe { CloseHandle(handle) };
    match class {
        HIGH_PRIORITY_CLASS => Some("high".into()),
        NORMAL_PRIORITY_CLASS => Some("normal".into()),
        0 => None,
        _ => Some("custom".into()),
    }
}
