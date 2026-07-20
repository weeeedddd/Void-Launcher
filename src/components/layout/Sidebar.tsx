import { useCallback } from "react";
import { ArrowLeft, ArrowRight, Boxes, Gauge, Home, PanelLeftClose, PanelLeftOpen, Settings, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useUiStore, type View } from "@/stores/ui";

const NAV: { view: View; label: string; eyebrow: string; icon: typeof Home }[] = [
  { view: "instances", label: "Home", eyebrow: "Command center", icon: Home },
  { view: "mods", label: "Mod Manager", eyebrow: "Mods & modpacks", icon: Boxes },
  { view: "optimizer", label: "Performance", eyebrow: "System tuning", icon: Gauge },
  { view: "settings", label: "Settings", eyebrow: "Launcher config", icon: Settings },
];

export function Sidebar() {
  const view = useUiStore((state) => state.view);
  const setView = useUiStore((state) => state.setView);
  const sidebarSide = useUiStore((state) => state.sidebarSide);
  const toggleSidebarSide = useUiStore((state) => state.toggleSidebarSide);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const isLeft = sidebarSide === "left";
  const MoveIcon = isLeft ? ArrowRight : ArrowLeft;

  const selectView = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => setView(event.currentTarget.value as View),
    [setView],
  );

  return (
    <motion.aside
      layout
      transition={{ layout: { type: "spring", stiffness: 360, damping: 34 } }}
      style={{ order: isLeft ? 0 : 2 }}
      className={`relative flex w-18 shrink-0 flex-col bg-[#08070a]/92 px-2 pb-3 backdrop-blur-2xl sm:w-20 lg:px-3 lg:pb-5 ${collapsed ? "lg:w-20" : "lg:w-67"} ${isLeft ? "border-r border-white/6" : "border-l border-white/6"}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent-500/12 blur-3xl" />
        <div className={`shadow-energy-rail absolute inset-y-0 w-px opacity-40 ${isLeft ? "right-0" : "left-0"}`} />
      </div>

      <div className="relative flex items-center justify-center gap-2 py-4 lg:justify-end">
        <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden size-10 cursor-pointer place-items-center rounded-xl border border-white/7 bg-white/[0.028] text-ink-500 transition hover:border-accent-500/35 hover:text-accent-300 focus-visible:outline-2 focus-visible:outline-accent-400 lg:grid">
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          type="button"
          aria-label={`Move sidebar to the ${isLeft ? "right" : "left"}`}
          title={`Move sidebar to the ${isLeft ? "right" : "left"}`}
          onClick={toggleSidebarSide}
          className="hidden size-10 cursor-pointer place-items-center rounded-xl border border-white/7 bg-white/[0.028] text-ink-500 transition duration-200 hover:border-accent-500/35 hover:bg-accent-500/12 hover:text-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 lg:grid"
        >
          <MoveIcon size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className={`relative mb-5 px-2 ${collapsed ? "lg:hidden" : "hidden lg:block"}`}>
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={12} strokeWidth={1.8} className="text-accent-400" />
          <span className="text-[10px] font-bold tracking-[0.22em] text-accent-300 uppercase">Navigation</span>
        </div>
        <p className="text-xs leading-relaxed text-ink-500">Build in silence. Launch with power.</p>
      </div>

      <nav aria-label="Main navigation" className="relative flex flex-1 flex-col gap-2">
        {NAV.map(({ view: navView, label, eyebrow, icon: Icon }) => {
          const active = navView === view;
          return (
            <button
              key={navView}
              type="button"
              value={navView}
              onClick={selectView}
              aria-current={active ? "page" : undefined}
              title={label}
              className={`group relative flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl border px-2 py-3 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-400 lg:justify-start ${active ? "border-accent-500/35 bg-accent-500/12 shadow-[0_10px_34px_rgb(123_44_191_/_0.12)]" : "border-transparent text-ink-300 hover:border-white/6 hover:bg-white/[0.035] hover:text-white"}`}
            >
              {active && <motion.span layoutId="sidebar-active" className={`shadow-energy-rail absolute inset-y-2 w-0.5 rounded-full ${isLeft ? "left-0" : "right-0"}`} />}
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${active ? "bg-accent-500/18 text-accent-300" : "bg-white/[0.035] text-ink-500 group-hover:text-accent-300"}`}>
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span className={`min-w-0 ${collapsed ? "lg:hidden" : "hidden lg:block"}`}>
                <span className="block truncate text-sm font-semibold">{label}</span>
                <span className="block text-[10px] tracking-wide text-ink-500">{eyebrow}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={`relative rounded-xl border border-success-500/15 bg-success-500/[0.035] p-3 ${collapsed ? "grid place-items-center" : ""}`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-success-400">
          <span className="size-2 shrink-0 rounded-full bg-success-500 shadow-[0_0_10px_var(--color-success-glow)]" /> <span className={collapsed ? "hidden" : "hidden lg:inline"}>Systems operational</span>
        </div>
        <p className={`mt-1 text-[10px] leading-relaxed text-ink-500 ${collapsed ? "hidden" : "hidden lg:block"}`}>Tauri Desktop · Secure runtime</p>
      </div>
    </motion.aside>
  );
}
