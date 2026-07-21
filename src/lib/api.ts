import { invoke } from "@tauri-apps/api/core";
import type {
  CreateInstanceSpec,
  DeviceCodeInfo,
  HardwareReport,
  GameVideoSettings,
  InstalledMod,
  InstalledShader,
  Instance,
  InstanceSettings,
  JavaRuntimeInfo,
  JavaStatus,
  MinecraftProfile,
  ModLoader,
  ModVersionInfo,
  OptimizationOutcome,
  OptimizationTier,
  Platform,
  SearchParams,
  SearchResultPage,
  DiscordRpcStatus,
  DiscordRpcUpdate,
  SettingsStatus,
  MusicConnectionState,
  MusicPlaybackAction,
  MusicProvider,
  LauncherFolderKind,
  StorageCategory,
  StorageReport,
} from "@/types";

/**
 * Typed wrapper around Tauri's `invoke`.
 *
 * Every function here corresponds 1:1 to a `#[tauri::command]` in
 * `src-tauri/src/**` — this file is the single place where the frontend
 * touches the IPC boundary, so components stay free of magic strings.
 *
 * Note: Tauri automatically converts camelCase argument names (JS) to
 * snake_case parameters (Rust), e.g. `instanceId` → `instance_id`.
 */
export const api = {
  // ── Authentication ────────────────────────────────────────────────────
  /** Step 1: request a device code the user enters on microsoft.com/link */
  beginMicrosoftLogin: () => invoke<DeviceCodeInfo>("begin_microsoft_login"),

  /** Step 2: blocks until the user finished the browser login, then runs
   *  the full Xbox→XSTS→Minecraft token chain on the Rust side. */
  completeMicrosoftLogin: (deviceCode: string) =>
    invoke<MinecraftProfile>("complete_microsoft_login", { deviceCode }),

  restoreMicrosoftSession: () => invoke<MinecraftProfile | null>("restore_microsoft_session"),

  // ── Spotify + Google/YouTube ───────────────────────────────────────────
  connectMusicProvider: (provider: MusicProvider) =>
    invoke<MusicConnectionState>("connect_music_provider", { provider }),

  getMusicConnection: (provider: MusicProvider) =>
    invoke<MusicConnectionState>("get_music_connection", { provider }),

  controlMusicPlayback: (
    provider: MusicProvider,
    action: MusicPlaybackAction,
    positionMs?: number,
  ) => invoke<MusicConnectionState>("control_music_playback", { provider, action, positionMs }),

  disconnectMusicProvider: (provider: MusicProvider) =>
    invoke<MusicConnectionState>("disconnect_music_provider", { provider }),

  // ── Mod platforms (Modrinth / CurseForge) ─────────────────────────────
  /** Unified search across the selected platform. */
  searchMods: (params: SearchParams) => invoke<SearchResultPage>("search_mods", { params }),

  /** All downloadable versions of a project, newest first. */
  getModVersions: (
    platform: Platform,
    projectId: string,
    gameVersion?: string,
    loader?: ModLoader,
  ) => invoke<ModVersionInfo[]>("get_mod_versions", { platform, projectId, gameVersion, loader }),

  // ── Instances (modpack builder) ───────────────────────────────────────
  listInstances: () => invoke<Instance[]>("list_instances"),

  createInstance: (spec: CreateInstanceSpec) => invoke<Instance>("create_instance", { spec }),

  updateInstanceSettings: (instanceId: string, settings: InstanceSettings) =>
    invoke<Instance>("update_instance_settings", { instanceId, settings }),

  /** Downloads the newest compatible version of a mod into the instance. */
  installMod: (instanceId: string, platform: Platform, projectId: string) =>
    invoke<InstalledMod>("install_mod", { instanceId, platform, projectId }),

  installShader: (instanceId: string, platform: Platform, projectId: string) =>
    invoke<InstalledShader>("install_shader", { instanceId, platform, projectId }),

  /** Enable/disable an installed mod (renames the jar to `*.jar.disabled`). */
  setModEnabled: (instanceId: string, fileName: string, enabled: boolean) =>
    invoke<void>("set_mod_enabled", { instanceId, fileName, enabled }),

  // ── Launching ─────────────────────────────────────────────────────────
  /** Installs, verifies and starts the selected instance with the native-held authenticated session. */
  launchInstance: (instanceId: string) =>
    invoke<void>("launch_instance", { instanceId, developerTestMode: false }),

  // ── Performance Optimizer & Java management ───────────────────────────
  /** Scans CPU, RAM, GPU and disk (runs on a Rust worker thread). */
  getHardwareReport: () => invoke<HardwareReport>("get_hardware_report"),

  /** Which Java an instance needs and whether it's already managed. */
  getJavaStatus: (instanceId: string) => invoke<JavaStatus>("get_java_status", { instanceId }),

  /** Downloads/verifies/extracts the matching Temurin JRE if missing.
   *  Progress arrives via the "java-download-progress" event. */
  ensureJavaForInstance: (instanceId: string) =>
    invoke<JavaRuntimeInfo>("ensure_java_for_instance", { instanceId }),

  /** Applies a full optimization pass (RAM, JVM flags, Java, GPU hint)
   *  to an instance and returns the transparent change log. */
  optimizeInstance: (instanceId: string, tier: OptimizationTier) =>
    invoke<OptimizationOutcome>("optimize_instance", { instanceId, tier }),

  applyGameVideoSettings: (instanceId: string, settings: GameVideoSettings) =>
    invoke<GameVideoSettings>("apply_game_video_settings", { instanceId, settings }),

  // ── Local settings ────────────────────────────────────────────────────────
  /** Reports only whether a key exists; the secret never comes back to React. */
  getSettingsStatus: () => invoke<SettingsStatus>("get_settings_status"),

  /** Saves a new key locally, or removes it when null is supplied. */
  setCurseforgeApiKey: (apiKey: string | null) =>
    invoke<SettingsStatus>("set_curseforge_api_key", { apiKey }),

  setAuthPersistence: (persistence: SettingsStatus["authPersistence"]) =>
    invoke<SettingsStatus>("set_auth_persistence", { persistence }),

  // ── Native storage and launcher controls ────────────────────────────────
  getStorageReport: () => invoke<StorageReport>("get_storage_report"),

  openLauncherFolder: (kind: LauncherFolderKind, instanceId?: string) =>
    invoke<void>("open_launcher_folder", { kind, instanceId }),

  clearStorageCategory: (category: Extract<StorageCategory, "logs" | "cache">) =>
    invoke<StorageReport>("clear_storage_category", { category }),

  restartLauncher: () => invoke<void>("restart_launcher"),

  getDiscordRpcStatus: () => invoke<DiscordRpcStatus>("get_discord_rpc_status"),

  updateDiscordRpc: (request: DiscordRpcUpdate) =>
    invoke<DiscordRpcStatus>("update_discord_rpc", { request }),
};
