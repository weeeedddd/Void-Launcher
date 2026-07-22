import { useCallback, useEffect, useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useMusicStore, type MusicProvider, type MusicTrack } from "@/stores/music";
import { ShadowGlyph } from "../../../components/ShadowGlyph";

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function providerLabel(provider: MusicProvider | null) {
  return provider === "youtube" ? "YouTube Music" : "Spotify";
}

export function MusicPanel() {
  const nativeRuntime = isTauri();
  const {
    status,
    provider,
    displayName,
    avatarUrl,
    track,
    message,
    error,
    hydrated,
    hydrate,
    connect,
    refresh,
    disconnect,
    playback,
    seekLocal,
    commitSeek,
    tick,
  } = useMusicStore();
  const [busyProvider, setBusyProvider] = useState<MusicProvider | null>(null);
  const [playbackBusy, setPlaybackBusy] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== "connected" || !provider) return;
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [provider, refresh, status]);

  useEffect(() => {
    if (status !== "connected" || !track?.isPlaying) return;
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [status, tick, track?.isPlaying]);

  const connectProvider = useCallback(async (selected: MusicProvider) => {
    setBusyProvider(selected);
    try {
      await connect(selected);
    } finally {
      setBusyProvider(null);
    }
  }, [connect]);

  const disconnectProvider = useCallback(async () => {
    setBusyProvider(provider);
    try {
      await disconnect();
    } finally {
      setBusyProvider(null);
    }
  }, [disconnect, provider]);

  const sendPlayback = useCallback(async (action: "play" | "pause" | "next" | "previous") => {
    setPlaybackBusy(true);
    try {
      await playback(action);
    } finally {
      setPlaybackBusy(false);
    }
  }, [playback]);

  const openYouTubeMusic = useCallback(async () => {
    setOpenBusy(true);
    setOpenError(null);
    try {
      await openUrl("https://music.youtube.com");
    } catch (openFailure) {
      setOpenError(String(openFailure));
    } finally {
      setOpenBusy(false);
    }
  }, []);

  const progress = useMemo(() => {
    if (!track || track.durationMs <= 0) return 0;
    return Math.min(100, Math.max(0, (track.positionMs / track.durationMs) * 100));
  }, [track]);

  return (
    <section className="border border-[#333333] bg-[#1A1A1A]" aria-labelledby="music-panel-heading">
      <header className="flex min-h-14 items-center justify-between gap-4 border-b border-[#333333] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center border border-[#333333] bg-[#111111] text-[#A855F7]" aria-hidden="true">
            <ShadowGlyph name="music" size={16} />
          </span>
          <div className="min-w-0">
            <h2 id="music-panel-heading" className="truncate text-base font-semibold text-[#F5F5F5]">Music</h2>
            <p className="truncate text-xs text-[#A3A3A3]">Real account connection and playback</p>
          </div>
        </div>
        <ConnectionStatus status={status} provider={provider} />
      </header>

      <div className="p-4">
        {!nativeRuntime ? <PackagedOnlyState /> : null}
        {nativeRuntime && !hydrated ? <MusicLoadingState /> : null}
        {nativeRuntime && hydrated && status === "disconnected" ? (
          <DisconnectedState busyProvider={busyProvider} onConnect={connectProvider} error={error} />
        ) : null}
        {nativeRuntime && hydrated && status === "connecting" ? (
          <ConnectingState provider={provider} />
        ) : null}
        {nativeRuntime && hydrated && status === "connected" ? (
          <ConnectedState
            avatarUrl={avatarUrl}
            displayName={displayName}
            error={error}
            message={message}
            openBusy={openBusy}
            openError={openError}
            playbackBusy={playbackBusy}
            progress={progress}
            provider={provider}
            track={track}
            busyProvider={busyProvider}
            onDisconnect={disconnectProvider}
            onOpenYouTube={openYouTubeMusic}
            onRefresh={() => void refresh()}
            onPlayback={sendPlayback}
            onSeek={seekLocal}
            onCommitSeek={() => void commitSeek()}
          />
        ) : null}
      </div>
    </section>
  );
}

function PackagedOnlyState() {
  return (
    <div className="min-h-24 border border-[#333333] bg-[#111111] p-4" role="status">
      <p className="text-sm font-medium text-[#F5F5F5]">Music controls require the packaged launcher</p>
      <p className="mt-1 text-xs leading-5 text-[#A3A3A3]">OAuth callbacks and encrypted provider tokens are owned by the native Void Launcher service.</p>
    </div>
  );
}

