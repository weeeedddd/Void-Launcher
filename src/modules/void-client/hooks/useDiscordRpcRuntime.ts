import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import { useVoidClientStore } from "../stores/voidClient.store";

const IDLE_TIMEOUT_MS = 5 * 60 * 1_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousemove", "wheel", "touchstart"] as const;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Discord Rich Presence could not connect.";
  }
}
/**
 * Owns the single Discord IPC synchronization loop for the launcher.
 * Settings only update desired state; this hook serializes native commands and
 * publishes the resulting connection/error state back to the shared store.
 */
export function useDiscordRpcRuntime(): void {
  const desiredEnabled = useVoidClientStore((state) => state.discordRpcEnabled);
  const hideWhenIdle = useVoidClientStore((state) => state.hideRpcWhenIdle);
  const language = useVoidClientStore((state) => state.rpcLanguage);
  const setRuntime = useVoidClientStore((state) => state.setDiscordRpcRuntime);
  const [idle, setIdle] = useState(false);
  const revisionRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!desiredEnabled || !hideWhenIdle) {
      setIdle(false);
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const markActive = () => {
      setIdle(false);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActive, { passive: true });
    }
    markActive();

    return () => {
      if (timeout) clearTimeout(timeout);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActive);
      }
    };
  }, [desiredEnabled, hideWhenIdle]);

  useEffect(() => {
    const revision = ++revisionRef.current;
    if (!isTauri()) {
      setRuntime({
        connected: false,
        pending: false,
        error: null,
        message: "Discord IPC is available only in the packaged launcher.",
      });
      return;
    }

    const enabled = desiredEnabled && !(hideWhenIdle && idle);
    setRuntime({
      connected: useVoidClientStore.getState().discordRpcConnected,
      pending: true,
      error: null,
      message: enabled
        ? "Connecting to the Discord desktop app..."
        : desiredEnabled
          ? "Pausing Rich Presence while the launcher is idle..."
          : "Disabling Discord Rich Presence...",
    });

    const synchronize = async () => {
      try {
        // Omit custom details/state so the native bridge applies the selected
        // localized activity strings instead of being overwritten by English.
        const status = await api.updateDiscordRpc({
          enabled,
          hideWhenIdle,
          language,
        });
        if (revision !== revisionRef.current) return;
        setRuntime({
          connected: status.connected,
          pending: false,
          error: null,
          message: desiredEnabled && idle
            ? "Rich Presence is paused while the launcher is idle."
            : status.message,
        });
      } catch (error) {
        if (revision !== revisionRef.current) return;
        const message = errorMessage(error);
        setRuntime({
          connected: false,
          pending: false,
          error: message,
          message: "Discord Rich Presence is not connected.",
        });
      }
    };

    // Native named-pipe operations must remain ordered when the user changes
    // multiple settings quickly. A rejected call is handled inside
    // `synchronize`, so it cannot poison later queue entries.
    queueRef.current = queueRef.current.then(synchronize, synchronize);
  }, [desiredEnabled, hideWhenIdle, idle, language, setRuntime]);
}
