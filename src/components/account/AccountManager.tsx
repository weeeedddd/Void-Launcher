import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, LoaderCircle, ShieldCheck, UserRoundPlus } from "lucide-react";
import { MinecraftAvatar } from "./MinecraftAvatar";
import { useAccountStore, type LauncherAccount } from "@/stores/account";

export function AccountManager() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const profile = useAccountStore((state) => state.profile);
  const accounts = useAccountStore((state) => state.accounts);
  const pending = useAccountStore((state) => state.pending);
  const error = useAccountStore((state) => state.error);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);

  const signIn = useCallback(() => void login(), [login]);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  const switchAccount = useCallback((accountId: string) => {
    activateAccount(accountId);
    setOpen(false);
  }, [activateAccount]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!profile) {
    return (
      <button type="button" onClick={signIn} disabled={Boolean(pending)} title={error ?? undefined} className="microsoft-button flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold text-white transition hover:border-[#7B2CBF]/50 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#5da9ff]">
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : <MicrosoftMark />}
        {pending ? "Waiting for Microsoft" : "Sign in with Microsoft"}
      </button>
    );
  }

  const active = accounts.find((account) => account.isActive) ?? {
    id: `profile-${profile.uuid}`,
    username: profile.name,
    uuid: profile.uuid,
    isActive: true,
    kind: "microsoft" as const,
  };

  return (
    <div ref={root} className="relative z-[200] isolate">
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#050505]/85 p-1.5 pr-3 text-left backdrop-blur-xl transition hover:border-[#7B2CBF]/45 focus-visible:outline-2 focus-visible:outline-[#9d5ce0]">
        <MinecraftAvatar username={active.username} size={32} className="size-8 rounded-lg ring-1 ring-white/15" />
        <span><strong className="block max-w-32 truncate text-xs text-white">{active.username}</strong><small className="flex items-center gap-1 text-[9px] text-[#4cff9a]"><ShieldCheck size={11} /> Microsoft verified</small></span>
        <ChevronDown size={13} className={`text-[#9b8ea6] transition ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.18 }} className="absolute top-[calc(100%+10px)] right-0 z-[250] w-[340px] rounded-3xl border border-[#9d5ce0]/38 bg-[#050505]/95 p-3 shadow-[0_35px_100px_rgba(0,0,0,0.9),0_0_55px_rgba(123,44,191,0.22)] backdrop-blur-2xl">
            <p className="px-2 text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Verified identities</p>
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
              {accounts.map((account) => <AccountRow key={account.id} account={account} onSelect={switchAccount} />)}
            </div>
            <button type="button" onClick={signIn} disabled={Boolean(pending)} className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#7B2CBF]/35 bg-[#7B2CBF]/16 text-xs font-bold text-white transition hover:bg-[#7B2CBF]/25 disabled:cursor-wait disabled:opacity-60">
              {pending ? <LoaderCircle size={15} className="animate-spin" /> : <UserRoundPlus size={15} />}
              {pending ? "Waiting for Microsoft" : "Add Microsoft Account"}
            </button>
            {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountRow({ account, onSelect }: { account: LauncherAccount; onSelect: (accountId: string) => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={account.isActive} onClick={() => onSelect(account.id)} className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-[#9d5ce0] ${account.isActive ? "border-[#a855f7]/50 bg-[#7B2CBF]/16" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"}`}>
      <MinecraftAvatar username={account.username} size={36} className="size-9 rounded-xl ring-1 ring-white/10" />
      <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-white">{account.username}</strong><small className="text-[#a79bad]">{account.isActive ? "Native session active" : "Re-authenticate to switch"}</small></span>
      {account.isActive && <Check size={14} className="text-[#d8b4fe]" />}
    </button>
  );
}

function MicrosoftMark() {
  return <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true"><span className="bg-[#f35325]" /><span className="bg-[#81bc06]" /><span className="bg-[#05a6f0]" /><span className="bg-[#ffba08]" /></span>;
}
