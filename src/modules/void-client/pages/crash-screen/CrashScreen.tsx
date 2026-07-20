import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";

import { ShadowGlyph } from "../../components/ShadowGlyph";
import { crashScreenStyles as styles } from "./crash-screen.styles";

export type CrashLogDestination = "MC-Logs.gs" | "Void Logs Native";
export type CrashRepairSource = "local-preview" | "native";

type ExecutableRepairPhase = "scanning" | "verifying" | "restoring" | "finalizing";
type RepairPhase = "idle" | ExecutableRepairPhase | "success" | "failed";
type PhaseVisualState = "pending" | "active" | "complete" | "failed";

export interface IRepairResult {
  success: boolean;
  summary?: string;
}

export interface ICrashScreenProps {
  error?: unknown;
  stackTrace?: readonly string[];
  diagnosis?: string;
  possibleFix?: string;
  automaticallyUploadLogs?: boolean;
  logDestination?: CrashLogDestination;
  repairSource?: CrashRepairSource;
  onAnalyzeAndRepair?: () => Promise<IRepairResult | void>;
  onRetry?: () => void | Promise<void>;
  onReturn?: () => void | Promise<void>;
  incidentId?: string;
  retryLabel?: string;
  returnLabel?: string;
}

export interface IRuntimeErrorReport {
  message: string;
  stack: string;
  componentStack: string;
}

export interface IVoidRuntimeBoundaryProps {
  children: ReactNode;
  crashScreenProps?: Omit<ICrashScreenProps, "error" | "stackTrace" | "onRetry" | "onReturn">;
  onError?: (report: IRuntimeErrorReport) => void;
  onReset?: () => void;
  onReload?: () => void;
  resetKey?: string | number;
}

interface IVoidRuntimeBoundaryState {
  error: Error | null;
}

interface IRepairPhaseDefinition {
  id: ExecutableRepairPhase;
  label: string;
  detail: string;
  target: number;
}

interface ISanitizedTraceLine {
  id: string;
  line: string;
  tone: "critical" | "frame" | "neutral";
}

const MAX_DIAGNOSTIC_LENGTH = 12_000;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const WINDOWS_USER_PATTERN = /([A-Za-z]:\\Users\\)[^\\\s]+/g;
const MAC_USER_PATTERN = /(\/Users\/)[^/\s]+/g;
const LINUX_USER_PATTERN = /(\/home\/)[^/\s]+/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_PATTERN = /\b(access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|api[_-]?key|password)\b\s*[:=]\s*["']?[^\s"',;]+/gi;

const DEFAULT_STACK_TRACE = [
  "java.lang.IllegalStateException: Registry synchronization failed during client bootstrap",
  "    at net.fabricmc.loader.impl.launch.knot.KnotClient.main(KnotClient.java:28)",
  "    at void.launcher.runtime.GameProcess.start(GameProcess.java:184)",
  "Caused by: java.nio.file.NoSuchFileException: libraries/net/minecraft/client.jar",
  "    at java.base/sun.nio.fs.WindowsException.translateToIOException(WindowsException.java:92)",
  "    at java.base/java.nio.file.Files.newByteChannel(Files.java:380)",
  "    at void.launcher.integrity.AssetVerifier.verify(AssetVerifier.java:71)",
  "[Void/Diagnostics] Bootstrap halted before the game window was created.",
] as const;

const REPAIR_PHASES: readonly IRepairPhaseDefinition[] = [
  {
    id: "scanning",
    label: "Integrity scan",
    detail: "Mapping manifests and local assets",
    target: 28,
  },
  {
    id: "verifying",
    label: "Dependency verification",
    detail: "Comparing library signatures",
    target: 57,
  },
  {
    id: "restoring",
    label: "Asset restoration",
    detail: "Preparing recoverable file actions",
    target: 86,
  },
  {
    id: "finalizing",
    label: "Boot profile rebuild",
    detail: "Validating the repaired launch graph",
    target: 100,
  },
] as const;

const PHASE_CLASS_NAMES: Record<PhaseVisualState, string> = {
  pending: `${styles.phase} ${styles.phasePending}`,
  active: `${styles.phase} ${styles.phaseActive}`,
  complete: `${styles.phase} ${styles.phaseComplete}`,
  failed: `${styles.phase} ${styles.phaseFailed}`,
};

const PHASE_STATUS_LABELS: Record<PhaseVisualState, string> = {
  pending: "Pending",
  active: "Running",
  complete: "Complete",
  failed: "Stopped",
};

function coerceDiagnosticValue(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "The game process terminated before a detailed error message was available.";
  }

  try {
    return String(value);
  } catch {
    return "An unreadable runtime error interrupted the game process.";
  }
}