function ConnectionStatus({ status, provider }: { status: "disconnected" | "connecting" | "connected"; provider: MusicProvider | null }) {
  const connected = status === "connected";
  const connecting = status === "connecting";
  const label = connected ? `${providerLabel(provider)} linked` : connecting ? "Connecting" : "Not linked";
  const color = connected ? "text-[#86EFAC]" : connecting ? "text-[#FBBF24]" : "text-[#A3A3A3]";
  const dot = connected ? "bg-[#22C55E]" : connecting ? "bg-[#F59E0B]" : "bg-[#737373]";
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 text-xs font-medium ${color}`} aria-live="polite">
      <span className={`size-2 ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function MusicLoadingState() {
  return (
    <div className="flex min-h-24 items-center gap-3 text-sm text-[#A3A3A3]" role="status">
      <span className="size-4 animate-pulse border border-[#333333]" aria-hidden="true" />
      Checking music connections...
    </div>
  );
}

function DisconnectedState({
  busyProvider,
  onConnect,
  error,
}: {
  busyProvider: MusicProvider | null;
  onConnect: (provider: MusicProvider) => void;
  error: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="text-sm font-medium text-[#F5F5F5]">Link a music account</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-[#A3A3A3]">
          The native launcher opens your browser for OAuth. Tokens stay encrypted on this Windows account; no credentials enter the UI.
        </p>
        {error ? <p className="mt-2 break-words text-xs text-[#FCA5A5]" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <ProviderButton provider="spotify" busyProvider={busyProvider} onClick={onConnect} />
        <ProviderButton provider="youtube" busyProvider={busyProvider} onClick={onConnect} />
      </div>
    </div>
  );
}

function ProviderButton({
  provider,
  busyProvider,
  onClick,
}: {
  provider: MusicProvider;
  busyProvider: MusicProvider | null;
  onClick: (provider: MusicProvider) => void;
}) {
  const busy = busyProvider === provider;
  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={busyProvider !== null}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-none border border-[#333333] bg-[#111111] px-3 text-xs font-semibold text-[#F5F5F5] transition-colors duration-150 hover:bg-[#7B2CBF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7] disabled:cursor-not-allowed disabled:text-[#737373]"
    >
      <ShadowGlyph name={provider === "spotify" ? "music" : "external"} size={15} />
      {busy ? "Opening browser..." : `Connect ${provider === "spotify" ? "Spotify" : "YouTube"}`}
    </button>
  );
}

function ConnectingState({ provider }: { provider: MusicProvider | null }) {
  return (
    <div className="flex min-h-24 items-center gap-3 border border-[#333333] bg-[#111111] p-4" role="status" aria-live="polite">
      <span className="size-4 animate-pulse border border-[#333333]" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-[#F5F5F5]">Finish signing in via your browser</p>
        <p className="mt-1 text-xs text-[#A3A3A3]">Waiting for the secure {providerLabel(provider)} callback on the local launcher.</p>
      </div>
    </div>
  );
}

interface ConnectedStateProps {
  avatarUrl: string | null;
  displayName: string | null;
  error: string | null;
  message: string | null;
  openBusy: boolean;
  openError: string | null;
  playbackBusy: boolean;
  progress: number;
  provider: MusicProvider | null;
  track: MusicTrack | null;
  busyProvider: MusicProvider | null;
  onDisconnect: () => void;
  onOpenYouTube: () => void;
  onRefresh: () => void;
  onPlayback: (action: "play" | "pause" | "next" | "previous") => void;
  onSeek: (positionMs: number) => void;
  onCommitSeek: () => void;
}

function ConnectedState({
  avatarUrl,
  displayName,
  error,
  message,
  openBusy,
  openError,
  playbackBusy,
  progress,
  provider,
  track,
  busyProvider,
  onDisconnect,
  onOpenYouTube,
  onRefresh,
  onPlayback,
  onSeek,
  onCommitSeek,
}: ConnectedStateProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden border border-[#333333] bg-[#111111] text-[#A855F7]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <ShadowGlyph name="account" size={19} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#F5F5F5]">{displayName ?? `${providerLabel(provider)} account`}</p>
            <p className="text-xs text-[#86EFAC]">{providerLabel(provider)} linked</p>
          </div>
        </div>

        {track ? (
          <TrackControls
            track={track}
            progress={progress}
            busy={playbackBusy}
            onPlayback={onPlayback}
            onSeek={onSeek}
            onCommitSeek={onCommitSeek}
          />
        ) : (
          <div className="mt-4 border border-[#333333] bg-[#111111] p-3">
            <p className="text-sm font-medium text-[#F5F5F5]">No active playback</p>
            <p className="mt-1 text-xs leading-5 text-[#A3A3A3]">{message ?? "Start music on a connected device, then refresh this panel."}</p>
          </div>
        )}

        {error ? <p className="mt-3 break-words text-xs text-[#FCA5A5]" role="alert">{error}</p> : null}
        {openError ? <p className="mt-3 break-words text-xs text-[#FCA5A5]" role="alert">{openError}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 lg:max-w-48 lg:flex-col">
        {provider === "youtube" ? (
          <button
            type="button"
            onClick={onOpenYouTube}
            disabled={openBusy}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-none border border-[#333333] bg-[#111111] px-3 text-xs font-semibold text-[#F5F5F5] transition-colors duration-150 hover:bg-[#7B2CBF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7] disabled:cursor-not-allowed disabled:text-[#737373]"
          >
            <ShadowGlyph name="external" size={14} />
            {openBusy ? "Opening..." : "Open YouTube Music"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-none border border-[#333333] bg-[#111111] px-3 text-xs font-semibold text-[#F5F5F5] transition-colors duration-150 hover:bg-[#7B2CBF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7]"
          >
            <ShadowGlyph name="sync" size={14} />
            Refresh playback
          </button>
        )}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busyProvider !== null}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-none border border-[#333333] bg-[#111111] px-3 text-xs font-semibold text-[#A3A3A3] transition-colors duration-150 hover:bg-[#242424] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7] disabled:cursor-not-allowed disabled:text-[#737373]"
        >
          <ShadowGlyph name="close" size={14} />
          Disconnect
        </button>
      </div>
    </div>
  );
}

function TrackControls({
  track,
  progress,
  busy,
  onPlayback,
  onSeek,
  onCommitSeek,
}: {
  track: MusicTrack;
  progress: number;
  busy: boolean;
  onPlayback: (action: "play" | "pause" | "next" | "previous") => void;
  onSeek: (positionMs: number) => void;
  onCommitSeek: () => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-3 border border-[#333333] bg-[#111111] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden border border-[#333333] bg-[#1A1A1A] text-[#A855F7]">
          {track.artworkUrl ? <img src={track.artworkUrl} alt="" className="size-full object-cover" /> : <ShadowGlyph name="music" size={20} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#F5F5F5]">{track.title}</p>
          <p className="truncate text-xs text-[#A3A3A3]">{track.artist}{track.album ? ` · ${track.album}` : ""}</p>
        </div>
      </div>
      <label className="grid gap-1">
        <span className="sr-only">Track position</span>
        <input
          aria-label="Track position"
          type="range"
          min={0}
          max={Math.max(1, track.durationMs)}
          value={Math.min(track.positionMs, Math.max(1, track.durationMs))}
          onChange={(event) => onSeek(Number(event.target.value))}
          onPointerUp={onCommitSeek}
          onKeyUp={onCommitSeek}
          style={{ accentColor: "#7B2CBF" }}
          className="h-1 w-full cursor-pointer accent-[#7B2CBF]"
        />
        <span className="flex justify-between text-[10px] tabular-nums text-[#737373]">
          <span>{formatTime(track.positionMs)}</span>
          <span>{formatTime(track.durationMs)} · {Math.round(progress)}%</span>
        </span>
      </label>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#A3A3A3]">{track.isPlaying ? "Playing" : "Paused"}</span>
        <div className="flex items-center gap-1">
          <PlaybackButton label="Previous track" glyph="arrow" disabled={busy} onClick={() => onPlayback("previous")} />
          <PlaybackButton label={track.isPlaying ? "Pause" : "Play"} glyph={track.isPlaying ? "close" : "play"} primary disabled={busy} onClick={() => onPlayback(track.isPlaying ? "pause" : "play")} />
          <PlaybackButton label="Next track" glyph="arrow" disabled={busy} onClick={() => onPlayback("next")} />
        </div>
      </div>
    </div>
  );
}

function PlaybackButton({
  label,
  glyph,
  primary = false,
  disabled,
  onClick,
}: {
  label: string;
  glyph: "arrow" | "close" | "play";
  primary?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-8 place-items-center rounded-none border border-[#333333] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7] disabled:cursor-not-allowed disabled:text-[#737373] ${primary ? "bg-[#7B2CBF] text-white hover:bg-[#8E3FD0]" : "bg-[#1A1A1A] text-[#D4D4D4] hover:bg-[#242424] hover:text-white"}`}
    >
      <ShadowGlyph name={glyph} size={14} className={glyph === "arrow" ? "rotate-180" : undefined} />
    </button>
  );
}

export default MusicPanel;
