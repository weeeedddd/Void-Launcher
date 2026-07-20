export type VoidView = "dashboard" | "mods" | "telemetry" | "settings" | "chronicle";

export type SettingsSection = "general" | "launch" | "mission" | "rpc" | "privacy";

export type LauncherVisibility = "keep-open" | "hide" | "close";

export type MissionVisibility = "best-monitor" | "background" | "hidden";

export type LogRetention = "forever" | "one-year" | "six-months" | "thirty-days" | "seven-days";

export type NotificationPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export type NotificationKind =
  | "playing"
  | "closing"
  | "update"
  | "game-launching"
  | "experimental-warning"
  | "content-installed"
  | "modpack-installing"
  | "opening-folder"
  | "branch-change"
  | "game-closed"
  | "new-content"
  | "native-notifications";

export type RpcLanguage = "english" | "german" | "russian" | "japanese" | "korean" | "spanish" | "chinese" | "polish";

export type CrashLogDestination = "mc-logs" | "void-native";

export type CatalogSource = "modrinth" | "curseforge";

export type CatalogKind = "modpack" | "shader";

export type InstallPhase = "idle" | "installing" | "installed";

export interface ITelemetrySnapshot {
  cpu: number;
  ram: number;
  ping: number;
  fps: number;
  cpuHistory: number[];
  ramHistory: number[];
}

export interface IInstallState {
  phase: InstallPhase;
  progress: number;
}

export interface IModCatalogItem {
  id: string;
  name: string;
  creator: string;
  description: string;
  version: string;
  gameVersion: string;
  source: CatalogSource;
  kind: CatalogKind;
  accent: "violet" | "blue" | "crimson" | "amber";
  downloads: string;
}

export interface INewsEntry {
  id: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  readTime: string;
  chapter: string;
  body: string[];
}

export interface IFriendEntry {
  id: string;
  username: string;
  status: string;
  online: boolean;
}
