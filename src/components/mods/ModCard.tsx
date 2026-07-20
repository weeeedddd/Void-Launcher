import { useCallback } from "react";
import { ArrowUpRight, Download, Package, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { ModSummary } from "@/types";

const compact = new Intl.NumberFormat("en", { notation: "compact" });

interface ModCardProps {
  mod: ModSummary;
  onSelect: (mod: ModSummary) => void;
}

export function ModCard({ mod, onSelect }: ModCardProps) {
  const selectMod = useCallback(() => onSelect(mod), [mod, onSelect]);

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <button
        type="button"
        onClick={selectMod}
        className="group shadow-panel relative flex h-full min-h-66 w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/7 p-0 text-left transition duration-250 hover:-translate-y-1 hover:border-accent-500/38 hover:shadow-[0_24px_60px_rgb(0_0_0_/_0.48),0_0_28px_rgb(123_44_191_/_0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        <div className="relative h-24 overflow-hidden border-b border-white/6 bg-gradient-to-br from-[#181020] via-[#0d0a13] to-[#071023]">
          <div className="absolute -top-12 -right-4 size-32 rounded-full bg-accent-500/24 blur-3xl transition duration-500 group-hover:bg-accent-500/35" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,transparent_35%,rgb(123_44_191_/_0.6)_50%,transparent_65%)] [background-size:220%_100%] transition-[background-position] duration-700 group-hover:[background-position:100%_0]" />
          <div className="absolute right-4 bottom-3 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.16em] text-white/45 uppercase">
            <Sparkles size={11} /> {mod.platform}
          </div>
        </div>

        <div className="relative -mt-8 flex flex-1 flex-col px-4 pb-4">
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" loading="lazy" className="size-16 rounded-2xl border-4 border-[#100d15] bg-void-800 object-cover shadow-xl" />
          ) : (
            <div className="grid size-16 place-items-center rounded-2xl border-4 border-[#100d15] bg-gradient-to-br from-accent-600 to-midnight-800 text-white shadow-xl">
              <Package size={24} />
            </div>
          )}

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold text-white">{mod.name}</h3>
              <p className="mt-0.5 truncate text-[11px] text-ink-500">by {mod.author || "unknown"}</p>
            </div>
            <ArrowUpRight size={16} className="shrink-0 text-ink-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-300" />
          </div>

          <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-300">{mod.summary}</p>

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
              <Download size={12} /> {compact.format(mod.downloads)}
            </div>
            <div className="flex gap-1.5">
              {mod.categories.slice(0, 2).map((category) => (
                <span key={category} className="max-w-24 truncate rounded-md border border-white/6 bg-white/[0.035] px-2 py-1 text-[9px] font-semibold text-ink-300">
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
