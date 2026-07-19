import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Atom, Coins, Crown, Flame, Gem, type LucideIcon, Shirt, Sparkles, Wand2, X } from "lucide-react";
import { GlassCard, WidgetHeader } from "@/components/dashboard/GlassCard";
import { usePlayerStore } from "@/stores/player";
import { cn } from "@/lib/utils";

const PULL_COST = 500;

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const RARITIES: Record<Rarity, { label: string; color: string; weight: number }> = {
  common: { label: "Common", color: "#9A90B2", weight: 50 },
  rare: { label: "Rare", color: "#3C79FF", weight: 28 },
  epic: { label: "Epic", color: "#9D4EDD", weight: 15 },
  legendary: { label: "Legendary", color: "#E0B646", weight: 6 },
  mythic: { label: "Mythic Shadow", color: "#FF4D6D", weight: 1 },
};

interface Cosmetic {
  name: string;
  rarity: Rarity;
  icon: LucideIcon;
}

const COSMETICS: Cosmetic[] = [
  { name: "Obsidian Cloak", rarity: "common", icon: Shirt },
  { name: "Dim Rune Trail", rarity: "common", icon: Sparkles },
  { name: "Violet Ember Cape", rarity: "rare", icon: Flame },
  { name: "Shadow Sigil", rarity: "rare", icon: Wand2 },
  { name: "Garden Warden Set", rarity: "epic", icon: Gem },
  { name: "Arcane Overlord Aura", rarity: "epic", icon: Sparkles },
  { name: "Crown of Eminence", rarity: "legendary", icon: Crown },
  { name: "I AM ATOMIC — Nova", rarity: "mythic", icon: Atom },
];

/** Weighted pull: each cosmetic is weighted by its rarity's weight. */
function rollCosmetic(): Cosmetic {
  const total = COSMETICS.reduce((sum, c) => sum + RARITIES[c.rarity].weight, 0);
  let r = Math.random() * total;
  for (const c of COSMETICS) {
    r -= RARITIES[c.rarity].weight;
    if (r <= 0) return c;
  }
  return COSMETICS[0];
}

type GachaPhase = "closed" | "summoning" | "reveal";

