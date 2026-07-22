import { useEffect, useMemo, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LauncherLogEvent } from "@/types";
import { CLIENT_COPY } from "../../../i18n";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import { voidClientStyles } from "../void-client.styles";

export function MissionControl() {
  const activeView = useVoidClientStore((state) => state.activeView);
  const overlayOpen = useVoidClientStore((state) => state.launchOverlayOpen);
  const consoleOpen = useVoidClientStore((state) => state.missionControlOpen);
  const consoleBehavior = useVoidClientStore((state) => state.missionVisibility);
  const instanceName = useVoidClientStore((state) => state.launchInstanceName);
  const logs = useVoidClientStore((state) => state.launchLogs);
  const language = useVoidClientStore((state) => state.language);
  const appendLog = useVoidClientStore((state) => state.appendLaunchLog);
  const setConsoleOpen = useVoidClientStore((state) => state.setMissionControlOpen);
  const clearLogs = useVoidClientStore((state) => state.clearLaunchLogs);
  const reducedMotion = Boolean(useReducedMotion());
  const scrollRef = useRef<HTMLDivElement>(null);
  const copy = CLIENT_COPY[language];
  const bottomOffset = "bottom-5";

  useEffect(() => {
    if (!isTauri()) return undefined;
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
          <motion.div className="fixed inset-0 z-[400] grid place-items-center bg-black/80 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}>
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} className="w-full max-w-xl rounded-xl border border-[#34343A] bg-[#151518] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-[#9333EA] bg-[#7E22CE] text-white">
                  <ShadowGlyph name="play" size={24} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#92929B]">{copy.launching}</p>
                  <h2 className="mt-1 truncate text-xl font-semibold text-[#F4F4F5]">{instanceName || "Minecraft"}</h2>
                  <p className="mt-1 truncate text-sm text-[#92929B]">{logs.at(-1)?.message ?? "Preparing launch..."}</p>
                </div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#29292F]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <motion.div className="h-full rounded-full bg-[#8B5CF6]" animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : 0.15 }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#92929B]">Mission Control is recording each native startup phase.</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!consoleOpen && consoleBehavior !== "hidden" && activeView !== "dashboard" && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            onClick={() => setConsoleOpen(true)}
            aria-controls="mission-control-console"
            aria-expanded="false"
            className={`fixed right-5 ${bottomOffset} z-[340] inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#34343A] bg-[#151518] px-3.5 text-xs font-semibold text-[#D4D4D8] shadow-lg shadow-black/30 transition-colors duration-150 hover:border-[#7E22CE] hover:bg-[#21152B] hover:text-white ${voidClientStyles.focusRing}`}
          >
            <ShadowGlyph name="monitor" size={16} />
            {copy.missionControl}
            {logs.length > 0 && <span className="min-w-6 rounded-md border border-[#34343A] bg-[#111114] px-1.5 py-0.5 text-center font-mono text-xs tabular-nums text-[#92929B]">{logs.length}</span>}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {consoleOpen && consoleBehavior !== "hidden" && (
          <motion.aside id="mission-control-console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} className={`fixed right-5 ${bottomOffset} z-[350] flex h-[min(430px,52vh)] w-[min(620px,calc(100vw-40px))] flex-col overflow-hidden rounded-xl border border-[#34343A] bg-[#111114] shadow-2xl shadow-black/50`}>
            <header className="flex min-h-14 items-center gap-3 border-b border-[#29292F] bg-[#151518] px-4">
              <span className="grid size-8 place-items-center rounded-lg bg-[#21152B] text-[#C084FC]"><ShadowGlyph name="monitor" size={16} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-[#F4F4F5]">{copy.missionControl}</strong><small className="block truncate text-xs text-[#92929B]">{instanceName || "Native launch service"}</small></span>
              <button type="button" onClick={clearLogs} disabled={logs.length === 0} className={`${voidClientStyles.secondaryButton} min-h-10 px-3 text-xs`}>{copy.clearLogs}</button>
              <button type="button" onClick={() => setConsoleOpen(false)} aria-label={copy.hideConsole} title={copy.hideConsole} className={`${voidClientStyles.iconButton} size-10`}><ShadowGlyph name="close" size={14} /></button>
            </header>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#111114] p-3 font-mono text-xs leading-5" aria-live="polite">
              {logs.length === 0 ? <p className="p-4 text-center text-[#92929B]">No launch messages yet.</p> : logs.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[68px_80px_minmax(0,1fr)] gap-2 border-b border-[#29292F] px-2 py-1.5 last:border-0">
                  <time className="text-[#737373]">{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                  <span className={`font-semibold uppercase ${entry.level === "error" ? "text-[#FCA5A5]" : entry.level === "success" ? "text-[#86EFAC]" : entry.level === "warning" ? "text-[#FCD34D]" : "text-[#D4D4D4]"}`}>{entry.phase}</span>
                  <span className="break-words text-[#D4D4D4]">{entry.message}</span>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
