import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import { CLIENT_COPY } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { AuthenticationPersistence } from "../../../types";
import { voidClientStyles } from "../void-client.styles";

export function AccountDropdown() {
  const [open, setOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const accounts = useAccountStore((state) => state.accounts);
  const profile = useAccountStore((state) => state.profile);
  const pending = useAccountStore((state) => state.pending);
  const error = useAccountStore((state) => state.error);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);
  const language = useVoidClientStore((state) => state.language);
  const copy = CLIENT_COPY[language];

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
                <p className={voidClientStyles.sectionKicker}>Microsoft account</p>
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
              <button type="button" onClick={() => { setOpen(false); setSecurityOpen(true); }} className={`mt-2 w-full ${voidClientStyles.secondaryButton}`}><ShadowGlyph name="shield" size={15} />{copy.sessionSecurity}</button>
              {error && <p role="alert" className="mt-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[10px] leading-4 text-red-300">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{securityOpen && <SessionSecurityDialog onClose={() => setSecurityOpen(false)} />}</AnimatePresence>
    </div>
  );
}

const SESSION_OPTIONS: ReadonlyArray<{ value: AuthenticationPersistence; label: string; description: string }> = [
  { value: "one-week", label: "1 Week", description: "Ask again after seven days." },
  { value: "two-weeks", label: "2 Weeks", description: "Balanced security for a personal PC." },
  { value: "one-month", label: "1 Month", description: "Keep the encrypted refresh session for thirty days." },
  { value: "always-ask", label: "Always Ask", description: "Never keep a Microsoft refresh session on disk." },
];

function SessionSecurityDialog({ onClose }: { onClose: () => void }) {
  const persistence = useVoidClientStore((state) => state.authPersistence);
  const setPersistence = useVoidClientStore((state) => state.setAuthPersistence);
  const [selected, setSelected] = useState<AuthenticationPersistence>(persistence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const status = await api.setAuthPersistence(selected);
      setPersistence(status.authPersistence);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }, [onClose, selected, setPersistence]);

  return (
    <motion.div className="fixed inset-0 z-[500] grid place-items-center bg-black/75 p-5 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="session-security-title" onMouseDown={(event) => event.stopPropagation()} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} className="w-full max-w-lg border border-[#9d5ce0]/34 bg-[#050505]/98 p-6 shadow-[0_38px_120px_rgba(0,0,0,.9),0_0_60px_rgba(123,44,191,.18)] [clip-path:polygon(0_0,95%_0,100%_9%,100%_100%,5%_100%,0_91%)]">
        <div className="flex items-start justify-between gap-4"><span className="grid size-12 place-items-center border border-[#9d5ce0]/30 bg-[#7B2CBF]/12 text-[#d8b4fe]"><ShadowGlyph name="shield" size={22} /></span><button type="button" onClick={onClose} aria-label="Close" className={`grid size-11 cursor-pointer place-items-center text-[#95899f] transition hover:bg-white/[0.05] hover:text-white ${voidClientStyles.focusRing}`}><ShadowGlyph name="close" size={15} /></button></div>
        <h2 id="session-security-title" className="font-display mt-5 text-xl font-black">Authentication Persistence</h2>
        <p className="mt-2 text-xs leading-5 text-[#a79bad]">Choose how long Void Launcher may reuse your Microsoft session. The refresh token is encrypted with Windows DPAPI and cannot be decrypted by another Windows user.</p>
        <div className="mt-5 space-y-2">{SESSION_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setSelected(option.value)} aria-pressed={selected === option.value} className={`flex min-h-16 w-full cursor-pointer items-center gap-3 border p-3 text-left transition ${selected === option.value ? "border-[#c084fc]/55 bg-[#7B2CBF]/16 shadow-[0_0_24px_rgba(123,44,191,.15)]" : "border-white/[0.075] bg-black/20 hover:border-white/[0.16]"} ${voidClientStyles.focusRing}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected === option.value ? "border-[#d8b4fe] bg-[#7B2CBF]" : "border-[#655a70]"}`}>{selected === option.value && <span className="size-1.5 rounded-full bg-white" />}</span><span><strong className="block text-xs text-white">{option.label}</strong><small className="mt-1 block text-[10px] leading-4 text-[#95899f]">{option.description}</small></span></button>)}</div>
        {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onClose} className={voidClientStyles.secondaryButton}>Cancel</button><button type="button" onClick={() => void save()} disabled={saving} className={voidClientStyles.primaryButton}><ShadowGlyph name={saving ? "spark" : "check"} size={15} />{saving ? "Saving…" : "Save Session Policy"}</button></div>
      </motion.section>
    </motion.div>
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
