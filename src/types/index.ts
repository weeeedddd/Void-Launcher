/**
 * Shared frontend types.
 *
 * These mirror the Rust structs in `src-tauri/src/**` 1:1 — the Rust side
 * serializes everything with `#[serde(rename_all = "camelCase")]`, so the
 * JSON crossing the IPC boundary matches these shapes exactly.
 */

/** Mod distribution platforms we integrate with. */
export type Platform = "modrinth" | "curseforge";

/** Mod loaders supported by the mod platforms. */
export type ModLoader = "fabric" | "forge" | "neoforge" | "quilt";

export type ProjectType = "mod" | "modpack" | "shader";
export type SearchSort = "relevance" | "downloads" | "updated" | "name";

/** What an instance runs on — vanilla or one of the loaders. */
export type InstanceLoader = "vanilla" | ModLoader;

/** Parameters for a unified mod search (both platforms). */
export interface SearchParams {
  platform: Platform;
  query: string;
  projectType?: ProjectType;
  sort?: SearchSort;
  /** e.g. "1.21.1" — omit for "any version" */
  gameVersion?: string;
  /** omit for "any loader" */
  loader?: ModLoader;
  limit?: number;
  offset?: number;
}

/** Normalized search result — identical shape for Modrinth & CurseForge. */
export interface ModSummary {
  platform: Platform;
  projectType: ProjectType;
  /** Platform-specific project id (Modrinth: string id, CurseForge: numeric id as string) */
  id: string;
  slug: string;
  name: string;
  summary: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
  categories: string[];
  /** Link to the mod's page on the platform website */
  pageUrl: string;
}

export interface SearchResultPage {
  items: ModSummary[];
  total: number;
  offset: number;
  limit: number;
}

/** A concrete downloadable version/file of a mod. */
export interface ModVersionInfo {
  id: string;
  name: string;
  versionNumber: string;
  fileName: string;
  /** null ⇒ the author disabled third-party downloads (CurseForge opt-out) */
  downloadUrl: string | null;
  sha1: string | null;
  fileSize: number;
  gameVersions: string[];
  loaders: string[];
}

/** A mod that has been installed into an instance. */
export interface InstalledMod {
  platform: Platform;
  projectId: string;
  versionId: string;
  name: string;
  fileName: string;
  enabled: boolean;
}

export interface InstalledShader {
  platform: Platform;
  projectId: string;
  versionId: string;
  name: string;
  fileName: string;
}

export interface ModpackInstallOutcome {
  instanceId: string;
  archiveVersion: string;
  filesInstalled: number;
}

export interface ProvisionedModpackOutcome {
  instance: Instance;
  archiveVersion: string;
  filesInstalled: number;
}

/** A game instance (= one modpack/profile). */
export interface Instance {
  id: string;
  name: string;
  gameVersion: string;
  loader: InstanceLoader;
  loaderVersion: string | null;
  /** JVM heap (-Xmx) in megabytes */
  memoryMb: number;
  /** Per-instance java override; null = launcher default */
  javaPath: string | null;
  extraJavaArgs: string[];
  mods: InstalledMod[];
  createdAt: string;
  lastPlayedAt: string | null;
}

/** Real files discovered inside an instance's managed content directories. */
export interface InstanceContentEntry {
  kind: "mod" | "shader";
  name: string;
  fileName: string;
  enabled: boolean;
}

export interface CreateInstanceSpec {
  name: string;
  gameVersion: string;
  loader: InstanceLoader;
}

/** One stable Java release returned by Mojang's official version manifest. */
export interface MinecraftReleaseVersion {
  id: string;
  releaseTime: string;
}

/** Native, filtered view of Mojang's version manifest used by the profile UI. */
export interface MinecraftVersionCatalog {
  latestRelease: string;
  releases: MinecraftReleaseVersion[];
  fetchedAt: string;
}

export interface InstanceSettings {
  memoryMb: number;
  javaPath: string | null;
  extraJavaArgs: string[];
}

/** Microsoft device-code login: what the user must do in the browser. */
export interface DeviceCodeInfo {
  userCode: string;
  deviceCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  message: string;
}

/** Public account info — the access token itself never leaves the Rust side. */
export interface MinecraftProfile {
  uuid: string;
  name: string;
}

