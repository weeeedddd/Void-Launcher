import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import type { HardwareReport, LiveSystemMetrics, MinecraftProcessStatus, ProcessPriority } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

function formatMemory(megabytes: number) {
  return `${(megabytes / 1024).toFixed(1)} GB`;
}

function formatDisk(gigabytes: number) {
  return `${gigabytes.toFixed(1)} GB`;
}

export function TelemetryView() {
  const nativeRuntime = isTauri();
  const queryClient = useQueryClient();
  const reportQuery = useQuery<HardwareReport | null>({
    queryKey: ["native-hardware-report"],
    queryFn: async () => (nativeRuntime ? api.getHardwareReport() : null),
    enabled: nativeRuntime,
    retry: false,
  });
  const liveQuery = useQuery<LiveSystemMetrics | null>({
    queryKey: ["native-live-system-metrics"],
    queryFn: async () => (nativeRuntime ? api.getLiveSystemMetrics() : null),
    enabled: nativeRuntime,
    retry: false,
    refetchInterval: nativeRuntime ? 1_000 : false,
  });
  const processQuery = useQuery<MinecraftProcessStatus | null>({
    queryKey: ["minecraft-process-status"],
    queryFn: async () => (nativeRuntime ? api.getMinecraftProcess() : null),
    enabled: nativeRuntime,
    retry: false,
    refetchInterval: nativeRuntime ? 2_000 : false,
  });
  const priorityMutation = useMutation({
    mutationFn: (priority: ProcessPriority) => api.setMinecraftProcessPriority(priority),
    onSuccess: (status) => queryClient.setQueryData(["minecraft-process-status"], status),
  });

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>System monitor</p>
          <h1 className={`${voidClientStyles.pageTitle} mt-1`}>Performance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#92929B]">
            Hardware information and live host CPU/RAM samples from the native launcher. FPS and ping require an in-game/server telemetry channel and are not guessed.
          </p>
        </div>
        <button type="button" onClick={() => void reportQuery.refetch()} disabled={!nativeRuntime || reportQuery.isFetching} className={voidClientStyles.secondaryButton}>
          <ShadowGlyph name="sync" size={15} />
          {reportQuery.isFetching ? "Scanning…" : "Scan hardware"}
        </button>
      </header>

      {!nativeRuntime && <StatusMessage tone="warning" title="Native scan unavailable" message="Run the packaged Void Launcher to inspect this machine. The browser preview never invents hardware values." />}
      {nativeRuntime && reportQuery.isLoading && <StatusMessage tone="neutral" title="Scanning hardware" message="Reading CPU, memory, graphics adapters and storage from the native process." />}
      {nativeRuntime && reportQuery.isError && <StatusMessage tone="error" title="Hardware scan failed" message={String(reportQuery.error)} />}
      {nativeRuntime && liveQuery.isError && <StatusMessage tone="error" title="Live metrics unavailable" message={String(liveQuery.error)} />}
      {nativeRuntime && liveQuery.data && <LiveMetricsCard metrics={liveQuery.data} />}
      {nativeRuntime && processQuery.data && <MinecraftProcessCard status={processQuery.data} pending={priorityMutation.isPending} onPriorityChange={(priority) => priorityMutation.mutate(priority)} error={priorityMutation.isError ? String(priorityMutation.error) : null} />}
      {nativeRuntime && reportQuery.data && <HardwareSnapshot report={reportQuery.data} />}
    </div>
  );
}

