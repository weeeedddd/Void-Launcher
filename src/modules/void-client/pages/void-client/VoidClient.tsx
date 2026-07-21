import { lazy, Suspense, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { closeCurrentWindow, minimizeCurrentWindow, toggleCurrentWindowMaximized } from "@/lib/windowControls";
import { useAccountStore } from "@/stores/account";
import { NAVIGATION_ITEMS } from "../../constants";
import { ShadowGlyph } from "../../components/ShadowGlyph";
import { translatedViewLabel } from "../../i18n";
import { useTelemetry } from "../../hooks/useTelemetry";
import { useVoidClientStore } from "../../stores/voidClient.store";
import { AccountDropdown } from "./components/AccountDropdown";
import { CommandDeck } from "./components/CommandDeck";
import { LanguageControl } from "./components/LanguageControl";
import { MissionControl } from "./components/MissionControl";
import { CrashScreen, VoidRuntimeBoundary } from "../crash-screen";
import { voidClientStyles } from "./void-client.styles";

const DashboardView = lazy(() => import("./components/DashboardView").then((module) => ({ default: module.DashboardView })));
const DeploymentVaultView = lazy(() => import("./components/DeploymentVaultView").then((module) => ({ default: module.DeploymentVaultView })));
const ModHubView = lazy(() => import("./components/ModHubView").then((module) => ({ default: module.ModHubView })));
const TelemetryView = lazy(() => import("./components/TelemetryPanel").then((module) => ({ default: module.TelemetryView })));
const TuningMatrixView = lazy(() => import("./components/TuningMatrixView").then((module) => ({ default: module.TuningMatrixView })));
const ChronicleView = lazy(() => import("./components/ChronicleView").then((module) => ({ default: module.ChronicleView })));
const ShadowSystemsView = lazy(() => import("./components/ShadowSystemsView").then((module) => ({ default: module.ShadowSystemsView })));

export function VoidClient() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const crashScreenOpen = useVoidClientStore((state) => state.crashScreenOpen);
  const setCrashScreenOpen = useVoidClientStore((state) => state.setCrashScreenOpen);
  const automaticallyUploadLogs = useVoidClientStore((state) => state.autoUploadCrashLogs);
  const storedDestination = useVoidClientStore((state) => state.crashLogDestination);
  const logDestination = storedDestination === "mc-logs" ? "MC-Logs.gs" : "Void Logs Native";
  const closeCrashPreview = useCallback(() => setCrashScreenOpen(false), [setCrashScreenOpen]);
  const retryCrashPreview = useCallback(() => {
    setActiveView("dashboard");
    setCrashScreenOpen(false);
  }, [setActiveView, setCrashScreenOpen]);

  if (crashScreenOpen) {
    return (
      <CrashScreen
        error="java.lang.IllegalStateException: Preview launch integrity check failed"
        diagnosis="A required client asset could not be verified before the game process started."
        possibleFix="Run the local recovery preview, then retry from the dashboard."
        automaticallyUploadLogs={automaticallyUploadLogs}
        logDestination={logDestination}
        repairSource="local-preview"
        onRetry={retryCrashPreview}
        onReturn={closeCrashPreview}
      />
    );
  }

  return (
    <VoidRuntimeBoundary
      resetKey={activeView}
      onReset={() => setActiveView("dashboard")}
      crashScreenProps={{
        automaticallyUploadLogs,
        logDestination,
        repairSource: "local-preview",
      }}
    >
      <VoidClientSurface />
    </VoidRuntimeBoundary>
  );
}

