import { useCallback, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { parseDeepLink, type DeepLink } from "@/lib/deeplink";
import { VoidClient, useVoidClientStore } from "@/modules/void-client";

const DEEP_LINK_EVENT = "deep-link";
const MAX_DEEP_LINK_LENGTH = 512;

function getValidatedDeepLinks(payload: unknown): DeepLink[] {
  const candidates = typeof payload === "string"
    ? [payload]
    : Array.isArray(payload)
      ? payload
      : [];

  return candidates.flatMap((candidate) => {
    if (typeof candidate !== "string" || candidate.length > MAX_DEEP_LINK_LENGTH) return [];
    const parsed = parseDeepLink(candidate);
    return parsed ? [parsed] : [];
  });
}

/**
 * Native entry point for the daily-use launcher.
 *
 * The bootstrapper is a separate application and is deliberately not part of
 * this component graph. Untrusted operating-system deep links are accepted
 * only inside Tauri, validated by the strict parser, and routed to the archive.
 */
export function VoidClientApp() {
  const setActiveView = useVoidClientStore((state) => state.setActiveView);

  const routeDeepLinks = useCallback((payload: unknown) => {
    const [deepLink] = getValidatedDeepLinks(payload);
    if (!deepLink) return;

    setActiveView("mods");
  }, [setActiveView]);

  useEffect(() => {
    if (!isTauri()) return undefined;

    let disposed = false;
    let stopListening: UnlistenFn | undefined;

    void listen<unknown>(DEEP_LINK_EVENT, (event) => routeDeepLinks(event.payload))
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        stopListening = unlisten;
      })
      .catch(() => {
        // The dashboard remains usable if the native event bridge is unavailable.
      });

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, [routeDeepLinks]);

  return <VoidClient />;
}

export default VoidClientApp;
