import { lazy, Suspense, useCallback, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, Maximize2, Minus, X } from "lucide-react";
import { closeCurrentWindow, minimizeCurrentWindow, toggleCurrentWindowMaximized } from "@/lib/windowControls";
import { useAccountStore } from "@/stores/account";
import { NAVIGATION_ITEMS } from "../../constants";
import { ShadowGlyph } from "../../components/ShadowGlyph";
import { useDiscordRpcRuntime } from "../../hooks/useDiscordRpcRuntime";
import { translatedViewLabel } from "../../i18n";
import { useVoidClientStore } from "../../stores/voidClient.store";
import { AccountDropdown } from "./components/AccountDropdown";
import { MissionControl } from "./components/MissionControl";
import { VoidSidebar } from "./components/VoidSidebar";
import { LauncherNotificationRuntime } from "../../notifications/LauncherNotificationRuntime";
import { VoidRuntimeBoundary } from "../crash-screen";
import { voidClientStyles } from "./void-client.styles";

const MainDashboard = lazy(() => import("./components/MainDashboard").then((module) => ({ default: module.MainDashboard })));
const DeploymentVaultView = lazy(() => import("./components/DeploymentVaultView").then((module) => ({ default: module.DeploymentVaultView })));
const ModHubView = lazy(() => import("./components/ModHubView").then((module) => ({ default: module.ModHubView })));
const TelemetryView = lazy(() => import("./components/TelemetryPanel").then((module) => ({ default: module.TelemetryView })));
const TuningMatrixView = lazy(() => import("./components/TuningMatrixView").then((module) => ({ default: module.TuningMatrixView })));
const ChronicleView = lazy(() => import("./components/ChronicleView").then((module) => ({ default: module.ChronicleView })));

export function VoidClient() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);

  return (
    <VoidRuntimeBoundary
      resetKey={activeView}
      onReset={() => setActiveView("dashboard")}
    >
      <VoidClientSurface />
    </VoidRuntimeBoundary>
  );
}

function VoidClientSurface() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const setSettingsSection = useVoidClientStore((state) => state.setSettingsSection);
  const restoreSession = useAccountStore((state) => state.restoreSession);
  const language = useVoidClientStore((state) => state.language);
  const animatedRunes = useVoidClientStore((state) => state.animatedRunes);
  const reduceMotion = Boolean(useReducedMotion());
  const activeNavigation = NAVIGATION_ITEMS.find((item) => item.id === activeView);
  useDiscordRpcRuntime();

  useEffect(() => {
    if (!isTauri()) return;
    void restoreSession().catch(() => undefined);
  }, [restoreSession]);

  const minimize = useCallback(minimizeCurrentWindow, []);
  const toggleMaximize = useCallback(toggleCurrentWindowMaximized, []);
  const close = useCallback(closeCurrentWindow, []);
  const openNotificationSettings = useCallback(() => {
    setSettingsSection("mission");
    setActiveView("settings");
  }, [setActiveView, setSettingsSection]);

  return (
    <div className={voidClientStyles.shell}>
      <a
        href="#void-main-content"
        className="fixed top-2 left-16 z-[600] -translate-y-16 rounded-none border border-[#333333] bg-[#7B2CBF] px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <VoidTitleBar
        activeSection={activeNavigation ? translatedViewLabel(language, activeNavigation.id) : translatedViewLabel(language, "dashboard")}
        nativeRuntime={isTauri()}
        onMinimize={minimize}
        onMaximize={toggleMaximize}
        onClose={close}
        onOpenNotifications={openNotificationSettings}
      />
      <VoidSidebar />
      <MissionControl />
      <LauncherNotificationRuntime />

      <main id="void-main-content" className={`${voidClientStyles.main} ${activeView === "dashboard" ? "overflow-hidden" : "overflow-y-auto"}`} tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion || !animatedRunes ? 0 : 0.15 }}
            className={activeView === "dashboard" ? "h-full min-h-0" : "min-h-full"}
          >
            <Suspense fallback={<ViewLoadingState />}>
              {activeView === "dashboard" && <MainDashboard />}
              {activeView === "deployments" && <DeploymentVaultView />}
              {activeView === "mods" && <ModHubView />}
              {activeView === "telemetry" && <TelemetryView />}
              {activeView === "settings" && <TuningMatrixView />}
              {activeView === "chronicle" && <ChronicleView />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function ViewLoadingState() {
  return (
    <div className={`${voidClientStyles.page} grid min-h-[55vh] place-items-center`} role="status" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-none border border-[#333333] bg-[#7B2CBF] text-white">
          <ShadowGlyph name="spark" size={20} />
        </span>
        <p className="mt-4 text-sm font-medium text-[#A3A3A3]">Loading launcher view...</p>
      </div>
    </div>
  );
}

interface IVoidTitleBarProps {
  activeSection: string;
  nativeRuntime: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onOpenNotifications: () => void;
}

function VoidTitleBar({ activeSection, nativeRuntime, onMinimize, onMaximize, onClose, onOpenNotifications }: IVoidTitleBarProps) {
  return (
    <header data-tauri-drag-region className={voidClientStyles.titleBar} onDoubleClick={onMaximize}>
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center justify-between gap-4 px-3">
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-4">
          <strong data-tauri-drag-region className="truncate text-sm font-bold text-[#F4F4F5]">VOID <span className="font-semibold text-[#A855F7]">Launcher</span></strong>
          <span data-tauri-drag-region className="hidden h-7 items-center gap-2 rounded-lg border border-[#25252B] bg-[#141417] px-2.5 sm:inline-flex" role="status">
            <span className={`size-2 rounded-full ${nativeRuntime ? "bg-[#22C55E]" : "bg-[#F59E0B]"}`} aria-hidden="true" />
            <span className="text-[10px] font-semibold text-[#A1A1AA]">{nativeRuntime ? "Core Online" : "Web Preview"}</span>
          </span>
          <span data-tauri-drag-region className="hidden h-4 w-px bg-[#29292F] sm:block" aria-hidden="true" />
          <span data-tauri-drag-region className="hidden text-xs font-medium text-[#71717A] sm:block">{activeSection}</span>
        </div>
        <div className="flex items-center gap-3" onDoubleClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={onOpenNotifications} aria-label="Open notification settings" title="Notification settings" className="grid size-10 cursor-pointer place-items-center rounded-lg text-[#777780] transition-colors hover:bg-[#17171B] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"><Bell size={17} strokeWidth={1.7} /></button>
          <AccountDropdown />
        </div>
      </div>

      <div className="flex h-full items-center" onDoubleClick={(event) => event.stopPropagation()}>
        <WindowControl label="Minimize" kind="minimize" onClick={onMinimize} />
        <WindowControl label="Maximize" kind="maximize" onClick={onMaximize} />
        <WindowControl label="Close" kind="close" onClick={onClose} danger />
      </div>
    </header>
  );
}

function WindowControl({ label, kind, onClick, danger = false }: { label: string; kind: "minimize" | "maximize" | "close"; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-full w-10 cursor-pointer place-items-center border-l border-[#222222] transition-colors duration-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] ${danger ? "text-[#777777] hover:bg-[#B91C1C] hover:text-white" : "text-[#777777] hover:bg-[#171717] hover:text-white"}`}
    >
      {kind === "minimize" ? <Minus size={14} strokeWidth={1.6} /> : null}
      {kind === "maximize" ? <Maximize2 size={13} strokeWidth={1.6} /> : null}
      {kind === "close" ? <X size={14} strokeWidth={1.6} /> : null}
    </button>
  );
}

export default VoidClient;