export function sanitizeDiagnosticText(value: unknown): string {
  return coerceDiagnosticValue(value)
    .replace(CONTROL_CHARACTER_PATTERN, "")
    .replace(WINDOWS_USER_PATTERN, "$1<user>")
    .replace(MAC_USER_PATTERN, "$1<user>")
    .replace(LINUX_USER_PATTERN, "$1<user>")
    .replace(EMAIL_PATTERN, "<redacted-email>")
    .replace(SECRET_PATTERN, (_match, key: string) => `${key}=<redacted>`)
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}

function getDefaultDiagnosis(errorMessage: string): string {
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("memory") || normalizedMessage.includes("heap")) {
    return "The client exhausted its available Java heap during bootstrap. The active profile may be allocating less memory than its mod graph requires.";
  }

  if (normalizedMessage.includes("missing") || normalizedMessage.includes("nosuchfile")) {
    return "One or more required runtime assets are absent or were interrupted during download. The launch graph stopped before Minecraft could create a window.";
  }

  return "The runtime boundary detected a failed client bootstrap. The most likely causes are an incomplete dependency, an incompatible mod, or a stale instance manifest.";
}

function hashDiagnosticLine(line: string): string {
  let hash = 2_166_136_261;

  for (let characterIndex = 0; characterIndex < line.length; characterIndex += 1) {
    hash ^= line.charCodeAt(characterIndex);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(36);
}

function createSanitizedTraceLines(trace: string): ISanitizedTraceLine[] {
  const hashOccurrences = new Map<string, number>();

  return trace.split("\n").map((line) => {
    const lineHash = hashDiagnosticLine(line);
    const occurrence = (hashOccurrences.get(lineHash) ?? 0) + 1;
    const normalizedLine = line.trimStart();
    const tone = /(?:exception|error|caused by:|fatal|halted)/i.test(normalizedLine)
      ? "critical"
      : normalizedLine.startsWith("at ")
        ? "frame"
        : "neutral";

    hashOccurrences.set(lineHash, occurrence);

    return {
      id: `${lineHash}-${occurrence}`,
      line,
      tone,
    };
  });
}

function getDefaultPossibleFix(errorMessage: string): string {
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("memory") || normalizedMessage.includes("heap")) {
    return "Increase the profile RAM allocation, close memory-heavy applications, then retry. Keep at least 2 GB available for Windows.";
  }

  return "Run the integrity analysis below, review the proposed result, then retry the instance. Disable the most recently installed mod if the crash repeats.";
}

function getPhaseVisualState(
  phaseId: ExecutableRepairPhase,
  activePhase: RepairPhase,
  failedPhase: ExecutableRepairPhase | null,
): PhaseVisualState {
  const itemIndex = REPAIR_PHASES.findIndex((item) => item.id === phaseId);
  const activeIndex = REPAIR_PHASES.findIndex((item) => item.id === activePhase);

  if (activePhase === "success") {
    return "complete";
  }

  if (activePhase === "failed") {
    const failedIndex = failedPhase
      ? REPAIR_PHASES.findIndex((item) => item.id === failedPhase)
      : REPAIR_PHASES.length - 1;

    if (itemIndex < failedIndex) {
      return "complete";
    }

    return itemIndex === failedIndex ? "failed" : "pending";
  }

  if (activeIndex < 0) {
    return "pending";
  }

  if (itemIndex < activeIndex) {
    return "complete";
  }

  return itemIndex === activeIndex ? "active" : "pending";
}

