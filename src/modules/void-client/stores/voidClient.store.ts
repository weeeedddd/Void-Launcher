import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_JVM_ARGUMENTS } from "../constants";
import type {
  AuthenticationPersistence,
  CatalogKind,
  ClientLanguageCode,
  GarbageCollectorPreset,
  ILaunchLogEntry,
  LauncherVisibility,
  MissionVisibility,
  NotificationKind,
  NotificationPosition,
  RpcLanguage,
  SettingsSection,
  VoidView,
} from "../types";

export interface IVoidClientUiState {
  activeView: VoidView;
  activeInstanceId: string | null;
  language: ClientLanguageCode;
  authPersistence: AuthenticationPersistence;
  settingsSection: SettingsSection;
  ramGb: number;
  jvmArguments: string;
  garbageCollector: GarbageCollectorPreset;
  highThreadPriority: boolean;
  largePages: boolean;
  animatedRunes: boolean;
  resolutionWidth: number;
  resolutionHeight: number;
  fullscreen: boolean;
  lockAspectRatio: boolean;
  launcherVisibility: LauncherVisibility;
  missionVisibility: MissionVisibility;
  notificationPosition: NotificationPosition;
  notifications: Record<NotificationKind, boolean>;
  discordRpcEnabled: boolean;
  discordRpcConnected: boolean;
  discordRpcPending: boolean;
  discordRpcError: string | null;
  discordRpcMessage: string;
  hideRpcWhenIdle: boolean;
  rpcLanguage: RpcLanguage;
  launchOverlayOpen: boolean;
  missionControlOpen: boolean;
  launchInstanceName: string;
  launchLogs: ILaunchLogEntry[];
  catalogKind: CatalogKind;
  setActiveView: (view: VoidView) => void;
  setActiveInstanceId: (instanceId: string | null) => void;
  setLanguage: (language: ClientLanguageCode) => void;
  setAuthPersistence: (persistence: AuthenticationPersistence) => void;
  setSettingsSection: (section: SettingsSection) => void;
  setRamGb: (ramGb: number) => void;
  setJvmArguments: (jvmArguments: string) => void;
  setGarbageCollector: (preset: GarbageCollectorPreset) => void;
  setResolutionWidth: (width: number) => void;
  setResolutionHeight: (height: number) => void;
  setLauncherVisibility: (visibility: LauncherVisibility) => void;
  setMissionVisibility: (visibility: MissionVisibility) => void;
  setNotificationPosition: (position: NotificationPosition) => void;
  setRpcLanguage: (language: RpcLanguage) => void;
  setDiscordRpcEnabled: (enabled: boolean) => void;
  setDiscordRpcRuntime: (runtime: {
    connected: boolean;
    pending: boolean;
    error: string | null;
    message: string;
  }) => void;
  beginLaunch: (instanceName: string) => void;
  appendLaunchLog: (entry: Omit<ILaunchLogEntry, "id">) => void;
  finishLaunch: (message?: string, failed?: boolean) => void;
  setMissionControlOpen: (open: boolean) => void;
  clearLaunchLogs: () => void;
  setCatalogKind: (kind: CatalogKind) => void;
  toggleAnimatedRunes: () => void;
  toggleHighThreadPriority: () => void;
  toggleLargePages: () => void;
  toggleFullscreen: () => void;
  toggleLockAspectRatio: () => void;
  toggleNotification: (kind: NotificationKind) => void;
  toggleHideRpcWhenIdle: () => void;
  resetSettings: () => void;
  reset: () => void;
}

const DEFAULT_NOTIFICATIONS: Record<NotificationKind, boolean> = {
  playing: true,
  closing: true,
  update: true,
  "game-launching": true,
  "experimental-warning": true,
  "content-installed": true,
  "modpack-installing": true,
  "opening-folder": false,
  "branch-change": true,
  "game-closed": true,
  "new-content": true,
  "native-notifications": false,
};

const SETTINGS_DEFAULTS = {
  language: "en" as ClientLanguageCode,
  authPersistence: "one-month" as AuthenticationPersistence,
  settingsSection: "general" as SettingsSection,
  ramGb: 6,
  jvmArguments: DEFAULT_JVM_ARGUMENTS,
  garbageCollector: "aikar-g1" as GarbageCollectorPreset,
  highThreadPriority: true,
  largePages: false,
  animatedRunes: true,
  resolutionWidth: 1920,
  resolutionHeight: 1080,
  fullscreen: false,
  lockAspectRatio: true,
  launcherVisibility: "hide" as LauncherVisibility,
  missionVisibility: "auto-open" as MissionVisibility,
  notificationPosition: "bottom-right" as NotificationPosition,
  notifications: DEFAULT_NOTIFICATIONS,
  discordRpcEnabled: false,
  hideRpcWhenIdle: false,
  rpcLanguage: "english" as RpcLanguage,
};

