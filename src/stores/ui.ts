import { create } from "zustand";

export type View = "instances" | "mods" | "settings";

interface UiState {
  view: View;
  setView: (view: View) => void;
}

/** Global UI state — which page is visible. */
export const useUiStore = create<UiState>((set) => ({
  view: "instances",
  setView: (view) => set({ view }),
}));
