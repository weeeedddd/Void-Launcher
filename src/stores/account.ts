import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type { DeviceCodeInfo, MinecraftProfile } from "@/types";

export type AccountMode = "signedOut" | "microsoft" | "developer" | "offline";
export type LauncherAccountKind = "microsoft" | "developer" | "mock" | "offline";

export interface LauncherAccount {
  id: string;
  username: string;
  uuid: string;
  isActive: boolean;
  kind: LauncherAccountKind;
}

interface AccountState {
  /** Developer mode is UI-only and can never authorize a real game launch. */
  mode: AccountMode;
  /** Public, session-only account metadata. OAuth tokens remain native-only. */
  accounts: LauncherAccount[];
  /** Signed-in player, or null. The MC access token stays on the Rust side. */
  profile: MinecraftProfile | null;
  /** Device-code info while a browser login is in progress. */
  pending: DeviceCodeInfo | null;
  /** True after the current device code was copied to the system clipboard. */
  codeCopied: boolean;
  /** Clipboard failure is separate from the Microsoft authentication error. */
  copyError: string | null;
  error: string | null;
  login: () => Promise<void>;
  enableDeveloperMode: () => void;
  enableOfflineMode: () => void;
  disableDeveloperMode: () => void;
  activateAccount: (accountId: string) => void;
  addMockAccount: () => LauncherAccount;
  addOfflineAccount: (username: string) => LauncherAccount | null;
  copyDeviceCode: () => Promise<void>;
}

const DEVELOPER_PROFILE: MinecraftProfile = {
  uuid: "00000000000000000000000000000000",
  name: "VoidDeveloper",
};

const OFFLINE_PROFILE: MinecraftProfile = {
  uuid: "offline-mock-uuid",
  name: "Shadow_Guest",
};

const DEVELOPER_ACCOUNTS: LauncherAccount[] = [
  { id: "dev-void", username: "VoidDeveloper", uuid: DEVELOPER_PROFILE.uuid, isActive: true, kind: "developer" },
  { id: "dev-dark-knight", username: "DarkKnight_AT", uuid: "10000000000000000000000000000001", isActive: false, kind: "mock" },
  { id: "dev-kitten-slayer", username: "KittenSlayer99", uuid: "10000000000000000000000000000002", isActive: false, kind: "mock" },
];

const MOCK_ACCOUNT_NAMES = ["ShadowPulse_7", "AbyssWalker_13", "NightReign47", "VioletKitsune"] as const;

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    throw new Error("Clipboard API unavailable");
  } catch {
    // Tauri's WebView can deny navigator.clipboard in some environments.
    // Keep a small legacy fallback so the manual Copy code button still works.
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
 * Microsoft sign-in via the OAuth2 *device code* flow:
 *  1. Rust requests a short code from Microsoft.
 *  2. We open microsoft.com/link in the system browser and show the code.
 *  3. Rust polls until the user approved, then runs the Xbox Live → XSTS →
 *     Minecraft token chain and returns only the public profile.
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

      // Copy immediately when the code arrives, before opening the browser.
      // The button below remains available if the host denies clipboard access.
      await get().copyDeviceCode();

      // Open the verification page in the user's default browser.
      // (Requires the `opener` plugin, see src-tauri/capabilities/default.json)
      await openUrl(pending.verificationUri);

      // Resolves once the user finished signing in (or the code expired).
      const profile = await api.completeMicrosoftLogin(pending.deviceCode);
      set((state) => {
        const microsoftAccount: LauncherAccount = {
          id: `msa-${profile.uuid}`,
          username: profile.name,
          uuid: profile.uuid,
          isActive: true,
          kind: "microsoft",
        };
        const accounts = state.accounts
          .filter((account) => account.id !== microsoftAccount.id)
          .map((account) => ({ ...account, isActive: false }));
        return { mode: "microsoft", profile, accounts: [microsoftAccount, ...accounts], pending: null };
      });
    } catch (e) {
      set({ pending: null, codeCopied: false, copyError: null, error: String(e) });
    }
  },

  enableDeveloperMode: () => set({
    mode: "developer",
    accounts: DEVELOPER_ACCOUNTS.map((account) => ({ ...account })),
    profile: DEVELOPER_PROFILE,
    pending: null,
    codeCopied: false,
    copyError: null,
    error: null,
  }),

  enableOfflineMode: () => {
    const offlineAccount: LauncherAccount = {
      id: "offline-shadow-guest",
      username: OFFLINE_PROFILE.name,
      uuid: OFFLINE_PROFILE.uuid,
      isActive: true,
      kind: "offline",
    };
    set({
      mode: "offline",
      accounts: [offlineAccount],
      profile: OFFLINE_PROFILE,
      pending: null,
      codeCopied: false,
      copyError: null,
      error: null,
    });
  },

  disableDeveloperMode: () => set({
    mode: "signedOut",
    accounts: [],
    profile: null,
    pending: null,
    codeCopied: false,
    copyError: null,
    error: null,
  }),

  activateAccount: (accountId) => set((state) => {
    const account = state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return state;
    return {
      accounts: state.accounts.map((candidate) => ({ ...candidate, isActive: candidate.id === accountId })),
      profile: { uuid: account.uuid, name: account.username },
      mode: account.kind === "microsoft" ? "microsoft" : account.kind === "offline" ? "offline" : "developer",
      error: null,
    };
  }),

  addMockAccount: () => {
    const state = get();
    const availableName = MOCK_ACCOUNT_NAMES.find((name) => !state.accounts.some((account) => account.username === name));
    const username = availableName ?? `ShadowAgent_${state.accounts.length + 1}`;
    const account: LauncherAccount = {
      id: `mock-${crypto.randomUUID()}`,
      username,
      uuid: crypto.randomUUID().replaceAll("-", ""),
      isActive: true,
      kind: "mock",
    };
    set({
      accounts: [...state.accounts.map((candidate) => ({ ...candidate, isActive: false })), account],
      profile: { uuid: account.uuid, name: account.username },
      mode: "developer",
      error: null,
    });
    return account;
  },

  addOfflineAccount: (rawUsername) => {
    const username = rawUsername.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return null;
    const state = get();
    const existing = state.accounts.find((account) => account.kind === "offline" && account.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      get().activateAccount(existing.id);
      return existing;
    }
    const account: LauncherAccount = {
      id: `offline-${crypto.randomUUID()}`,
      username,
      uuid: `offline-${crypto.randomUUID()}`,
      isActive: true,
      kind: "offline",
    };
    set({
      accounts: [...state.accounts.map((candidate) => ({ ...candidate, isActive: false })), account],
      profile: { uuid: account.uuid, name: account.username },
      mode: "offline",
      error: null,
    });
    return account;
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
