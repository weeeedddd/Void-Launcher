import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Eminence glass panel: translucent purple (#110D17), arcane hairline
 * border and backdrop-blur, with a faint top-edge glow. The shared surface
 * for every dashboard widget.
 */
export function GlassCard({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#7B2CBF]/20 bg-[#110D17]/70 backdrop-blur-xl",
        "shadow-[0_20px_60px_-30px_#000]",
        className,
      )}
      {...props}
    >
      {/* top-edge arcane glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(123,44,191,0.14), transparent 70%)" }}
      />
      {children}
    </div>
  );
}

/** Small uppercase widget header with an accent icon. */
export function WidgetHeader({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#9D4EDD]" />
      <span className="text-[11px] font-semibold tracking-[0.2em] text-[#5f5878] uppercase">{title}</span>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

/** A tiny rounded metadata chip (loader, version, region…). */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md border border-[#7B2CBF]/25 bg-[#050505]/50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-[#9A90B2]",
        className,
      )}
    >
      {children}
    </span>
  );
}
