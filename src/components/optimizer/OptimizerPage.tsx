import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  Coffee,
  Cpu,
  HardDrive,
  Info,
  MemoryStick,
  Monitor,
  RefreshCw,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { playSuccess } from "@/lib/sound";
import { Button } from "@/components/ui/Button";
import type { JavaProgress, OptimizationLogEntry, OptimizationTier } from "@/types";

const TIERS: { id: OptimizationTier; name: string; blurb: string }[] = [
  { id: "light", name: "Light", blurb: "Safe defaults for low-end machines — ~25% of RAM." },
  { id: "balanced", name: "Balanced", blurb: "Recommended: tuned G1 GC flags — ~35% of RAM." },
  { id: "strong", name: "Strong", blurb: "Heavy modpacks, aggressive flags — ~50% of RAM." },
];

/** Icon per log-entry kind — keeps the feedback list scannable. */
const LOG_ICONS: Record<OptimizationLogEntry["kind"], typeof Info> = {
  memory: MemoryStick,
  jvm: SlidersHorizontal,
  java: Coffee,
  gpu: Zap,
  info: Info,
};

const PHASE_LABELS: Record<JavaProgress["phase"], string> = {
  download: "Downloading Temurin JRE…",
  verify: "Verifying SHA-256 checksum…",
  extract: "Extracting runtime…",
  done: "Done",
};

const gb = (mb: number) => (mb / 1024).toFixed(1);

/**
 * Performance Optimizer: scans the hardware (Rust `sysinfo` + OS queries),
 * lets the user pick an optimization tier, then applies RAM/JVM/Java/GPU
 * tweaks to an instance — and reports every change in a transparent log.
 */
export function OptimizerPage() {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<OptimizationTier>("balanced");
  const [targetId, setTargetId] = useState<string>();
  const [progress, setProgress] = useState<JavaProgress | null>(null);

  const hardware = useQuery({ queryKey: ["hardware"], queryFn: api.getHardwareReport });
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: api.listInstances });
  const target = targetId ?? instances?.[0]?.id;

  // Live progress while the Rust side downloads/extracts a Java runtime.
  useEffect(() => {
    const unlisten = listen<JavaProgress>("java-download-progress", (event) => {
      setProgress(event.payload.phase === "done" ? null : event.payload);
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  const optimize = useMutation({
    mutationFn: () => api.optimizeInstance(target!, tier),
    onSuccess: () => {
      playSuccess();
      // Instance settings (RAM, args, java path) changed — refresh lists.
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onSettled: () => setProgress(null),
  });

  const hw = hardware.data;
  const percent =
    progress && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
      : null;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Optimizer</h2>
          <p className="mt-1 text-sm text-ink-500">
            Analyze your hardware, pick a level, and let the launcher tune RAM, JVM flags and the
            Java runtime for you.
          </p>
        </div>
        <Button variant="outline" onClick={() => void hardware.refetch()} disabled={hardware.isFetching}>
          <RefreshCw size={15} className={hardware.isFetching ? "animate-spin" : ""} />
          Scan system
        </Button>
      </div>

      {/* ── Hardware report ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Cpu}
          label="CPU"
          value={hw?.cpuModel ?? "—"}
          sub={hw ? `${hw.logicalCores} threads · ${(hw.cpuFrequencyMhz / 1000).toFixed(1)} GHz` : "scanning…"}
        />
        <StatCard
          icon={MemoryStick}
          label="Memory"
          value={hw ? `${gb(hw.availableMemoryMb)} GiB free` : "—"}
          sub={hw ? `of ${gb(hw.totalMemoryMb)} GiB total` : "scanning…"}
        />
        <StatCard
          icon={Monitor}
          label="GPU"
          value={hw?.gpus[0] ?? (hw ? "Not detected" : "—")}
          sub={hw && hw.gpus.length > 1 ? `+${hw.gpus.length - 1} more` : (hw?.os ?? "scanning…")}
        />
        <StatCard
          icon={HardDrive}
          label="Disk (launcher data)"
          value={hw ? `${hw.diskAvailableGb.toFixed(0)} GB free` : "—"}
          sub={hw ? `of ${hw.diskTotalGb.toFixed(0)} GB` : "scanning…"}
        />
      </div>

      {/* ── Tier selection ── */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((t) => {
          const selected = tier === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={
                "cursor-pointer rounded-xl border p-4 text-left transition-all duration-150 " +
                (selected
                  ? "border-accent-500 bg-accent-600/10 shadow-[0_0_20px_var(--color-accent-glow)]"
                  : "border-void-700 bg-void-800/70 hover:border-void-600")
              }
            >
              <p className={"font-semibold " + (selected ? "text-accent-300" : "text-ink-100")}>
                {t.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* ── Apply ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {instances && instances.length > 0 ? (
          <>
            <label className="flex items-center gap-2 text-sm text-ink-300">
              Apply to
              <select
                className="control select-text"
                value={target}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {instances.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={!target || optimize.isPending} onClick={() => optimize.mutate()}>
              <Zap size={15} />
              {optimize.isPending ? "Optimizing…" : "Optimize"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink-500">Create an instance first, then optimize it here.</p>
        )}
      </div>

      {/* ── Java download progress (only while a runtime is being fetched) ── */}
      {progress && (
        <div className="mb-6 rounded-xl border border-void-700 bg-void-800/70 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-300">
              <Coffee size={15} className="text-accent-400" />
              {PHASE_LABELS[progress.phase]}
            </span>
            <span className="font-mono text-xs text-ink-500">
              {percent !== null
                ? `${percent}%`
                : `${(progress.downloadedBytes / 1_000_000).toFixed(0)} MB`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-void-700">
            <div
              className={
                "h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-200 " +
                (percent === null ? "w-full animate-pulse" : "")
              }
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
        </div>
      )}

      {optimize.isError && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {String(optimize.error)}
        </div>
      )}

      {/* ── Feedback log: every change, spelled out ── */}
      {optimize.data && (
        <div className="rounded-xl border border-void-700 bg-void-800/70 p-5">
          <h3 className="mb-3 font-semibold">
            Optimization report{" "}
            <span className="text-sm font-normal text-ink-500">
              — {optimize.data.memoryMb} MB heap · Java {optimize.data.java.major} (
              {optimize.data.java.releaseName})
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {optimize.data.log.map((entry, index) => {
              const Icon = LOG_ICONS[entry.kind];
              return (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="flex items-start gap-3 text-sm text-ink-300"
                >
                  <Icon size={15} className="mt-0.5 shrink-0 text-accent-400" />
                  {entry.message}
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-void-700 bg-void-800/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-ink-500 uppercase">
        <Icon size={14} className="text-accent-400" />
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-ink-100" title={value}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-ink-500">{sub}</p>
    </div>
  );
}
