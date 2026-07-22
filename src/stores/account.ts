import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type {
  DeviceCodeInfo,
  MinecraftProfile,
  MicrosoftAccountSnapshot,
  MicrosoftAccountStatus,
} from "@/types";

export type AccountMode = "signedOut" | "microsoft";
export type LauncherAccountKind = "microsoft";

export interface LauncherAccount {
  id: string;
  username: string;
  uuid: string;
  isActive: boolean;
  stored: boolean;
  status: MicrosoftAccountStatus;
  kind: LauncherAccountKind;
}

interface AccountState {
  mode: AccountMode;
  /** Public metadata mirrored from the native DPAPI account vault. */
  accounts: LauncherAccount[];
  profile: MinecraftProfile | null;
  pending: DeviceCodeInfo | null;
  codeCopied: boolean;
  copyError: string | null;
  browserError: string | null;
  error: string | null;
  restoring: boolean;
  switchingAccountId: string | null;
  removingAccountId: string | null;
  restoreSession: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  login: () => Promise<void>;
  activateAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  copyDeviceCode: () => Promise<void>;
  reopenVerificationPage: () => Promise<void>;
  clearError: () => void;
}

function accountStateFromSnapshot(snapshot: MicrosoftAccountSnapshot) {
  const accounts: LauncherAccount[] = snapshot.accounts.map((account) => ({
    ...account,
    kind: "microsoft",
  }));
  const active = accounts.find((account) => account.id === snapshot.activeAccountId && account.isActive);
  return {
    accounts,
    profile: active ? { uuid: active.uuid, name: active.username } : null,
    mode: active ? "microsoft" as const : "signedOut" as const,
  };
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard write was rejected");
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Verified Microsoft device-code authentication. Refresh and Minecraft access
 * tokens never enter JavaScript; the native DPAPI vault is the only source of
 * truth for saved identities and account activation.
 */
export const useAccountStore = create<AccountState>((set, get) => ({
  mode: "signedOut",
  accounts: [],
  profile: null,
  pending: null,
  codeCopied: false,
  copyError: null,
  browserError: null,
  error: null,
  restoring: false,
  switchingAccountId: null,
  removingAccountId: null,

  restoreSession: async () => {
    if (get().restoring || !isTauri()) {
      if (!isTauri()) {
        set({ error: "Microsoft accounts require the packaged Void Launcher." });
      }
      return;
    }
    set({ restoring: true, error: null });
    let restoreError: string | null = null;
    try {
      await api.restoreMicrosoftSession();
    } catch (error) {
      // A temporary network failure must not erase or hide the saved account.
      restoreError = errorMessage(error);
    }
    try {
      const snapshot = await api.listMicrosoftAccounts();
      set({ ...accountStateFromSnapshot(snapshot), restoring: false, error: restoreError });
    } catch (error) {
      set({
        mode: "signedOut",
        profile: null,
        restoring: false,
        error: restoreError ?? errorMessage(error),
      });
    }
  },

  refreshAccounts: async () => {
    if (!isTauri()) return;
    const snapshot = await api.listMicrosoftAccounts();
    set({ ...accountStateFromSnapshot(snapshot), error: null });
  },

  login: async () => {
    if (!isTauri()) {
      set({
        pending: null,
        codeCopied: false,
        copyError: null,
        browserError: null,
        error: "Microsoft sign-in requires the packaged Void Launcher.",
      });
      return;
    }
    if (get().pending) return;
    set({ error: null, copyError: null, browserError: null, codeCopied: false });
    try {
      const pending = await api.beginMicrosoftLogin();
      set({ pending, copyError: null, browserError: null, codeCopied: false });
      await get().copyDeviceCode();
      try {
        await openUrl(pending.verificationUri);
      } catch (error) {
        set({ browserError: `The browser could not be opened: ${errorMessage(error)}` });
      }
      await api.completeMicrosoftLogin(pending.deviceCode);
      const snapshot = await api.listMicrosoftAccounts();
      set({
        ...accountStateFromSnapshot(snapshot),
        pending: null,
        codeCopied: false,
        copyError: null,
        browserError: null,
        error: null,
      });
    } catch (error) {
      set({ pending: null, codeCopied: false, error: errorMessage(error) });
    }
  },

  activateAccount: async (accountId) => {
    const account = get().accounts.find((candidate) => candidate.id === accountId);
    if (!account || account.isActive || get().switchingAccountId) return;
    if (account.status === "reauth-required") {
      await get().login();
      return;
    }
    set({ switchingAccountId: accountId, error: null });
    try {
      await api.activateMicrosoftAccount(accountId);
      const snapshot = await api.listMicrosoftAccounts();
      set({ ...accountStateFromSnapshot(snapshot), switchingAccountId: null, error: null });
    } catch (error) {
      set({ switchingAccountId: null, error: errorMessage(error) });
    }
  },

  removeAccount: async (accountId) => {
    if (get().removingAccountId) return;
    set({ removingAccountId: accountId, error: null });
    try {
      const snapshot = await api.removeMicrosoftAccount(accountId);
      set({ ...accountStateFromSnapshot(snapshot), removingAccountId: null, error: null });
    } catch (error) {
      set({ removingAccountId: null, error: errorMessage(error) });
    }
  },

  copyDeviceCode: async () => {
    const code = get().pending?.userCode;
    if (!code) return;
    try {
      await copyText(code);
      set({ codeCopied: true, copyError: null });
    } catch {
      set({
        codeCopied: false,
        copyError: "Could not copy the code. Select it manually and press Ctrl+C.",
      });
    }
  },

  reopenVerificationPage: async () => {
    const verificationUri = get().pending?.verificationUri;
    if (!verificationUri) return;
    try {
      await openUrl(verificationUri);
      set({ browserError: null });
    } catch (error) {
      set({ browserError: `The browser could not be opened: ${errorMessage(error)}` });
    }
  },

  clearError: () => set({ error: null, copyError: null, browserError: null }),
}));
