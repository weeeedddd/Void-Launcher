//! System diagnostics & performance modules.
//!
//!   hardware.rs   CPU/RAM/GPU/disk detection (sysinfo + per-OS queries)
//!   java.rs       Automatic Temurin JRE download & isolated installs
//!   optimizer.rs  Tier heuristics: heap size, JVM flags, GPU preference
//!   commands.rs   The #[tauri::command] glue for all of the above

pub mod commands;
pub mod hardware;
pub mod java;
pub mod optimizer;
