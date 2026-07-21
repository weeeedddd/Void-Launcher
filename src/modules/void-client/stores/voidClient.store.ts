import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_JVM_ARGUMENTS } from "../constants";
import type {
  AuthenticationPersistence,
  ClientLanguageCode,
  CrashLogDestination,
  GarbageCollectorPreset,
  ILaunchLogEntry,
  LauncherVisibility,
  LogRetention,
  MissionVisibility,
  NotificationKind,
  NotificationPosition,
  RpcLanguage,
  SettingsSection,
  VoidView,
} from "../types";

export interface IVoidClientUiState {
  activeView: VoidView;
  language: ClientLanguageCode;
  authPersistence: AuthenticationPersistence;
  settingsSection: SettingsSection;
  ramGb: number;
  jvmArguments: string;
  garbageCollector: GarbageCollectorPreset;
  highThreadPriority: boolean;
  largePages: boolean;
  animatedRunes: boolean;
  minimizeOnLaunch: boolean;
  autoConnectVoice: boolean;
  bloom: boolean;
  lowLatencyMode: boolean;
  nativeMemoryGuard: boolean;
  resolutionWidth: number;
  resolutionHeight: number;
  fullscreen: boolean;
  lockAspectRatio: boolean;
  ignoreForgeProcessorHash: boolean;
  launcherVisibility: LauncherVisibility;
  missionVisibility: MissionVisibility;
  logRetention: LogRetention;
  notificationPosition: NotificationPosition;
  notifications: Record<NotificationKind, boolean>;
  discordRpcEnabled: boolean;
  hideRpcWhenIdle: boolean;
  rpcLanguage: RpcLanguage;
  analyticsEnabled: boolean;
  autoUploadCrashLogs: boolean;
  crashLogDestination: CrashLogDestination;
  crashScreenOpen: boolean;
  launchLoadUntil: number;
  launchOverlayOpen: boolean;
  missionControlOpen: boolean;
  launchInstanceName: string;
  launchLogs: ILaunchLogEntry[];
  setActiveView: (view: VoidView) => void;
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
  setLogRetention: (retention: LogRetention) => void;
  setNotificationPosition: (position: NotificationPosition) => void;
  setRpcLanguage: (language: RpcLanguage) => void;
  setCrashLogDestination: (destination: CrashLogDestination) => void;
  setCrashScreenOpen: (open: boolean) => void;
  signalLaunchLoad: (durationMs: number) => void;
  beginLaunch: (instanceName: string) => void;
  appendLaunchLog: (entry: Omit<ILaunchLogEntry, "id">) => void;
  finishLaunch: (message?: string, failed?: boolean) => void;
  setMissionControlOpen: (open: boolean) => void;
  clearLaunchLogs: () => void;
  toggleAnimatedRunes: () => void;
  toggleMinimizeOnLaunch: () => void;
  toggleAutoConnectVoice: () => void;
  toggleBloom: () => void;
  toggleLowLatencyMode: () => void;
  toggleNativeMemoryGuard: () => void;
  toggleHighThreadPriority: () => void;
  toggleLargePages: () => void;
  toggleFullscreen: () => void;
  toggleLockAspectRatio: () => void;
  toggleIgnoreForgeProcessorHash: () => void;
  toggleNotification: (kind: NotificationKind) => void;
  toggleDiscordRpc: () => void;
  toggleHideRpcWhenIdle: () => void;
  toggleAnalytics: () => void;
  toggleAutoUploadCrashLogs: () => void;
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
  minimizeOnLaunch: true,
  autoConnectVoice: false,
  bloom: true,
  lowLatencyMode: true,
  nativeMemoryGuard: true,
  resolutionWidth: 1920,
  resolutionHeight: 1080,
  fullscreen: false,
  lockAspectRatio: true,
  ignoreForgeProcessorHash: false,
  launcherVisibility: "hide" as LauncherVisibility,
  missionVisibility: "best-monitor" as MissionVisibility,
  logRetention: "thirty-days" as LogRetention,
  notificationPosition: "bottom-right" as NotificationPosition,
  notifications: DEFAULT_NOTIFICATIONS,
  discordRpcEnabled: false,
  hideRpcWhenIdle: false,
  rpcLanguage: "english" as RpcLanguage,
  analyticsEnabled: false,
  autoUploadCrashLogs: false,
  crashLogDestination: "void-native" as CrashLogDestination,
};

const clampResolution = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(Number.isFinite(value) ? value : minimum)));