const clampResolution = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(Number.isFinite(value) ? value : minimum)));

export const useVoidClientStore = create<IVoidClientUiState>()(
  persist(
    (set) => {
      const resetSettings = () => set((state) => ({
        ...SETTINGS_DEFAULTS,
        activeView: state.activeView,
        activeInstanceId: state.activeInstanceId,
        launchOverlayOpen: false,
        missionControlOpen: false,
        launchInstanceName: "",
        launchLogs: [],
        catalogKind: "mod",
        notifications: { ...DEFAULT_NOTIFICATIONS },
        discordRpcConnected: false,
        discordRpcPending: false,
        discordRpcError: null,
        discordRpcMessage: "Discord Rich Presence is disabled.",
      }));

      return {
        activeView: "dashboard",
        activeInstanceId: null,
        ...SETTINGS_DEFAULTS,
        notifications: { ...DEFAULT_NOTIFICATIONS },
        discordRpcConnected: false,
        discordRpcPending: false,
        discordRpcError: null,
        discordRpcMessage: "Discord Rich Presence is disabled.",
        launchOverlayOpen: false,
        missionControlOpen: false,
        launchInstanceName: "",
        launchLogs: [],
        catalogKind: "mod",
        setActiveView: (activeView) => set({ activeView }),
        setActiveInstanceId: (activeInstanceId) => set({ activeInstanceId }),
        setLanguage: (language) => set({ language }),
        setAuthPersistence: (authPersistence) => set({ authPersistence }),
        setSettingsSection: (settingsSection) => set({ settingsSection }),
        setRamGb: (ramGb) => set({ ramGb: Math.min(32, Math.max(2, Math.round(ramGb))) }),
        setJvmArguments: (jvmArguments) => set({ jvmArguments: jvmArguments.slice(0, 2_000) }),
        setGarbageCollector: (garbageCollector) => set({ garbageCollector }),
        setResolutionWidth: (value) => set((state) => {
          const resolutionWidth = clampResolution(value, 800, 7_680);
          return state.lockAspectRatio
            ? { resolutionWidth, resolutionHeight: clampResolution((resolutionWidth * 9) / 16, 600, 4_320) }
            : { resolutionWidth };
        }),
        setResolutionHeight: (value) => set((state) => {
          const resolutionHeight = clampResolution(value, 600, 4_320);
          return state.lockAspectRatio
            ? { resolutionHeight, resolutionWidth: clampResolution((resolutionHeight * 16) / 9, 800, 7_680) }
            : { resolutionHeight };
        }),
        setLauncherVisibility: (launcherVisibility) => set({ launcherVisibility }),
        setMissionVisibility: (missionVisibility) => set((state) => ({
          missionVisibility,
          missionControlOpen: missionVisibility === "hidden" ? false : state.missionControlOpen,
        })),
        setNotificationPosition: (notificationPosition) => set({ notificationPosition }),
        setRpcLanguage: (rpcLanguage) => set({ rpcLanguage }),
        setDiscordRpcEnabled: (discordRpcEnabled) => set({ discordRpcEnabled }),
        setDiscordRpcRuntime: ({ connected, pending, error, message }) => set({
          discordRpcConnected: connected,
          discordRpcPending: pending,
          discordRpcError: error,
          discordRpcMessage: message,
        }),
        beginLaunch: (launchInstanceName) => set((state) => ({
          launchOverlayOpen: true,
          missionControlOpen: state.missionVisibility === "auto-open",
          launchInstanceName,
          launchLogs: [{
            id: `ui-${Date.now()}-queued`,
            timestamp: new Date().toISOString(),
            level: "info",
            phase: "queued",
            message: `Preparing ${launchInstanceName} for launch.`,
          }],
        })),
        appendLaunchLog: (entry) => set((state) => ({
          missionControlOpen: state.missionVisibility === "hidden" ? false : state.missionControlOpen,
          launchLogs: [...state.launchLogs, { ...entry, id: `${entry.timestamp}-${state.launchLogs.length}` }].slice(-160),
        })),
        finishLaunch: (message, failed = false) => set((state) => ({
          launchOverlayOpen: false,
          missionControlOpen: state.missionVisibility === "hidden" ? false : state.missionControlOpen,
          launchLogs: message ? [...state.launchLogs, {
            id: `ui-${Date.now()}-finished`,
            timestamp: new Date().toISOString(),
            level: failed ? "error" as const : "success" as const,
            phase: failed ? "failed" : "running",
            message,
          }].slice(-160) : state.launchLogs,
        })),
        setMissionControlOpen: (missionControlOpen) => set((state) => ({
          missionControlOpen: state.missionVisibility === "hidden" ? false : missionControlOpen,
        })),
        clearLaunchLogs: () => set({ launchLogs: [] }),
        setCatalogKind: (catalogKind) => set({ catalogKind }),
        toggleAnimatedRunes: () => set((state) => ({ animatedRunes: !state.animatedRunes })),
        toggleHighThreadPriority: () => set((state) => ({ highThreadPriority: !state.highThreadPriority })),
        toggleLargePages: () => set((state) => ({ largePages: !state.largePages })),
        toggleFullscreen: () => set((state) => ({ fullscreen: !state.fullscreen })),
        toggleLockAspectRatio: () => set((state) => ({
          lockAspectRatio: !state.lockAspectRatio,
          resolutionHeight: !state.lockAspectRatio
            ? clampResolution((state.resolutionWidth * 9) / 16, 600, 4_320)
            : state.resolutionHeight,
        })),
        toggleNotification: (kind) => set((state) => ({ notifications: { ...state.notifications, [kind]: !state.notifications[kind] } })),
        toggleHideRpcWhenIdle: () => set((state) => ({ hideRpcWhenIdle: !state.hideRpcWhenIdle })),
        resetSettings,
        reset: resetSettings,
      };
    },
    {
      name: "void-client-ui",
      version: 7,
      migrate: (persistedState) => {
        const previous = persistedState as Partial<IVoidClientUiState>;
        const previousMissionVisibility = previous.missionVisibility as MissionVisibility | "best-monitor" | "background" | undefined;
        const missionVisibility: MissionVisibility = previousMissionVisibility === "best-monitor"
          ? "auto-open"
          : previousMissionVisibility === "background"
            ? "manual"
            : previousMissionVisibility ?? SETTINGS_DEFAULTS.missionVisibility;
        return {
          activeInstanceId: previous.activeInstanceId ?? null,
          settingsSection: previous.settingsSection ?? SETTINGS_DEFAULTS.settingsSection,
          language: previous.language ?? SETTINGS_DEFAULTS.language,
          authPersistence: previous.authPersistence ?? SETTINGS_DEFAULTS.authPersistence,
          ramGb: previous.ramGb ?? SETTINGS_DEFAULTS.ramGb,
          jvmArguments: previous.jvmArguments ?? SETTINGS_DEFAULTS.jvmArguments,
          garbageCollector: previous.garbageCollector ?? SETTINGS_DEFAULTS.garbageCollector,
          highThreadPriority: previous.highThreadPriority ?? SETTINGS_DEFAULTS.highThreadPriority,
          largePages: previous.largePages ?? SETTINGS_DEFAULTS.largePages,
          animatedRunes: previous.animatedRunes ?? SETTINGS_DEFAULTS.animatedRunes,
          resolutionWidth: previous.resolutionWidth ?? SETTINGS_DEFAULTS.resolutionWidth,
          resolutionHeight: previous.resolutionHeight ?? SETTINGS_DEFAULTS.resolutionHeight,
          fullscreen: previous.fullscreen ?? SETTINGS_DEFAULTS.fullscreen,
          lockAspectRatio: previous.lockAspectRatio ?? SETTINGS_DEFAULTS.lockAspectRatio,
          launcherVisibility: previous.launcherVisibility ?? SETTINGS_DEFAULTS.launcherVisibility,
          missionVisibility,
          notificationPosition: previous.notificationPosition ?? SETTINGS_DEFAULTS.notificationPosition,
          notifications: { ...DEFAULT_NOTIFICATIONS, ...(previous.notifications ?? {}) },
          discordRpcEnabled: previous.discordRpcEnabled ?? SETTINGS_DEFAULTS.discordRpcEnabled,
          hideRpcWhenIdle: previous.hideRpcWhenIdle ?? SETTINGS_DEFAULTS.hideRpcWhenIdle,
          rpcLanguage: previous.rpcLanguage ?? SETTINGS_DEFAULTS.rpcLanguage,
          catalogKind: previous.catalogKind ?? "mod",
        };
      },
      partialize: (state) => ({
        activeInstanceId: state.activeInstanceId,
        settingsSection: state.settingsSection,
        language: state.language,
        authPersistence: state.authPersistence,
        ramGb: state.ramGb,
        jvmArguments: state.jvmArguments,
        garbageCollector: state.garbageCollector,
        highThreadPriority: state.highThreadPriority,
        largePages: state.largePages,
        animatedRunes: state.animatedRunes,
        resolutionWidth: state.resolutionWidth,
        resolutionHeight: state.resolutionHeight,
        fullscreen: state.fullscreen,
        lockAspectRatio: state.lockAspectRatio,
        launcherVisibility: state.launcherVisibility,
        missionVisibility: state.missionVisibility,
        notificationPosition: state.notificationPosition,
        notifications: state.notifications,
        discordRpcEnabled: state.discordRpcEnabled,
        hideRpcWhenIdle: state.hideRpcWhenIdle,
        rpcLanguage: state.rpcLanguage,
        catalogKind: state.catalogKind,
      }),
    },
  ),
);
