import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShadowGlyph } from "./ShadowGlyph";
import {
  chooseInstallDirectory,
  closeInstallerWindow,
  finishAndLaunch,
  getDefaultInstallPath,
  installClient,
  isNativeRuntime,
  minimizeInstallerWindow,
  subscribeToInstallerProgress,
  type IInstallClientResult,
  type IInstallerProgress,
} from "./installerApi";
import { installerStyles as styles } from "./VoidInstallerApp.styles";

export type InstallerState = "WELCOME" | "PATH_SELECT" | "DOWNLOADING_CLIENT" | "DONE";

type InstallerLanguageCode =
  | "en"
  | "de"
  | "ru"
  | "ja"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "tr"
  | "pl"
  | "ko"
  | "zh"
  | "vi";

interface IInstallerLanguage {
  code: InstallerLanguageCode;
  label: string;
  nativeLabel: string;
}

interface IInstallerStep {
  id: InstallerState;
  label: string;
  meta: string;
}

const FALLBACK_INSTALL_PATH = "C:\\Users\\Username\\AppData\\Local\\Programs\\Void Launcher";
const PREVIEW_TOTAL_BYTES = 301_989_888;

const LANGUAGES: ReadonlyArray<IInstallerLanguage> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
] as const;

const STEPS: ReadonlyArray<IInstallerStep> = [
  { id: "WELCOME", label: "Void Entry", meta: "Language protocol" },
  { id: "PATH_SELECT", label: "Local Node", meta: "Path and consent" },
  { id: "DOWNLOADING_CLIENT", label: "Core Transfer", meta: "Verified payload" },
  { id: "DONE", label: "Awakening", meta: "Client ready" },
] as const;

function isLanguageCode(value: string): value is InstallerLanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

function getStepIndex(state: InstallerState): number {
  return STEPS.findIndex((step) => step.id === state);
}

function getPathValidationMessage(value: string): string | null {
  const path = value.trim();

  if (path.length === 0) return "Choose an installation directory before continuing.";
  if (path.length > 240) return "The installation path must contain 240 characters or fewer.";
  if (path.includes("/")) return "Use a Windows path with backslashes, for example C:\\Programs\\Void Launcher.";

  const isDrivePath = /^[A-Za-z]:\\/.test(path);
  const isNetworkPath = /^\\\\[^\\]+\\[^\\]+/.test(path);
  if (!isDrivePath && !isNetworkPath) {
    return "Enter an absolute Windows drive or network path.";
  }

  const pathBody = isDrivePath ? path.slice(2) : path;
  if (/[<>:"|?*\u0000-\u001F]/.test(pathBody)) {
    return "The installation path contains a character Windows does not allow.";
  }

  const segments = path.split("\\").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return "Relative path segments are not allowed in the installation directory.";
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const cleanMessage = message.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 240);
  return cleanMessage || "The native installer returned an unknown error.";
}

function previewStatus(percentage: number): string {
  if (percentage >= 94) return "Verifying client signature...";
  if (percentage >= 72) return "Assembling native runtime...";
  if (percentage >= 43) return "Resolving managed assets...";
  if (percentage >= 18) return "Downloading Void Client payload...";
  return "Opening secure transfer channel...";
}

