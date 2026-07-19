import { useState, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { ArrowDownToLine, Loader2, Sparkles, Swords, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE ULTIMATE AAA ACTION BUTTON
 * ─────────────────────────────────────────────────────────────────────────
 *  The single most important interactive element of the client. Used for the
 *  three primary calls-to-action: PLAY, DOWNLOAD and PREPARE.
 *
 *  Layered anatomy (bottom → top), each an absolutely-positioned element so
 *  the compositor can animate them independently on the GPU:
 *    1. Aura ring      — a blurred conic gradient that rotates + fades in on hover
 *    2. Shifting body  — the vibrant purple→violet gradient, position animates idly
 *    3. Top sheen      — inset highlight for a glassy, molded look
 *    4. Glint sweep    — a diagonal light streak that crosses once per hover
 *    5. Content        — animated variant icon + bold, wide-tracked label
 *    6. Particle burst — flash ring + 12 particles fired on press (placeholder FX)
 *
 *  The pulsing outer glow lives on the (unclipped) wrapper so `overflow-hidden`
 *  on the body can clip the gradient/sheen/glint without eating the shadow.
 */

export type ActionButtonVariant = "play" | "download" | "prepare";

interface VariantConfig {
  label: string;
  /** Gradient stops (deep → neon) for the shifting body. */
  colors: [string, string, string];
  /** Glow color as "r,g,b" for box-shadows & particles. */
  glow: string;
}

const VARIANTS: Record<ActionButtonVariant, VariantConfig> = {
  play: { label: "PLAY", colors: ["#3C096C", "#7B2CBF", "#C77DFF"], glow: "123,44,191" },
  download: { label: "DOWNLOAD INSTANCE", colors: ["#2A0A54", "#6D28D9", "#A855F7"], glow: "124,58,237" },
  prepare: { label: "PREPARE & DOWNLOAD CLIENT", colors: ["#3C096C", "#7B2CBF", "#9D4EDD"], glow: "123,44,191" },
};

/** Per-variant icon with its own signature micro-animation on hover. */
function VariantIcon({ variant, hovered }: { variant: ActionButtonVariant; hovered: boolean }) {
  // DOWNLOAD → arrow bobs downward, telegraphing "pull it down".
  if (variant === "download") {
    return (
      <motion.span
        className="block"
        animate={hovered ? { y: [0, 5, 0] } : { y: 0 }}
        transition={{ duration: 0.9, repeat: hovered ? Infinity : 0, ease: "easeInOut" }}
      >
        <ArrowDownToLine className="h-5 w-5" strokeWidth={2.5} />
      </motion.span>
    );
  }

  // PLAY → crossed swords; PREPARE → a wand. Both catch a "glint" spark on hover.
  const Blade = variant === "play" ? Swords : Wand2;
  return (
    <span className="relative block">
      <Blade className="h-5 w-5" strokeWidth={2.5} />
      <motion.span
        className="absolute -top-1.5 -right-1.5"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={hovered ? { opacity: [0, 1, 0], scale: [0.5, 1.15, 0.5], rotate: [0, 25, 0] } : { opacity: 0 }}
        transition={{ duration: 1.1, repeat: hovered ? Infinity : 0, ease: "easeInOut" }}
      >
        <Sparkles className="h-3 w-3 text-white" />
      </motion.span>
    </span>
  );
}

/** Flash ring + radial particle spray fired on each press. */
function Burst({ colorRgb }: { colorRgb: string }) {
  const particles = Array.from({ length: 12 });
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <motion.span
        className="absolute h-14 w-14 rounded-full"
        style={{ border: `2px solid rgba(${colorRgb},0.9)` }}
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 55 + Math.random() * 35;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: `rgb(${colorRgb})`, boxShadow: `0 0 8px rgba(${colorRgb},0.9)` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

export interface ActionButtonProps
  extends Omit<
    HTMLMotionProps<"button">,
    "children" | "animate" | "onTapStart" | "onTap" | "onTapCancel" | "onHoverStart" | "onHoverEnd" | "ref"
  > {
  variant?: ActionButtonVariant;
  /** Override the variant's default label (e.g. "PLAY" → "RESUME"). */
  label?: string;
  /** Small secondary line under the label (e.g. "Fabric 1.21.1 · 8 GB"). */
  subLabel?: string;
  /** Override the animated variant icon entirely. */
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function ActionButton({
  variant = "play",
  label,
  subLabel,
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [burst, setBurst] = useState(0);
  const reduce = useReducedMotion();

  const cfg = VARIANTS[variant];
  const interactive = !disabled && !loading;

  // Idle pulse vs. hover surge — driven on the unclipped wrapper.
  const restShadow = [
    `0 0 20px rgba(${cfg.glow},0.45)`,
    `0 0 34px rgba(${cfg.glow},0.65)`,
    `0 0 20px rgba(${cfg.glow},0.45)`,
  ];
  const hoverShadow = `0 0 50px rgba(${cfg.glow},0.95)`;

  return (
    <motion.div
      className={cn("relative inline-flex rounded-2xl", fullWidth && "flex w-full")}
      style={!interactive ? { boxShadow: `0 0 12px rgba(${cfg.glow},0.2)` } : undefined}
      animate={
        interactive && !reduce ? (hovered ? { boxShadow: hoverShadow } : { boxShadow: restShadow }) : undefined
      }
      transition={hovered ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* 1 — rotating aura ring (hover only) */}
      <motion.span
        aria-hidden
        className="absolute -inset-[3px] z-0 rounded-2xl blur-md"
        style={{
          background: `conic-gradient(from 0deg, transparent, rgba(${cfg.glow},0.9), transparent 40%, rgba(199,125,255,0.8), transparent 75%)`,
        }}
        animate={{ rotate: reduce ? 0 : 360, opacity: hovered ? 1 : 0 }}
        transition={{
          rotate: { duration: 5, repeat: Infinity, ease: "linear" },
          opacity: { duration: 0.3 },
        }}
      />

      <motion.button
        type="button"
        disabled={disabled || loading}
        className={cn(
          "relative z-10 overflow-hidden rounded-2xl border border-white/10",
          "flex items-center justify-center outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#C77DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
          interactive ? "cursor-pointer" : "cursor-not-allowed opacity-60",
          fullWidth && "w-full",
          className,
        )}
        animate={{ scale: pressed ? 0.97 : hovered && interactive ? 1.03 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onHoverStart={() => interactive && setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onTapStart={() => {
          if (!interactive) return;
          setPressed(true);
          setBurst((b) => b + 1); // fire a fresh particle burst
        }}
        onTap={() => setPressed(false)}
        onTapCancel={() => setPressed(false)}
        {...props}
      >
        {/* 2 — shifting gradient body */}
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(110deg, ${cfg.colors[0]}, ${cfg.colors[1]}, ${cfg.colors[2]}, ${cfg.colors[1]}, ${cfg.colors[0]})`,
            backgroundSize: "220% 100%",
          }}
          animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 3 — top sheen */}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/20" />
        {/* 4 — glint sweep (one pass per hover-enter) */}
        <span aria-hidden className="absolute inset-0 overflow-hidden">
          <motion.span
            className="absolute top-0 h-full w-1/3 -skew-x-12 bg-white/25 blur-md"
            animate={{ x: hovered ? "320%" : "-140%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </span>

        {/* 5 — content */}
        <span className="relative z-10 flex items-center justify-center gap-3 px-9 py-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <span className="text-white">{icon ?? <VariantIcon variant={variant} hovered={hovered} />}</span>
          )}
          <span className="flex flex-col items-start leading-none">
            <span className="text-[15px] font-extrabold tracking-[0.18em] text-white uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
              {label ?? cfg.label}
            </span>
            {subLabel && (
              <span className="mt-1 text-[11px] font-medium tracking-wide text-white/70">{subLabel}</span>
            )}
          </span>
        </span>

        {/* 6 — particle burst on press */}
        {burst > 0 && <Burst key={burst} colorRgb={cfg.glow} />}
      </motion.button>
    </motion.div>
  );
}