export type MicrosoftAccountStatus = "active" | "available" | "reauth-required";

/** Public account-vault metadata. Credentials always remain in native Rust. */
export interface MicrosoftAccountSummary {
  id: string;
  uuid: string;
  username: string;
  isActive: boolean;
  stored: boolean;
  status: MicrosoftAccountStatus;
}

export interface MicrosoftAccountSnapshot {
  accounts: MicrosoftAccountSummary[];
  activeAccountId: string | null;
  authPersistence: "one-week" | "two-weeks" | "one-month" | "always-ask";
}

/* ── Performance Optimizer & Java management ──────────────────────────── */

/** Snapshot of the machine, produced by the Rust `system::hardware` module. */
export interface HardwareReport {
  os: string;
  cpuModel: string;
  logicalCores: number;
  cpuFrequencyMhz: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  gpus: string[];
  /** Disk hosting the launcher's data directory. */
  diskTotalGb: number;
  diskAvailableGb: number;
}

export interface LiveSystemMetrics {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  processCount: number;
  sampledAt: string;
}

/** HTTPS round-trip sample to Minecraft Services, not an in-game server ping. */
export interface NetworkLatency {
  reachable: boolean;
  latencyMs: number | null;
  sampledAt: string;
}

/** Light / Balanced / Strong — how aggressively to tune the instance. */
export type OptimizationTier = "light" | "balanced" | "strong";

/** One line of the transparent feedback log shown after optimizing. */
export interface OptimizationLogEntry {
  kind: "memory" | "jvm" | "java" | "gpu" | "info";
  message: string;
}

/** A launcher-managed Java runtime (isolated under <data>/java/<major>). */
export interface JavaRuntimeInfo {
  major: number;
  javaExecutable: string;
  releaseName: string;
  freshlyInstalled: boolean;
}

export interface OptimizationOutcome {
  log: OptimizationLogEntry[];
  memoryMb: number;
  jvmArgs: string[];
  java: JavaRuntimeInfo;
}

export interface JavaStatus {
  requiredMajor: number;
  installed: { javaExecutable: string; releaseName: string } | null;
}

/** Payload of the "java-download-progress" event emitted by the Rust side. */
export interface JavaProgress {
  phase: "download" | "verify" | "extract" | "done";
  downloadedBytes: number;
  totalBytes: number;
}

/** Only exposes whether a CurseForge key exists; never returns the key itself. */
export interface SettingsStatus {
  curseforgeConfigured: boolean;
  authPersistence: "one-week" | "two-weeks" | "one-month" | "always-ask";
}

export interface LauncherLogEvent {
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  phase: string;
  message: string;
  instanceId?: string;
}

/** Per-launch window overrides consumed directly by the native launcher. */
export interface LaunchOptions {
  width?: number;
  height?: number;
  fullscreen: boolean;
}

export interface GameVideoSettings {
  renderDistance: number;
  simulationDistance: number;
  graphicsMode: "fast" | "fancy" | "fabulous";
  maxFps: number;
}

export interface DiscordRpcStatus {
  configured: boolean;
  connected: boolean;
  applicationId: string | null;
  message: string;
}

export type ProcessPriority = "normal" | "high";

export interface MinecraftProcessStatus {
  pid: number | null;
  running: boolean;
  priority: string;
  supported: boolean;
  message: string;
}

export interface DiscordRpcUpdate {
  enabled: boolean;
  hideWhenIdle: boolean;
  language: string;
  details?: string;
  state?: string;
}

/* ── Native launcher storage ───────────────────────────────────────────── */

export type StorageCategory = "logs" | "profiles" | "assets" | "cache";
export type LauncherFolderKind = "launcherLogs" | "gameLogs";

export interface StorageSegment {
  category: StorageCategory;
  bytes: number;
}

export interface StorageReport {
  segments: StorageSegment[];
  totalBytes: number;
}

/* ── Native music integrations ─────────────────────────────────────────── */

export type MusicProvider = "spotify" | "youtube";
export type MusicPlaybackAction = "play" | "pause" | "next" | "previous" | "seek";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
}

/** Sanitized provider state. OAuth access and refresh tokens never cross IPC. */
export interface MusicConnectionState {
  provider: MusicProvider;
  connected: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  track: MusicTrack | null;
  message: string | null;
}