export function CrashScreen({
  error,
  stackTrace,
  diagnosis,
  possibleFix,
  automaticallyUploadLogs = false,
  logDestination = "Void Logs Native",
  repairSource = "local-preview",
  onAnalyzeAndRepair,
  onRetry,
  onReturn,
  incidentId = "VOID-RUNTIME-7E4F",
  retryLabel = "Retry Launch",
  returnLabel = "Return to Launcher",
}: ICrashScreenProps) {
  const reducedMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const repairControllerRef = useRef<AbortController | null>(null);
  const repairTimersRef = useRef<Set<number>>(new Set());
  const [repairPhase, setRepairPhase] = useState<RepairPhase>("idle");
  const [failedPhase, setFailedPhase] = useState<ExecutableRepairPhase | null>(null);
  const [progress, setProgress] = useState(0);
  const [repairMessage, setRepairMessage] = useState(
    "Diagnostics are ready. No files have been changed.",
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const safeErrorMessage = useMemo(() => sanitizeDiagnosticText(error), [error]);
  const safeDiagnosis = useMemo(
    () => sanitizeDiagnosticText(diagnosis ?? getDefaultDiagnosis(safeErrorMessage)),
    [diagnosis, safeErrorMessage],
  );
  const safePossibleFix = useMemo(
    () => sanitizeDiagnosticText(possibleFix ?? getDefaultPossibleFix(safeErrorMessage)),
    [possibleFix, safeErrorMessage],
  );
  const safeIncidentId = useMemo(() => sanitizeDiagnosticText(incidentId), [incidentId]);
  const safeRetryLabel = useMemo(() => sanitizeDiagnosticText(retryLabel), [retryLabel]);
  const safeReturnLabel = useMemo(() => sanitizeDiagnosticText(returnLabel), [returnLabel]);
  const safeLogDestination = useMemo(() => sanitizeDiagnosticText(logDestination), [logDestination]);
  const safeTrace = useMemo(() => {
    const traceLines = stackTrace && stackTrace.length > 0 ? stackTrace : DEFAULT_STACK_TRACE;
    return sanitizeDiagnosticText(traceLines.join("\n"));
  }, [stackTrace]);
  const safeTraceLines = useMemo(() => createSanitizedTraceLines(safeTrace), [safeTrace]);
  const isRepairing = REPAIR_PHASES.some((item) => item.id === repairPhase);
  const nativeSourceUnavailable = repairSource === "native" && !onAnalyzeAndRepair;
  const currentPhase = REPAIR_PHASES.find((item) => item.id === repairPhase);
  const progressLabel = currentPhase?.detail ?? (repairPhase === "success" ? "Analysis complete" : "Awaiting command");

  const cancelRepair = useCallback(() => {
    repairControllerRef.current?.abort();
    repairControllerRef.current = null;
    repairTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    repairTimersRef.current.clear();
  }, []);

  const waitFor = useCallback((durationMs: number, signal: AbortSignal) => {
    return new Promise<boolean>((resolve) => {
      if (signal.aborted) {
        resolve(false);
        return;
      }

      const handleAbort = () => {
        window.clearTimeout(timerId);
        repairTimersRef.current.delete(timerId);
        resolve(false);
      };
      const timerId = window.setTimeout(() => {
        signal.removeEventListener("abort", handleAbort);
        repairTimersRef.current.delete(timerId);
        resolve(true);
      }, durationMs);

      repairTimersRef.current.add(timerId);
      signal.addEventListener("abort", handleAbort, { once: true });
    });
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
    return cancelRepair;
  }, [cancelRepair]);

  const runRepair = useCallback(async () => {
    if (nativeSourceUnavailable || isRepairing || repairControllerRef.current) {
      return;
    }

    cancelRepair();
    const controller = new AbortController();
    repairControllerRef.current = controller;
    setFailedPhase(null);
    setProgress(0);
    setRepairPhase("scanning");
    setRepairMessage(
      repairSource === "native"
        ? "Native repair source connected. Verifying the local instance."
        : "Local preview started. The launcher is calculating a repair plan without changing files.",
    );

    const nativeOutcome = repairSource === "native" && onAnalyzeAndRepair
      ? Promise.resolve()
          .then(onAnalyzeAndRepair)
          .then((result) => ({ result }))
          .catch((nativeError: unknown) => ({ error: nativeError }))
      : Promise.resolve({ result: undefined });

    let previousTarget = 0;
    let lastExecutedPhase: ExecutableRepairPhase = "scanning";

    for (const phaseDefinition of REPAIR_PHASES) {
      if (controller.signal.aborted) {
        return;
      }

      lastExecutedPhase = phaseDefinition.id;
      setRepairPhase(phaseDefinition.id);

      if (reducedMotion) {
        const continued = await waitFor(90, controller.signal);
        if (!continued) {
          return;
        }
        setProgress(phaseDefinition.target);
      } else {
        for (let nextProgress = previousTarget + 1; nextProgress <= phaseDefinition.target; nextProgress += 1) {
          const continued = await waitFor(24, controller.signal);
          if (!continued) {
            return;
          }
          setProgress(nextProgress);
        }
      }

      previousTarget = phaseDefinition.target;
    }

    const outcome = await nativeOutcome;
    if (controller.signal.aborted) {
      return;
    }

    repairControllerRef.current = null;

    if ("error" in outcome) {
      setFailedPhase(lastExecutedPhase);
      setRepairPhase("failed");
      setRepairMessage(`Native repair stopped: ${sanitizeDiagnosticText(outcome.error)}`);
      return;
    }

    if (outcome.result?.success === false) {
      setFailedPhase(lastExecutedPhase);
      setRepairPhase("failed");
      setRepairMessage(sanitizeDiagnosticText(outcome.result.summary ?? "The native repair source could not validate the instance."));
      return;
    }

    setRepairPhase("success");
    setRepairMessage(
      repairSource === "native"
        ? sanitizeDiagnosticText(outcome.result?.summary ?? "The native repair source reported a successful repair.")
        : "Preview complete. A recovery plan was validated locally; no native game files were changed.",
    );
  }, [cancelRepair, isRepairing, nativeSourceUnavailable, onAnalyzeAndRepair, reducedMotion, repairSource, waitFor]);

  const handleRepairClick = useCallback(() => {
    void runRepair();
  }, [runRepair]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) {
      return;
    }

    cancelRepair();
    setIsRetrying(true);
    setActionMessage("Retrying the launch sequence…");

    try {
      await onRetry();
    } catch (retryError) {
      setActionMessage(`Retry failed: ${sanitizeDiagnosticText(retryError)}`);
    } finally {
      setIsRetrying(false);
    }
  }, [cancelRepair, isRetrying, onRetry]);

  const handleRetryClick = useCallback(() => {
    void handleRetry();
  }, [handleRetry]);

  const handleReturn = useCallback(async () => {
    if (!onReturn) {
      return;
    }

    cancelRepair();
    setActionMessage("Returning to the launcher…");

    try {
      await onReturn();
    } catch (returnError) {
      setActionMessage(`Return action failed: ${sanitizeDiagnosticText(returnError)}`);
    }
  }, [cancelRepair, onReturn]);

  const handleReturnClick = useCallback(() => {
    void handleReturn();
  }, [handleReturn]);

  const phaseRows = REPAIR_PHASES.map((phaseDefinition) => {
    const visualState = getPhaseVisualState(phaseDefinition.id, repairPhase, failedPhase);

    return (
      <li
        aria-current={visualState === "active" ? "step" : undefined}
        className={PHASE_CLASS_NAMES[visualState]}
        key={phaseDefinition.id}
      >
        <span>{phaseDefinition.label}</span>
        <span>{PHASE_STATUS_LABELS[visualState]}</span>
      </li>
    );
  });
  const traceRows = safeTraceLines.map((traceLine) => {
    const traceClassName = traceLine.tone === "critical"
      ? styles.traceCritical
      : traceLine.tone === "frame"
        ? styles.traceFrame
        : styles.traceNeutral;

    return <span className={traceClassName} key={traceLine.id}>{traceLine.line}</span>;
  });

  return (
    <motion.main
      animate={{ opacity: 1 }}
      aria-labelledby="void-crash-title"
      className={styles.root}
      initial={reducedMotion ? false : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: "easeOut" }}
    >
      <div aria-hidden="true" className={styles.ambient}>
        <div className={styles.ambientRed} />
        <div className={styles.ambientPurple} />
        <div className={styles.grid} />
      </div>
      <div aria-hidden="true" className={styles.hazardRail} />

      <div className={styles.shell}>
        <header className={styles.header}>
          <div aria-hidden="true" className={styles.headerSlash} />
          <div className={styles.headerContent}>
            <div className={styles.alertIdentity}>
              <div className={styles.alertIcon}>
                <ShadowGlyph aria-hidden="true" name="warning" size={34} />
              </div>
              <div className="min-w-0">
                <p className={styles.eyebrow}>Void Diagnostics / Fatal Interruption</p>
                <h1 className={styles.title} id="void-crash-title" ref={headingRef} tabIndex={-1}>
                  THE CLIENT FELL INTO SHADOW
                </h1>
                <p className={styles.subtitle}>
                  Minecraft stopped before reaching a stable game state. Your instance remains isolated while the launcher inspects the failure.
                </p>
              </div>
            </div>

            <div className={styles.incidentPanel}>
              <p className={styles.incidentLabel}>Incident signature</p>
              <p className={styles.incidentValue}>{safeIncidentId}</p>
              <div className={styles.incidentStatus}>
                <span aria-hidden="true" className={styles.statusDiamond} />
                <span>GAME PROCESS TERMINATED</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <section aria-labelledby="void-stack-title" className={styles.panel}>
            <div className={styles.panelHeadingRow}>
              <div>
                <p className={styles.panelKicker}>Sanitized evidence</p>
                <h2 className={styles.panelTitle} id="void-stack-title">Runtime Stack Trace</h2>
              </div>
              <span className={styles.panelBadge}>
                <ShadowGlyph aria-hidden="true" name="logs" size={14} />
                Selectable log
              </span>
            </div>

            <p className={styles.errorMessage} role="alert">{safeErrorMessage}</p>
            <pre
              aria-label="Sanitized crash stack trace. The text can be selected and copied."
              className={styles.trace}
              tabIndex={0}
            >
              <code>{traceRows}</code>
            </pre>
            <p className={styles.traceHint}>
              <ShadowGlyph aria-hidden="true" name="privacy" size={14} />
              User paths, email addresses, control characters, and common credential fields are redacted before display.
            </p>
          </section>

          <aside aria-labelledby="void-diagnosis-title" className={`${styles.panel} flex flex-col`}>
            <div className={styles.panelHeadingRow}>
              <div>
                <p className={styles.panelKicker}>Recovery intelligence</p>
                <h2 className={styles.panelTitle} id="void-diagnosis-title">Diagnosis / Possible Fix</h2>
              </div>
              <span className={styles.panelBadge}>
                <ShadowGlyph aria-hidden="true" name="repair" size={14} />
                Local analysis
              </span>
            </div>

            <div className={styles.diagnosisGrid}>
              <article className={styles.diagnosisCard}>
                <h3 className={styles.diagnosisLabel}>
                  <ShadowGlyph aria-hidden="true" name="warning" size={15} />
                  Diagnosis
                </h3>
                <p className={styles.diagnosisText}>{safeDiagnosis}</p>
              </article>
              <article className={styles.diagnosisCard}>
                <h3 className={styles.diagnosisLabel}>
                  <ShadowGlyph aria-hidden="true" name="spark" size={15} />
                  Possible fix
                </h3>
                <p className={styles.diagnosisText}>{safePossibleFix}</p>
              </article>
            </div>

            <div className={styles.preferenceStrip}>
              <div className={styles.preferenceItem}>
                <div className={styles.preferenceIcon}>
                  <ShadowGlyph aria-hidden="true" name="upload" size={18} />
                </div>
                <div>
                  <p className={styles.preferenceLabel}>Automatic crash upload</p>
                  <p className={styles.preferenceValue}>
                    {automaticallyUploadLogs ? "Enabled by preference" : "Disabled by preference"}
                  </p>
                </div>
              </div>
              <div className={styles.preferenceItem}>
                <div className={styles.preferenceIcon}>
                  <ShadowGlyph aria-hidden="true" name="logs" size={18} />
                </div>
                <div>
                  <p className={styles.preferenceLabel}>Log destination</p>
                  <p className={styles.preferenceValue}>{safeLogDestination}</p>
                </div>
              </div>
              <p className={styles.preferenceDisclosure}>
                Preference display only. This diagnostic surface does not transmit logs or credentials.
              </p>
            </div>

            <section aria-labelledby="void-repair-title" aria-busy={isRepairing} className={styles.repairPanel}>
              <div className={styles.repairHeader}>
                <div>
                  <p className={styles.panelKicker}>Recovery sequence</p>
                  <h3 className="mt-1 text-base font-black text-white" id="void-repair-title">Analyze & Repair Instance</h3>
                </div>
                <span className={styles.repairMode}>
                  {repairSource === "native" ? "Native source" : "Local preview"}
                </span>
              </div>

              <p className={styles.repairDisclosure}>
                {repairSource === "native"
                  ? "A native repair source is selected. Confirmed actions may modify recoverable instance files."
                  : "Preview mode only: this sequence analyzes simulated recovery steps and never modifies native game files."}
              </p>

              <div
                aria-label={progressLabel}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className={styles.progressTrack}
                role="progressbar"
              >
                <motion.div
                  animate={{ scaleX: progress / 100 }}
                  className={styles.progressFill}
                  initial={false}
                  transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
                />
              </div>
              <div className={styles.progressMeta}>
                <span className="text-[#bdaec1]">{progressLabel}</span>
                <span className="tabular-nums text-[#e7bbff]">{progress}%</span>
              </div>

              <ol aria-label="Repair phases" className={styles.phaseList}>{phaseRows}</ol>
              <p aria-live="polite" className="mt-4 text-xs leading-5 text-[#cbbfd0]">{repairMessage}</p>
              {nativeSourceUnavailable ? (
                <p className="mt-2 text-xs leading-5 text-[#ff91a7]" role="alert">
                  Native repair is selected, but no native repair handler is connected.
                </p>
              ) : null}
            </section>

            <div className={styles.actionRow}>
              <motion.button
                className={styles.primaryButton}
                disabled={isRepairing || nativeSourceUnavailable}
                onClick={handleRepairClick}
                type="button"
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              >
                <ShadowGlyph aria-hidden="true" name="repair" size={18} />
                {isRepairing ? "Analyzing Instance" : "Analyze & Repair"}
              </motion.button>
              <button
                className={styles.secondaryButton}
                disabled={!onRetry || isRetrying}
                onClick={handleRetryClick}
                type="button"
              >
                <ShadowGlyph aria-hidden="true" name="restart" size={17} />
                {isRetrying ? "Retrying…" : safeRetryLabel}
              </button>
              <button
                className={styles.dangerButton}
                disabled={!onReturn}
                onClick={handleReturnClick}
                type="button"
              >
                <ShadowGlyph aria-hidden="true" name="arrow" size={17} />
                {safeReturnLabel}
              </button>
            </div>
            {actionMessage ? (
              <p aria-live="polite" className={styles.actionFeedback}>{actionMessage}</p>
            ) : (
              <p aria-live="polite" className={styles.liveRegion} />
            )}
          </aside>
        </div>
      </div>
    </motion.main>
  );
}

