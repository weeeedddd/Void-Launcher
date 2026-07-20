import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  Activity,
  Check,
  ChevronRight,
  CircleDot,
  Coffee,
  Cpu,
  Gauge,
  MemoryStick,
  Monitor,
  RefreshCw,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { api } from "@/lib/api";
import { playSuccess } from "@/lib/sound";
import { useUiStore, type PerformanceFeature } from "@/stores/ui";
import type { JavaProgress, OptimizationTier } from "@/types";

const TIERS: {
  id: OptimizationTier;
  name: string;
  description: string;
  ram: string;
}[] = [
  {
    id: "light",
    name: "Light",
    description: "Stable and efficient for Vanilla and smaller modpacks.",
    ram: "25% RAM",
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Balanced profile with optimized G1-GC flags.",
    ram: "35% RAM",
  },
  {
    id: "strong",
    name: "Strong",
    description: "Maximum performance for shaders and large modpacks.",
    ram: "50% RAM",
  },
];

const PHASE_LABELS: Record<JavaProgress["phase"], string> = {
  download: "Downloading OpenJDK",
  verify: "Verifying SHA-256 checksum",
  extract: "Extracting Java runtime",
  done: "Java is ready",
};

const BASE_TERMINAL_LINES = [
  { id: "boot", tone: "muted", text: "VOID Optimizer v0.1 · System analysis started" },
  { id: "cpu", tone: "info", text: "Reading CPU profile and thread count ..." },
  { id: "path", tone: "success", text: "Launcher data path located" },
  { id: "java", tone: "info", text: "Preparing OpenJDK 21 / Temurin runtime ..." },
] as const;

const MOCK_GPUS = ["NVIDIA GeForce RTX 4070 Laptop GPU", "AMD Radeon 780M Graphics"];

const PERFORMANCE_SWITCHES: { id: PerformanceFeature; label: string; description: string }[] = [
  { id: "pingOptimization", label: "Ping Optimization", description: "Prioritize low-latency launcher and game traffic." },
  { id: "improvedFps", label: "Improved FPS", description: "Apply the selected Java and memory performance profile." },
  { id: "reducedInputLag", label: "Reduced Input Lag", description: "Favor responsiveness over background throughput." },
];

function gb(megabytes: number) {
  return (megabytes / 1024).toFixed(1);
}

