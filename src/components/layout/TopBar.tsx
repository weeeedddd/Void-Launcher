import { useCallback } from "react";
import { Minus, ShieldCheck, Square, X } from "lucide-react";
import { AccountManager } from "@/components/account/AccountManager";
import { closeCurrentWindow, minimizeCurrentWindow, toggleCurrentWindowMaximized } from "@/lib/windowControls";
import { useAccountStore, type AccountMode } from "@/stores/account";

export function TopBar() {
  const accountMode = useAccountStore((state) => state.mode);

  const minimize = useCallback(minimizeCurrentWindow, []);
  const toggleMaximize = useCallback(toggleCurrentWindowMaximized, []);
  const close = useCallback(closeCurrentWindow, []);

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={toggleMaximize}
      className="relative z-60 flex h-16 shrink-0 items-center gap-2 border-b border-white/7 bg-[#050505]/94 px-2 backdrop-blur-2xl sm:h-18 sm:gap-4 sm:px-4 lg:px-5"
    >
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-accent-500/35 bg-accent-500/12 shadow-[0_0_30px_rgb(123_44_191_/_0.28)] sm:size-10">
          <span className="absolute inset-x-2 top-1/2 h-px -rotate-45 bg-accent-300/60 shadow-[0_0_8px_rgb(201_158_255_/_0.7)]" />
          <span className="font-display relative text-sm font-black tracking-tighter text-white">V</span>
        </div>
        <div data-tauri-drag-region className="min-w-0">
          <p className="font-display truncate text-xs font-black tracking-[0.14em] text-white sm:text-sm sm:tracking-[0.2em]">VOID // SHADOW</p>
          <p className="hidden truncate text-[10px] font-semibold tracking-[0.16em] text-ink-500 uppercase lg:block">Minecraft Client Launcher</p>
        </div>
      </div>

      <div className="hidden shrink-0 md:block" onDoubleClick={(event) => event.stopPropagation()}>
        <ClientActiveIndicator mode={accountMode} />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-3" onDoubleClick={(event) => event.stopPropagation()}>
        <AccountManager />

        <div className="ml-0.5 flex items-center gap-0.5 border-l border-white/7 pl-1 sm:ml-1 sm:gap-1 sm:pl-3">
          <WindowButton label="Minimize" onClick={minimize} icon={Minus} />
          <WindowButton label="Maximize" onClick={toggleMaximize} icon={Square} />
          <WindowButton label="Close" onClick={close} icon={X} danger />
        </div>
      </div>
    </header>
  );
}

function ClientActiveIndicator({ mode }: { mode: AccountMode }) {
  const verified = mode === "microsoft";
  return (
    <div
      role="status"
      aria-label={verified ? "Microsoft verified" : "Authentication required"}
      className={`flex h-9 items-center gap-2.5 rounded-full border px-4 text-[10px] font-black tracking-[0.18em] uppercase ${verified ? "border-success-500/24 bg-success-500/[0.065] text-success-400 shadow-[0_0_24px_rgb(0_230_118_/_0.08)]" : "border-white/10 bg-white/[0.035] text-ink-300"}`}
    >
      <ShieldCheck size={14} />
      {verified ? "Microsoft verified" : "Sign-in required"}
      <span className={`size-1.5 rounded-full ${verified ? "bg-success-500 shadow-[0_0_9px_var(--color-success-glow)]" : "bg-ink-500"}`} />
    </div>
  );
}

function WindowButton({ label, onClick, icon: Icon, danger = false }: { label: string; onClick: () => void; icon: typeof Minus; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-9 cursor-pointer place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-accent-400 sm:size-10 sm:rounded-xl ${danger ? "text-ink-500 hover:bg-red-500/15 hover:text-red-300" : "text-ink-500 hover:bg-white/6 hover:text-white"}`}
    >
      <Icon size={14} />
    </button>
  );
}