export class VoidRuntimeBoundary extends Component<
  IVoidRuntimeBoundaryProps,
  IVoidRuntimeBoundaryState
> {
  state: IVoidRuntimeBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): IVoidRuntimeBoundaryState {
    if (error instanceof Error) {
      return { error };
    }

    return { error: new Error(sanitizeDiagnosticText(error)) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const report: IRuntimeErrorReport = {
      message: sanitizeDiagnosticText(error.message),
      stack: sanitizeDiagnosticText(error.stack ?? "No JavaScript stack was provided."),
      componentStack: sanitizeDiagnosticText(errorInfo.componentStack ?? "No React component stack was provided."),
    };

    try {
      this.props.onError?.(report);
    } catch {
      // The diagnostics boundary must remain stable even if an observer fails.
    }
  }

  componentDidUpdate(previousProps: IVoidRuntimeBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleReset = () => {
    this.setState({ error: null }, () => {
      this.props.onReset?.();
    });
  };

  private handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }

    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const { crashScreenProps } = this.props;
    const runtimeStack = this.state.error.stack?.split(/\r?\n/) ?? [this.state.error.message];

    return (
      <CrashScreen
        {...crashScreenProps}
        error={this.state.error}
        onRetry={this.handleReset}
        onReturn={this.handleReload}
        stackTrace={runtimeStack}
      />
    );
  }
}

export default CrashScreen;
