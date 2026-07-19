import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Cpu, Package, Settings2 } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { GlassCard, Chip } from "@/components/dashboard/GlassCard";
import { INSTANCES, type MockInstance } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useInterval } from "@/hooks/useInterval";

type HeroState = "idle" | "launching" | "downloading";

/**
 * The dashboard centerpiece. Pick an instance from the strip; installed ones
 * show the massive PLAY button, uninstalled ones show DOWNLOAD INSTANCE with a
 * simulated progress fill that flips the instance to installed. All local
 * state — no backend.
 */
export function PlayHeroWidget() {
  const [instances, setInstances] = useState<MockInstance[]>(INSTANCES);
  const [selectedId, setSelectedId] = useState(instances[0].id);
  const [state, setState] = useState<HeroState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const selected = instances.find((i) => i.id === selectedId)!;

  // Drive the simulated download progress bar while state === "downloading".
  useInterval(
    () => {
      setProgress((p) => {
        const next = Math.min(100, p + 4 + Math.random() * 6);
        if (next >= 100) {
          // Flip the instance to installed and settle back to PLAY.
          setInstances((list) => list.map((i) => (i.id === selectedId ? { ...i, installed: true } : i)));
          setState("idle");
          setStatus(`${selected.name} installed — ready to play.`);
        }
        return next;
      });
    },
    state === "downloading" ? 220 : null,
  );

  const launch = () => {
    setStatus(null);
    setState("launching");
    // Simulated: real launch is handled by the native layer, out of scope here.
    setTimeout(() => {
      setState("idle");
      setStatus(`Launched ${selected.name} (simulated).`);
    }, 2200);
  };

  const download = () => {
    setStatus(null);
    setProgress(0);
    setState("downloading");
  };

  return (
    <GlassCard className="p-6">
      {/* faint moving sheen behind the hero */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(60% 120% at 100% 0%, ${selected.accent}33, transparent 60%)`,
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Instance identity */}
        <div className="flex items-center gap-4 lg:w-72">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-white/10 text-2xl font-black text-white"
            style={{ background: `linear-gradient(135deg, ${selected.accent}, #050505)` }}
          >
            {selected.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.2em] text-[#5f5878] uppercase">Selected Instance</div>
            <h2 className="truncate font-serif text-xl font-bold text-[#EAE4F4]">{selected.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip>{selected.version}</Chip>
              <Chip className="border-[#9D4EDD]/40 text-[#C77DFF]">{selected.loader}</Chip>
              <Chip>
                <Package className="mr-1 inline h-3 w-3" />
                {selected.mods}
              </Chip>
            </div>
          </div>
        </div>

        {/* The button + meta */}
        <div className="flex flex-1 flex-col items-stretch gap-3">
          <AnimatePresence mode="wait">
            {state === "downloading" ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#C77DFF]">
                    <Cpu className="h-4 w-4" /> Downloading {selected.name}…
                  </span>
                  <span className="font-mono text-xs text-[#9A90B2]">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-[#7B2CBF]/25 bg-[#050505]/70">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#7B2CBF,#C77DFF)", boxShadow: "0 0 18px rgba(123,44,191,0.7)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selected.installed ? "play" : "download"}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <ActionButton
                  variant={selected.installed ? "play" : "download"}
                  size="xl"
                  fullWidth
                  loading={state === "launching"}
                  label={state === "launching" ? "LAUNCHING…" : undefined}
                  subLabel={selected.installed ? selected.java : "Not installed · ~1.2 GB"}
                  onClick={selected.installed ? launch : download}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* status line */}
          <div className="flex h-5 items-center justify-center">
            <AnimatePresence>
              {status && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-[#46E0A8]"
                >
                  <Check className="h-3.5 w-3.5" /> {status}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Instance switcher strip */}
      <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-[#7B2CBF]/15 pt-4">
        <Settings2 className="mr-1 h-4 w-4 text-[#5f5878]" />
        {instances.map((inst) => (
          <button
            key={inst.id}
            onClick={() => {
              setSelectedId(inst.id);
              setState("idle");
              setStatus(null);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              inst.id === selectedId
                ? "border-[#9D4EDD]/60 bg-[#7B2CBF]/15 text-[#EAE4F4]"
                : "border-[#7B2CBF]/20 text-[#9A90B2] hover:border-[#7B2CBF]/40 hover:text-[#EAE4F4]",
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: inst.installed ? "#46E0A8" : "#5f5878" }} />
            {inst.name}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
