import { memo, useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ITelemetrySnapshot } from "../../../types";
import { createTelemetryPath } from "../../../hooks/useTelemetry";
import { ShadowGlyph, type ShadowGlyphName } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

interface ITelemetryPanelProps {
  snapshot: ITelemetrySnapshot;
  expanded?: boolean;
}

function pingTone(ping: number) {
  if (ping <= 45) return { label: "Optimal", dot: "bg-[#4cff9a] shadow-[0_0_12px_rgba(76,255,154,0.85)]", text: "text-[#4cff9a]" };
  if (ping <= 75) return { label: "Variable", dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.85)]", text: "text-amber-300" };
  return { label: "Void route", dot: "bg-[#bd7aff] shadow-[0_0_14px_rgba(189,122,255,0.9)]", text: "text-[#c796ff]" };
}

export const TelemetryPanel = memo(function TelemetryPanel({ snapshot, expanded = false }: ITelemetryPanelProps) {
  const reducedMotion = useReducedMotion();
  const ping = pingTone(snapshot.ping);
  const cpuPath = createTelemetryPath(snapshot.cpuHistory);
  const ramPath = createTelemetryPath(snapshot.ramHistory);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <section className={`${voidClientStyles.glassCard} ${expanded ? "p-6 xl:p-7" : "p-5"}`} aria-labelledby={`telemetry-title-${reactId}`}>
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <header className="relative flex items-start justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>Real-time telemetry</p>
          <h2 id={`telemetry-title-${reactId}`} className="font-display mt-1 text-lg font-black">Performance Matrix</h2>
        </div>
        <div className={`flex items-center gap-2 text-[9px] font-black tracking-[0.12em] uppercase ${snapshot.launchLoadActive ? "text-[#d8b4fe]" : ping.text}`}>
          <motion.span
            animate={reducedMotion ? undefined : { scale: [1, 1.65, 1], opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
            className={`size-1.5 rounded-full ${snapshot.launchLoadActive ? "bg-[#bd7aff] shadow-[0_0_16px_rgba(189,122,255,0.95)]" : ping.dot}`}
          />
          {snapshot.launchLoadActive ? "Instance boot surge" : `${ping.label} · ${snapshot.ping} ms`}
        </div>
      </header>

      <div className={`relative mt-5 grid gap-3 ${expanded ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-2"}`}>
        <MetricTile icon="cpu" label="CPU Load" value={snapshot.cpu} suffix="%" accent="violet" launchLoadActive={snapshot.launchLoadActive} />
        <MetricTile icon="ram" label="RAM Usage" value={snapshot.ram} suffix="%" accent="blue" launchLoadActive={snapshot.launchLoadActive} />
        {expanded && <MetricTile icon="telemetry" label="Frame Rate" value={snapshot.fps} suffix="FPS" accent="green" launchLoadActive={false} />}
        {expanded && <MetricTile icon="server" label="Route Latency" value={snapshot.ping} suffix="MS" accent={snapshot.ping > 75 ? "violet" : snapshot.ping > 45 ? "amber" : "green"} launchLoadActive={false} />}
      </div>

      <div className={`relative mt-5 grid gap-3 ${expanded ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        <WaveGraph id={`${reactId}-cpu`} label="CPU frequency curve" value={snapshot.cpu} path={cpuPath} color="violet" />
        <WaveGraph id={`${reactId}-ram`} label="Memory pressure curve" value={snapshot.ram} path={ramPath} color="blue" />
      </div>

      {expanded && (
        <div className="relative mt-5 grid gap-3 md:grid-cols-3">
          <RuntimeStatus title="Render thread" detail="Frame pacing stable" value="2.8 ms" tone="green" />
          <RuntimeStatus title="Native memory" detail="Guarded allocation" value="6.9 GB" tone="violet" />
          <RuntimeStatus title="Network route" detail="EU Central relay" value={`${snapshot.ping} ms`} tone={snapshot.ping > 60 ? "amber" : "blue"} />
        </div>
      )}
    </section>
  );
});

function MetricTile({ icon, label, value, suffix, accent, launchLoadActive }: { icon: ShadowGlyphName; label: string; value: number; suffix?: string; accent: "violet" | "blue" | "green" | "amber"; launchLoadActive: boolean }) {
  const tones = {
    violet: "border-[#a855f7]/20 bg-[#7B2CBF]/8 text-[#d8b4fe]",
    blue: "border-[#4c6fdc]/20 bg-[#263f92]/8 text-[#86a8ff]",
    green: "border-[#4cff9a]/18 bg-[#00e676]/[0.055] text-[#4cff9a]",
    amber: "border-amber-300/18 bg-amber-300/[0.055] text-amber-300",
  } as const;
  return (
    <motion.div animate={launchLoadActive ? { boxShadow: ["0 0 0 rgba(123,44,191,0)", "0 0 28px rgba(123,44,191,0.24)", "0 0 0 rgba(123,44,191,0)"] } : { boxShadow: "0 0 0 rgba(123,44,191,0)" }} transition={{ duration: 1.15, repeat: launchLoadActive ? Infinity : 0 }} className={`rounded-2xl border p-3.5 ${tones[accent]}`}>
      <div className="flex items-center justify-between">
        <ShadowGlyph name={icon} size={16} className="filter drop-shadow-[0_0_7px_currentColor]" />
        <span className="text-[8px] font-black tracking-[0.14em] text-[#655a70] uppercase">Live</span>
      </div>
      <p className="mt-4 text-xl font-black tabular-nums text-white"><motion.span key={value} initial={{ opacity: 0.4, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{value}</motion.span>{suffix && <small className="ml-1 text-[9px] tracking-[0.1em] text-[#a79bad]">{suffix}</small>}</p>
      <p className="mt-0.5 text-[10px] text-[#776c82]">{label}</p>
    </motion.div>
  );
}

function WaveGraph({ id, label, value, path, color }: { id: string; label: string; value: number; path: string; color: "violet" | "blue" }) {
  const stroke = color === "violet" ? "#b36dff" : "#6488ff";
  const fill = color === "violet" ? "#7B2CBF" : "#263f92";
  return (
    <div className="rounded-2xl border border-white/[0.065] bg-black/20 p-3.5">
      <div className="mb-2 flex items-center justify-between text-[9px] font-bold tracking-[0.1em] text-[#776c82] uppercase">
        <span>{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <svg viewBox="0 0 320 104" className="h-24 w-full overflow-visible" role="img" aria-label={`${label}: ${value} percent`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor={fill} stopOpacity=".4" />
            <stop offset="1" stopColor={fill} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={`${path} L320 104 L0 104 Z`} fill={`url(#${id}-fill)`} opacity=".72" />
        <motion.path d={path} animate={{ d: path }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-glow)`} />
      </svg>
    </div>
  );
}

function RuntimeStatus({ title, detail, value, tone }: { title: string; detail: string; value: string; tone: "green" | "violet" | "blue" | "amber" }) {
  const dot = tone === "green" ? "bg-[#4cff9a]" : tone === "blue" ? "bg-[#6488ff]" : tone === "amber" ? "bg-amber-300" : "bg-[#bd7aff]";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
      <span className={`size-2 rounded-full ${dot} shadow-[0_0_12px_currentColor]`} />
      <span className="min-w-0 flex-1"><strong className="block text-xs text-white">{title}</strong><small className="text-[9px] text-[#776c82]">{detail}</small></span>
      <span className="text-xs font-black tabular-nums text-white">{value}</span>
    </div>
  );
}

export function TelemetryView({ snapshot }: { snapshot: ITelemetrySnapshot }) {
  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6">
        <p className={voidClientStyles.sectionKicker}>Battle metrics // live native signal</p>
        <h1 className={voidClientStyles.pageTitle}>Performance Monitor</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#8d8198]">A deterministic live simulation of the system signals the launcher will consume from the native telemetry bridge.</p>
      </header>
      <TelemetryPanel snapshot={snapshot} expanded />
    </div>
  );
}
