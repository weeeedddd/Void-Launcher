import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { getVersion } from "@tauri-apps/api/app";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import type { LauncherFolderKind } from "@/types";
import { NAVIGATION_ITEMS } from "../../../constants";
import { translatedViewLabel } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { VoidView } from "../../../types";

type UpdateState = "idle" | "checking" | "current";
type UploadState = "idle" | "uploading" | "complete";
type FocusTarget = "first" | "last";

const MENU_ITEM_SELECTOR = '[data-command-menu-item="true"]:not(:disabled)';
const SUBMENU_ITEM_SELECTOR = '[data-command-submenu-item="true"]:not(:disabled)';

const classes = {
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd7aff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
  insetFocus:
    "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d8b4fe]",
  menuItem:
    "group relative flex min-h-12 w-full cursor-pointer items-center gap-3 overflow-hidden border border-transparent px-3.5 py-2.5 text-left text-[#b8acc3] transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-white/[0.07] hover:bg-white/[0.045] hover:text-white focus-visible:border-[#9d5ce0]/55 focus-visible:bg-[#7B2CBF]/12 focus-visible:text-white disabled:cursor-wait disabled:opacity-55",
  iconWell:
    "grid size-9 shrink-0 place-items-center border border-white/[0.07] bg-black/35 text-[#9d5ce0] transition-colors duration-200 [clip-path:polygon(17%_0,100%_0,100%_72%,78%_100%,0_100%,0_21%)] group-hover:border-[#9d5ce0]/35 group-hover:text-[#d8b4fe]",
  previewBadge:
    "ml-auto shrink-0 border border-[#7767ff]/25 bg-[#7767ff]/10 px-1.5 py-0.5 text-[7px] font-black tracking-[0.15em] text-[#a9a1ff] uppercase [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]",
} as const;

function createOpaqueId(prefix: string): string {
  if (typeof globalThis.crypto === "undefined") return `${prefix}-LOCAL-PREVIEW`;
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${prefix}-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
}

