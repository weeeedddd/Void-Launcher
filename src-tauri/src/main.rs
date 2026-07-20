// Hide the console window on Windows in both debug and release builds.
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

fn main() {
    void_launcher_lib::run()
}
