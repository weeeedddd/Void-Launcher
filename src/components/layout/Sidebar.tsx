import { ArrowLeftRight, Boxes, Gauge, GripVertical, LogIn, Search, Settings } from "lucide-react";
import { motion, useDragControls, type PanInfo } from "motion/react";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/stores/account";
import { useUiStore, type SidebarSide, type View } from "@/stores/ui";

const NAV: { view: View; label: string; icon: typeof Boxes }[] = [
  { view: "instances", label: "Instances", icon: Boxes },
  { view: "mods", label: "Mods", icon: Search },
  { view: "optimizer", label: "Optimizer", icon: Gauge },
  { view: "settings", label: "Settings", icon: Settings },
];

/**
 * Dockable navigation rail — "snap and dock".
 *
 * How the docking works (and why it's fast):
 *  • The docked side is plain state (`sidebarSide`), persisted in zustand.
 *    Left vs. right is just CSS `order` on a flex row: sidebar 0|2, main 1.
 *  • `motion.aside layout` animates the order swap with the FLIP technique —
 *    Motion measures old/new positions and animates a GPU `transform`
 *    between them. No per-frame React renders, no reparenting, no layout
 *    thrash: one reflow at the swap, then compositor-only animation.
 *  • Dragging starts ONLY from the grip handle (`dragListener={false}` +
 *    `useDragControls`), so nav buttons stay plain clicks.
 *  • The drag itself is rubber-banded (constraints 0/0 + elastic): the
 *    panel nudges a few px while the *pointer position* decides the target
 *    half of the screen. Crossing the midpoint updates the glowing dock
 *    preview strip (rendered by App.tsx); releasing snaps the panel over.
 */
export function Sidebar() {
  const { view, setView, sidebarSide, setSidebarSide, toggleSidebarSide, setDockPreview } =
    useUiStore();
  const { profile, pending, error, login } = useAccountStore();
  const dragControls = useDragControls();
  const isLeft = sidebarSide === "left";

  /** Which half of the window the pointer is currently in. */
  const targetFor = (info: PanInfo): SidebarSide =>
    info.point.x > window.innerWidth / 2 ? "right" : "left";

  return (
    <motion.aside
      layout
      drag="x"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      dragMomentum={false}
      onDrag={(_, info) => setDockPreview(targetFor(info))}
      onDragEnd={(_, info) => {
        setDockPreview(null);
        setSidebarSide(targetFor(info));
      }}
      transition={{ layout: { type: "spring", stiffness: 380, damping: 34 } }}
      style={{ order: isLeft ? 0 : 2 }}
      className={
        "flex w-60 shrink-0 flex-col bg-void-900/80 " +
        (isLeft ? "border-r" : "border-l") +
        " border-void-700/60"
      }
    >
      {/* ── Brand + dock controls ── */}
      <div className="flex items-center gap-1 px-3 py-6">
        <button
          title="Drag to dock the sidebar left or right"
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab touch-none rounded p-1 text-ink-500 transition-colors hover:text-accent-400 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <h1 className="flex-1 text-lg font-bold tracking-[0.2em]">
          <span className="text-accent-400 drop-shadow-[0_0_10px_var(--color-accent-glow)]">
            VOID
          </span>
        </h1>
        <button
          title={`Dock sidebar ${isLeft ? "right" : "left"}`}
          onClick={toggleSidebarSide}
          className="cursor-pointer rounded p-1.5 text-ink-500 transition-colors hover:bg-void-800 hover:text-accent-400"
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = v === view;
          // The active indicator bar mirrors to the outer edge per side.
          const activeClasses = isLeft
            ? "shadow-[inset_2px_0_0_var(--color-accent-500)]"
            : "shadow-[inset_-2px_0_0_var(--color-accent-500)]";
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? `bg-accent-600/15 text-accent-300 ${activeClasses}`
                  : "text-ink-300 hover:bg-void-800 hover:text-ink-100")
              }
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* ── Account ── */}
      <div className="border-t border-void-700/60 p-4">
        {profile ? (
          <div className="flex items-center gap-3">
            {/* Crafatar renders the player's skin head from their UUID */}
            <img
              src={`https://crafatar.com/avatars/${profile.uuid}?size=64&overlay`}
              alt=""
              className="h-9 w-9 rounded-md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-ink-500">Signed in</p>
            </div>
          </div>
        ) : pending ? (
          <p className="text-xs leading-relaxed text-ink-300">
            Enter code{" "}
            <span className="select-text font-mono text-sm text-accent-300">
              {pending.userCode}
            </span>{" "}
            in the browser window that just opened…
          </p>
        ) : (
          <>
            <Button variant="outline" className="w-full" onClick={() => void login()}>
              <LogIn size={16} />
              Sign in with Microsoft
            </Button>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </>
        )}
      </div>
    </motion.aside>
  );
}
