import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type { DeviceCodeInfo, MinecraftProfile } from "@/types";

export type AccountMode = "signedOut" | "microsoft";
export type LauncherAccountKind = "microsoft";

export interface LauncherAccount {
  id: string;
  username: string;
  uuid: string;
  isActive: boolean;
  kind: LauncherAccountKind;
}

interface AccountState {
  mode: AccountMode;
  /** Public, session-only metadata. OAuth and Minecraft tokens remain native-only. */
  accounts: LauncherAccount[];
  profile: MinecraftProfile | null;
  pending: DeviceCodeInfo | null;
  codeCopied: boolean;
  copyError: string | null;
  error: string | null;
  login: () => Promise<void>;
  activateAccount: (accountId: string) => void;
  copyDeviceCode: () => Promise<void>;
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

/**
 * Verified Microsoft device-code authentication. Sensitive tokens never enter
 * React and are retained only by the native Rust authentication boundary.
 */
export const useAccountStore = create<AccountState>((set, get) => ({
  mode: "signedOut",
  accounts: [],
  profile: null,
  pending: null,
  codeCopied: false,
  copyError: null,
  error: null,

  login: async () => {
    set({ error: null, copyError: null, codeCopied: false });
    try {
      const pending = await api.beginMicrosoftLogin();
      set({ pending, copyError: null, codeCopied: false });
      await get().copyDeviceCode();
      await openUrl(pending.verificationUri);
      const profile = await api.completeMicrosoftLogin(pending.deviceCode);
      set((state) => {
        const account: LauncherAccount = {
          id: `msa-${profile.uuid}`,
          username: profile.name,
          uuid: profile.uuid,
          isActive: true,
          kind: "microsoft",
        };
        const accounts = state.accounts
          .filter((candidate) => candidate.id !== account.id)
          .map((candidate) => ({ ...candidate, isActive: false }));
        return {
          mode: "microsoft",
          profile,
          accounts: [account, ...accounts],
          pending: null,
          codeCopied: false,
          copyError: null,
          error: null,
        };
      });
    } catch (error) {
      set({ pending: null, codeCopied: false, copyError: null, error: String(error) });
    }
  },

  activateAccount: (accountId) => {
    const account = get().accounts.find((candidate) => candidate.id === accountId);
    if (!account) return;

    // The native token vault currently owns one live Microsoft session. A
    // stored secondary identity therefore re-enters OAuth before activation.
    if (!account.isActive) {
      void get().login();
      return;
    }

    set({
      accounts: get().accounts.map((candidate) => ({ ...candidate, isActive: candidate.id === accountId })),
      profile: { uuid: account.uuid, name: account.username },
      mode: "microsoft",
      error: null,
    });
  },

  copyDeviceCode: async () => {
    const code = get().pending?.userCode;
    if (!code) return;
    try {
      await copyText(code);
      set({ codeCopied: true, copyError: null });
    } catch {
      set({ codeCopied: false, copyError: "Could not copy the code. Select it manually and press Ctrl+C." });
    }
  },
}));
