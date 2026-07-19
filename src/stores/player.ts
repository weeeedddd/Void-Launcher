import { create } from "zustand";
import { persist } from "zustand/middleware";

/** A cosmetic the player has pulled from the gacha. */
export interface OwnedCosmetic {
  name: string;
  rarity: string;
  at: number;
}

interface PlayerState {
  coins: number;
  streak: number;
  owned: OwnedCosmetic[];

  /** Try to spend coins; returns false (no-op) if the balance is too low. */
  spend: (amount: number) => boolean;
  reward: (amount: number) => void;
  grant: (cosmetic: Omit<OwnedCosmetic, "at">) => void;
}

/**
 * Browser-only player economy (localStorage-persisted via zustand). Shared
 * between the top-bar coins pill and the "Pull Cosmetics" gacha so they stay
 * in sync.
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      coins: 12940,
      streak: 47,
      owned: [],

      spend: (amount) => {
        if (get().coins < amount) return false;
        set((s) => ({ coins: s.coins - amount }));
        return true;
      },
      reward: (amount) => set((s) => ({ coins: s.coins + amount })),
      grant: (cosmetic) =>
        set((s) => ({ owned: [{ ...cosmetic, at: Date.now() }, ...s.owned].slice(0, 50) })),
    }),
    { name: "void-player" },
  ),
);
