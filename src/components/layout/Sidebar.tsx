import { Boxes, LogIn, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/stores/account";
import { useUiStore, type View } from "@/stores/ui";

const NAV: { view: View; label: string; icon: typeof Boxes }[] = [
  { view: "instances", label: "Instances", icon: Boxes },
  { view: "mods", label: "Mods", icon: Search },
  { view: "settings", label: "Settings", icon: Settings },
];

/**
 * Left navigation rail: brand, page links, account section.
 * Active items get a purple tint + an inset accent bar on the left edge.
 */
export function Sidebar() {
  const { view, setView } = useUiStore();
  const { profile, pending, error, login } = useAccountStore();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-void-700/60 bg-void-900/80">
      {/* ── Brand ── */}
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold tracking-[0.2em]">
          <span className="text-accent-400 drop-shadow-[0_0_10px_var(--color-accent-glow)]">
            VOID
          </span>{" "}
          <span className="font-light text-ink-300">Launcher</span>
        </h1>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = v === view;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-accent-600/15 text-accent-300 shadow-[inset_2px_0_0_var(--color-accent-500)]"
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
    </aside>
  );
}
