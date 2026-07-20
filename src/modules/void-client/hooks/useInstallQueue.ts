import { useCallback, useEffect, useRef, useState } from "react";
import type { IInstallState } from "../types";

const IDLE_INSTALL_STATE: IInstallState = { phase: "idle", progress: 0 };

export function useInstallQueue() {
  const [installations, setInstallations] = useState<Record<string, IInstallState>>({});
  const timersRef = useRef(new Map<string, number>());

  const install = useCallback((itemId: string) => {
    const activeTimer = timersRef.current.get(itemId);
    if (activeTimer !== undefined) return;

    setInstallations((current) => ({
      ...current,
      [itemId]: { phase: "installing", progress: 0 },
    }));

    const timer = window.setInterval(() => {
      setInstallations((current) => {
        const currentState = current[itemId] ?? IDLE_INSTALL_STATE;
        const nextProgress = Math.min(100, currentState.progress + 3);
        if (nextProgress === 100) {
          const completedTimer = timersRef.current.get(itemId);
          if (completedTimer !== undefined) window.clearInterval(completedTimer);
          timersRef.current.delete(itemId);
          return { ...current, [itemId]: { phase: "installed", progress: 100 } };
        }
        return { ...current, [itemId]: { phase: "installing", progress: nextProgress } };
      });
    }, 90);

    timersRef.current.set(itemId, timer);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearInterval(timer));
    timersRef.current.clear();
  }, []);

  const getInstallState = useCallback(
    (itemId: string) => installations[itemId] ?? IDLE_INSTALL_STATE,
    [installations],
  );

  return { install, getInstallState };
}
