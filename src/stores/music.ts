import { create } from "zustand";
import { api } from "@/lib/api";
import type { MusicConnectionState, MusicPlaybackAction, MusicProvider, MusicTrack } from "@/types";

export type MusicConnectionStatus = "disconnected" | "connecting" | "connected";

interface MusicState {
  status: MusicConnectionStatus;
  provider: MusicProvider | null;
  displayName: string | null;
  avatarUrl: string | null;
  track: MusicTrack | null;
  message: string | null;
  error: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  connect: (provider: MusicProvider) => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
  playback: (action: Exclude<MusicPlaybackAction, "seek">) => Promise<void>;
  seekLocal: (positionMs: number) => void;
  commitSeek: () => Promise<void>;
  tick: () => void;
}

function stateFromConnection(connection: MusicConnectionState) {
  return {
    status: connection.connected ? "connected" as const : "disconnected" as const,
    provider: connection.connected ? connection.provider : null,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    track: connection.track,
    message: connection.message,
    error: null,
  };
}

export const useMusicStore = create<MusicState>((set, get) => ({
  status: "disconnected",
  provider: null,
  displayName: null,
  avatarUrl: null,
  track: null,
  message: null,
  error: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    for (const provider of ["spotify", "youtube"] as const) {
      try {
        const connection = await api.getMusicConnection(provider);
        if (connection.connected) {
          set({ ...stateFromConnection(connection), hydrated: true });
          return;
        }
      } catch {
        // A corrupt/expired provider entry must not prevent the widget loading.
      }
    }
    set({ hydrated: true });
  },

  connect: async (provider) => {
    set({ status: "connecting", provider, error: null, message: "Waiting for authorization in your browser…" });
    try {
      const connection = await api.connectMusicProvider(provider);
      set({ ...stateFromConnection(connection), hydrated: true });
    } catch (error) {
      set({ status: "disconnected", provider: null, track: null, message: null, error: String(error), hydrated: true });
    }
  },

  refresh: async () => {
    const provider = get().provider;
    if (!provider || get().status !== "connected") return;
    try {
      const connection = await api.getMusicConnection(provider);
      set(stateFromConnection(connection));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  disconnect: async () => {
    const provider = get().provider;
    if (!provider) return;
    try {
      await api.disconnectMusicProvider(provider);
    } finally {
      set({ status: "disconnected", provider: null, displayName: null, avatarUrl: null, track: null, message: null, error: null });
    }
  },

  playback: async (action) => {
    const provider = get().provider;
    if (!provider) return;
    set({ error: null });
    try {
      const connection = await api.controlMusicPlayback(provider, action);
      set(stateFromConnection(connection));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  seekLocal: (positionMs) => set((state) => ({
    track: state.track
      ? { ...state.track, positionMs: Math.max(0, Math.min(positionMs, state.track.durationMs)) }
      : null,
  })),

  commitSeek: async () => {
    const { provider, track } = get();
    if (!provider || !track) return;
    try {
      const connection = await api.controlMusicPlayback(provider, "seek", track.positionMs);
      set(stateFromConnection(connection));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  tick: () => set((state) => ({
    track: state.track?.isPlaying
      ? { ...state.track, positionMs: Math.min(state.track.durationMs, state.track.positionMs + 1_000) }
      : state.track,
  })),
}));

export type { MusicProvider, MusicTrack } from "@/types";
