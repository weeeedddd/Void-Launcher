import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAccountStore } from "@/stores/account";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

export function AccountDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const accounts = useAccountStore((state) => state.accounts);
  const profile = useAccountStore((state) => state.profile);
  const pending = useAccountStore((state) => state.pending);
  const error = useAccountStore((state) => state.error);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);

  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  const addMicrosoft = useCallback(() => void login(), [login]);
  const selectAccount = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    activateAccount(event.currentTarget.value);
    close();
  }, [activateAccount, close]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  const activeLabel = profile?.name ?? "Sign in";

  return (
    <div ref={rootRef} className="relative z-[200] isolate">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex min-h-11 min-w-52 cursor-pointer items-center gap-2.5 rounded-2xl border border-white/[0.085] bg-[#050505]/80 p-1.5 pr-3 text-left backdrop-blur-xl transition hover:border-[#7B2CBF]/50 hover:bg-[#110D17] ${voidClientStyles.focusRing}`}
      >
        <AccountAvatar username={activeLabel} signedIn={Boolean(profile)} size="large" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-white">{activeLabel}</span>
          <span className={`block text-[8px] font-black tracking-[0.12em] uppercase ${profile ? "text-[#4cff9a]" : "text-[#a79bad]"}`}>
            {profile ? "Microsoft verified" : "Authentication required"}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="text-[#a79bad]">
          <ShadowGlyph name="chevronDown" size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[calc(100%+10px)] right-0 z-[250] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-[#9d5ce0]/40 bg-[#050505]/95 p-3 shadow-[0_38px_120px_rgba(0,0,0,0.9),0_0_65px_rgba(123,44,191,0.24)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(123,44,191,0.24),transparent_38%)]" />
            <div className="relative">
              <div className="px-2 py-2">
                <p className={voidClientStyles.sectionKicker}>Verified identity vault</p>
                <p className="mt-1 text-[10px] leading-4 text-[#a79bad]">Only Microsoft-authenticated Minecraft accounts can launch the client.</p>
              </div>

              <div className="mt-1 max-h-56 space-y-1 overflow-y-auto pr-0.5">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={account.isActive}
                    value={account.id}
                    onClick={selectAccount}
                    className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${voidClientStyles.focusRing} ${account.isActive ? "border-[#a855f7]/55 bg-[#7B2CBF]/18 shadow-[0_0_28px_rgba(123,44,191,0.18)]" : "border-transparent hover:border-white/[0.1] hover:bg-white/[0.045]"}`}
                  >
                    <AccountAvatar username={account.username} signedIn />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-white">{account.username}</strong>
                      <small className="text-[#a79bad]">{account.isActive ? "Native session active" : "Re-authenticate to switch"}</small>
                    </span>
                    {account.isActive && <ShadowGlyph name="check" size={15} className="text-[#d8b4fe] filter drop-shadow-[0_0_7px_currentColor]" />}
                  </button>
                ))}
                {accounts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/25 px-4 py-5 text-center">
                    <ShadowGlyph name="account" size={24} className="mx-auto text-[#725f80]" />
                    <p className="mt-2 text-xs font-bold text-white">No verified account</p>
                    <p className="mt-1 text-[10px] text-[#a79bad]">Authenticate with Microsoft to unlock launch.</p>
                  </div>
                )}
              </div>

              <button type="button" onClick={addMicrosoft} disabled={Boolean(pending)} className={`mt-3 w-full ${voidClientStyles.primaryButton}`}>
                <MicrosoftMark /> {pending ? "Waiting for Microsoft…" : accounts.length ? "Add Microsoft Account" : "Sign in with Microsoft"}
              </button>
              {error && <p role="alert" className="mt-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[10px] leading-4 text-red-300">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountAvatar({ username, signedIn, size = "small" }: { username: string; signedIn: boolean; size?: "small" | "large" }) {
  const [failed, setFailed] = useState(false);
  const dimension = size === "large" ? "size-9" : "size-10";
  useEffect(() => setFailed(false), [username]);

  if (!signedIn || failed) {
    return (
      <span className={`${dimension} grid shrink-0 place-items-center rounded-xl border border-[#9d5ce0]/25 bg-[#7B2CBF]/12 text-[#d8b4fe]`}>
        <ShadowGlyph name="account" size={size === "large" ? 18 : 20} />
      </span>
    );
  }

  return <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/40`} alt={`${username} Minecraft avatar`} width={40} height={40} onError={() => setFailed(true)} className={`${dimension} shrink-0 rounded-xl bg-[#110D17] object-cover [image-rendering:pixelated]`} />;
}

function MicrosoftMark() {
  return (
    <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f35325]" /><span className="bg-[#81bc06]" /><span className="bg-[#05a6f0]" /><span className="bg-[#ffba08]" />
    </span>
  );
}
