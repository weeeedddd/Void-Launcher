import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import type { DeviceCodeInfo, MinecraftProfile } from "@/types";

interface AccountState {
  /** Signed-in player, or null. The MC access token stays on the Rust side. */
  profile: MinecraftProfile | null;
  /** Device-code info while a browser login is in progress. */
  pending: DeviceCodeInfo | null;
  error: string | null;
  login: () => Promise<void>;
}

/**
 * Microsoft sign-in via the OAuth2 *device code* flow:
 *  1. Rust requests a short code from Microsoft.
 *  2. We open microsoft.com/link in the system browser and show the code.
 *  3. Rust polls until the user approved, then runs the Xbox Live → XSTS →
 *     Minecraft token chain and returns only the public profile.
 */
export const useAccountStore = create<AccountState>((set) => ({
  profile: null,
  pending: null,
  error: null,

  login: async () => {
    set({ error: null });
    try {
      const pending = await api.beginMicrosoftLogin();
      set({ pending });

      // Open the verification page in the user's default browser.
      // (Requires the `opener` plugin, see src-tauri/capabilities/default.json)
      await openUrl(pending.verificationUri);

      // Resolves once the user finished signing in (or the code expired).
      const profile = await api.completeMicrosoftLogin(pending.deviceCode);
      set({ profile, pending: null });
    } catch (e) {
      set({ pending: null, error: String(e) });
    }
  },
}));
