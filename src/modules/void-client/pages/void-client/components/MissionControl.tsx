import { useEffect, useMemo, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LauncherLogEvent } from "@/types";
import { CLIENT_COPY } from "../../../i18n";
import { ShadowEmblem } from "../../../components/ShadowEmblem";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

export function MissionControl() {
  const overlayOpen = useVoidClientStore((state) => state.launchOverlayOpen);
  const consoleOpen = useVoidClientStore((state) => state.missionControlOpen);
  const instanceName = useVoidClientStore((state) => state.launchInstanceName);
  const logs = useVoidClientStore((state) => state.launchLogs);
  const language = useVoidClientStore((state) => state.language);
  const appendLog = useVoidClientStore((state) => state.appendLaunchLog);
  const setConsoleOpen = useVoidClientStore((state) => state.setMissionControlOpen);
  const clearLogs = useVoidClientStore((state) => state.clearLaunchLogs);
  const reducedMotion = Boolean(useReducedMotion());
  const scrollRef = useRef<HTMLDivElement>(null);
  const copy = CLIENT_COPY[language];

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<LauncherLogEvent>("launcher-log", (event) => appendLog(event.payload)).then((dispose) => {
      unlisten = dispose;
    });
    return () => unlisten?.();
  }, [appendLog]);

  useEffect(() => {
    if (!consoleOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [consoleOpen, logs, reducedMotion]);

  const progress = useMemo(() => {
    const phases = ["queued", "authentication", "runtime", "loader", "install", "process", "running"];
    const latest = logs.at(-1)?.phase ?? "queued";
    const index = phases.indexOf(latest);
    return latest === "failed" ? 100 : Math.max(8, ((Math.max(index, 0) + 1) / phases.length) * 100);
  }, [logs]);

  return (
    <>
      <AnimatePresence>
        {overlayOpen && (
          <motion.div className="fixed inset-0 z-[400] grid place-items-center bg-[#050505]/92 p-5 backdrop-blur-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .985 }} transition={{ duration: reducedMotion ? .01 : .26, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-xl overflow-hidden border border-[#9d5ce0]/32 bg-[#0F0B15]/96 p-6 shadow-[0_38px_120px_rgba(0,0,0,.88),0_0_70px_rgba(123,44,191,.2)] [clip-path:polygon(0_0,96%_0,100%_12%,100%_100%,4%_100%,0_88%)]">
              <div className="flex items-center gap-4"><motion.span animate={reducedMotion ? undefined : { rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} className="grid size-16 shrink-0 place-items-center border border-[#a855f7]/38 bg-[#7B2CBF]/12 text-[#d8b4fe] shadow-[0_0_32px_rgba(123,44,191,.28)] [clip-path:polygon(15%_0,100%_0,85%_100%,0_100%)]"><ShadowEmblem size={38} /></motion.span><div className="min-w-0"><p className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">{copy.launching}</p><h2 className="font-display mt-1 truncate text-xl font-black text-white">{instanceName || "Minecraft"}</h2><p className="mt-1 truncate text-xs text-[#a79bad]">{logs.at(-1)?.message ?? "Preparing launch…"}</p></div></div>
              <div className="mt-6 h-2 overflow-hidden border border-[#9d5ce0]/18 bg-black/45"><motion.div className="h-full origin-left bg-[linear-gradient(90deg,#3b0d57,#7B2CBF,#5062d9)] shadow-[0_0_20px_rgba(123,44,191,.6)]" animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : .3, ease: [0.22, 1, 0.36, 1] }} /></div>
              <p className="mt-3 text-[10px] leading-5 text-[#7f7487]">The console is already docked behind this overlay and records each native startup phase.</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {consoleOpen && (
          <motion.aside initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 34, y: 18 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 24, y: 12 }} transition={{ duration: reducedMotion ? .01 : .24, ease: [0.22, 1, 0.36, 1] }} className="fixed right-5 bottom-5 z-[350] flex h-[min(430px,52vh)] w-[min(620px,calc(100vw-40px))] flex-col overflow-hidden border border-[#9d5ce0]/28 bg-[#08060b]/96 shadow-[0_28px_90px_rgba(0,0,0,.82),0_0_55px_rgba(123,44,191,.15)] backdrop-blur-2xl [clip-path:polygon(0_0,96%_0,100%_8%,100%_100%,4%_100%,0_92%)]">
            <header className="flex min-h-14 items-center gap-3 border-b border-white/[0.065] px-4"><span className="grid size-8 place-items-center border border-[#9d5ce0]/25 bg-[#7B2CBF]/10 text-[#d8b4fe]"><ShadowGlyph name="monitor" size={16} /></span><span className="min-w-0 flex-1"><strong className="block text-xs text-white">{copy.missionControl}</strong><small className="block truncate text-[9px] text-[#81768a]">{instanceName || "Native launch service"}</small></span><button type="button" onClick={clearLogs} disabled={logs.length === 0} className={`min-h-10 cursor-pointer border border-white/[0.075] bg-black/25 px-3 text-[9px] font-bold text-[#9f93a8] transition hover:border-white/[0.15] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${voidClientStyles.focusRing}`}>{copy.clearLogs}</button><button type="button" onClick={() => setConsoleOpen(false)} aria-label={copy.hideConsole} title={copy.hideConsole} className={`grid size-10 cursor-pointer place-items-center text-[#8c8095] transition hover:bg-white/[0.05] hover:text-white ${voidClientStyles.focusRing}`}><ShadowGlyph name="close" size={14} /></button></header>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-black/30 p-3 font-mono text-[10px] leading-5" aria-live="polite">
              {logs.length === 0 ? <p className="p-4 text-center text-[#6f6477]">No launch messages yet.</p> : logs.map((entry) => <div key={entry.id} className="grid grid-cols-[68px_72px_minmax(0,1fr)] gap-2 border-b border-white/[0.035] px-2 py-1.5 last:border-0"><time className="text-[#655b6c]">{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span className={`font-bold uppercase ${entry.level === "error" ? "text-red-300" : entry.level === "success" ? "text-[#72f2a8]" : entry.level === "warning" ? "text-amber-200" : "text-[#b987e2]"}`}>{entry.phase}</span><span className="break-words text-[#b6aabd]">{entry.message}</span></div>)}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
