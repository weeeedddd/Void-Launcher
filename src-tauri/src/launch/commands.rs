use tauri::State;
use uuid::Uuid;

use crate::error::LauncherError;
use crate::instance::Instance;
use crate::state::AppState;

/// Launches an instance.
///
/// Scaffold status: validates the preconditions (instance exists, user is
/// signed in with a non-expired session) and then reports what's missing.
/// Once the Milestone-3 download pipeline exists, the marked block below
/// turns into the real launch.
#[tauri::command]
pub async fn launch_instance(
    state: State<'_, AppState>,
    instance_id: Uuid,
) -> Result<(), LauncherError> {
    let root = state.instances_dir();
    let instance = Instance::find(&root, instance_id)?;

    let session = state
        .session
        .read()
        .await
        .clone()
        .ok_or_else(|| LauncherError::Auth("Sign in with your Microsoft account first.".into()))?;
    if session.is_expired() {
        // TODO: silently refresh via the stored MSA refresh token instead.
        return Err(LauncherError::Auth("Your session expired — please sign in again.".into()));
    }

    // ── Milestone 3 wiring ──────────────────────────────────────────────
    // let files = pipeline::ensure_game_files(&state, &instance).await?;  // manifest, jars, assets, loader
    // let jvm   = super::build_jvm_args(&instance, &files.natives_dir, &files.classpath);
    // let game  = super::build_game_args(&instance, &session, &files.game_dir,
    //                                    &files.assets_dir, &files.asset_index_id);
    // super::spawn_game(&files.java_executable, jvm, &files.main_class, game, &files.game_dir)?;
    // ────────────────────────────────────────────────────────────────────

    let _ = (&instance, &session); // used by the block above once it exists

    Err(LauncherError::NotImplemented(format!(
        "'{}' is ready to launch, but the game-file download pipeline is not built yet \
         (Roadmap → Milestone 3 in docs/CONCEPT.md).",
        instance.name
    )))
}