function readOrCreateId(storageKind: "local" | "session", key: string, prefix: string): string {
  if (typeof window === "undefined") return `${prefix}-LOCAL-PREVIEW`;
  try {
    const storage = storageKind === "local" ? window.localStorage : window.sessionStorage;
    const existing = storage.getItem(key);
    if (existing) return existing;
    const generated = createOpaqueId(prefix);
    storage.setItem(key, generated);
    return generated;
  } catch {
    return createOpaqueId(prefix);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function focusMenuItem(container: HTMLElement | null, selector: string, target: FocusTarget): void {
  if (!container) return;
  const items = Array.from(container.querySelectorAll<HTMLButtonElement>(selector));
  const item = target === "last" ? items.at(-1) : items[0];
  item?.focus();
}

function moveMenuFocus(
  event: ReactKeyboardEvent<HTMLElement>,
  container: HTMLElement | null,
  selector: string,
): boolean {
  const items = container ? Array.from(container.querySelectorAll<HTMLButtonElement>(selector)) : [];
  if (items.length === 0) return false;

  const activeIndex = items.findIndex((item) => item === document.activeElement);
  let nextIndex: number | null = null;

  if (event.key === "ArrowDown") nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
  if (event.key === "ArrowUp") nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = items.length - 1;

  if (nextIndex === null) return false;
  event.preventDefault();
  items[nextIndex]?.focus();
  return true;
}

function inferBuildStream(version: string): "Canary" | "Stable" {
  return /alpha|beta|canary|dev|preview/i.test(version) ? "Canary" : "Stable";
}

export const CommandDeck = memo(function CommandDeck() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const setActiveView = useVoidClientStore((state) => state.setActiveView);
  const { instance, isLoadingInstances } = useLauncherInstance();
  const reducedMotion = Boolean(useReducedMotion());
  const menuId = useId();
  const aboutId = useId();
  const logsMenuId = useId();
  const restartTitleId = useId();
  const restartDescriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const logsTriggerRef = useRef<HTMLButtonElement>(null);
  const logsMenuRef = useRef<HTMLDivElement>(null);
  const restartTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRestartRef = useRef<HTMLButtonElement>(null);
  const requestedFocusRef = useRef<FocusTarget>("first");

  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [restartConfirmation, setRestartConfirmation] = useState(false);
  const [version, setVersion] = useState("Preview build");
  const profile = useAccountStore((state) => state.profile);
  const language = useVoidClientStore((state) => state.language);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [nativePending, setNativePending] = useState<LauncherFolderKind | "restart" | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nodeId] = useState(() => readOrCreateId("local", "void-preview-node", "NODE"));
  const [sessionId] = useState(() => readOrCreateId("session", "void-preview-session", "SESSION"));

  useEffect(() => {
    let active = true;
    void getVersion()
      .then((value) => {
        if (active) setVersion(`v${value}`);
      })
      .catch(() => {
        if (active) setVersion("Web preview");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (updateState !== "checking") return;
    const timeoutId = window.setTimeout(() => {
      setUpdateState("current");
      setActionMessage("Preview check complete — this build is marked current.");
    }, 1_450);
    return () => window.clearTimeout(timeoutId);
  }, [updateState]);

  useEffect(() => {
    if (uploadState !== "uploading") return;
    const timeoutId = window.setTimeout(() => {
      setUploadState("complete");
      setActionMessage("Preview upload complete — no files were sent from this device.");
    }, 1_650);
    return () => window.clearTimeout(timeoutId);
  }, [uploadState]);

  useEffect(() => {
    if (!menuOpen) return;
    const animationFrame = window.requestAnimationFrame(() => {
      focusMenuItem(menuRef.current, MENU_ITEM_SELECTOR, requestedFocusRef.current);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [menuOpen]);

  useEffect(() => {
    if (!logsOpen) return;
    const animationFrame = window.requestAnimationFrame(() => {
      focusMenuItem(logsMenuRef.current, SUBMENU_ITEM_SELECTOR, "first");
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [logsOpen]);

  useEffect(() => {
    if (!restartConfirmation) return;
    const animationFrame = window.requestAnimationFrame(() => cancelRestartRef.current?.focus());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [restartConfirmation]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
      setLogsOpen(false);
      setRestartConfirmation(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (restartConfirmation) {
        setRestartConfirmation(false);
        restartTriggerRef.current?.focus();
        return;
      }
      if (logsOpen) {
        setLogsOpen(false);
        logsTriggerRef.current?.focus();
        return;
      }
      setMenuOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [logsOpen, menuOpen, restartConfirmation]);

  const navigate = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    const view = event.currentTarget.dataset.view as VoidView | undefined;
    if (view) {
      setActiveView(view);
      setMenuOpen(false);
      setLogsOpen(false);
      setRestartConfirmation(false);
    }
  }, [setActiveView]);

  const toggleMenu = useCallback(() => {
    requestedFocusRef.current = "first";
    setMenuOpen((open) => !open);
    setLogsOpen(false);
    setRestartConfirmation(false);
  }, []);

  const openMenuFromKeyboard = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    requestedFocusRef.current = event.key === "ArrowUp" ? "last" : "first";
    setMenuOpen(true);
  }, []);

  const handleMenuKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    moveMenuFocus(event, menuRef.current, MENU_ITEM_SELECTOR);
  }, []);

  const handleLogsKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault();
      setLogsOpen(false);
      logsTriggerRef.current?.focus();
      return;
    }
    moveMenuFocus(event, logsMenuRef.current, SUBMENU_ITEM_SELECTOR);
  }, []);

  const handleLogsTriggerKeyboard = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setLogsOpen(true);
    }
  }, []);

  const handleConfirmationKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.stopPropagation();
    }
  }, []);

  const toggleAbout = useCallback(() => {
    setAboutOpen((open) => !open);
    setLogsOpen(false);
    setRestartConfirmation(false);
  }, []);

  const toggleLogs = useCallback(() => {
    setLogsOpen((open) => !open);
    setAboutOpen(false);
    setRestartConfirmation(false);
  }, []);

  const checkForUpdates = useCallback(() => {
    setUpdateState("checking");
    setActionError(null);
    setActionMessage("Running a local preview update check…");
    setLogsOpen(false);
    setRestartConfirmation(false);
  }, []);

  const uploadLogs = useCallback(() => {
    setUploadState("uploading");
    setActionError(null);
    setActionMessage("Simulating an encrypted log upload preview…");
    setLogsOpen(false);
    setRestartConfirmation(false);
  }, []);

  const openFolder = useCallback(async (kind: LauncherFolderKind) => {
    setNativePending(kind);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.openLauncherFolder(kind, kind === "gameLogs" ? instance?.id : undefined);
      setActionMessage(kind === "launcherLogs" ? "Launcher logs folder opened." : "Game logs folder opened.");
      setLogsOpen(false);
      logsTriggerRef.current?.focus();
    } catch (error) {
      setActionError(`Could not open the logs folder: ${errorMessage(error)}`);
    } finally {
      setNativePending(null);
    }
  }, [instance?.id]);

  const openLauncherLogs = useCallback(() => void openFolder("launcherLogs"), [openFolder]);
  const openGameLogs = useCallback(() => void openFolder("gameLogs"), [openFolder]);

  const requestRestart = useCallback(() => {
    setRestartConfirmation(true);
    setAboutOpen(false);
    setLogsOpen(false);
    setActionError(null);
  }, []);

  const cancelRestart = useCallback(() => {
    setRestartConfirmation(false);
    restartTriggerRef.current?.focus();
  }, []);

  const restartLauncher = useCallback(async () => {
    setNativePending("restart");
    setActionError(null);
    setActionMessage("Restarting the native launcher…");
    try {
      await api.restartLauncher();
    } catch (error) {
      setActionError(`Restart failed: ${errorMessage(error)}`);
      setActionMessage(null);
      setNativePending(null);
      setRestartConfirmation(false);
    }
  }, []);

  const buildStream = inferBuildStream(version);
  const arrowTransitionClass = reducedMotion ? "transition-none" : "transition-transform duration-200";
  const updateLabel = updateState === "checking" ? "Checking…" : updateState === "current" ? "Build is current" : "Check for Updates";
  const uploadLabel = uploadState === "uploading" ? "Uploading preview…" : uploadState === "complete" ? "Preview upload ready" : "Upload Logs";

  return (
    <section
      ref={rootRef}
      aria-label="Void command deck"
      className="pointer-events-none absolute inset-x-0 top-16 z-40 h-[76px] px-5 pt-3"
    >
      <div className="pointer-events-auto relative z-50 flex w-fit items-stretch">
        <div className={`flex h-12 items-center gap-2.5 rounded-xl border px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${profile ? "border-[#4cff9a]/18 bg-[linear-gradient(110deg,rgba(7,16,13,0.9),rgba(17,13,23,0.94))]" : "border-amber-300/16 bg-[linear-gradient(110deg,rgba(27,20,8,0.88),rgba(17,13,23,0.94))]"}`}>
          <motion.span
            aria-hidden="true"
            animate={reducedMotion ? undefined : { opacity: [1, 0.38, 1], scale: [1, 0.76, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className={`size-2 rounded-full ${profile ? "bg-[#4cff9a] shadow-[0_0_15px_rgba(76,255,154,0.9)]" : "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.65)]"}`}
          />
          <span className="min-w-[108px]">
            <strong className="font-display block text-[11px] font-black tracking-[0.07em] text-white">
              {profile ? "Account connected" : "Sign in required"}
            </strong>
            <small className={`block text-[9px] font-bold tracking-[0.08em] ${profile ? "text-[#4cff9a]/78" : "text-amber-200/72"}`}>{profile ? profile.name : "Microsoft verification"}</small>
          </span>
        </div>

        <button
          ref={triggerRef}
          type="button"
          aria-controls={menuId}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={menuOpen ? "Close Void system menu" : "Open Void system menu"}
          onClick={toggleMenu}
          onKeyDown={openMenuFromKeyboard}
          className={`-ml-1 grid size-12 cursor-pointer place-items-center rounded-xl border border-[#9d5ce0]/28 bg-[linear-gradient(145deg,rgba(54,21,78,0.96),rgba(14,10,19,0.96))] text-[#d8b4fe] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(123,44,191,0.2)] transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-[#d8b4fe]/55 hover:text-white hover:shadow-[0_0_30px_rgba(123,44,191,0.38)] focus-visible:border-[#f2e8ff] focus-visible:text-white ${classes.focus}`}
        >
          <ShadowGlyph
            name="arrow"
            size={17}
            className={`filter drop-shadow-[0_0_7px_currentColor] ${arrowTransitionClass} ${menuOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Void launcher system menu"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -7, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.99 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              onKeyDown={handleMenuKeyboard}
              className="absolute left-0 top-[58px] w-[336px] overflow-visible border border-[#9d5ce0]/24 bg-[radial-gradient(circle_at_82%_0%,rgba(123,44,191,0.22),transparent_37%),linear-gradient(155deg,rgba(17,13,23,0.98),rgba(5,5,5,0.98))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_30px_80px_rgba(0,0,0,0.72),0_0_42px_rgba(123,44,191,0.16)] backdrop-blur-3xl before:pointer-events-none before:absolute before:-right-px before:-top-px before:size-8 before:border-r before:border-t before:border-[#bd7aff]/50 before:[clip-path:polygon(38%_0,100%_0,100%_62%)] after:pointer-events-none after:absolute after:-bottom-px after:-left-px after:size-8 after:border-b after:border-l after:border-[#533183]/50 after:[clip-path:polygon(0_38%,0_100%,62%_100%)]"
            >
              <div className="mb-1 flex items-center justify-between border-b border-white/[0.065] px-3 pb-2.5 pt-1.5">
                <span>
                  <span className="block text-[8px] font-black tracking-[0.18em] text-[#c796ff] uppercase">Void Launcher</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-[#86798f]">Navigation and local tools</span>
                </span>
                  <span className="border border-[#4cff9a]/20 bg-[#4cff9a]/8 px-2 py-1 text-[7px] font-black tracking-[0.15em] text-[#4cff9a] uppercase">Local</span>
              </div>

              <button
                type="button"
                role="menuitem"
                data-command-menu-item="true"
                aria-controls={aboutId}
                aria-expanded={aboutOpen}
                onClick={toggleAbout}
                className={`${classes.menuItem} ${classes.focus}`}
              >
                <span className={classes.iconWell}><ShadowGlyph name="info" size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">About Void Launcher</span>
                  <span className="mt-0.5 block text-[9px] text-[#70647b]">Node, session and build identity</span>
                </span>
                <ShadowGlyph name="arrow" size={12} className={`${arrowTransitionClass} ${aboutOpen ? "rotate-90" : "-rotate-90"}`} />
              </button>

              <AnimatePresence initial={false}>
                {aboutOpen ? (
                  <motion.div
                    id={aboutId}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
                    className="mx-2 mb-2 border border-[#9d5ce0]/18 bg-black/35 p-3 [clip-path:polygon(0_0,96%_0,100%_15%,100%_100%,4%_100%,0_85%)]"
                  >
                    <dl className="grid grid-cols-[74px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[9px]">
                      <dt className="font-black tracking-[0.12em] text-[#655a70] uppercase">Void node</dt>
                      <dd className="truncate font-mono text-[#cfc3d9]" title={nodeId}>{nodeId}</dd>
                      <dt className="font-black tracking-[0.12em] text-[#655a70] uppercase">Session</dt>
                      <dd className="truncate font-mono text-[#cfc3d9]" title={sessionId}>{sessionId}</dd>
                      <dt className="font-black tracking-[0.12em] text-[#655a70] uppercase">Build</dt>
                      <dd className="font-mono text-[#d8b4fe]">{version}</dd>
                      <dt className="font-black tracking-[0.12em] text-[#655a70] uppercase">Stream</dt>
                      <dd className={buildStream === "Canary" ? "text-amber-300" : "text-[#4cff9a]"}>{buildStream}</dd>
                    </dl>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                role="menuitem"
                data-command-menu-item="true"
                disabled={updateState === "checking"}
                onClick={checkForUpdates}
                className={`${classes.menuItem} ${classes.focus}`}
              >
                <span className={classes.iconWell}>
                  <motion.span
                    animate={!reducedMotion && updateState === "checking" ? { rotate: 360 } : undefined}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="grid place-items-center"
                  >
                    <ShadowGlyph name="sync" size={17} />
                  </motion.span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{updateLabel}</span>
                  <span className="mt-0.5 block text-[9px] text-[#70647b]">Simulated release channel scan</span>
                </span>
                <span className={classes.previewBadge}>Preview</span>
              </button>

              <div
                className="relative"
                onMouseEnter={() => setLogsOpen(true)}
                onMouseLeave={() => setLogsOpen(false)}
              >
                <button
                  ref={logsTriggerRef}
                  type="button"
                  role="menuitem"
                  data-command-menu-item="true"
                  aria-controls={logsMenuId}
                  aria-expanded={logsOpen}
                  aria-haspopup="menu"
                  onClick={toggleLogs}
                  onKeyDown={handleLogsTriggerKeyboard}
                  className={`${classes.menuItem} ${classes.focus}`}
                >
                  <span className={classes.iconWell}><ShadowGlyph name="logs" size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold">Open Logs Folder</span>
                    <span className="mt-0.5 block text-[9px] text-[#70647b]">Launcher or current game instance</span>
                  </span>
                  <ShadowGlyph name="arrow" size={12} className={`${arrowTransitionClass} ${logsOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>

                <AnimatePresence initial={false}>
                  {logsOpen ? (
                    <motion.div
                      ref={logsMenuRef}
                      id={logsMenuId}
                      role="menu"
                      aria-label="Log folders"
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -7, scale: 0.985 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -5, scale: 0.99 }}
                      transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                      onKeyDown={handleLogsKeyboard}
                      className="absolute left-[calc(100%_+_10px)] top-0 w-[238px] border border-[#9d5ce0]/22 bg-[linear-gradient(145deg,rgba(17,13,23,0.99),rgba(5,5,5,0.99))] p-2 shadow-[0_26px_65px_rgba(0,0,0,0.7),0_0_34px_rgba(123,44,191,0.14)] backdrop-blur-3xl [clip-path:polygon(0_0,94%_0,100%_12%,100%_100%,6%_100%,0_88%)]"
                    >
                      <p className="px-3 pb-2 pt-1 text-[8px] font-black tracking-[0.18em] text-[#7d7088] uppercase">Select log channel</p>
                      <button
                        type="button"
                        role="menuitem"
                        data-command-submenu-item="true"
                        disabled={nativePending !== null}
                        onClick={openLauncherLogs}
                        className={`${classes.menuItem} ${classes.focus}`}
                      >
                        <span className={classes.iconWell}><ShadowGlyph name="folder" size={16} /></span>
                        <span>
                          <span className="block text-xs font-bold">Launcher Logs</span>
                          <span className="text-[8px] text-[#70647b]">Native runtime records</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        data-command-submenu-item="true"
                        disabled={nativePending !== null || isLoadingInstances}
                        onClick={openGameLogs}
                        className={`${classes.menuItem} ${classes.focus}`}
                      >
                        <span className={classes.iconWell}><ShadowGlyph name="folder" size={16} /></span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold">Game Logs</span>
                          <span className="block truncate text-[8px] text-[#70647b]">{instance?.name ?? "Shared Minecraft folder"}</span>
                        </span>
                      </button>
                      <p className="px-3 py-2 text-[8px] leading-3.5 text-[#655a70]">Press Left Arrow or Escape to return.</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                ref={restartTriggerRef}
                type="button"
                role="menuitem"
                data-command-menu-item="true"
                disabled={uploadState === "uploading"}
                onClick={uploadLogs}
                className={`${classes.menuItem} ${classes.focus}`}
              >
                <span className={classes.iconWell}><ShadowGlyph name="upload" size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{uploadLabel}</span>
                  <span className="mt-0.5 block text-[9px] text-[#70647b]">No data leaves the device in Preview</span>
                </span>
                <span className={classes.previewBadge}>Preview</span>
              </button>

              <button
                type="button"
                role="menuitem"
                data-command-menu-item="true"
                disabled={nativePending === "restart"}
                onClick={requestRestart}
                className={`${classes.menuItem} ${classes.focus}`}
              >
                <span className={`${classes.iconWell} text-[#ff6b8a]`}><ShadowGlyph name="restart" size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-[#e9dce9]">Restart Launcher</span>
                  <span className="mt-0.5 block text-[9px] text-[#806b77]">Closes and relaunches the native process</span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {restartConfirmation ? (
                  <motion.div
                    role="group"
                    aria-labelledby={restartTitleId}
                    aria-describedby={restartDescriptionId}
                    onKeyDown={handleConfirmationKeyboard}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
                    className="mx-2 mb-2 border border-[#ff5277]/24 bg-[linear-gradient(120deg,rgba(91,17,43,0.22),rgba(20,8,18,0.72))] p-3 [clip-path:polygon(0_0,96%_0,100%_18%,100%_100%,4%_100%,0_82%)]"
                  >
                    <p id={restartTitleId} className="text-[10px] font-black tracking-[0.11em] text-[#ff9caf] uppercase">Confirm native restart</p>
                    <p id={restartDescriptionId} className="mt-1.5 text-[9px] leading-4 text-[#a58f9a]">Any unsaved launcher form changes will be lost.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        ref={cancelRestartRef}
                        type="button"
                        onClick={cancelRestart}
                        className={`min-h-11 cursor-pointer border border-white/[0.09] bg-white/[0.035] px-3 text-[9px] font-black tracking-[0.1em] text-[#b8acc3] uppercase transition hover:bg-white/[0.07] hover:text-white ${classes.focus}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={nativePending === "restart"}
                        onClick={restartLauncher}
                        className={`min-h-11 cursor-pointer border border-[#ff5277]/35 bg-[linear-gradient(110deg,rgba(111,18,48,0.9),rgba(72,24,91,0.94))] px-3 text-[9px] font-black tracking-[0.1em] text-[#ffd9e1] uppercase shadow-[0_0_18px_rgba(255,51,102,0.15)] transition hover:border-[#ff9caf]/55 hover:shadow-[0_0_24px_rgba(255,51,102,0.28)] disabled:cursor-wait disabled:opacity-55 ${classes.focus}`}
                      >
                        {nativePending === "restart" ? "Restarting…" : "Restart now"}
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {(actionMessage || actionError) ? (
                <div
                  role={actionError ? "alert" : "status"}
                  aria-live="polite"
                  className={`mx-2 mb-1 mt-2 border px-3 py-2 text-[9px] leading-4 ${actionError ? "border-red-400/20 bg-red-500/8 text-red-200" : "border-[#4cff9a]/16 bg-[#4cff9a]/[0.055] text-[#9debc2]"}`}
                >
                  {actionError ?? actionMessage}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <nav
        aria-label="Void Client primary navigation"
      className="pointer-events-auto absolute left-1/2 top-3 flex max-w-[calc(100%_-_510px)] -translate-x-1/2 items-center overflow-x-auto rounded-xl border border-[#9d5ce0]/18 bg-[linear-gradient(90deg,rgba(17,13,23,0.97),rgba(17,13,23,0.97))] px-2 shadow-[0_16px_44px_rgba(0,0,0,0.36),0_0_26px_rgba(123,44,191,0.08)] backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAVIGATION_ITEMS.map((item) => {
          const active = item.id === activeView;
          return (
            <motion.button
              key={item.id}
              type="button"
              data-view={item.id}
              aria-current={active ? "page" : undefined}
              onClick={navigate}
              whileHover={reducedMotion ? undefined : { y: -1 }}
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
              className={`group relative flex h-11 min-w-[108px] cursor-pointer items-center justify-center gap-2 border-x px-3 transition-[color,border-color,background-color] duration-200 ${classes.insetFocus} ${active ? "border-[#9d5ce0]/35 bg-[linear-gradient(115deg,rgba(123,44,191,0.25),rgba(37,28,103,0.18))] text-white" : "border-white/[0.035] text-[#91869b] hover:border-[#9d5ce0]/18 hover:bg-white/[0.025] hover:text-[#f0e8f4]"}`}
            >
              {active ? (
                <motion.span
                  layoutId="command-deck-navigation-active"
                  transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-3 bottom-0 h-px bg-[#bd7aff] shadow-[0_0_13px_rgba(189,122,255,0.95)]"
                />
              ) : null}
              <ShadowGlyph
                name={item.icon}
                size={16}
                className={`shrink-0 filter drop-shadow-[0_0_6px_currentColor] ${active ? "text-[#d8b4fe]" : "text-[#655a70] group-hover:text-[#b982ef]"}`}
              />
              <span className="min-w-0 text-left">
                <span className="block truncate text-[11px] font-semibold">{translatedViewLabel(language, item.id)}</span>
              </span>
            </motion.button>
          );
        })}
      </nav>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-[linear-gradient(90deg,rgba(123,44,191,0.32),rgba(123,44,191,0.04)_28%,rgba(123,44,191,0.04)_72%,rgba(123,44,191,0.32))]" />
    </section>
  );
});

export default CommandDeck;