export function VoidInstallerApp() {
  const [state, setState] = useState<InstallerState>("WELCOME");
  const [language, setLanguage] = useState<InstallerLanguageCode>("en");
  const [installationPath, setInstallationPath] = useState(FALLBACK_INSTALL_PATH);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pathTouched, setPathTouched] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [progress, setProgress] = useState<IInstallerProgress>({
    downloadedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    status: "Preparing secure transfer...",
  });
  const [installResult, setInstallResult] = useState<IInstallClientResult | null>(null);
  const [installerError, setInstallerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const mountedRef = useRef(true);
  const previewTimersRef = useRef<Set<number>>(new Set());
  const unlistenProgressRef = useRef<(() => void) | null>(null);
  const launchRequestedRef = useRef(false);
  const reduceMotion = Boolean(useReducedMotion());
  const nativeRuntime = useMemo(() => isNativeRuntime(), []);

  const normalizedPath = installationPath.trim();
  const pathError = getPathValidationMessage(normalizedPath);
  const canInstall = pathError === null && acceptedTerms && !isBrowsing;
  const activeStepIndex = getStepIndex(state);
  const selectedLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      previewTimersRef.current.forEach((timerId) => window.clearInterval(timerId));
      previewTimersRef.current.clear();
      unlistenProgressRef.current?.();
      unlistenProgressRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!nativeRuntime) return undefined;

    let cancelled = false;
    void getDefaultInstallPath()
      .then((defaultPath) => {
        if (!cancelled && defaultPath.trim()) setInstallationPath(defaultPath.trim());
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNotice(`The native default path was unavailable. The safe fallback remains selected. ${errorMessage(error)}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nativeRuntime]);

  const handleLanguageChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    if (isLanguageCode(event.target.value)) setLanguage(event.target.value);
  }, []);

  const handlePathChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setInstallationPath(event.target.value);
    setPathTouched(true);
    setInstallerError(null);
  }, []);

  const handleTermsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAcceptedTerms(event.target.checked);
    setInstallerError(null);
  }, []);

  const handleBrowse = useCallback(async () => {
    if (isBrowsing || state !== "PATH_SELECT") return;
    setIsBrowsing(true);
    setInstallerError(null);

    if (!nativeRuntime) {
      const timerId = window.setTimeout(() => {
        previewTimersRef.current.delete(timerId);
        if (mountedRef.current) {
          setInstallationPath("C:\\Users\\PreviewUser\\AppData\\Local\\Programs\\Void Launcher");
          setPathTouched(true);
          setNotice("Web preview: a deterministic sample path was selected. No system folder picker was opened.");
          setIsBrowsing(false);
        }
      }, reduceMotion ? 20 : 260);
      previewTimersRef.current.add(timerId);
      return;
    }

    try {
      const selectedPath = await chooseInstallDirectory(normalizedPath || FALLBACK_INSTALL_PATH);
      if (mountedRef.current && selectedPath) {
        setInstallationPath(selectedPath);
        setPathTouched(true);
      }
    } catch (error: unknown) {
      if (mountedRef.current) setInstallerError(`The folder picker could not be opened. ${errorMessage(error)}`);
    } finally {
      if (mountedRef.current) setIsBrowsing(false);
    }
  }, [isBrowsing, nativeRuntime, normalizedPath, reduceMotion, state]);

  const runPreviewInstallation = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let tick = 0;
      const tickCount = reduceMotion ? 20 : 50;
      const timerId = window.setInterval(() => {
        tick += 1;
        const percentage = Math.min(100, (tick / tickCount) * 100);
        const downloadedBytes = Math.round(PREVIEW_TOTAL_BYTES * (percentage / 100));
        setProgress({
          downloadedBytes,
          totalBytes: PREVIEW_TOTAL_BYTES,
          percentage,
          status: previewStatus(percentage),
        });

        if (percentage >= 100) {
          window.clearInterval(timerId);
          previewTimersRef.current.delete(timerId);
          resolve();
        }
      }, reduceMotion ? 18 : 72);
      previewTimersRef.current.add(timerId);
    });
  }, [reduceMotion]);

  const startInstallation = useCallback(async () => {
    setPathTouched(true);
    setInstallerError(null);
    setNotice(null);

    const validationError = getPathValidationMessage(normalizedPath);
    if (validationError !== null || !acceptedTerms || state !== "PATH_SELECT") return;

    setProgress({
      downloadedBytes: 0,
      totalBytes: nativeRuntime ? 0 : PREVIEW_TOTAL_BYTES,
      percentage: 0,
      status: "Opening secure transfer channel...",
    });
    setState("DOWNLOADING_CLIENT");

    try {
      if (nativeRuntime) {
        unlistenProgressRef.current?.();
        unlistenProgressRef.current = await subscribeToInstallerProgress((nextProgress) => {
          if (!mountedRef.current) return;
          setProgress((currentProgress) => ({
            ...nextProgress,
            percentage: Math.max(currentProgress.percentage, nextProgress.percentage),
          }));
        });

        const result = await installClient(normalizedPath);
        if (!mountedRef.current) return;
        setInstallResult(result);
        setProgress((currentProgress) => ({
          downloadedBytes: currentProgress.totalBytes || currentProgress.downloadedBytes,
          totalBytes: currentProgress.totalBytes,
          percentage: 100,
          status: "Void Client payload verified.",
        }));
      } else {
        await runPreviewInstallation();
        if (!mountedRef.current) return;
        setInstallResult({
          installedExecutable: `${normalizedPath}\\Void Launcher.exe — preview only, no file written`,
          version: "Preview 0.1.0",
        });
      }

      const completionTimer = window.setTimeout(() => {
        previewTimersRef.current.delete(completionTimer);
        if (mountedRef.current) setState("DONE");
      }, reduceMotion ? 20 : 280);
      previewTimersRef.current.add(completionTimer);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      setInstallerError(`Void Client could not be installed. ${errorMessage(error)}`);
      setState("PATH_SELECT");
    } finally {
      unlistenProgressRef.current?.();
      unlistenProgressRef.current = null;
    }
  }, [acceptedTerms, nativeRuntime, normalizedPath, reduceMotion, runPreviewInstallation, state]);

  const handleNext = useCallback(() => {
    if (state === "WELCOME") {
      setNotice(null);
      setState("PATH_SELECT");
    }
  }, [state]);

  const handleBack = useCallback(() => {
    if (state === "PATH_SELECT") {
      setInstallerError(null);
      setState("WELCOME");
    }
  }, [state]);

  const handleFinish = useCallback(async () => {
    if (state !== "DONE" || launchRequestedRef.current) return;
    launchRequestedRef.current = true;
    setInstallerError(null);

    if (!nativeRuntime) {
      setNotice("Web preview complete: launching and closing require the standalone native Bootstrapper.");
      launchRequestedRef.current = false;
      return;
    }

    try {
      await finishAndLaunch();
    } catch (error: unknown) {
      if (mountedRef.current) {
        setInstallerError(`Void Launcher could not be started. ${errorMessage(error)}`);
        launchRequestedRef.current = false;
      }
    }
  }, [nativeRuntime, state]);

  const handleMinimize = useCallback(async () => {
    if (!nativeRuntime) {
      setNotice("Web preview: window controls are available only in the native Bootstrapper.");
      return;
    }
    try {
      await minimizeInstallerWindow();
    } catch (error: unknown) {
      if (mountedRef.current) setInstallerError(`The window could not be minimized. ${errorMessage(error)}`);
    }
  }, [nativeRuntime]);

  const performClose = useCallback(async () => {
    setCloseConfirmationOpen(false);
    if (!nativeRuntime) {
      setNotice("Web preview: close the browser tab to exit this preview.");
      return;
    }
    try {
      await closeInstallerWindow();
    } catch (error: unknown) {
      if (mountedRef.current) setInstallerError(`The Bootstrapper could not close. ${errorMessage(error)}`);
    }
  }, [nativeRuntime]);

  const handleCloseRequest = useCallback(() => {
    if (state === "DOWNLOADING_CLIENT") {
      setCloseConfirmationOpen(true);
      return;
    }
    void performClose();
  }, [performClose, state]);

  return (
    <main className={styles.page} aria-busy={state === "DOWNLOADING_CLIENT"}>
      <InstallerAmbient reducedMotion={reduceMotion} />
      <div className={styles.shellOuter}>
        <div className={styles.shellBorder}>
          <section className={styles.shell} aria-labelledby="installer-stage-title" data-installer-state={state}>
            <InstallerTitlebar onClose={handleCloseRequest} onMinimize={handleMinimize} />

            {!nativeRuntime ? (
              <div className={styles.previewBanner} role="status">
                <span className={styles.previewDot} aria-hidden="true" />
                Web preview · Native download, file writes, launch, and window controls are disabled
              </div>
            ) : null}

            <header className={styles.header}>
              <div className={styles.brand}>
                <span className={styles.titleMark} aria-hidden="true">
                  <ShadowGlyph name="mark" size={21} className="filter drop-shadow-[0_0_9px_currentColor]" />
                </span>
                <span className={styles.brandCopy}>
                  <strong className={styles.brandTitle}>Void // Bootstrapper</strong>
                  <small className={styles.brandMeta}>Standalone Client Deployment Node</small>
                </span>
              </div>
              <div className={styles.integrityBadge}>
                <ShadowGlyph name="shield" size={14} />
                Installer integrity active
              </div>
            </header>

            {installerError ? (
              <div className={styles.globalError} role="alert">
                <ShadowGlyph name="close" size={16} className="mt-0.5 shrink-0" />
                <span>{installerError}</span>
              </div>
            ) : null}

            {notice ? (
              <div className={styles.notice} role="status">
                <ShadowGlyph name="shield" size={16} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            ) : null}

            <div className={styles.content}>
              <InstallerRail activeStepIndex={activeStepIndex} />
              <div className={styles.viewport}>
                <div className={styles.viewportRune} aria-hidden="true" />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={state}
                    className={styles.stage}
                    initial={reduceMotion ? false : { opacity: 0, x: 22, filter: "blur(5px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -16, filter: "blur(4px)" }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {state === "WELCOME" ? (
                      <WelcomeStage
                        language={language}
                        onLanguageChange={handleLanguageChange}
                        reducedMotion={reduceMotion}
                      />
                    ) : null}
                    {state === "PATH_SELECT" ? (
                      <PathSelectStage
                        acceptedTerms={acceptedTerms}
                        installationPath={installationPath}
                        isBrowsing={isBrowsing}
                        pathError={pathError}
                        pathTouched={pathTouched}
                        onBrowse={handleBrowse}
                        onPathChange={handlePathChange}
                        onTermsChange={handleTermsChange}
                      />
                    ) : null}
                    {state === "DOWNLOADING_CLIENT" ? (
                      <DownloadingStage progress={progress} reducedMotion={reduceMotion} />
                    ) : null}
                    {state === "DONE" ? <DoneStage result={installResult} nativeRuntime={nativeRuntime} /> : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <InstallerFooter
              canInstall={canInstall}
              languageLabel={selectedLanguage.nativeLabel}
              nativeRuntime={nativeRuntime}
              onBack={handleBack}
              onFinish={handleFinish}
              onInstall={startInstallation}
              onNext={handleNext}
              progress={progress.percentage}
              state={state}
            />
          </section>
        </div>
      </div>

      <AnimatePresence>
        {closeConfirmationOpen ? (
          <CloseConfirmation
            onCancel={() => setCloseConfirmationOpen(false)}
            onConfirm={performClose}
            reducedMotion={reduceMotion}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

interface IInstallerAmbientProps {
  reducedMotion: boolean;
}

function InstallerAmbient({ reducedMotion }: IInstallerAmbientProps) {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <div className={styles.ambientGrid} />
      <motion.div
        className={styles.ambientGlow}
        initial={reducedMotion ? false : { x: -18, y: 12, opacity: 0.7 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.01 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className={styles.ambientBlue}
        initial={reducedMotion ? false : { x: 20, y: -10, opacity: 0.6 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.01 : 1.25, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className={styles.slashA} />
      <div className={styles.slashB} />
    </div>
  );
}

interface IInstallerTitlebarProps {
  onClose: () => void;
  onMinimize: () => Promise<void>;
}

function InstallerTitlebar({ onClose, onMinimize }: IInstallerTitlebarProps) {
  return (
    <div className={styles.titlebar} data-tauri-drag-region>
      <div className={styles.titleBrand} data-tauri-drag-region>
        <span className={styles.titleMark} aria-hidden="true">
          <ShadowGlyph name="mark" size={17} />
        </span>
        <span className={styles.titleText} data-tauri-drag-region>Void Launcher Setup</span>
        <span className={styles.titleMeta} data-tauri-drag-region>Bootstrap Node // 01</span>
      </div>
      <div className={styles.windowControls}>
        <button type="button" className={styles.windowButton} onClick={() => void onMinimize()} aria-label="Minimize installer">
          <ShadowGlyph name="minimize" size={16} />
        </button>
        <button type="button" className={styles.closeWindowButton} onClick={onClose} aria-label="Close installer">
          <ShadowGlyph name="close" size={15} />
        </button>
      </div>
    </div>
  );
}

function InstallerRail({ activeStepIndex }: { activeStepIndex: number }) {
  return (
    <aside className={styles.rail} aria-label="Installation progress">
      <p className={styles.railKicker}>Shadow Garden Protocol</p>
      <h2 className={styles.railTitle}>One small node awakens the entire Void.</h2>
      <p className={styles.railBody}>
        This lightweight Bootstrapper installs the daily-use client, verifies its payload, starts it once, and exits.
      </p>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => {
          const active = index === activeStepIndex;
          const complete = index < activeStepIndex;
          const nodeClass = active
            ? `${styles.stepNode} ${styles.stepNodeActive}`
            : complete
              ? `${styles.stepNode} ${styles.stepNodeDone}`
              : `${styles.stepNode} ${styles.stepNodeIdle}`;
          const labelClass = active
            ? `${styles.stepLabel} ${styles.stepLabelActive}`
            : complete
              ? `${styles.stepLabel} ${styles.stepLabelDone}`
              : `${styles.stepLabel} ${styles.stepLabelIdle}`;

          return (
            <li key={step.id} className={styles.stepItem} aria-current={active ? "step" : undefined}>
              <span className={nodeClass} aria-hidden="true">
                {complete ? <ShadowGlyph name="check" size={13} /> : String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong className={labelClass}>{step.label}</strong>
                <small className={styles.stepMeta}>{step.meta}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

interface IWelcomeStageProps {
  language: InstallerLanguageCode;
  onLanguageChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  reducedMotion: boolean;
}

function WelcomeStage({ language, onLanguageChange, reducedMotion }: IWelcomeStageProps) {
  return (
    <div className={styles.centeredStage}>
      <motion.div
        className={styles.sigil}
        initial={reducedMotion ? false : { rotate: -3, scale: 0.94, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      >
        <span className={styles.sigilOuter} />
        <span className={styles.sigilDiamond} />
        <span className={styles.sigilCore}>
          <ShadowGlyph name="mark" size={43} className="filter drop-shadow-[0_0_13px_currentColor]" />
        </span>
      </motion.div>
      <p className={styles.kicker}>A Separate Deployment Application</p>
      <h1 id="installer-stage-title" className={styles.stageTitle}>
        Welcome to
        <span className={styles.accentTitle}>Void Launcher</span>
      </h1>
      <p className={styles.stageBody}>
        Configure the installation node. The Bootstrapper will deploy the full client and then leave the shadows.
      </p>
      <label className={styles.languageField} htmlFor="installer-language">
        <span className={styles.label}>Installer language</span>
        <span className={styles.selectWrap}>
          <ShadowGlyph name="globe" size={17} className={styles.selectIcon} />
          <select
            id="installer-language"
            value={language}
            onChange={onLanguageChange}
            className={styles.select}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>{item.nativeLabel} · {item.label}</option>
            ))}
          </select>
          <ShadowGlyph name="arrow" size={14} className={styles.selectChevron} />
        </span>
      </label>
    </div>
  );
}

interface IPathSelectStageProps {
  acceptedTerms: boolean;
  installationPath: string;
  isBrowsing: boolean;
  pathError: string | null;
  pathTouched: boolean;
  onBrowse: () => Promise<void>;
  onPathChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTermsChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function PathSelectStage({
  acceptedTerms,
  installationPath,
  isBrowsing,
  pathError,
  pathTouched,
  onBrowse,
  onPathChange,
  onTermsChange,
}: IPathSelectStageProps) {
  const showPathError = pathTouched && pathError !== null;
  const descriptionId = showPathError ? "installation-path-error" : "installation-path-help";

  return (
    <div>
      <div className={styles.pathHeader}>
        <p className={styles.kicker}>Local Deployment Matrix</p>
        <h1 id="installer-stage-title" className={styles.stageTitle}>Choose the client installation path.</h1>
        <p className={styles.stageBody}>
          The full Void Launcher executable and its managed runtime will be installed in this directory.
        </p>
      </div>
      <label htmlFor="installation-path" className={styles.label}>Installation directory</label>
      <div className={styles.pathRow}>
        <div className={styles.inputWrap}>
          <ShadowGlyph name="folder" size={17} className={styles.inputIcon} />
          <input
            id="installation-path"
            type="text"
            className={styles.pathInput}
            value={installationPath}
            onChange={onPathChange}
            maxLength={260}
            spellCheck={false}
            autoComplete="off"
            aria-describedby={descriptionId}
            aria-invalid={showPathError}
          />
        </div>
        <button
          type="button"
          className={styles.browseButton}
          onClick={() => void onBrowse()}
          disabled={isBrowsing}
        >
          <ShadowGlyph name="folder" size={16} />
          {isBrowsing ? "Opening..." : "Browse"}
        </button>
      </div>
      <p id={descriptionId} className={showPathError ? styles.error : styles.helper} role={showPathError ? "alert" : undefined}>
        {showPathError
          ? pathError
          : "Use an absolute Windows path. The native build opens the operating system folder picker."}
      </p>

      <label className={styles.agreement}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={onTermsChange}
          className="peer sr-only"
          aria-describedby="terms-description"
        />
        <span className={styles.checkbox} aria-hidden="true">
          <ShadowGlyph name="check" size={14} />
        </span>
        <span>
          <strong className={styles.agreementTitle}>I accept the Terms of Service and Privacy Policy</strong>
          <small id="terms-description" className={styles.agreementBody}>
            Required before the Bootstrapper can download and write the Void Client payload.
          </small>
        </span>
      </label>
    </div>
  );
}

interface IDownloadingStageProps {
  progress: IInstallerProgress;
  reducedMotion: boolean;
}

function DownloadingStage({ progress, reducedMotion }: IDownloadingStageProps) {
  const totalBytes = progress.totalBytes || PREVIEW_TOTAL_BYTES;
  const progressScale = Math.max(0, Math.min(1, progress.percentage / 100));

  return (
    <div className={styles.centeredStage}>
      <div className={styles.progressSigil} aria-hidden="true">
        <motion.span
          className={styles.progressOrbit}
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "linear" }}
        />
        <span className={styles.progressCore}>
          <ShadowGlyph name="download" size={29} className="filter drop-shadow-[0_0_11px_currentColor]" />
        </span>
      </div>
      <p className={styles.kicker}>Secure Payload Transfer</p>
      <h1 id="installer-stage-title" className={styles.stageTitle}>Downloading Void Client payload...</h1>
      <p className={styles.stageBody}>The Bootstrapper is assembling and verifying the separate daily-use application.</p>
      <div
        className="w-full"
        role="progressbar"
        aria-label="Void Client download progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.percentage)}
        aria-valuetext={`${Math.round(progress.percentage)} percent. ${progress.status}`}
      >
        <div className={styles.progressShell}>
          <motion.div
            className={styles.progressBar}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progressScale }}
            transition={{ duration: reducedMotion ? 0.01 : 0.14, ease: "linear" }}
          />
        </div>
        <div className={styles.progressMeta}>
          <span className={styles.progressStatus} aria-live="polite">{progress.status}</span>
          <span className={styles.progressValue}>{Math.round(progress.percentage).toString().padStart(3, "0")}%</span>
        </div>
        <div className={styles.transferMeta}>
          <span className={styles.transferCell}>
            <small className={styles.transferLabel}>Transferred</small>
            <strong className={styles.transferValue}>{formatBytes(progress.downloadedBytes)}</strong>
          </span>
          <span className={styles.transferCell}>
            <small className={styles.transferLabel}>Payload size</small>
            <strong className={styles.transferValue}>{formatBytes(totalBytes)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

interface IDoneStageProps {
  nativeRuntime: boolean;
  result: IInstallClientResult | null;
}

function DoneStage({ nativeRuntime, result }: IDoneStageProps) {
  return (
    <div className={styles.centeredStage}>
      <div className={styles.doneBadge} aria-hidden="true">
        <ShadowGlyph name="check" size={47} className="filter drop-shadow-[0_0_13px_currentColor]" />
      </div>
      <p className={`${styles.kicker} mt-7 text-[#58ed9d]`}>{nativeRuntime ? "Deployment Complete" : "Preview Complete"}</p>
      <h1 id="installer-stage-title" className={styles.stageTitle}>
        {nativeRuntime ? "The Void Client is ready." : "The preview sequence is complete."}
      </h1>
      <p className={styles.stageBody}>
        {nativeRuntime
          ? "Finish to launch the separate Void Client application. This Bootstrapper will close immediately afterward."
          : "No executable or directory was created. Use the native Bootstrapper to perform a real installation."}
      </p>
      {result ? (
        <dl className={styles.resultCard}>
          <div className={styles.resultRow}>
            <dt className={styles.resultLabel}>Client version</dt>
            <dd className={styles.resultValue}>{result.version}</dd>
          </div>
          <div className={styles.resultRow}>
            <dt className={styles.resultLabel}>Executable</dt>
            <dd className={styles.resultValue}>{result.installedExecutable}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

interface IInstallerFooterProps {
  canInstall: boolean;
  languageLabel: string;
  nativeRuntime: boolean;
  onBack: () => void;
  onFinish: () => Promise<void>;
  onInstall: () => Promise<void>;
  onNext: () => void;
  progress: number;
  state: InstallerState;
}

function InstallerFooter({
  canInstall,
  languageLabel,
  nativeRuntime,
  onBack,
  onFinish,
  onInstall,
  onNext,
  progress,
  state,
}: IInstallerFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerStatus} aria-live="polite">
        <span className={styles.footerDot} aria-hidden="true" />
        {state === "DOWNLOADING_CLIENT"
          ? `Core transfer ${Math.round(progress)}%`
          : `${languageLabel} · ${nativeRuntime ? "Native node" : "Preview node"}`}
      </div>
      <div className={styles.actions}>
        {state === "PATH_SELECT" ? (
          <button type="button" className={styles.secondaryButton} onClick={onBack}>Back</button>
        ) : null}
        {state === "WELCOME" ? (
          <button type="button" className={styles.primaryButton} onClick={onNext}>
            Next
            <ShadowGlyph name="arrow" size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        ) : null}
        {state === "PATH_SELECT" ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void onInstall()}
            disabled={!canInstall}
            title={!canInstall ? "Choose a valid path and accept the Terms of Service to continue." : undefined}
          >
            {nativeRuntime ? "Install Void Client" : "Preview installation"}
            <ShadowGlyph name="download" size={16} />
          </button>
        ) : null}
        {state === "DONE" ? (
          <button type="button" className={styles.primaryButton} onClick={() => void onFinish()}>
            Finish &amp; Start Void Launcher
            <ShadowGlyph name="launch" size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        ) : null}
      </div>
    </footer>
  );
}

interface ICloseConfirmationProps {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  reducedMotion: boolean;
}

function CloseConfirmation({ onCancel, onConfirm, reducedMotion }: ICloseConfirmationProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <motion.div
      className={styles.confirmBackdrop}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
      role="presentation"
    >
      <motion.section
        className={styles.confirmCard}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="close-confirmation-title"
        aria-describedby="close-confirmation-description"
      >
        <p className={styles.kicker}>Transfer Interruption</p>
        <h2 id="close-confirmation-title" className={styles.confirmTitle}>Abort the client download?</h2>
        <p id="close-confirmation-description" className={styles.confirmBody}>
          Closing now interrupts the active transfer. The native backend is responsible for removing incomplete temporary files.
        </p>
        <div className={styles.confirmActions}>
          <button ref={cancelButtonRef} type="button" className={styles.secondaryButton} onClick={onCancel}>Keep downloading</button>
          <button type="button" className={styles.dangerButton} onClick={() => void onConfirm()}>Abort &amp; close</button>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default VoidInstallerApp;
