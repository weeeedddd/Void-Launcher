import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import type { GameVideoSettings, HardwareReport, Instance, OptimizationOutcome, OptimizationTier } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

interface IAutoTuneModalProps {
  instance: Instance;
  onClose: () => void;
}

interface ITuneReport {
  hardware: HardwareReport;
  optimization: OptimizationOutcome;
  video: GameVideoSettings;
  tier: OptimizationTier;
}

export function AutoTuneModal({ instance, onClose }: IAutoTuneModalProps) {
  const [phase, setPhase] = useState<"ready" | "scanning" | "optimizing" | "complete" | "error">("ready");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ITuneReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape" && phase !== "optimizing" && phase !== "scanning") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, phase]);

  const run = useCallback(async () => {
    setPhase("scanning");
    setProgress(12);
    setError(null);
    try {
      const hardware = await api.getHardwareReport();
      setProgress(34);
      setPhase("optimizing");
      const tier: OptimizationTier = hardware.totalMemoryMb >= 16_384 && hardware.logicalCores >= 8 ? "strong" : hardware.totalMemoryMb >= 8_192 && hardware.logicalCores >= 4 ? "balanced" : "light";
      const optimization = await api.optimizeInstance(instance.id, tier);
      setProgress(76);
      const video = chooseVideoSettings(hardware);
      const appliedVideo = await api.applyGameVideoSettings(instance.id, video);
      setProgress(100);
      setReport({ hardware, optimization, video: appliedVideo, tier });
      setPhase("complete");
      await queryClient.invalidateQueries({ queryKey: ["instances"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("error");
    }
  }, [instance.id, queryClient]);

  const phaseLabel = useMemo(() => {
    if (phase === "scanning") return "Reading CPU, memory, storage, and every detected GPU…";
    if (phase === "optimizing") return "Applying Java, memory, GPU, and video settings…";
    if (phase === "complete") return "Optimization complete";
    if (phase === "error") return "Optimization stopped";
    return "Ready to benchmark this profile";
  }, [phase]);
  const busy = phase === "scanning" || phase === "optimizing";

  return (
    <motion.div className="fixed inset-0 z-[460] grid place-items-center bg-black/78 p-5 backdrop-blur-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={busy ? undefined : onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="auto-tune-title" onMouseDown={(event) => event.stopPropagation()} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 9, scale: .985 }} transition={{ duration: reducedMotion ? .01 : .24, ease: [0.22, 1, 0.36, 1] }} className="max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-[#9d5ce0]/34 bg-[#0F0B15]/98 p-6 shadow-[0_40px_130px_rgba(0,0,0,.9),0_0_70px_rgba(123,44,191,.2)] [clip-path:polygon(0_0,96%_0,100%_7%,100%_100%,4%_100%,0_93%)] sm:p-8">
        <div className="flex items-start justify-between gap-4"><span className="grid size-14 place-items-center border border-[#9d5ce0]/30 bg-[#7B2CBF]/12 text-[#d8b4fe] shadow-[0_0_28px_rgba(123,44,191,.18)]"><ShadowGlyph name="telemetry" size={26} /></span><button type="button" onClick={onClose} disabled={busy} aria-label="Close optimization report" className={`grid size-11 cursor-pointer place-items-center text-[#94889d] transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${voidClientStyles.focusRing}`}><ShadowGlyph name="close" size={15} /></button></div>
        <p className="mt-6 text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Hardware Auto-Tuner</p><h2 id="auto-tune-title" className="font-display mt-2 text-2xl font-black">Optimize {instance.name}</h2><p className="mt-3 max-w-2xl text-xs leading-6 text-[#a79bad]">The native benchmark reads this computer, selects a safe JVM profile, applies GPU preference, and writes performance-minded Minecraft video settings for a stable 60+ FPS target.</p>

        <div className="mt-6 border border-white/[0.075] bg-black/25 p-4"><div className="flex items-center justify-between gap-4"><span className="text-xs text-[#b4a9bc]">{phaseLabel}</span><strong className="text-xs text-white tabular-nums">{progress}%</strong></div><div className="mt-3 h-2 overflow-hidden bg-black/55"><motion.div className="h-full bg-[linear-gradient(90deg,#3b0d57,#7B2CBF,#5062d9)] shadow-[0_0_22px_rgba(123,44,191,.6)]" animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : .28, ease: [0.22, 1, 0.36, 1] }} /></div></div>

        <AnimatePresence mode="wait">
          {report && phase === "complete" && <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReportTile label="Profile" value={report.tier} /><ReportTile label="RAM" value={`${Math.round(report.optimization.memoryMb / 1024)} GB`} /><ReportTile label="Render / Simulation" value={`${report.video.renderDistance} / ${report.video.simulationDistance}`} /><ReportTile label="Graphics" value={`${report.video.graphicsMode} · ${report.video.maxFps} FPS`} /></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><section className="border border-white/[0.07] bg-black/22 p-4"><h3 className="text-xs font-black text-white">Detected hardware</h3><dl className="mt-3 space-y-2 text-[10px]"><ReportRow label="CPU" value={`${report.hardware.cpuModel} · ${report.hardware.logicalCores} threads`} /><ReportRow label="Memory" value={`${(report.hardware.totalMemoryMb / 1024).toFixed(1)} GB total`} /><ReportRow label="GPUs" value={report.hardware.gpus.join(" · ") || "No GPU name reported"} /><ReportRow label="Free disk" value={`${report.hardware.diskAvailableGb.toFixed(1)} GB`} /></dl></section><section className="border border-white/[0.07] bg-black/22 p-4"><h3 className="text-xs font-black text-white">Changes applied</h3><ul className="mt-3 space-y-2 text-[10px] leading-5 text-[#aaa0b1]">{report.optimization.log.map((entry, index) => <li key={`${entry.kind}-${index}`} className="flex gap-2"><ShadowGlyph name="check" size={13} className="mt-0.5 shrink-0 text-[#72f2a8]" /><span>{entry.message}</span></li>)}<li className="flex gap-2"><ShadowGlyph name="check" size={13} className="mt-0.5 shrink-0 text-[#72f2a8]" /><span>Updated options.txt with {report.video.renderDistance}-chunk render distance, {report.video.simulationDistance}-chunk simulation distance, and {report.video.graphicsMode} graphics.</span></li></ul></section></div></motion.div>}
        </AnimatePresence>

        {error && <p role="alert" className="mt-4 border border-red-400/22 bg-red-400/[0.055] px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className={voidClientStyles.secondaryButton}>{phase === "complete" ? "Close Report" : "Cancel"}</button>{phase !== "complete" && <button type="button" onClick={() => void run()} disabled={busy} className={voidClientStyles.primaryButton}><ShadowGlyph name={busy ? "spark" : "telemetry"} size={16} />{busy ? "Optimizing…" : phase === "error" ? "Try Again" : "Run Auto-Tune"}</button>}</div>
      </motion.section>
    </motion.div>
  );
}

function chooseVideoSettings(hardware: HardwareReport): GameVideoSettings {
  const gpuText = hardware.gpus.join(" ").toLowerCase();
  const dedicatedGpu = /nvidia|geforce|radeon|arc/.test(gpuText) && !/microsoft basic/.test(gpuText);
  const strong = hardware.totalMemoryMb >= 16_384 && hardware.logicalCores >= 8 && dedicatedGpu;
  const balanced = hardware.totalMemoryMb >= 8_192 && hardware.logicalCores >= 4;
  return {
    renderDistance: strong ? 20 : balanced ? 14 : 8,
    simulationDistance: strong ? 12 : balanced ? 8 : 5,
    graphicsMode: strong || balanced ? "fancy" : "fast",
    maxFps: strong ? 144 : balanced ? 120 : 60,
  };
}

function ReportTile({ label, value }: { label: string; value: string }) {
  return <div className="border border-[#9d5ce0]/16 bg-[#7B2CBF]/[0.055] p-3"><span className="block text-[8px] font-black tracking-[0.12em] text-[#8f8199] uppercase">{label}</span><strong className="mt-2 block truncate text-xs capitalize text-white">{value}</strong></div>;
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3"><dt className="text-[#746a7c]">{label}</dt><dd className="break-words text-right text-[#bbb0c2]">{value}</dd></div>;
}
