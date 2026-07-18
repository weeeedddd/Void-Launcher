import type { ButtonHTMLAttributes } from "react";
import { playClick } from "@/lib/sound";

type Variant = "primary" | "outline" | "ghost" | "danger";

/**
 * Per-variant styling. `primary` carries the signature purple glow;
 * the glow color comes from the --color-accent-glow theme token.
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700 " +
    "shadow-[0_0_18px_var(--color-accent-glow)] hover:shadow-[0_0_26px_var(--color-accent-glow)]",
  outline:
    "border border-void-600 bg-void-800/40 text-ink-100 " +
    "hover:border-accent-500 hover:text-accent-300",
  ghost: "bg-transparent text-ink-300 hover:bg-void-700/60 hover:text-ink-100",
  danger: "bg-red-900/60 text-red-200 border border-red-800 hover:bg-red-800/60",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Opt out of the UI click sound for this button. */
  silent?: boolean;
}

export function Button({
  variant = "primary",
  className = "",
  silent = false,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      className={
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 " +
        "text-sm font-medium transition-all duration-150 " +
        "disabled:pointer-events-none disabled:opacity-50 " +
        `${variants[variant]} ${className}`
      }
      onClick={(event) => {
        // Central hook-in for the subtle UI click sound (see lib/sound.ts).
        if (!silent) playClick();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
