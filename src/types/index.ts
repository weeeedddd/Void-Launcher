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
