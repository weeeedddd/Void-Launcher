import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_JVM_ARGUMENTS } from "../constants";
import type {
  CrashLogDestination,
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
  settingsSection: SettingsSection;
  ramGb: number;
  jvmArguments: string;
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
  setActiveView: (view: VoidView) => void;
  setSettingsSection: (section: SettingsSection) => void;
  setRamGb: (ramGb: number) => void;
  setJvmArguments: (jvmArguments: string) => void;
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
  toggleAnimatedRunes: () => void;
  toggleMinimizeOnLaunch: () => void;
  toggleAutoConnectVoice: () => void;
  toggleBloom: () => void;
  toggleLowLatencyMode: () => void;
  toggleNativeMemoryGuard: () => void;
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
  settingsSection: "general" as SettingsSection,
  ramGb: 12,
  jvmArguments: DEFAULT_JVM_ARGUMENTS,
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
  discordRpcEnabled: true,
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
        notifications: { ...DEFAULT_NOTIFICATIONS },
      }));

      return {
        activeView: "dashboard",
        ...SETTINGS_DEFAULTS,
        notifications: { ...DEFAULT_NOTIFICATIONS },
        crashScreenOpen: false,
        launchLoadUntil: 0,
        setActiveView: (activeView) => set({ activeView }),
        setSettingsSection: (settingsSection) => set({ settingsSection }),
        setRamGb: (ramGb) => set({ ramGb: Math.min(32, Math.max(2, Math.round(ramGb))) }),
        setJvmArguments: (jvmArguments) => set({ jvmArguments: jvmArguments.slice(0, 2_000) }),
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
        toggleAnimatedRunes: () => set((state) => ({ animatedRunes: !state.animatedRunes })),
        toggleMinimizeOnLaunch: () => set((state) => ({ minimizeOnLaunch: !state.minimizeOnLaunch })),
        toggleAutoConnectVoice: () => set((state) => ({ autoConnectVoice: !state.autoConnectVoice })),
        toggleBloom: () => set((state) => ({ bloom: !state.bloom })),
        toggleLowLatencyMode: () => set((state) => ({ lowLatencyMode: !state.lowLatencyMode })),
        toggleNativeMemoryGuard: () => set((state) => ({ nativeMemoryGuard: !state.nativeMemoryGuard })),
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
      version: 2,
      migrate: (persistedState) => {
        const previous = persistedState as Partial<IVoidClientUiState>;
        return {
          settingsSection: previous.settingsSection ?? SETTINGS_DEFAULTS.settingsSection,
          ramGb: previous.ramGb ?? SETTINGS_DEFAULTS.ramGb,
          jvmArguments: previous.jvmArguments ?? SETTINGS_DEFAULTS.jvmArguments,
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
        ramGb: state.ramGb,
        jvmArguments: state.jvmArguments,
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
