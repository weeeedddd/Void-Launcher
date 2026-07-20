import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View = "instances" | "mods" | "optimizer" | "settings";
export type SidebarSide = "left" | "right";
export type DashboardWidget = "music" | "status" | "streak" | "friends";
export type PerformanceFeature = "pingOptimization" | "improvedFps" | "reducedInputLag";

export interface WidgetVisibility {
  music: boolean;
  status: boolean;
  streak: boolean;
  friends: boolean;
}

export interface PerformanceFeatures {
  pingOptimization: boolean;
  improvedFps: boolean;
  reducedInputLag: boolean;
}

interface UiState {
  view: View;
  setView: (view: View) => void;

  /** Which screen edge the sidebar is docked to. Persisted. */
  sidebarSide: SidebarSide;
  setSidebarSide: (side: SidebarSide) => void;
  toggleSidebarSide: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  widgetVisibility: WidgetVisibility;
  setWidgetVisibility: (widget: DashboardWidget, visible: boolean) => void;

  selectedGpu: string | null;
  setSelectedGpu: (gpu: string | null) => void;
  performanceFeatures: PerformanceFeatures;
  setPerformanceFeature: (feature: PerformanceFeature, enabled: boolean) => void;

  uiScale: number;
  setUiScale: (scale: number) => void;
  animatedBackgrounds: boolean;
  setAnimatedBackgrounds: (enabled: boolean) => void;
  gachaBackgrounds: boolean;
  setGachaBackgrounds: (enabled: boolean) => void;

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
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      widgetVisibility: { music: true, status: true, streak: true, friends: true },
      setWidgetVisibility: (widget, visible) =>
        set((state) => ({ widgetVisibility: { ...state.widgetVisibility, [widget]: visible } })),

      selectedGpu: null,
      setSelectedGpu: (selectedGpu) => set({ selectedGpu }),
      performanceFeatures: { pingOptimization: true, improvedFps: true, reducedInputLag: false },
      setPerformanceFeature: (feature, enabled) =>
        set((state) => ({ performanceFeatures: { ...state.performanceFeatures, [feature]: enabled } })),

      uiScale: 100,
      setUiScale: (uiScale) => set({ uiScale: Math.min(115, Math.max(85, uiScale)) }),
      animatedBackgrounds: true,
      setAnimatedBackgrounds: (animatedBackgrounds) => set({ animatedBackgrounds }),
      gachaBackgrounds: false,
      setGachaBackgrounds: (gachaBackgrounds) => set({ gachaBackgrounds }),

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
      partialize: (state) => ({
        sidebarSide: state.sidebarSide,
        sidebarCollapsed: state.sidebarCollapsed,
        soundEnabled: state.soundEnabled,
        widgetVisibility: state.widgetVisibility,
        selectedGpu: state.selectedGpu,
        performanceFeatures: state.performanceFeatures,
        uiScale: state.uiScale,
        animatedBackgrounds: state.animatedBackgrounds,
        gachaBackgrounds: state.gachaBackgrounds,
      }),
    },
  ),
);
