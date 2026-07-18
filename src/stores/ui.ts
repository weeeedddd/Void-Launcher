import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View = "instances" | "mods" | "optimizer" | "settings";
export type SidebarSide = "left" | "right";

interface UiState {
  view: View;
  setView: (view: View) => void;

  /** Which screen edge the sidebar is docked to. Persisted. */
  sidebarSide: SidebarSide;
  setSidebarSide: (side: SidebarSide) => void;
  toggleSidebarSide: () => void;

  /** While dragging the sidebar: the edge it would dock to on release.
   *  Rendered by App.tsx as a glowing strip (the "snap preview"). */
  dockPreview: SidebarSide | null;
  setDockPreview: (side: SidebarSide | null) => void;

  /** Subtle UI sounds (WebAudio-generated clicks & chimes). Persisted. */
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  /** Search text pushed into the mod browser from outside (deep links). */
  pendingSearch: string | null;
  setPendingSearch: (query: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      view: "instances",
      setView: (view) => set({ view }),

      sidebarSide: "left",
      setSidebarSide: (sidebarSide) => set({ sidebarSide }),
      toggleSidebarSide: () =>
        set((s) => ({ sidebarSide: s.sidebarSide === "left" ? "right" : "left" })),

      dockPreview: null,
      setDockPreview: (dockPreview) => set({ dockPreview }),

      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      pendingSearch: null,
      setPendingSearch: (pendingSearch) => set({ pendingSearch }),
    }),
    {
      name: "void-ui",
      // Persist only durable preferences — transient state stays out.
      partialize: (s) => ({ sidebarSide: s.sidebarSide, soundEnabled: s.soundEnabled }),
    },
  ),
);
