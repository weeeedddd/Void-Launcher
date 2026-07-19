import { useEffect, useRef } from "react";

/**
 * Declarative `setInterval` (Dan Abramov pattern). Powers the dashboard's
 * browser-only live simulations — ping jitter, the Discord elapsed timer —
 * without stale-closure bugs. Pass `delayMs = null` to pause.
 */
export function useInterval(callback: () => void, delayMs: number | null) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
