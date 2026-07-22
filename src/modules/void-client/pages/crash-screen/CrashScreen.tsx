import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { ShadowGlyph } from "../../components/ShadowGlyph";

export type CrashLogDestination = "MC-Logs.gs" | "Void Logs Native";
export type CrashRepairSource = "native";
export interface IRepairResult { success: boolean; summary?: string; }
export interface ICrashScreenProps { error?: unknown; stackTrace?: readonly string[]; diagnosis?: string; possibleFix?: string; automaticallyUploadLogs?: boolean; logDestination?: CrashLogDestination; repairSource?: CrashRepairSource; onAnalyzeAndRepair?: () => Promise<IRepairResult | void>; onRetry?: () => void | Promise<void>; onReturn?: () => void | Promise<void>; incidentId?: string; retryLabel?: string; returnLabel?: string; }
export interface IRuntimeErrorReport { message: string; stack: string; componentStack: string; }
export interface IVoidRuntimeBoundaryProps { children: ReactNode; crashScreenProps?: Omit<ICrashScreenProps, "error" | "stackTrace" | "onRetry" | "onReturn">; onError?: (report: IRuntimeErrorReport) => void; onReset?: () => void; onReload?: () => void; resetKey?: string | number; }
interface IVoidRuntimeBoundaryState { error: Error | null; }

const MAX_DIAGNOSTIC_LENGTH = 12_000;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const WINDOWS_USER_PATTERN = /([A-Za-z]:\\Users\\)[^\\\s]+/g;
const MAC_USER_PATTERN = /(\/Users\/)[^/\s]+/g;
const LINUX_USER_PATTERN = /(\/home\/)[^/\s]+/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_PATTERN = /\b(access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|api[_-]?key|password)\b\s*[:=]\s*["']?[^\s"',;]+/gi;

export function sanitizeDiagnosticText(value: unknown) {
  const text = typeof value === "string" ? value : value instanceof Error ? value.stack ?? value.message : String(value ?? "Unknown runtime error");
  return text.slice(0, MAX_DIAGNOSTIC_LENGTH).replace(CONTROL_CHARACTER_PATTERN, "").replace(WINDOWS_USER_PATTERN, "$1<redacted>").replace(MAC_USER_PATTERN, "$1<redacted>").replace(LINUX_USER_PATTERN, "$1<redacted>").replace(EMAIL_PATTERN, "<redacted-email>").replace(SECRET_PATTERN, "$1=<redacted>");
}

export function CrashScreen({ error, stackTrace, diagnosis = "The React interface stopped while rendering this view.", possibleFix = "Retry the view. If it fails again, restart the launcher and inspect the native logs.", onAnalyzeAndRepair, onRetry, onReturn, incidentId, retryLabel = "Retry view", returnLabel = "Return home" }: ICrashScreenProps) {
  const [repairState, setRepairState] = useState<"idle" | "running" | "success" | "failed">("idle"); const [repairMessage, setRepairMessage] = useState("");
  const trace = stackTrace?.length ? stackTrace.map(sanitizeDiagnosticText) : sanitizeDiagnosticText(error).split("\n").filter(Boolean);
  const repair = async () => { if (!onAnalyzeAndRepair || repairState === "running") return; setRepairState("running"); setRepairMessage(""); try { const result = await onAnalyzeAndRepair(); if (result && !result.success) { setRepairState("failed"); setRepairMessage(result.summary ?? "The native repair command did not complete."); return; } setRepairState("success"); setRepairMessage(result?.summary ?? "Native analysis completed."); } catch (cause) { setRepairState("failed"); setRepairMessage(sanitizeDiagnosticText(cause)); } };
  return <main className="grid min-h-screen place-items-center bg-[#111111] p-5 text-[#F5F5F5]"><section className="w-full max-w-4xl rounded-sm border border-[#333333] bg-[#1A1A1A]"><header className="flex items-start gap-4 border-b border-[#333333] p-5"><span className="grid size-12 shrink-0 place-items-center rounded-sm border border-[#333333] bg-[#2A1515] text-[#FCA5A5]"><ShadowGlyph name="warning" size={22} /></span><div className="min-w-0"><p className="text-xs font-semibold text-[#FCA5A5]">Launcher runtime error</p><h1 className="mt-1 text-xl font-semibold">Void Launcher could not render this view</h1><p className="mt-2 text-sm leading-5 text-[#A3A3A3]">{diagnosis}</p>{incidentId && <p className="mt-2 text-xs text-[#737373]">Incident {incidentId}</p>}</div></header><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]"><section><h2 className="text-sm font-semibold">Sanitized stack trace</h2><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border border-[#333333] bg-[#111111] p-4 font-mono text-xs leading-5 text-[#D4D4D4]">{trace.join("\n") || "No stack trace was reported."}</pre></section><aside><h2 className="text-sm font-semibold">Recovery</h2><p className="mt-3 text-sm leading-5 text-[#A3A3A3]">{possibleFix}</p>{onAnalyzeAndRepair ? <button type="button" onClick={() => void repair()} disabled={repairState === "running"} className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-[#333333] bg-[#7B2CBF] px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"><ShadowGlyph name="repair" size={16} />{repairState === "running" ? "Analyzing…" : "Analyze with native repair"}</button> : <p className="mt-4 border border-[#333333] bg-[#111111] p-3 text-xs leading-5 text-[#A3A3A3]">No native repair command was provided; repair is unavailable.</p>}{repairMessage && <p role={repairState === "failed" ? "alert" : "status"} className={`mt-3 text-xs leading-5 ${repairState === "failed" ? "text-[#FCA5A5]" : "text-[#86EFAC]"}`}>{repairMessage}</p>}<div className="mt-4 grid gap-2"><button type="button" onClick={() => void onRetry?.()} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-[#333333] bg-[#F5F5F5] px-4 text-sm font-semibold text-[#111111] hover:bg-white">{retryLabel}</button><button type="button" onClick={() => void onReturn?.()} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-[#333333] bg-[#111111] px-4 text-sm font-semibold text-[#D4D4D4] hover:bg-[#242424] hover:text-white">{returnLabel}</button></div></aside></div></section></main>;
}

export class VoidRuntimeBoundary extends Component<IVoidRuntimeBoundaryProps, IVoidRuntimeBoundaryState> {
  state: IVoidRuntimeBoundaryState = { error: null };
  static getDerivedStateFromError(error: unknown): IVoidRuntimeBoundaryState { return { error: error instanceof Error ? error : new Error(String(error)) }; }
  componentDidCatch(error: Error, info: ErrorInfo) { this.props.onError?.({ message: sanitizeDiagnosticText(error.message), stack: sanitizeDiagnosticText(error.stack ?? error.message), componentStack: sanitizeDiagnosticText(info.componentStack ?? "") }); }
  componentDidUpdate(previousProps: IVoidRuntimeBoundaryProps) { if (this.state.error && previousProps.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  private retry = () => { this.setState({ error: null }); this.props.onReset?.(); };
  private reload = () => { if (this.props.onReload) this.props.onReload(); else window.location.reload(); };
  render() { if (!this.state.error) return this.props.children; return <CrashScreen {...this.props.crashScreenProps} error={this.state.error} onRetry={this.retry} onReturn={this.reload} />; }
}

export default CrashScreen;
