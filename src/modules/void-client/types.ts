export type VoidView = "dashboard" | "deployments" | "mods" | "telemetry" | "settings" | "chronicle";

export type ClientLanguageCode = "en" | "de" | "ru" | "ja" | "ko";

export type AuthenticationPersistence = "one-week" | "two-weeks" | "one-month" | "always-ask";

export type GarbageCollectorPreset = "aikar-g1" | "generational-zgc" | "shenandoah";

export type LaunchLogLevel = "info" | "success" | "warning" | "error";

export interface ILaunchLogEntry {
  id: string;
  timestamp: string;
  level: LaunchLogLevel;
  phase: string;
  message: string;
  instanceId?: string;
}

export type SettingsSection = "general" | "launch" | "mission" | "rpc" | "privacy";

export type LauncherVisibility = "keep-open" | "hide" | "close";

export type MissionVisibility = "auto-open" | "manual" | "hidden";

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

export type CatalogKind = "modpack" | "mod" | "shader";

export type InstallPhase = "idle" | "installing" | "installed";

export interface IInstallState {
  phase: InstallPhase;
  progress: number;
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
