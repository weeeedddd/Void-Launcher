use std::{
    path::PathBuf,
    sync::{atomic::AtomicBool, Mutex},
};

#[derive(Default)]
pub struct InstallerState {
    pub install_in_progress: AtomicBool,
    pub installed_executable: Mutex<Option<PathBuf>>,
}
