import { motion } from "motion/react";
import {
  ArrowLeftRight,
  Blocks,
  Ghost,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shirt,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";

export type DashNav = "home" | "play" | "void" | "builder" | "cosmetics" | "settings";

const NAV: { id: DashNav; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "play", label: "Play", icon: Swords },
  { id: "void", label: "The Void", icon: Ghost },
  { id: "builder", label: "Modpack Builder", icon: Blocks },
  { id: "cosmetics", label: "Cosmetics", icon: Shirt },
  { id: "settings", label: "Settings", icon: Settings },
];

/**
 * Dockable Eminence sidebar.
 *
 * Docking model (browser-only, no native APIs): the docked side is just CSS
 * `order` on the flex row — sidebar `order-0` (left) or `order-2` (right),
 * content `order-1`. `motion.aside layout` FLIP-animates the reposition when
 * the arrow control flips the side. The active-nav indicator + rounded corner
 * mirror to whichever edge the rail is docked against.
 */
export function DashboardSidebar({
  active,
  onNavigate,
}: {
  active: DashNav;
  onNavigate: (id: DashNav) => void;
}) {
  const side = useUiStore((s) => s.sidebarSide);
  const toggleSide = useUiStore((s) => s.toggleSidebarSide);
  const isLeft = side === "left";

  return (
    <motion.aside
      layout
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      style={{ order: isLeft ? 0 : 2 }}
      className={cn(
        "flex w-64 shrink-0 flex-col bg-[#080610]/80 backdrop-blur-xl",
        isLeft ? "border-r" : "border-l",
        "border-[#7B2CBF]/20",
      )}
    >
      {/* ── Brand + dock control ── */}
      <div className={cn("flex items-center gap-2 px-5 py-6", !isLeft && "flex-row-reverse")}>
        <h1 className="flex-1 text-xl font-black tracking-[0.25em]">
          <span className="text-[#C77DFF] drop-shadow-[0_0_12px_rgba(123,44,191,0.7)]">VOID</span>
        </h1>
        <button
          onClick={toggleSide}
          title={`Dock sidebar to the ${isLeft ? "right" : "left"}`}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-[#7B2CBF]/25 bg-[#110D17]/60 text-[#9A90B2] transition-colors hover:border-[#9D4EDD]/60 hover:text-[#C77DFF]"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                !isLeft && "flex-row-reverse text-right",
                isActive
                  ? "bg-[#7B2CBF]/15 text-[#C77DFF]"
                  : "text-[#9A90B2] hover:bg-[#110D17]/80 hover:text-[#EAE4F4]",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className={cn(
                    "absolute inset-y-2 w-[3px] rounded-full bg-[#C77DFF] shadow-[0_0_12px_rgba(123,44,191,0.9)]",
                    isLeft ? "left-0" : "right-0",
                  )}
                />
              )}
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Account (mock — no auth in browser build) ── */}
      <div className={cn("flex items-center gap-3 border-t border-[#7B2CBF]/15 p-4", !isLeft && "flex-row-reverse text-right")}>
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#9D4EDD]/50 bg-gradient-to-br from-[#3C096C] to-[#7B2CBF] font-bold text-white">
          S
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#EAE4F4]">Lord Shadow</p>
          <p className="text-[11px] tracking-wide text-[#9D4EDD] uppercase">Eminence</p>
        </div>
      </div>
    </motion.aside>
  );
}