function VoidClientSurface() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const restoreSession = useAccountStore((state) => state.restoreSession);
  const language = useVoidClientStore((state) => state.language);
  const discordRpcEnabled = useVoidClientStore((state) => state.discordRpcEnabled);
  const hideRpcWhenIdle = useVoidClientStore((state) => state.hideRpcWhenIdle);
  const rpcLanguage = useVoidClientStore((state) => state.rpcLanguage);
  const snapshot = useTelemetry();
  const reduceMotion = useReducedMotion();
  const activeNavigation = NAVIGATION_ITEMS.find((item) => item.id === activeView);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!discordRpcEnabled) return;
    void api
      .updateDiscordRpc({
        enabled: true,
        hideWhenIdle: hideRpcWhenIdle,
        language: rpcLanguage,
        details: "Step Beyond the Ordinary Client",
        state: "In the Void Launcher",
      })
      .catch(() => undefined);
  }, [discordRpcEnabled, hideRpcWhenIdle, rpcLanguage]);

  const minimize = useCallback(minimizeCurrentWindow, []);
  const toggleMaximize = useCallback(toggleCurrentWindowMaximized, []);
  const close = useCallback(closeCurrentWindow, []);

  return (
    <div className={voidClientStyles.shell}>
      <AmbientShadowField reducedMotion={Boolean(reduceMotion)} />
      <VoidTitleBar
        activeSection={activeNavigation ? translatedViewLabel(language, activeNavigation.id) : translatedViewLabel(language, "dashboard")}
        onMinimize={minimize}
        onMaximize={toggleMaximize}
        onClose={close}
      />
      <CommandDeck />
      <LanguageControl />
      <MissionControl />

      <main className={voidClientStyles.main}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full"
          >
            <Suspense fallback={<ViewLoadingState />}>
              {activeView === "dashboard" && <DashboardView snapshot={snapshot} />}
              {activeView === "deployments" && <DeploymentVaultView />}
              {activeView === "mods" && <ModHubView />}
              {activeView === "telemetry" && <TelemetryView snapshot={snapshot} />}
              {activeView === "settings" && <TuningMatrixView />}
              {activeView === "chronicle" && <ChronicleView />}
              {activeView === "systems" && <ShadowSystemsView />}
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
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
          className="mx-auto grid size-12 place-items-center border border-[#a855f7]/38 bg-[#7B2CBF]/12 text-[#d8b4fe] shadow-[0_0_28px_rgba(123,44,191,0.28)] [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)]"
        >
          <ShadowGlyph name="spark" size={22} />
        </motion.span>
        <p className="mt-4 text-[10px] font-semibold tracking-[0.08em] text-[#b8a8c1]">Loading launcher view…</p>
      </div>
    </div>
  );
}

interface IVoidTitleBarProps {
  activeSection: string;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

function VoidTitleBar({ activeSection, onMinimize, onMaximize, onClose }: IVoidTitleBarProps) {
  return (
    <header data-tauri-drag-region className={voidClientStyles.titleBar} onDoubleClick={onMaximize}>
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#9d5ce0]/35 bg-[#050505] shadow-[0_0_26px_rgba(123,44,191,0.26)]">
          <img
            src="/void-shadow-blade-app-icon.png"
            alt=""
            aria-hidden="true"
            className="size-full object-cover"
          />
        </span>
        <span data-tauri-drag-region className="min-w-0">
          <strong className="font-display block truncate text-xs font-black tracking-[0.16em] text-white">VOID LAUNCHER</strong>
          <small className="mt-0.5 block truncate text-[10px] font-semibold tracking-[0.1em] text-[#9f93a8] uppercase">{activeSection}</small>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2" onDoubleClick={(event) => event.stopPropagation()}>
        <AccountDropdown />
        <div className="flex items-center gap-0.5 border-l border-white/[0.07] pl-2">
          <WindowControl label="Minimize" glyph="minimize" onClick={onMinimize} />
          <WindowControl label="Maximize" glyph="maximize" onClick={onMaximize} />
          <WindowControl label="Close" glyph="close" onClick={onClose} danger />
        </div>
      </div>
    </header>
  );
}

function WindowControl({ label, glyph, onClick, danger = false }: { label: string; glyph: "minimize" | "maximize" | "close"; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-9 cursor-pointer place-items-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-[#9d5ce0] ${danger ? "text-[#655a70] hover:bg-red-500/15 hover:text-red-300" : "text-[#655a70] hover:bg-white/[0.05] hover:text-white"}`}
    >
      <ShadowGlyph name={glyph} size={14} className="filter drop-shadow-[0_0_5px_currentColor]" />
    </button>
  );
}

function AmbientShadowField({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className={voidClientStyles.ambient} aria-hidden="true">
      <motion.div
        animate={reducedMotion ? undefined : { x: [0, 48, -18, 0], y: [0, -28, 18, 0], opacity: [0.18, 0.32, 0.2, 0.18] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-44 left-[18%] size-[560px] rounded-full bg-[#5b21b6]/20 blur-[150px]"
      />
      <motion.div
        animate={reducedMotion ? undefined : { x: [0, -38, 24, 0], y: [0, 22, -18, 0], opacity: [0.12, 0.24, 0.14, 0.12] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-8%] bottom-[-28%] size-[720px] rounded-full bg-[#1e3a8a]/18 blur-[180px]"
      />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(168,85,247,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.11)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(circle_at_60%_30%,black,transparent_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_25%,transparent,rgba(5,5,5,0.42)_55%,#050505_100%)]" />
    </div>
  );
}

export default VoidClient;