function MinecraftProcessCard({ status, pending, onPriorityChange, error }: { status: MinecraftProcessStatus; pending: boolean; onPriorityChange: (priority: ProcessPriority) => void; error: string | null }) {
  return (
    <section className={`${voidClientStyles.flatPanel} mb-4 p-5`} aria-labelledby="minecraft-process-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className={voidClientStyles.sectionKicker}>Process control</p><h2 id="minecraft-process-title" className="mt-1 text-base font-semibold text-[#F4F4F5]">Minecraft process</h2><p className="mt-1 text-sm leading-6 text-[#92929B]">Priority changes are scoped to the Minecraft PID launched by this session.</p></div>
        <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${status.running ? "border-[#245337] bg-[#14251B] text-[#86EFAC]" : "border-[#59411F] bg-[#2A2112] text-[#FCD34D]"}`}>{status.running ? `PID ${status.pid}` : "Not running"}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs text-[#92929B]">Priority: <strong className="text-[#F4F4F5]">{status.priority}</strong></span>
        <button type="button" disabled={!status.running || !status.supported || pending || status.priority === "normal"} onClick={() => onPriorityChange("normal")} className={voidClientStyles.secondaryButton}>Normal</button>
        <button type="button" disabled={!status.running || !status.supported || pending || status.priority === "high"} onClick={() => onPriorityChange("high")} className={voidClientStyles.primaryButton}>High</button>
      </div>
      <p role={error ? "alert" : "status"} className={`mt-3 text-xs ${error ? "text-[#FCA5A5]" : "text-[#777780]"}`}>{error ?? status.message}</p>
    </section>
  );
}

function LiveMetricsCard({ metrics }: { metrics: LiveSystemMetrics }) {
  const memoryPercent = metrics.memoryTotalMb > 0 ? Math.round((metrics.memoryUsedMb / metrics.memoryTotalMb) * 100) : 0;
  return (
    <section className={`${voidClientStyles.flatPanel} mb-4 p-5`} aria-labelledby="live-metrics-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className={voidClientStyles.sectionKicker}>Native sampler</p><h2 id="live-metrics-title" className="mt-1 text-base font-semibold text-[#F4F4F5]">Live host metrics</h2></div>
        <time className="rounded-md border border-[#29292F] bg-[#111114] px-2.5 py-1 text-xs text-[#777780]" dateTime={metrics.sampledAt}>Sampled {new Date(metrics.sampledAt).toLocaleTimeString()}</time>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCell label="CPU usage" value={`${metrics.cpuUsagePercent.toFixed(1)}%`} percent={metrics.cpuUsagePercent} />
        <MetricCell label="Memory in use" value={`${memoryPercent}%`} percent={memoryPercent} detail={`${(metrics.memoryUsedMb / 1024).toFixed(1)} / ${(metrics.memoryTotalMb / 1024).toFixed(1)} GB`} />
        <MetricCell label="Running processes" value={metrics.processCount.toLocaleString()} />
      </div>
    </section>
  );
}

function MetricCell({ label, value, percent, detail }: { label: string; value: string; percent?: number; detail?: string }) {
  return <div className="rounded-lg border border-[#29292F] bg-[#111114] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-[#92929B]">{label}</span><strong className="font-mono text-sm tabular-nums text-[#F4F4F5]">{value}</strong></div>{percent !== undefined ? <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-[#29292F]"><span className="block h-full rounded-full bg-[#8B5CF6] transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></span> : null}{detail ? <span className="mt-2 block font-mono text-[11px] text-[#777780]">{detail}</span> : null}</div>;
}

function HardwareSnapshot({ report }: { report: HardwareReport }) {
  const memoryUsed = Math.max(0, report.totalMemoryMb - report.availableMemoryMb);
  const memoryPercent = report.totalMemoryMb > 0 ? Math.round((memoryUsed / report.totalMemoryMb) * 100) : 0;
  const rows = [
    ["Operating system", report.os],
    ["CPU", report.cpuModel],
    ["Logical cores", String(report.logicalCores)],
    ["CPU frequency", `${report.cpuFrequencyMhz.toLocaleString()} MHz`],
    ["Total memory", formatMemory(report.totalMemoryMb)],
    ["Available memory", formatMemory(report.availableMemoryMb)],
    ["Launcher disk", `${formatDisk(report.diskAvailableGb)} free of ${formatDisk(report.diskTotalGb)}`],
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
      <section className={`${voidClientStyles.flatPanel} p-5`} aria-labelledby="hardware-snapshot-title">
        <div className="flex items-center justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Native report</p><h2 id="hardware-snapshot-title" className="mt-1 text-base font-semibold text-[#F4F4F5]">Hardware snapshot</h2></div><span className="rounded-md border border-[#245337] bg-[#14251B] px-2.5 py-1 text-xs font-medium text-[#86EFAC]">Verified</span></div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => <div key={label} className="rounded-lg border border-[#29292F] bg-[#111114] p-3.5"><dt className="text-xs text-[#777780]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#D4D4D8]">{value}</dd></div>)}
        </dl>
        <div className="mt-4 rounded-lg border border-[#29292F] bg-[#111114] p-3.5"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-[#92929B]">Memory in use at scan</span><strong className="font-mono tabular-nums text-[#F4F4F5]">{memoryPercent}%</strong></div><div className="mt-3" aria-label={`${memoryPercent}% memory in use at scan`}><span className="block h-1.5 overflow-hidden rounded-full bg-[#29292F]"><span className="block h-full rounded-full bg-[#8B5CF6]" style={{ width: `${memoryPercent}%` }} /></span></div></div>
      </section>
      <section className={`${voidClientStyles.flatPanel} p-5`} aria-labelledby="gpu-snapshot-title">
        <div className="flex items-center justify-between gap-3"><div><p className={voidClientStyles.sectionKicker}>Graphics adapters</p><h2 id="gpu-snapshot-title" className="mt-1 text-base font-semibold text-[#F4F4F5]">Detected GPUs</h2></div><span className="grid size-10 place-items-center rounded-lg bg-[#21152B] text-[#C084FC]"><ShadowGlyph name="monitor" size={18} /></span></div>
        {report.gpus.length > 0 ? <ul className="mt-5 space-y-2">{report.gpus.map((gpu) => <li key={gpu} className="rounded-lg border border-[#29292F] bg-[#111114] p-3.5 text-sm text-[#D4D4D8]">{gpu}</li>)}</ul> : <p className="mt-5 rounded-lg border border-[#29292F] bg-[#111114] p-3.5 text-sm text-[#92929B]">No graphics adapter name was returned by Windows.</p>}
        <div className="mt-5 rounded-lg border border-[#29292F] bg-[#111114] p-3.5"><p className="text-xs font-semibold text-[#F4F4F5]">What this scan can do</p><p className="mt-1 text-xs leading-5 text-[#92929B]">The report is used by the native optimizer and Java setup. It does not claim per-process usage or FPS until a native sampling command is added.</p></div>
      </section>
    </div>
  );
}

function StatusMessage({ tone, title, message }: { tone: "neutral" | "warning" | "error"; title: string; message: string }) {
  const classes = tone === "error" ? "border-[#5C2525] bg-[#2A1515] text-[#FCA5A5]" : tone === "warning" ? "border-[#59411F] bg-[#2A2112] text-[#FCD34D]" : "border-[#29292F] bg-[#151518] text-[#D4D4D8]";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-4 ${classes}`}><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 opacity-90">{message}</p></div>;
}

export default TelemetryView;
