//! Hardware detection for the Performance Optimizer.
//!
//! CPU, memory and disks come from the cross-platform `sysinfo` crate.
//! GPUs are not covered by sysinfo, so we ask the OS directly (WMI via
//! PowerShell on Windows, `lspci` on Linux, `system_profiler` on macOS).
//! A heavier but driver-accurate alternative is enumerating adapters with
//! the `wgpu` crate — overkill for a display string.

use std::path::Path;

use serde::Serialize;
use sysinfo::{Disks, System};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareReport {
    pub os: String,
    pub cpu_model: String,
    pub logical_cores: usize,
    pub cpu_frequency_mhz: u64,
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub gpus: Vec<String>,
    /// The disk that hosts the launcher's data directory (where instances,
    /// assets and Java runtimes are stored).
    pub disk_total_gb: f64,
    pub disk_available_gb: f64,
}

/// Takes a full snapshot of the machine.
///
/// Blocking (sysinfo refresh + child processes for GPU queries) — commands
/// call this through `spawn_blocking` so the async runtime stays free.
pub fn scan(data_dir: &Path) -> HardwareReport {
    let mut sys = System::new();
    sys.refresh_cpu_all();
    sys.refresh_memory();

    let cpu_model = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().trim().to_string())
        .filter(|brand| !brand.is_empty())
        .unwrap_or_else(|| "Unknown CPU".into());
    let cpu_frequency_mhz = sys.cpus().first().map(|cpu| cpu.frequency()).unwrap_or(0);

    // Find the disk whose mount point is the deepest prefix of our data dir
    // (on Windows that's simply the drive, on Linux e.g. "/" or "/home").
    let disks = Disks::new_with_refreshed_list();
    let (mut disk_total, mut disk_available, mut best_len) = (0u64, 0u64, 0usize);
    for disk in disks.list() {
        let mount = disk.mount_point();
        if data_dir.starts_with(mount) && mount.as_os_str().len() >= best_len {
            best_len = mount.as_os_str().len();
            disk_total = disk.total_space();
            disk_available = disk.available_space();
        }
    }

    HardwareReport {
        os: format!(
            "{} {}",
            System::name().unwrap_or_else(|| "Unknown OS".into()),
            System::os_version().unwrap_or_default()
        )
        .trim()
        .to_string(),
        cpu_model,
        logical_cores: sys.cpus().len(),
        cpu_frequency_mhz,
        total_memory_mb: sys.total_memory() / (1024 * 1024),
        available_memory_mb: sys.available_memory() / (1024 * 1024),
        gpus: detect_gpus(),
        disk_total_gb: disk_total as f64 / 1e9,
        disk_available_gb: disk_available as f64 / 1e9,
    }
}

/// GPU model names, best effort per OS. An empty list means "not detected"
/// — the UI copes, and gameplay is unaffected.
#[allow(unreachable_code)]
fn detect_gpus() -> Vec<String> {
    #[cfg(target_os = "windows")]
    return run_lines(
        "powershell",
        &[
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            // WMI class Win32_VideoController — one line per GPU.
            "$names = @(); try { $names += Get-CimInstance Win32_VideoController -ErrorAction Stop | ForEach-Object { $_.Name } } catch {}; try { $names += Get-PnpDevice -Class Display -PresentOnly -ErrorAction Stop | ForEach-Object { $_.FriendlyName } } catch {}; $names | Where-Object { $_ -and $_.Trim() } | Sort-Object -Unique",
        ],
    );

    #[cfg(target_os = "macos")]
    return run_lines(
        "sh",
        &[
            "-c",
            "system_profiler SPDisplaysDataType | awk -F': ' '/Chipset Model/ {print $2}'",
        ],
    );

    #[cfg(all(unix, not(target_os = "macos")))]
    return run_lines(
        "sh",
        &[
            "-c",
            "lspci 2>/dev/null | grep -Ei 'vga|3d|display' | sed 's/.*: //'",
        ],
    );

    Vec::new()
}

/// Runs a command and returns its non-empty stdout lines (empty on failure).
fn run_lines(program: &str, args: &[&str]) -> Vec<String> {
    let mut command = std::process::Command::new(program);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command
        .args(args)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| {
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .map(|line| line.trim().to_string())
                .filter(|line| !line.is_empty())
                .collect()
        })
        .unwrap_or_default()
}
