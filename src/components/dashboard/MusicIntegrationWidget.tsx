import { useCallback, useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CheckCircle2, Disc3, ExternalLink, LoaderCircle, Music2, Pause, Play, Power, RefreshCw, ShieldCheck, SkipBack, SkipForward } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMusicStore, type MusicProvider } from "@/stores/music";

function clock(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicIntegrationWidget() {
  const { status, provider, displayName, avatarUrl, track, message, error, hydrated, hydrate, connect, refresh, disconnect, playback, seekLocal, commitSeek, tick } = useMusicStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { if (status === "connected") setDialogOpen(false); }, [status]);
  useEffect(() => {
    if (status !== "connected" || provider !== "spotify") return;
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [provider, refresh, status]);
  useEffect(() => {
    if (status !== "connected" || !track?.isPlaying) return;
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [status, tick, track?.isPlaying]);

  const chooseProvider = useCallback((selected: MusicProvider) => { void connect(selected); }, [connect]);
  const togglePlayback = useCallback(() => { void playback(track?.isPlaying ? "pause" : "play"); }, [playback, track?.isPlaying]);
  const showDialog = useCallback(() => setDialogOpen(true), []);
  const openYouTubeMusic = useCallback(() => { void openUrl("https://music.youtube.com"); }, []);

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="shadow-panel aaa-card min-w-0 overflow-hidden rounded-3xl border p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="section-kicker">Music integration</p><h2 className="mt-1 font-display text-lg font-bold text-white">Soundtrack the void</h2></div>
        {status === "connected" && <span className="flex items-center gap-1.5 rounded-full border border-success-500/20 bg-success-500/8 px-2.5 py-1 text-[10px] font-bold text-success-400 uppercase"><CheckCircle2 size={12} /> Linked</span>}
      </div>

      {!hydrated ? (
        <div className="grid min-h-44 place-items-center"><LoaderCircle className="animate-spin text-accent-300" aria-label="Loading music connection" /></div>
      ) : status === "disconnected" ? (
        <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center">
          <div><Music2 className="mx-auto mb-3 text-accent-300" /><p className="mb-4 max-w-xs text-xs leading-5 text-ink-300">Connect your real account. OAuth tokens remain encrypted inside the native Windows launcher.</p><Button onClick={showDialog} className="rounded-xl">Connect Spotify / YouTube</Button>{error && <p role="alert" className="mt-3 max-w-sm text-xs leading-5 text-red-300">{error}</p>}</div>
        </div>
      ) : status === "connecting" ? (
        <div className="grid min-h-44 place-items-center rounded-2xl border border-accent-500/20 bg-accent-500/[0.05] p-5 text-center"><div><LoaderCircle className="mx-auto mb-3 animate-spin text-accent-300" /><p className="font-semibold text-white">Finish signing in via your browser</p><p className="mt-2 text-xs text-ink-500">The secure callback closes automatically after authorization.</p></div></div>
      ) : track ? (
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="album-art grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-accent-500/25">{track.artworkUrl ? <img src={track.artworkUrl} alt="" className="size-full object-cover" /> : <Disc3 size={38} className={track.isPlaying ? "animate-[spin_9s_linear_infinite]" : ""} />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-display font-bold text-white">{track.title}</p><p className="truncate text-xs text-ink-500">{track.artist} · {track.album}</p></div><button type="button" onClick={() => void disconnect()} className="music-control" aria-label="Disconnect music provider"><Power size={15} /></button></div>
            <input aria-label="Track position" type="range" min={0} max={Math.max(1, track.durationMs)} value={track.positionMs} onChange={(event) => seekLocal(Number(event.target.value))} onPointerUp={() => void commitSeek()} onKeyUp={() => void commitSeek()} className="mt-4 w-full accent-[#9d4edd]" />
            <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-ink-500 tabular-nums">{clock(track.positionMs)} / {clock(track.durationMs)}</span><div className="flex items-center gap-1"><button type="button" onClick={() => void playback("previous")} className="music-control" aria-label="Previous track"><SkipBack size={15} /></button><button type="button" onClick={togglePlayback} className="grid size-10 place-items-center rounded-full bg-white text-black transition hover:scale-105" aria-label={track.isPlaying ? "Pause" : "Play"}>{track.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button type="button" onClick={() => void playback("next")} className="music-control" aria-label="Next track"><SkipForward size={15} /></button></div><span className="text-[10px] font-bold text-accent-300 uppercase">Spotify</span></div>
            {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center overflow-hidden rounded-xl bg-accent-500/12 text-accent-300">{avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <Music2 size={19} />}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{displayName ?? (provider === "spotify" ? "Spotify account" : "YouTube account")}</p><p className="text-[10px] font-bold text-success-400 uppercase">{provider} connected</p></div><button type="button" onClick={() => void disconnect()} className="music-control" aria-label="Disconnect music provider"><Power size={15} /></button></div>
          <p className="mt-4 text-xs leading-5 text-ink-300">{message ?? "No active Spotify playback. Start a song on any Spotify device, then refresh."}</p>
          <div className="mt-4 flex flex-wrap gap-2">{provider === "youtube" ? <Button variant="outline" onClick={openYouTubeMusic} className="rounded-xl"><ExternalLink size={14} /> Open YouTube Music</Button> : <Button variant="outline" onClick={() => void refresh()} className="rounded-xl"><RefreshCw size={14} /> Refresh playback</Button>}</div>
          {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link a music provider</DialogTitle><DialogDescription>The native launcher opens your system browser and uses OAuth PKCE. Passwords and tokens are never shown to this interface.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            <button type="button" disabled={status === "connecting"} onClick={() => chooseProvider("spotify")} className="flex items-center justify-between rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-4 text-left transition hover:bg-[#1DB954]/16"><span><strong className="block text-white">Continue with Spotify</strong><small className="text-ink-300">Live playback, play, pause and skip</small></span>{status === "connecting" && provider === "spotify" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}</button>
            <button type="button" disabled={status === "connecting"} onClick={() => chooseProvider("youtube")} className="flex items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/8 p-4 text-left transition hover:bg-red-500/14"><span><strong className="block text-white">Continue with YouTube</strong><small className="text-ink-300">YouTube channel identity and account access</small></span>{status === "connecting" && provider === "youtube" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}</button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