export const useVoidClientStore = create<IVoidClientUiState>()(
  persist(
    (set) => {
      const resetSettings = () => set((state) => ({
        ...SETTINGS_DEFAULTS,
        activeView: state.activeView,
        crashScreenOpen: false,
        launchLoadUntil: 0,
        launchOverlayOpen: false,
        missionControlOpen: false,
        launchInstanceName: "",
        launchLogs: [],
        notifications: { ...DEFAULT_NOTIFICATIONS },
      }));

      return {
        activeView: "dashboard",
        ...SETTINGS_DEFAULTS,
        notifications: { ...DEFAULT_NOTIFICATIONS },
        crashScreenOpen: false,
        launchLoadUntil: 0,
        launchOverlayOpen: false,
        missionControlOpen: false,
        launchInstanceName: "",
        launchLogs: [],
        setActiveView: (activeView) => set({ activeView }),
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
        setMissionVisibility: (missionVisibility) => set({ missionVisibility }),
        setLogRetention: (logRetention) => set({ logRetention }),
        setNotificationPosition: (notificationPosition) => set({ notificationPosition }),
        setRpcLanguage: (rpcLanguage) => set({ rpcLanguage }),
        setCrashLogDestination: (crashLogDestination) => set({ crashLogDestination }),
        setCrashScreenOpen: (crashScreenOpen) => set({ crashScreenOpen }),
        signalLaunchLoad: (durationMs) => set((state) => ({
          launchLoadUntil: Math.max(state.launchLoadUntil, Date.now() + Math.max(0, durationMs)),
        })),
        beginLaunch: (launchInstanceName) => set({
          launchOverlayOpen: true,
          missionControlOpen: true,
          launchInstanceName,
          launchLogs: [{
            id: `ui-${Date.now()}-queued`,
            timestamp: new Date().toISOString(),
            level: "info",
            phase: "queued",
            message: `Preparing ${launchInstanceName} for launch.`,
          }],
        }),
        appendLaunchLog: (entry) => set((state) => ({
          missionControlOpen: true,
          launchLogs: [...state.launchLogs, { ...entry, id: `${entry.timestamp}-${state.launchLogs.length}` }].slice(-160),
        })),
        finishLaunch: (message, failed = false) => set((state) => ({
          launchOverlayOpen: false,
          missionControlOpen: true,
          launchLogs: message ? [...state.launchLogs, {
            id: `ui-${Date.now()}-finished`,
            timestamp: new Date().toISOString(),
            level: failed ? "error" as const : "success" as const,
            phase: failed ? "failed" : "running",
            message,
          }].slice(-160) : state.launchLogs,
        })),
        setMissionControlOpen: (missionControlOpen) => set({ missionControlOpen }),
        clearLaunchLogs: () => set({ launchLogs: [] }),
        toggleAnimatedRunes: () => set((state) => ({ animatedRunes: !state.animatedRunes })),
        toggleMinimizeOnLaunch: () => set((state) => ({ minimizeOnLaunch: !state.minimizeOnLaunch })),
        toggleAutoConnectVoice: () => set((state) => ({ autoConnectVoice: !state.autoConnectVoice })),
        toggleBloom: () => set((state) => ({ bloom: !state.bloom })),
        toggleLowLatencyMode: () => set((state) => ({ lowLatencyMode: !state.lowLatencyMode })),
        toggleNativeMemoryGuard: () => set((state) => ({ nativeMemoryGuard: !state.nativeMemoryGuard })),
        toggleHighThreadPriority: () => set((state) => ({ highThreadPriority: !state.highThreadPriority })),
        toggleLargePages: () => set((state) => ({ largePages: !state.largePages })),
        toggleFullscreen: () => set((state) => ({ fullscreen: !state.fullscreen })),
        toggleLockAspectRatio: () => set((state) => ({
          lockAspectRatio: !state.lockAspectRatio,
          resolutionHeight: !state.lockAspectRatio
            ? clampResolution((state.resolutionWidth * 9) / 16, 600, 4_320)
            : state.resolutionHeight,
        })),
        toggleIgnoreForgeProcessorHash: () => set((state) => ({ ignoreForgeProcessorHash: !state.ignoreForgeProcessorHash })),
        toggleNotification: (kind) => set((state) => ({ notifications: { ...state.notifications, [kind]: !state.notifications[kind] } })),
        toggleDiscordRpc: () => set((state) => ({ discordRpcEnabled: !state.discordRpcEnabled })),
        toggleHideRpcWhenIdle: () => set((state) => ({ hideRpcWhenIdle: !state.hideRpcWhenIdle })),
        toggleAnalytics: () => set((state) => ({ analyticsEnabled: !state.analyticsEnabled })),
        toggleAutoUploadCrashLogs: () => set((state) => ({ autoUploadCrashLogs: !state.autoUploadCrashLogs })),
        resetSettings,
        reset: resetSettings,
      };
    },
    {
      name: "void-client-ui",
      version: 3,
      migrate: (persistedState) => {
        const previous = persistedState as Partial<IVoidClientUiState>;
        return {
          settingsSection: previous.settingsSection ?? SETTINGS_DEFAULTS.settingsSection,
          language: previous.language ?? SETTINGS_DEFAULTS.language,
          authPersistence: previous.authPersistence ?? SETTINGS_DEFAULTS.authPersistence,
          ramGb: previous.ramGb ?? SETTINGS_DEFAULTS.ramGb,
          jvmArguments: previous.jvmArguments ?? SETTINGS_DEFAULTS.jvmArguments,
          garbageCollector: previous.garbageCollector ?? SETTINGS_DEFAULTS.garbageCollector,
          highThreadPriority: previous.highThreadPriority ?? SETTINGS_DEFAULTS.highThreadPriority,
          largePages: previous.largePages ?? SETTINGS_DEFAULTS.largePages,
          animatedRunes: previous.animatedRunes ?? SETTINGS_DEFAULTS.animatedRunes,
          minimizeOnLaunch: previous.minimizeOnLaunch ?? SETTINGS_DEFAULTS.minimizeOnLaunch,
          autoConnectVoice: previous.autoConnectVoice ?? SETTINGS_DEFAULTS.autoConnectVoice,
          bloom: previous.bloom ?? SETTINGS_DEFAULTS.bloom,
          lowLatencyMode: previous.lowLatencyMode ?? SETTINGS_DEFAULTS.lowLatencyMode,
          nativeMemoryGuard: previous.nativeMemoryGuard ?? SETTINGS_DEFAULTS.nativeMemoryGuard,
          resolutionWidth: previous.resolutionWidth ?? SETTINGS_DEFAULTS.resolutionWidth,
          resolutionHeight: previous.resolutionHeight ?? SETTINGS_DEFAULTS.resolutionHeight,
          fullscreen: previous.fullscreen ?? SETTINGS_DEFAULTS.fullscreen,
          lockAspectRatio: previous.lockAspectRatio ?? SETTINGS_DEFAULTS.lockAspectRatio,
          ignoreForgeProcessorHash: previous.ignoreForgeProcessorHash ?? SETTINGS_DEFAULTS.ignoreForgeProcessorHash,
          launcherVisibility: previous.launcherVisibility ?? SETTINGS_DEFAULTS.launcherVisibility,
          missionVisibility: previous.missionVisibility ?? SETTINGS_DEFAULTS.missionVisibility,
          logRetention: previous.logRetention ?? SETTINGS_DEFAULTS.logRetention,
          notificationPosition: previous.notificationPosition ?? SETTINGS_DEFAULTS.notificationPosition,
          notifications: { ...DEFAULT_NOTIFICATIONS, ...(previous.notifications ?? {}) },
          discordRpcEnabled: previous.discordRpcEnabled ?? SETTINGS_DEFAULTS.discordRpcEnabled,
          hideRpcWhenIdle: previous.hideRpcWhenIdle ?? SETTINGS_DEFAULTS.hideRpcWhenIdle,
          rpcLanguage: previous.rpcLanguage ?? SETTINGS_DEFAULTS.rpcLanguage,
          analyticsEnabled: previous.analyticsEnabled ?? SETTINGS_DEFAULTS.analyticsEnabled,
          autoUploadCrashLogs: previous.autoUploadCrashLogs ?? SETTINGS_DEFAULTS.autoUploadCrashLogs,
          crashLogDestination: previous.crashLogDestination ?? SETTINGS_DEFAULTS.crashLogDestination,
        };
      },
      partialize: (state) => ({
        settingsSection: state.settingsSection,
        language: state.language,
        authPersistence: state.authPersistence,
        ramGb: state.ramGb,
        jvmArguments: state.jvmArguments,
        garbageCollector: state.garbageCollector,
        highThreadPriority: state.highThreadPriority,
        largePages: state.largePages,
        animatedRunes: state.animatedRunes,
        minimizeOnLaunch: state.minimizeOnLaunch,
        autoConnectVoice: state.autoConnectVoice,
        bloom: state.bloom,
        lowLatencyMode: state.lowLatencyMode,
        nativeMemoryGuard: state.nativeMemoryGuard,
        resolutionWidth: state.resolutionWidth,
        resolutionHeight: state.resolutionHeight,
        fullscreen: state.fullscreen,
        lockAspectRatio: state.lockAspectRatio,
        ignoreForgeProcessorHash: state.ignoreForgeProcessorHash,
        launcherVisibility: state.launcherVisibility,
        missionVisibility: state.missionVisibility,
        logRetention: state.logRetention,
        notificationPosition: state.notificationPosition,
        notifications: state.notifications,
        discordRpcEnabled: state.discordRpcEnabled,
        hideRpcWhenIdle: state.hideRpcWhenIdle,
        rpcLanguage: state.rpcLanguage,
        analyticsEnabled: state.analyticsEnabled,
        autoUploadCrashLogs: state.autoUploadCrashLogs,
        crashLogDestination: state.crashLogDestination,
      }),
    },
  ),
);
