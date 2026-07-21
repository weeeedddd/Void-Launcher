import { lazy, Suspense, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { closeCurrentWindow, minimizeCurrentWindow, toggleCurrentWindowMaximized } from "@/lib/windowControls";
import { useAccountStore } from "@/stores/account";
import { NAVIGATION_ITEMS } from "../../constants";
import { ShadowGlyph } from "../../components/ShadowGlyph";
import { useTelemetry } from "../../hooks/useTelemetry";
import { useVoidClientStore } from "../../stores/voidClient.store";
import { AccountDropdown } from "./components/AccountDropdown";
import { CommandDeck } from "./components/CommandDeck";
import { CrashScreen, VoidRuntimeBoundary } from "../crash-screen";
import { voidClientStyles } from "./void-client.styles";

const DashboardView = lazy(() => import("./components/DashboardView").then((module) => ({ default: module.DashboardView })));
const DeploymentVaultView = lazy(() => import("./components/DeploymentVaultView").then((module) => ({ default: module.DeploymentVaultView })));
const ModHubView = lazy(() => import("./components/ModHubView").then((module) => ({ default: module.ModHubView })));
const TelemetryView = lazy(() => import("./components/TelemetryPanel").then((module) => ({ default: module.TelemetryView })));
const TuningMatrixView = lazy(() => import("./components/TuningMatrixView").then((module) => ({ default: module.TuningMatrixView })));
const ChronicleView = lazy(() => import("./components/ChronicleView").then((module) => ({ default: module.ChronicleView })));

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
  const accountMode = useAccountStore((state) => state.mode);
  const snapshot = useTelemetry();
  const reduceMotion = useReducedMotion();
  const activeNavigation = NAVIGATION_ITEMS.find((item) => item.id === activeView);

  const minimize = useCallback(minimizeCurrentWindow, []);
  const toggleMaximize = useCallback(toggleCurrentWindowMaximized, []);
  const close = useCallback(closeCurrentWindow, []);

  return (
    <div className={voidClientStyles.shell}>
      <AmbientShadowField reducedMotion={Boolean(reduceMotion)} />
      <VoidTitleBar
        activeSection={activeNavigation?.label ?? "Command Center"}
        accountMode={accountMode}
        onMinimize={minimize}
        onMaximize={toggleMaximize}
        onClose={close}
      />
      <CommandDeck />

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
        <p className="mt-4 text-[9px] font-black tracking-[0.2em] text-[#a98abf] uppercase">Synchronizing Void sector</p>
      </div>
    </div>
  );
}

interface IVoidTitleBarProps {
  activeSection: string;
  accountMode: ReturnType<typeof useAccountStore.getState>["mode"];
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

function VoidTitleBar({ activeSection, accountMode, onMinimize, onMaximize, onClose }: IVoidTitleBarProps) {
  const status = accountMode === "microsoft"
    ? { label: "Microsoft verified", tone: "text-[#4cff9a]", dot: "bg-[#4cff9a]" }
    : { label: "Identity required", tone: "text-[#a79bad]", dot: "bg-[#655a70]" };

  return (
    <header data-tauri-drag-region className={voidClientStyles.titleBar} onDoubleClick={onMaximize}>
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#9d5ce0]/35 bg-[radial-gradient(circle,#351348,#0a0710_74%)] text-[#d8b4fe] shadow-[0_0_26px_rgba(123,44,191,0.26)]">
          <span className="pointer-events-none absolute inset-x-1 top-1/2 h-px -rotate-45 bg-[#c796ff]/55 shadow-[0_0_8px_currentColor]" />
          <ShadowGlyph name="spark" size={20} className="relative filter drop-shadow-[0_0_8px_currentColor]" />
        </span>
        <span data-tauri-drag-region className="min-w-0">
          <strong className="font-display block truncate text-xs font-black tracking-[0.18em] text-white">VOID // ASCENSION</strong>
          <small className="mt-0.5 block truncate text-[8px] font-black tracking-[0.2em] text-[#655a70] uppercase">{activeSection} // Shadow Garden OS</small>
        </span>
      </div>

      <div data-tauri-drag-region className="hidden flex-1 justify-center xl:flex">
        <div className={`flex items-center gap-2 rounded-full border border-white/[0.065] bg-black/25 px-3.5 py-2 text-[8px] font-black tracking-[0.16em] uppercase ${status.tone}`}>
          <motion.span animate={{ opacity: [1, 0.35, 1], scale: [1, 0.78, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className={`size-1.5 rounded-full shadow-[0_0_11px_currentColor] ${status.dot}`} />
          {status.label}
        </div>
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
