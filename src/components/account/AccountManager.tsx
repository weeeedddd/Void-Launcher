import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, LoaderCircle, Plus, Sparkles, UserRoundPlus, UsersRound, WifiOff } from "lucide-react";
import { MinecraftAvatar, OfflineShadowAvatar } from "./MinecraftAvatar";
import { useAccountStore, type LauncherAccount } from "@/stores/account";

export function AccountManager() {
  const profile = useAccountStore((state) => state.profile);
  const accountMode = useAccountStore((state) => state.mode);
  const accounts = useAccountStore((state) => state.accounts);
  const pending = useAccountStore((state) => state.pending);
  const error = useAccountStore((state) => state.error);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);
  const addMockAccount = useAccountStore((state) => state.addMockAccount);
  const addOfflineAccount = useAccountStore((state) => state.addOfflineAccount);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [offlineUsername, setOfflineUsername] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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

  const toggle = useCallback(() => setOpen((current) => !current), []);
  const signIn = useCallback(() => void login(), [login]);
  const switchAccount = useCallback((accountId: string) => {
    activateAccount(accountId);
    setLastAdded(null);
    setOpen(false);
  }, [activateAccount]);
  const mockAddAccount = useCallback(async () => {
    if (adding) return;
    setAdding(true);
    setLastAdded(null);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const account = addMockAccount();
    setLastAdded(account.username);
    setAdding(false);
  }, [addMockAccount, adding]);
  const addOffline = useCallback((event: FormEvent) => {
    event.preventDefault();
    const account = addOfflineAccount(offlineUsername);
    if (!account) return;
    setOfflineUsername("");
    setLastAdded(account.username);
  }, [addOfflineAccount, offlineUsername]);

  if (!profile) {
    return (
      <button
        type="button"
        onClick={signIn}
        disabled={Boolean(pending)}
        title={error ?? undefined}
        className="microsoft-button flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5da9ff] sm:h-11 lg:min-w-54 lg:gap-3 lg:px-4"
      >
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : <MicrosoftMark />}
        <span className="hidden lg:inline">{pending ? "Waiting for Microsoft" : "Sign in with Microsoft"}</span>
        <span className="hidden sm:inline lg:hidden">{pending ? "Waiting" : "Sign in"}</span>
      </button>
    );
  }

  const active = accounts.find((account) => account.isActive) ?? {
    id: `profile-${profile.uuid}`,
    username: profile.name,
    uuid: profile.uuid,
    isActive: true,
    kind: accountMode === "microsoft" ? "microsoft" as const : accountMode === "offline" ? "offline" as const : "developer" as const,
  };
  const secondary = accounts.filter((account) => account.id !== active.id);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-1 pr-2 text-left backdrop-blur-xl transition focus-visible:outline-2 focus-visible:outline-accent-400 sm:h-11 sm:gap-3 sm:p-1.5 sm:pr-3 ${open ? "border-accent-400/50 bg-accent-500/12 shadow-[0_0_26px_rgb(123_44_191_/_0.22)]" : "border-white/8 bg-white/[0.035] hover:border-accent-500/30 hover:bg-accent-500/8"}`}
      >
        <AccountAvatar account={active} size={32} className="size-8 rounded-lg ring-1 ring-white/12" />
        <span className="hidden sm:block">
          <span className="block max-w-28 truncate text-xs font-bold text-white">{active.username}</span>
          <span className={`flex items-center gap-1.5 text-[10px] ${active.kind === "microsoft" ? "text-success-400" : "text-amber-300"}`}>
            <span className={`size-1.5 rounded-full ${active.kind === "microsoft" ? "bg-success-500 shadow-[0_0_7px_var(--color-success-glow)]" : "bg-amber-300 shadow-[0_0_7px_rgb(252_211_77_/_0.7)]"}`} />
            {active.kind === "microsoft" ? "Verified" : active.kind === "offline" ? "Offline mode" : "Test profile"}
          </span>
        </span>
        <ChevronDown size={13} className={`text-ink-500 transition duration-200 group-hover:text-white ${open ? "rotate-180 text-accent-300" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[calc(100%+0.7rem)] right-0 z-100 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-[24px] border border-accent-400/25 bg-[#0b0810]/96 p-3 shadow-[0_30px_90px_rgb(0_0_0_/_0.78),0_0_55px_rgb(123_44_191_/_0.2),inset_0_1px_0_rgb(255_255_255_/_0.07)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_8%,rgb(123_44_191_/_0.2),transparent_38%),linear-gradient(135deg,rgb(255_255_255_/_0.025),transparent_40%)]" />
            <div className="relative">
              <div className="flex items-center justify-between px-2 pt-1 pb-3">
                <div><p className="section-kicker">Account matrix</p><p className="mt-1 text-xs text-ink-500">Session-only public profiles</p></div>
                <span className="grid size-9 place-items-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300"><UsersRound size={16} /></span>
              </div>

              <p className="mb-2 px-2 text-[9px] font-black tracking-[0.16em] text-ink-500 uppercase">Active account</p>
              <AccountRow account={active} active onSelect={switchAccount} />

              {secondary.length > 0 && (
                <>
                  <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <p className="mb-2 px-2 text-[9px] font-black tracking-[0.16em] text-ink-500 uppercase">Stored accounts</p>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {secondary.map((account) => <AccountRow key={account.id} account={account} onSelect={switchAccount} />)}
                  </div>
                </>
              )}

              {lastAdded && <p role="status" className="mt-3 rounded-xl border border-success-500/18 bg-success-500/7 px-3 py-2 text-[10px] text-success-400"><Check size={12} className="mr-1.5 inline" />{lastAdded} added and activated.</p>}

              <form onSubmit={addOffline} className="mt-3 rounded-2xl border border-amber-400/16 bg-amber-400/[0.045] p-3">
                <label htmlFor="offline-account-name" className="mb-2 flex items-center gap-2 text-[9px] font-black tracking-[0.14em] text-amber-200/80 uppercase"><WifiOff size={12} /> Add Offline Account</label>
                <div className="flex gap-2">
                  <input
                    id="offline-account-name"
                    value={offlineUsername}
                    onChange={(event) => setOfflineUsername(event.target.value)}
                    maxLength={16}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Shadow_Guest"
                    className="min-w-0 flex-1 rounded-xl border border-amber-400/16 bg-black/30 px-3 text-xs text-white outline-none transition placeholder:text-ink-500 focus:border-accent-400 focus:ring-2 focus:ring-[#7B2CBF] focus:shadow-[0_0_15px_rgba(123,44,191,0.4)]"
                  />
                  <motion.button
                    type="submit"
                    disabled={!/^[A-Za-z0-9_]{3,16}$/.test(offlineUsername.trim())}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-amber-300/24 bg-amber-300/10 text-amber-200 transition hover:bg-amber-300/16 disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Add offline account"
                  >
                    <UserRoundPlus size={16} />
                  </motion.button>
                </div>
                <p className="mt-2 text-[9px] leading-4 text-amber-100/45">Local singleplayer simulation only. Multiplayer and real game launch stay disabled.</p>
              </form>

              <motion.button
                type="button"
                onClick={() => void mockAddAccount()}
                disabled={adding}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="group relative mt-3 flex min-h-12 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-accent-400/28 bg-accent-500/10 px-4 text-left transition hover:border-accent-300/45 hover:bg-accent-500/16 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="absolute inset-y-0 -left-12 w-10 -skew-x-12 bg-gradient-to-r from-transparent via-white/18 to-transparent transition-all duration-500 group-hover:left-[110%]" />
                <span className="grid size-8 place-items-center rounded-lg bg-accent-500/16 text-accent-200">{adding ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={16} />}</span>
                <span className="min-w-0 flex-1"><strong className="block text-xs text-white">{adding ? "Mock OAuth in progress..." : "Add Account (+)"}</strong><small className="text-[10px] text-ink-500">Adds a safe developer-session account</small></span>
                {!adding && <Sparkles size={14} className="text-accent-300" />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountRow({ account, active = false, onSelect }: { account: LauncherAccount; active?: boolean; onSelect: (accountId: string) => void }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(account.id)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-accent-400/45 bg-accent-500/12 shadow-[inset_0_0_24px_rgb(123_44_191_/_0.08),0_0_20px_rgb(123_44_191_/_0.12)]" : "border-transparent hover:border-white/9 hover:bg-white/[0.04]"}`}
    >
      <AccountAvatar account={account} size={40} className="size-10 rounded-xl ring-1 ring-white/10 transition group-hover:ring-accent-400/35" />
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{account.username}</strong><small className={account.kind === "microsoft" ? "text-success-400" : account.kind === "offline" ? "text-amber-300" : "text-ink-500"}>{account.kind === "microsoft" ? "Microsoft verified" : account.kind === "developer" ? "Developer sandbox" : account.kind === "offline" ? "Offline singleplayer" : "Mock OAuth session"}</small></span>
      {active ? <span className="grid size-7 place-items-center rounded-full bg-accent-500 text-white shadow-[0_0_16px_rgb(123_44_191_/_0.55)]"><Check size={13} strokeWidth={3} /></span> : <ChevronDown size={13} className="-rotate-90 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />}
    </button>
  );
}

function AccountAvatar({ account, size, className }: { account: LauncherAccount; size: number; className: string }) {
  return account.kind === "offline"
    ? <OfflineShadowAvatar size={size} className={className} />
    : <MinecraftAvatar username={account.username} size={size} className={className} />;
}

function MicrosoftMark() {
  return (
    <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f35325]" /><span className="bg-[#81bc06]" /><span className="bg-[#05a6f0]" /><span className="bg-[#ffba08]" />
    </span>
  );
}
