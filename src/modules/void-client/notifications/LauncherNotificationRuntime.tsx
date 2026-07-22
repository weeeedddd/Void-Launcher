import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import type { LauncherLogEvent } from "@/types";
import { ShadowGlyph } from "../components/ShadowGlyph";
import type { NotificationPosition } from "../types";
import { useVoidClientStore } from "../stores/voidClient.store";
import {
  publishLauncherNotification,
  type LauncherNotification,
  useLauncherNotificationStore,
} from "./notificationStore";

const POSITION_CLASSES: Record<NotificationPosition, string> = {
  "top-left": "top-16 left-4 items-start",
  "top-center": "top-16 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-16 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "right-4 bottom-4 items-end",
};

const TONE_STYLES = {
  info: "border-[#7B2CBF] text-[#C084FC]",
  success: "border-[#2F6B45] text-[#86EFAC]",
  warning: "border-[#8A5B18] text-[#FCD34D]",
  error: "border-[#7F3131] text-[#FCA5A5]",
} as const;

/** Mount once beside the production client surface. */
export function LauncherNotificationRuntime() {
  const [monitorProcess, setMonitorProcess] = useState(false);
  const observedRunningProcess = useRef(false);

  useEffect(() => {
    if (!isTauri()) return undefined;
    let disposed = false;
    let stopListening: (() => void) | undefined;

    void listen<LauncherLogEvent>("launcher-log", (event) => {
      if (disposed) return;
      const entry = event.payload;

      if (entry.phase === "queued") {
        observedRunningProcess.current = false;
        publishLauncherNotification({
          title: "Launching Minecraft",
          message: entry.message,
          tone: "info",
          durationMs: 7_000,
          preference: "game-launching",
          dedupeKey: "minecraft:launch",
        });
      } else if (entry.phase === "running") {
        observedRunningProcess.current = true;
        setMonitorProcess(true);
        publishLauncherNotification({
          title: "Minecraft is running",
          message: entry.message,
          tone: "success",
          preference: "playing",
          dedupeKey: "minecraft:launch",
        });
      } else if (entry.phase === "failed" || entry.level === "error") {
        setMonitorProcess(false);
        publishLauncherNotification({
          title: "Minecraft launch failed",
          message: entry.message,
          tone: "error",
          durationMs: 8_000,
          preference: "game-launching",
          dedupeKey: "minecraft:launch",
        });
      } else if (entry.level === "warning") {
        publishLauncherNotification({
          title: "Launcher warning",
          message: entry.message,
          tone: "warning",
          durationMs: 7_000,
          preference: "experimental-warning",
          dedupeKey: `minecraft:warning:${entry.phase}`,
        });
      }
    }).then((unlisten) => {
      if (disposed) unlisten();
      else stopListening = unlisten;
    }).catch(() => undefined);

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri() || !monitorProcess) return undefined;
    let disposed = false;

    const readProcess = async () => {
      try {
        const status = await api.getMinecraftProcess();
        if (disposed) return;
        if (status.running) {
          observedRunningProcess.current = true;
          return;
        }
        if (!observedRunningProcess.current) return;

        observedRunningProcess.current = false;
        setMonitorProcess(false);
        publishLauncherNotification({
          title: "Minecraft closed",
          message: "The Minecraft process started by this launcher is no longer running.",
          tone: "info",
          preference: "game-closed",
          dedupeKey: "minecraft:closed",
        });
      } catch {
        // Telemetry is best-effort. The launcher log remains authoritative.
      }
    };

    void readProcess();
    const timer = window.setInterval(() => void readProcess(), 5_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [monitorProcess]);

  return <LauncherNotificationHost />;
}

function LauncherNotificationHost() {
  const notifications = useLauncherNotificationStore((state) => state.notifications);
  const dismiss = useLauncherNotificationStore((state) => state.dismiss);
  const position = useVoidClientStore((state) => state.notificationPosition);
  const reducedMotion = Boolean(useReducedMotion());
  const positionClass = POSITION_CLASSES[position] ?? POSITION_CLASSES["bottom-right"];

  return (
    <section
      className={`pointer-events-none fixed z-[520] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 ${positionClass}`}
      aria-label="Launcher notifications"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <LauncherNotificationToast
            key={notification.id}
            notification={notification}
            reducedMotion={reducedMotion}
            onDismiss={dismiss}
          />
        ))}
      </AnimatePresence>
    </section>
  );
}

function LauncherNotificationToast({
  notification,
  reducedMotion,
  onDismiss,
}: {
  notification: LauncherNotification;
  reducedMotion: boolean;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), notification.durationMs);
    return () => window.clearTimeout(timer);
  }, [notification.createdAt, notification.durationMs, notification.id, onDismiss]);

  return (
    <motion.article
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
      className={`pointer-events-auto w-full rounded-none border bg-[#111111] ${TONE_STYLES[notification.tone]}`}
      role={notification.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-sm border border-[#333333] bg-[#111111]" aria-hidden="true">
          <ShadowGlyph name={notification.tone === "error" ? "close" : notification.tone === "success" ? "check" : "notification"} size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{notification.title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#A3A3A3]">{notification.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm border border-[#333333] bg-[#111111] text-[#A3A3A3] transition-colors hover:bg-[#242424] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7]"
          aria-label={`Dismiss ${notification.title}`}
        >
          <ShadowGlyph name="close" size={12} />
        </button>
      </div>
    </motion.article>
  );
}

export default LauncherNotificationRuntime;
