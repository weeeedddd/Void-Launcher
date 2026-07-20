import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAccountStore } from "@/stores/account";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { voidClientStyles } from "../void-client.styles";

const OFFLINE_NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export function AccountDropdown() {
  const [open, setOpen] = useState(false);
  const [offlineName, setOfflineName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const accounts = useAccountStore((state) => state.accounts);
  const profile = useAccountStore((state) => state.profile);
  const mode = useAccountStore((state) => state.mode);
  const pending = useAccountStore((state) => state.pending);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);
  const addOfflineAccount = useAccountStore((state) => state.addOfflineAccount);
  const active = accounts.find((account) => account.isActive) ?? null;

  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
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

  const selectAccount = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const account = accounts.find((candidate) => candidate.id === event.currentTarget.value);
    if (!account) return;
    if (account.kind === "microsoft" && !account.isActive) {
      void login();
      return;
    }
    activateAccount(account.id);
    close();
  }, [accounts, activateAccount, close, login]);

  const addOffline = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = offlineName.trim();
    if (!OFFLINE_NAME_PATTERN.test(username)) {
      setValidationError("Use 3–16 letters, numbers or underscores.");
      return;
    }
    const account = addOfflineAccount(username);
    if (!account) {
      setValidationError("The offline account could not be created.");
      return;
    }
    setOfflineName("");
    setValidationError(null);
    close();
  }, [addOfflineAccount, close, offlineName]);

  const changeOfflineName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setOfflineName(event.target.value.slice(0, 16));
    setValidationError(null);
  }, []);

  const addMicrosoft = useCallback(() => {
    void login();
  }, [login]);

  const activeLabel = profile?.name ?? "Sign in";
  const activeKind = active?.kind ?? (mode === "offline" ? "offline" : "microsoft");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex min-w-52 cursor-pointer items-center gap-2.5 rounded-2xl border border-white/[0.085] bg-black/25 p-1.5 pr-3 text-left transition hover:border-[#7B2CBF]/40 hover:bg-[#7B2CBF]/8 ${voidClientStyles.focusRing}`}
      >
        <AccountAvatar username={activeLabel} offline={activeKind === "offline"} size="large" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-white">{activeLabel}</span>
          <span className={`block text-[8px] font-black tracking-[0.12em] uppercase ${activeKind === "offline" ? "text-amber-300" : profile ? "text-[#4cff9a]" : "text-[#776c82]"}`}>
            {activeKind === "offline" ? "Offline identity" : profile ? "Microsoft verified" : "Authentication required"}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-[#776c82]">
          <ShadowGlyph name="chevronDown" size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[calc(100%+10px)] right-0 z-[90] w-[340px] overflow-hidden rounded-3xl border border-[#8f48cf]/28 bg-[radial-gradient(circle_at_90%_0%,rgba(123,44,191,0.25),transparent_35%),rgba(10,7,14,0.96)] p-2.5 shadow-[0_34px_100px_rgba(0,0,0,0.72),0_0_50px_rgba(123,44,191,0.14)] backdrop-blur-3xl"
          >
            <div className="px-2.5 py-2">
              <p className={voidClientStyles.sectionKicker}>Identity vault</p>
              <p className="mt-1 text-[10px] leading-4 text-[#776c82]">Online identities re-authenticate before their native session changes.</p>
            </div>

            <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  role="menuitem"
                  value={account.id}
                  onClick={selectAccount}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${voidClientStyles.focusRing} ${account.isActive ? "border-[#a855f7]/50 bg-[#7B2CBF]/16 shadow-[0_0_24px_rgba(123,44,191,0.15)]" : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]"}`}
                >
                  <AccountAvatar username={account.username} offline={account.kind === "offline"} />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-white">{account.username}</strong>
                    <small className={account.kind === "offline" ? "text-amber-300/75" : "text-[#8d8198]"}>{account.kind === "offline" ? "Singleplayer simulation" : account.isActive ? "Native session active" : "Re-authenticate to switch"}</small>
                  </span>
                  {account.isActive && <ShadowGlyph name="check" size={15} className="text-[#d8b4fe] filter drop-shadow-[0_0_7px_currentColor]" />}
                </button>
              ))}
              {accounts.length === 0 && <p className="px-3 py-5 text-center text-xs text-[#776c82]">No stored identities yet.</p>}
            </div>

            <button type="button" onClick={addMicrosoft} disabled={Boolean(pending)} className={`mt-2 w-full ${voidClientStyles.secondaryButton}`}>
              <ShadowGlyph name="account" size={15} /> {pending ? "Waiting for Microsoft…" : "Add Microsoft Account"}
            </button>

            <form onSubmit={addOffline} className="mt-2 rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-3">
              <label htmlFor="void-offline-name" className="flex items-center gap-2 text-[9px] font-black tracking-[0.13em] text-amber-200/85 uppercase">
                <ShadowGlyph name="offline" size={13} /> Add Offline Account
              </label>
              <div className="mt-2 flex gap-2">
                <input id="void-offline-name" value={offlineName} onChange={changeOfflineName} className={`${voidClientStyles.input} h-10 min-w-0`} placeholder="Shadow_Guest" autoComplete="off" />
                <button type="submit" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200 transition hover:bg-amber-300/18 focus-visible:outline-2 focus-visible:outline-amber-300" aria-label="Add offline account">
                  <ShadowGlyph name="addFriend" size={16} />
                </button>
              </div>
              {validationError && <p role="alert" className="mt-2 text-[10px] text-red-300">{validationError}</p>}
              <p className="mt-2 text-[9px] leading-4 text-amber-100/45">Local UI simulation only. It never bypasses Minecraft ownership.</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountAvatar({ username, offline, size = "small" }: { username: string; offline: boolean; size?: "small" | "large" }) {
  const [failed, setFailed] = useState(false);
  const dimensionClass = size === "large" ? "size-10 rounded-xl" : "size-9 rounded-xl";

  useEffect(() => setFailed(false), [username]);
  const markFailed = useCallback(() => setFailed(true), []);

  if (offline || failed) {
    return (
      <span className={`grid shrink-0 place-items-center border border-[#8f48cf]/28 bg-[radial-gradient(circle,#321445,#0a0710_72%)] text-[#c796ff] ${dimensionClass}`}>
        <ShadowGlyph name="offline" size={size === "large" ? 20 : 18} className="filter drop-shadow-[0_0_8px_currentColor]" />
      </span>
    );
  }

  return <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/40`} alt={`${username} Minecraft avatar`} onError={markFailed} className={`shrink-0 border border-white/10 bg-[#110D17] object-cover [image-rendering:pixelated] ${dimensionClass}`} />;
}