export function StreakCoinsWidget() {
  const { coins, streak, spend, grant } = usePlayerStore();
  const [phase, setPhase] = useState<GachaPhase>("closed");
  const [result, setResult] = useState<Cosmetic | null>(null);
  const [shake, setShake] = useState(false);

  const canPull = coins >= PULL_COST;

  const pull = () => {
    if (phase !== "closed") return;
    if (!spend(PULL_COST)) {
      // Not enough coins → shake the balance instead.
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setResult(null);
    setPhase("summoning");
    // Roll now, reveal after the summon animation.
    const rolled = rollCosmetic();
    setTimeout(() => {
      setResult(rolled);
      setPhase("reveal");
    }, 1500);
  };

  const claim = () => {
    if (result) grant({ name: result.name, rarity: RARITIES[result.rarity].label });
    setPhase("closed");
    setResult(null);
  };

  return (
    <GlassCard className="p-6">
      <WidgetHeader icon={Flame} title="Play Streak & Shadow-Coins" />

      <div className="flex items-stretch gap-4">
        {/* Streak */}
        <div className="flex-1">
          <div className="flex items-center gap-2 font-serif text-3xl font-black text-[#E0B646]">
            <motion.span
              animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame className="h-7 w-7 drop-shadow-[0_0_10px_rgba(224,182,70,0.6)]" />
            </motion.span>
            {streak}
          </div>
          <div className="mt-1 text-[11px] tracking-[0.12em] text-[#5f5878] uppercase">Day Streak</div>
        </div>

        {/* Coins */}
        <div className="flex-1 border-l border-[#7B2CBF]/15 pl-4">
          <motion.div
            className="flex items-center gap-2 font-serif text-3xl font-black text-[#C77DFF]"
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.45 }}
          >
            <Coins className="h-6 w-6" />
            {coins.toLocaleString()}
          </motion.div>
          <div className="mt-1 text-[11px] tracking-[0.12em] text-[#5f5878] uppercase">Shadow-Coins</div>
        </div>
      </div>

      {/* Rarity odds strip */}
      <div className="mt-5 flex gap-1 overflow-hidden rounded-full">
        {(Object.keys(RARITIES) as Rarity[]).map((r) => (
          <div
            key={r}
            title={`${RARITIES[r].label} · ${RARITIES[r].weight}%`}
            className="h-1.5 flex-1"
            style={{ background: RARITIES[r].color, opacity: 0.8 }}
          />
        ))}
      </div>

      {/* Pull button (gacha) */}
      <button
        onClick={pull}
        disabled={!canPull}
        className={cn(
          "group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold tracking-wide uppercase transition-all",
          canPull
            ? "cursor-pointer border-[#9D4EDD]/50 text-white shadow-[0_0_22px_-6px_rgba(123,44,191,0.7)] hover:shadow-[0_0_30px_-4px_rgba(123,44,191,0.9)]"
            : "cursor-not-allowed border-[#7B2CBF]/20 text-[#5f5878]",
        )}
        style={canPull ? { background: "linear-gradient(110deg,#3C096C,#7B2CBF,#3C096C)" } : undefined}
      >
        {/* rotating conic sheen */}
        {canPull && (
          <motion.span
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{ background: "conic-gradient(from 0deg, transparent, rgba(199,125,255,0.7), transparent 40%)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        )}
        <span className="relative flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Pull Cosmetics
          <span className="flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 text-xs">
            <Coins className="h-3 w-3" /> {PULL_COST}
          </span>
        </span>
      </button>

      {/* ── Gacha overlay ── */}
      <AnimatePresence>
        {phase !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-md"
            onClick={phase === "reveal" ? claim : undefined}
          >
            {phase === "summoning" && <SummoningRing />}
            {phase === "reveal" && result && <RevealCard cosmetic={result} onClaim={claim} />}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

/** The "summoning from the void" spinner shown before the reveal. */
function SummoningRing() {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="relative h-40 w-40">
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              inset: ring * 14,
              borderTopColor: "#C77DFF",
              borderRightColor: ring % 2 ? "#7B2CBF" : "transparent",
            }}
            animate={{ rotate: ring % 2 ? -360 : 360 }}
            transition={{ duration: 2 + ring, repeat: Infinity, ease: "linear" }}
          />
        ))}
        <motion.span
          className="absolute inset-0 grid place-items-center"
          animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-10 w-10 text-[#C77DFF] drop-shadow-[0_0_20px_rgba(123,44,191,0.9)]" />
        </motion.span>
      </div>
      <p className="font-serif text-lg tracking-wide text-[#C77DFF] italic">Summoning from the void…</p>
    </motion.div>
  );
}

/** Rarity-colored reveal of the pulled cosmetic + particle burst. */
function RevealCard({ cosmetic, onClaim }: { cosmetic: Cosmetic; onClaim: () => void }) {
  const rarity = RARITIES[cosmetic.rarity];
  const Icon = cosmetic.icon;
  const isHigh = cosmetic.rarity === "legendary" || cosmetic.rarity === "mythic";

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      onClick={(e) => e.stopPropagation()}
      className="relative w-[300px] rounded-2xl border p-8 text-center"
      style={{
        borderColor: rarity.color,
        background: "linear-gradient(180deg,#110D17,#050505)",
        boxShadow: `0 0 60px -10px ${rarity.color}`,
      }}
    >
      {/* particle burst */}
      <span className="pointer-events-none absolute inset-0 grid place-items-center">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const dist = 90 + Math.random() * 50;
          return (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ background: rarity.color, boxShadow: `0 0 8px ${rarity.color}` }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          );
        })}
      </span>

      {/* rotating aura for high rarities */}
      {isHigh && (
        <motion.span
          aria-hidden
          className="absolute -inset-2 rounded-2xl opacity-40 blur-lg"
          style={{ background: `conic-gradient(from 0deg, transparent, ${rarity.color}, transparent 55%)` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative">
        <div
          className="text-[11px] font-bold tracking-[0.3em] uppercase"
          style={{ color: rarity.color }}
        >
          {rarity.label}
        </div>
        <motion.div
          className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-2xl border"
          style={{ borderColor: rarity.color, background: `${rarity.color}1a` }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-12 w-12" style={{ color: rarity.color }} />
        </motion.div>
        <h3 className="mt-5 font-serif text-lg font-bold text-[#EAE4F4]">{cosmetic.name}</h3>
        <p className="mt-1 text-xs text-[#9A90B2]">Added to your Shadow Vault</p>
        <button
          onClick={onClaim}
          className="mt-6 w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-white/10"
        >
          Claim
        </button>
      </div>

      <button
        onClick={onClaim}
        aria-label="Close"
        className="absolute top-3 right-3 cursor-pointer text-[#5f5878] transition-colors hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
