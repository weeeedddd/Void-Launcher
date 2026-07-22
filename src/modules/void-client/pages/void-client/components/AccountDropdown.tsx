import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { useAccountStore } from "@/stores/account";
import { CLIENT_COPY } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { AuthenticationPersistence } from "../../../types";
import { voidClientStyles } from "../void-client.styles";

export function AccountDropdown() {
  const nativeRuntime = isTauri();
  const [open, setOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const accounts = useAccountStore((state) => state.accounts);
  const profile = useAccountStore((state) => state.profile);
  const pending = useAccountStore((state) => state.pending);
  const codeCopied = useAccountStore((state) => state.codeCopied);
  const copyError = useAccountStore((state) => state.copyError);
  const browserError = useAccountStore((state) => state.browserError);
  const error = useAccountStore((state) => state.error);
  const switchingAccountId = useAccountStore((state) => state.switchingAccountId);
  const removingAccountId = useAccountStore((state) => state.removingAccountId);
  const login = useAccountStore((state) => state.login);
  const activateAccount = useAccountStore((state) => state.activateAccount);
  const removeAccount = useAccountStore((state) => state.removeAccount);
  const copyDeviceCode = useAccountStore((state) => state.copyDeviceCode);
  const reopenVerificationPage = useAccountStore((state) => state.reopenVerificationPage);
  const language = useVoidClientStore((state) => state.language);
  const copy = CLIENT_COPY[language];

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const addMicrosoft = useCallback(() => void login(), [login]);
  const selectAccount = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    void activateAccount(event.currentTarget.value);
  }, [activateAccount]);
  const deleteAccount = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const account = accounts.find((candidate) => candidate.id === event.currentTarget.value);
    if (!account) return;
    if (window.confirm(`Remove ${account.username} from this Windows account? You can add it again with Microsoft sign-in.`)) {
      void removeAccount(account.id);
    }
  }, [accounts, removeAccount]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
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
    <div ref={rootRef} className="relative z-[200]">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-11 min-w-48 cursor-pointer items-center gap-2 rounded-lg border border-[#29292F] bg-[#151518] px-2 text-left transition-colors duration-150 hover:border-[#46464F] hover:bg-[#202026] ${voidClientStyles.focusRing}`}
      >
        <AccountAvatar username={activeLabel} signedIn={Boolean(profile)} size="large" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#F4F4F5]">{activeLabel}</span>
          <span className="block truncate text-xs text-[#92929B]">
            {profile ? "Microsoft verified" : "Authentication required"}
          </span>
        </span>
        <span className={`text-[#92929B] transition-transform duration-150 ${open ? "rotate-180" : "rotate-0"}`}>
          <ShadowGlyph name="chevronDown" size={14} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Microsoft accounts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            className="absolute top-[calc(100%+8px)] right-0 z-[250] w-[min(360px,calc(100vw-24px))] rounded-xl border border-[#34343A] bg-[#151518] p-3 shadow-2xl shadow-black/50"
          >
            <div className="border-b border-[#29292F] px-1 pb-3">
              <p className="text-sm font-semibold text-[#F4F4F5]">Microsoft account</p>
              <p className="mt-1 text-xs leading-5 text-[#92929B]">Verified accounts are required to launch Minecraft.</p>
            </div>

            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {accounts.map((account) => {
                const switching = switchingAccountId === account.id;
                const removing = removingAccountId === account.id;
                const status = account.isActive
                  ? "Active native session"
                  : account.status === "available"
                    ? "Ready · encrypted by Windows"
                    : "Microsoft sign-in required";
                return (
                  <div
                    key={account.id}
                    className={`flex min-h-14 items-center rounded-lg border ${account.isActive ? "border-[#7E22CE] bg-[#21152B] text-white" : "border-[#29292F] bg-[#111114]"}`}
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={account.isActive}
                      value={account.id}
                      onClick={selectAccount}
                      disabled={account.isActive || switching || removing}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-l-lg p-2 text-left transition-colors duration-150 disabled:cursor-default ${voidClientStyles.focusRing} ${account.isActive ? "" : "hover:bg-[#202026]"}`}
                    >
                      <AccountAvatar username={account.username} signedIn />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold">{account.username}</strong>
                        <small className={account.isActive ? "text-[#E9D5FF]" : "text-[#92929B]"}>
                          {switching ? "Refreshing secure session..." : status}
                        </small>
                      </span>
                      {account.isActive && <ShadowGlyph name="check" size={15} />}
                    </button>
                    <button
                      type="button"
                      value={account.id}
                      onClick={deleteAccount}
                      disabled={switching || removing}
                      aria-label={`Remove ${account.username}`}
                      title={`Remove ${account.username}`}
                      className={`mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#34343A] text-[#92929B] transition-colors hover:border-[#991B1B] hover:bg-[#7F1D1D] hover:text-white disabled:cursor-wait disabled:opacity-50 ${voidClientStyles.focusRing}`}
                    >
                      <ShadowGlyph name={removing ? "spark" : "close"} size={13} />
                    </button>
                  </div>
                );
              })}

              {accounts.length === 0 && (
                <div className="rounded-lg border border-[#29292F] bg-[#111114] px-4 py-5 text-center">
                  <ShadowGlyph name="account" size={22} className="mx-auto text-[#92929B]" />
                  <p className="mt-2 text-sm font-semibold text-[#F4F4F5]">No verified account</p>
                  <p className="mt-1 text-xs text-[#92929B]">Sign in with Microsoft to enable launch.</p>
                </div>
              )}
            </div>

            {pending && (
              <div className="mt-3 rounded-lg border border-[#7E22CE] bg-[#21152B] p-3" aria-live="polite">
                <p className="text-xs font-semibold text-[#D4D4D4]">Enter this code on Microsoft</p>
                <button
                  type="button"
                  onClick={() => void copyDeviceCode()}
                  className={`mt-2 flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#4A295E] bg-[#151518] px-3 py-2 ${voidClientStyles.focusRing}`}
                  title="Copy device code"
                >
                  <code className="select-all text-lg font-bold tracking-[0.18em] text-white">{pending.userCode}</code>
                  <span className="text-xs text-[#C4B5FD]">{codeCopied ? "Copied" : "Copy"}</span>
                </button>
                <button type="button" onClick={() => void reopenVerificationPage()} className={`mt-2 w-full ${voidClientStyles.secondaryButton}`}>
                  Open Microsoft sign-in again
                </button>
                {(copyError || browserError) && (
                  <p role="alert" className="mt-2 text-xs leading-4 text-[#FCA5A5]">{copyError ?? browserError}</p>
                )}
              </div>
            )}

            <button type="button" onClick={addMicrosoft} disabled={!nativeRuntime || Boolean(pending)} className={`mt-3 w-full ${voidClientStyles.primaryButton}`}>
              <MicrosoftMark />
              {!nativeRuntime ? "Packaged launcher required" : pending ? "Waiting for Microsoft..." : accounts.length ? "Add Microsoft account" : "Sign in with Microsoft"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSecurityOpen(true);
              }}
              disabled={!nativeRuntime}
              className={`mt-2 w-full ${voidClientStyles.secondaryButton}`}
            >
              <ShadowGlyph name="shield" size={15} />
              {copy.sessionSecurity}
            </button>
            {error && (
              <p role="alert" className="mt-2 rounded-none border border-[#333333] bg-[#2A1515] px-3 py-2 text-xs leading-4 text-[#FCA5A5]">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {securityOpen && <SessionSecurityDialog onClose={() => setSecurityOpen(false)} />}
      </AnimatePresence>
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
  const refreshAccounts = useAccountStore((state) => state.refreshAccounts);
  const [selected, setSelected] = useState<AuthenticationPersistence>(persistence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const status = await api.setAuthPersistence(selected);
      setPersistence(status.authPersistence);
      await refreshAccounts();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }, [onClose, refreshAccounts, selected, setPersistence]);

  return (
    <motion.div
      className="fixed inset-0 z-[500] grid place-items-center bg-black/80 p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
      onMouseDown={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-security-title"
        onMouseDown={(event) => event.stopPropagation()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.15 }}
        className="w-full max-w-lg rounded-xl border border-[#34343A] bg-[#151518] p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="session-security-title" className="text-xl font-semibold text-[#F4F4F5]">Authentication persistence</h2>
            <p className="mt-2 text-sm leading-6 text-[#92929B]">Choose how long Void Launcher may reuse the Microsoft session encrypted by Windows.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={voidClientStyles.iconButton}>
            <ShadowGlyph name="close" size={15} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {SESSION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              aria-pressed={selected === option.value}
              className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-150 ${voidClientStyles.focusRing} ${selected === option.value ? "border-[#7E22CE] bg-[#21152B] text-white" : "border-[#29292F] bg-[#111114] hover:border-[#46464F] hover:bg-[#202026]"}`}
            >
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${selected === option.value ? "border-[#A855F7] bg-[#7E22CE] text-white" : "border-[#34343A] bg-[#1A1A1F] text-transparent"}`}>
                <ShadowGlyph name="check" size={12} />
              </span>
              <span>
                <strong className="block text-sm font-semibold">{option.label}</strong>
                <small className={`mt-1 block text-xs leading-5 ${selected === option.value ? "text-[#E9D5FF]" : "text-[#92929B]"}`}>{option.description}</small>
              </span>
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-[#FCA5A5]">{error}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className={voidClientStyles.secondaryButton}>Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving} className={voidClientStyles.primaryButton}>
            <ShadowGlyph name={saving ? "spark" : "check"} size={15} />
            {saving ? "Saving..." : "Save session policy"}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

function AccountAvatar({ username, signedIn, size = "small" }: { username: string; signedIn: boolean; size?: "small" | "large" }) {
  const [failed, setFailed] = useState(false);
  const dimension = size === "large" ? "size-8" : "size-10";

  useEffect(() => setFailed(false), [username]);

  if (!signedIn || failed) {
    return (
      <span className={`${dimension} grid shrink-0 place-items-center rounded-lg border border-[#34343A] bg-[#111114] text-[#D4D4D8]`}>
        <ShadowGlyph name="account" size={size === "large" ? 16 : 18} />
      </span>
    );
  }

  return (
    <img
      src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/40`}
      alt={`${username} Minecraft avatar`}
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className={`${dimension} shrink-0 rounded-lg border border-[#34343A] bg-[#111114] object-cover [image-rendering:pixelated]`}
    />
  );
}

function MicrosoftMark() {
  return (
    <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f35325]" />
      <span className="bg-[#81bc06]" />
      <span className="bg-[#05a6f0]" />
      <span className="bg-[#ffba08]" />
    </span>
  );
}