export function OptimizerPage() {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<OptimizationTier>("balanced");
  const [targetId, setTargetId] = useState<string>();
  const [progress, setProgress] = useState<JavaProgress | null>(null);
  const selectedGpu = useUiStore((state) => state.selectedGpu);
  const setSelectedGpu = useUiStore((state) => state.setSelectedGpu);
  const performanceFeatures = useUiStore((state) => state.performanceFeatures);
  const setPerformanceFeature = useUiStore((state) => state.setPerformanceFeature);

  const hardware = useQuery({ queryKey: ["hardware"], queryFn: api.getHardwareReport });
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const target = targetId ?? instances?.[0]?.id;
  const availableGpus = hardware.data?.gpus.length ? hardware.data.gpus : MOCK_GPUS;

  useEffect(() => {
    if (!selectedGpu || !availableGpus.includes(selectedGpu)) setSelectedGpu(availableGpus[0] ?? null);
  }, [availableGpus, selectedGpu, setSelectedGpu]);

  useEffect(() => {
    const unlisten = listen<JavaProgress>("java-download-progress", (event) => {
      setProgress(event.payload.phase === "done" ? null : event.payload);
    });
    return () => {
      void unlisten.then((stopListening) => stopListening());
    };
  }, []);

  const optimize = useMutation({
    mutationFn: () => api.optimizeInstance(target!, tier),
    onSuccess: () => {
      playSuccess();
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onSettled: () => setProgress(null),
  });

  const chooseTier = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setTier(event.currentTarget.value as OptimizationTier);
  }, []);
  const chooseTarget = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetId(event.currentTarget.value);
  }, []);
  const scanHardware = useCallback(() => void hardware.refetch(), [hardware]);
  const runOptimization = useCallback(() => optimize.mutate(), [optimize]);
  const chooseGpu = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => setSelectedGpu(event.currentTarget.value), [setSelectedGpu]);

  const progressPercent =
    progress && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
      : null;

  const terminalLines = useMemo(() => {
    const lines: { id: string; tone: "muted" | "info" | "success" | "error"; text: string }[] = [
      ...BASE_TERMINAL_LINES,
    ];

    if (progress) {
      lines.push({
        id: `progress-${progress.phase}`,
        tone: "info",
        text: `${PHASE_LABELS[progress.phase]}${progressPercent === null ? " ..." : ` · ${progressPercent}%`}`,
      });
    }
    if (selectedGpu) lines.push({ id: "gpu-target", tone: "success", text: `Selected GPU: ${selectedGpu}` });
    for (const item of PERFORMANCE_SWITCHES) {
      if (performanceFeatures[item.id]) lines.push({ id: `feature-${item.id}`, tone: "info", text: `${item.label}: enabled` });
    }
    if (optimize.data) {
      for (const entry of optimize.data.log) {
        lines.push({
          id: `${entry.kind}-${entry.message}`,
          tone: "success",
          text: entry.message,
        });
      }
      lines.push({
        id: "complete",
        tone: "success",
        text: `Optimization complete · ${optimize.data.memoryMb} MB · Java ${optimize.data.java.major}`,
      });
    }
    if (optimize.isError) {
      lines.push({ id: "optimization-error", tone: "error", text: String(optimize.error) });
    }
    if (hardware.isError) {
      lines.push({ id: "hardware-error", tone: "error", text: "The hardware scan could not be completed." });
    }
    return lines;
  }, [hardware.isError, optimize.data, optimize.error, optimize.isError, performanceFeatures, progress, progressPercent, selectedGpu]);

  const hw = hardware.data;
  const gpuNames = hw?.gpus.length ? hw.gpus.join(" · ") : hw ? "No GPU detected" : "Detecting ...";
  const gpuDetail = hw
    ? `${hw.gpus.length} graphics adapter${hw.gpus.length === 1 ? "" : "s"} detected · ${hw.os}`
    : "Loading graphics profile";

  return (
    <div className="relative mx-auto max-w-7xl px-7 py-7 lg:px-10 lg:py-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute top-8 left-[18%] h-56 w-56 rounded-full bg-accent-500/8 blur-[90px]" />
        <div className="absolute top-0 right-[8%] h-72 w-72 rounded-full bg-fuchsia-700/6 blur-[110px]" />
      </div>

      <header className="relative mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.24em] text-accent-300 uppercase">
            <Gauge size={13} />
            System Tuning
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white lg:text-4xl">
            Performance <span className="text-accent-400">Optimizer</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
            Tune RAM, Java and GPU settings precisely for your system and modpack.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={scanHardware}
          disabled={hardware.isFetching}
          className="h-10 rounded-xl bg-void-900/70"
        >
          <RefreshCw size={15} className={hardware.isFetching ? "animate-spin" : ""} />
          Rescan system
        </Button>
      </header>

      <section aria-labelledby="hardware-heading" className="relative mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="hardware-heading" className="text-xs font-bold tracking-[0.2em] text-ink-500 uppercase">
            Hardware overview
          </h2>
          <span className="flex items-center gap-2 text-[11px] text-success-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500 shadow-[0_0_10px_var(--color-success-glow)]" />
            Live detection
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <HardwareCard
            icon={Cpu}
            label="CPU"
            value={hw?.cpuModel ?? "Detecting ..."}
            detail={hw ? `${hw.logicalCores} threads · ${(hw.cpuFrequencyMhz / 1000).toFixed(1)} GHz` : "System scan running"}
            meter={hw ? Math.min(100, hw.logicalCores * 4) : 36}
          />
          <HardwareCard
            icon={MemoryStick}
            label="RAM"
            value={hw ? `${gb(hw.availableMemoryMb)} GB available` : "Detecting ..."}
            detail={hw ? `${gb(hw.totalMemoryMb)} GB total memory` : "Memory analysis running"}
            meter={hw ? Math.round((hw.availableMemoryMb / hw.totalMemoryMb) * 100) : 58}
          />
          <HardwareCard
            icon={Monitor}
            label="GPU"
            value={gpuNames}
            detail={gpuDetail}
            meter={hw?.gpus.length ? 78 : 42}
          />
        </div>
      </section>

      <div className="relative grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-white/7 bg-void-900/76 p-5 shadow-[0_24px_70px_rgb(0_0_0_/_0.22)] backdrop-blur-xl lg:p-6">
          <div className="mb-6 rounded-2xl border border-accent-500/25 bg-accent-500/[0.06] p-4">
            <label htmlFor="optimizer-gpu" className="text-[10px] font-black tracking-[0.2em] text-accent-300 uppercase">Select GPU</label>
            <select id="optimizer-gpu" value={selectedGpu ?? ""} onChange={chooseGpu} className="control mt-2 h-11 w-full select-text">
              {availableGpus.map((gpu) => <option key={gpu} value={gpu}>{gpu}</option>)}
            </select>
            <p className="mt-2 text-xs text-ink-300">Target adapter saved: <strong className="text-white">{selectedGpu ?? "Scanning…"}</strong></p>
            <p className="mt-1 text-[10px] leading-4 text-ink-500">Windows receives the high-performance GPU preference; the graphics driver keeps final adapter control.</p>
          </div>

          <div className="mb-6 grid gap-2 sm:grid-cols-3">
            {PERFORMANCE_SWITCHES.map((item) => <div key={item.id} className="rounded-xl border border-white/7 bg-black/20 p-3"><Switch checked={performanceFeatures[item.id]} onCheckedChange={(enabled) => setPerformanceFeature(item.id, enabled)} label={item.label} /><p className="mt-2 text-[10px] leading-4 text-ink-500">{item.description}</p></div>)}
          </div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-accent-300 uppercase">Optimization tier</p>
              <h2 className="mt-1 text-xl font-bold text-white">How aggressively should we optimize?</h2>
            </div>
            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-[10px] font-bold tracking-wide text-accent-300 uppercase">
              Balanced recommended
            </span>
          </div>

          <div className="relative mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/6 bg-void-950/60 p-2">
            {TIERS.map((option) => {
              const selected = tier === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  value={option.id}
                  onClick={chooseTier}
                  aria-pressed={selected}
                  className={
                    "relative cursor-pointer rounded-xl px-3 py-3 text-center transition-all duration-200 " +
                    (selected ? "text-white" : "text-ink-500 hover:bg-white/[0.035] hover:text-ink-300")
                  }
                >
                  {selected && (
                    <motion.span
                      layoutId="optimizer-tier"
                      className="absolute inset-0 rounded-xl border border-accent-500/40 bg-accent-500/16 shadow-[0_0_24px_var(--color-accent-glow)]"
                    />
                  )}
                  <span className="relative block text-sm font-bold">{option.name}</span>
                  <span className="relative mt-0.5 block text-[10px]">{option.ram}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {TIERS.map((option) => {
              const selected = tier === option.id;
              return (
                <div
                  key={`description-${option.id}`}
                  className={
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all " +
                    (selected
                      ? "border-accent-500/25 bg-accent-500/[0.055]"
                      : "border-transparent opacity-45")
                  }
                >
                  <span
                    className={
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full " +
                      (selected ? "bg-accent-500 text-white" : "bg-white/5 text-ink-500")
                    }
                  >
                    {selected ? <Check size={14} /> : <CircleDot size={12} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{option.name}</p>
                    <p className="truncate text-[11px] text-ink-500">{option.description}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-ink-500">{option.ram}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/6 pt-5">
            {instances && instances.length > 0 ? (
              <>
                <label htmlFor="optimizer-instance" className="text-xs font-semibold text-ink-300">
                  Instance
                </label>
                <select
                  id="optimizer-instance"
                  className="control min-w-44 flex-1 select-text"
                  value={target}
                  onChange={chooseTarget}
                >
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!target || optimize.isPending}
                  onClick={runOptimization}
                  className="h-10 rounded-xl px-5 font-bold"
                >
                  {optimize.isPending ? <Activity size={15} className="animate-pulse" /> : <Zap size={15} />}
                  {optimize.isPending ? "Optimizing ..." : "Start optimization"}
                  {!optimize.isPending && <ChevronRight size={15} />}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-ink-500">
                <Sparkles size={16} className="text-accent-400" />
                Create an instance in the Mod Manager first.
              </div>
            )}
          </div>

          {progress && (
            <div className="mt-5 rounded-xl border border-accent-500/20 bg-accent-500/[0.045] p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-300">
                  <Coffee size={14} className="text-accent-400" />
                  {PHASE_LABELS[progress.phase]}
                </span>
                <span className="font-mono text-accent-300">
                  {progressPercent === null ? "active" : `${progressPercent}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-void-950">
                <div
                  className={
                    "h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-300 " +
                    (progressPercent === null ? "w-full animate-pulse" : "")
                  }
                  style={progressPercent === null ? undefined : { width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <TerminalLog lines={terminalLines} running={optimize.isPending || Boolean(progress)} />
      </div>
    </div>
  );
}

function HardwareCard({
  icon: Icon,
  label,
  value,
  detail,
  meter,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  detail: string;
  meter: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/7 bg-void-900/76 p-5 shadow-[0_18px_50px_rgb(0_0_0_/_0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-accent-500/25"
    >
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-accent-500/8 blur-2xl transition group-hover:bg-accent-500/14" />
      <div className="relative mb-4 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent-500/18 bg-accent-500/10 text-accent-300">
          <Icon size={19} />
        </span>
        <span className="text-[10px] font-black tracking-[0.2em] text-ink-500 uppercase">{label}</span>
      </div>
      <p className="relative min-h-10 text-sm leading-5 font-bold text-white" title={value}>{value}</p>
      <p className="relative mt-1 truncate text-xs text-ink-500" title={detail}>{detail}</p>
      <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 shadow-[0_0_10px_var(--color-accent-glow)]"
          style={{ width: `${Math.max(8, meter)}%` }}
        />
      </div>
    </motion.article>
  );
}

function TerminalLog({
  lines,
  running,
}: {
  lines: { id: string; tone: "muted" | "info" | "success" | "error"; text: string }[];
  running: boolean;
}) {
  return (
    <section className="flex min-h-105 flex-col overflow-hidden rounded-2xl border border-white/7 bg-[#08050D] shadow-[0_24px_70px_rgb(0_0_0_/_0.28)]">
      <header className="flex items-center justify-between border-b border-white/6 bg-white/[0.025] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-success-500/80" />
          </div>
          <span className="flex items-center gap-2 text-[11px] font-semibold text-ink-300">
            <TerminalSquare size={13} className="text-accent-400" />
            optimizer.log
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] text-ink-500">
          <span className={"h-1.5 w-1.5 rounded-full " + (running ? "animate-pulse bg-accent-400" : "bg-success-500")} />
          {running ? "RUNNING" : "READY"}
        </span>
      </header>

      <div className="flex-1 select-text overflow-y-auto p-5 font-mono text-[11px] leading-6">
        <p className="mb-3 text-accent-300">
          <span className="text-ink-500">dominic@void</span>:~$ void optimize --profile auto
        </p>
        <ul aria-live="polite" className="space-y-1">
          {lines.map((line) => (
            <motion.li
              key={line.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={
                line.tone === "success"
                  ? "text-success-400"
                  : line.tone === "error"
                    ? "text-red-300"
                    : line.tone === "info"
                      ? "text-ink-300"
                      : "text-ink-500"
              }
            >
              <span className="mr-2 text-ink-500">›</span>
              {line.text}
            </motion.li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-2 text-ink-500">
          <span className="text-accent-400">›</span>
          <span className="h-3 w-1.5 animate-pulse bg-accent-400" />
        </p>
      </div>
    </section>
  );
}
