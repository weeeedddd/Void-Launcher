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

/** What an instance runs on — vanilla or one of the loaders. */
export type InstanceLoader = "vanilla" | ModLoader;

/** Parameters for a unified mod search (both platforms). */
export interface SearchParams {
  platform: Platform;
  query: string;
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

export interface CreateInstanceSpec {
  name: string;
  gameVersion: string;
  loader: InstanceLoader;
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
