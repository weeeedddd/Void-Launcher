import { useEffect, useState } from "react";
import type { ITelemetrySnapshot } from "../types";

const HISTORY_LENGTH = 26;

function clampMetric(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function buildInitialHistory(center: number, amplitude: number) {
  return Array.from({ length: HISTORY_LENGTH }, (_, index) =>
    clampMetric(center + Math.sin(index * 0.58) * amplitude, 4, 96),
  );
}

const INITIAL_SNAPSHOT: ITelemetrySnapshot = {
  cpu: 34,
  ram: 57,
  ping: 24,
  fps: 238,
  cpuHistory: buildInitialHistory(34, 12),
  ramHistory: buildInitialHistory(57, 7),
};

export function useTelemetry() {
  const [snapshot, setSnapshot] = useState<ITelemetrySnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      const cpu = clampMetric(38 + Math.sin(tick * 0.71) * 17 + Math.sin(tick * 0.19) * 8, 8, 91);
      const ram = clampMetric(58 + Math.sin(tick * 0.31) * 6 + Math.cos(tick * 0.13) * 3, 38, 79);
      const ping = clampMetric(42 + Math.sin(tick * 0.47) * 27 + Math.cos(tick * 0.21) * 12, 18, 104);
      const fps = clampMetric(238 - cpu * 0.72 + Math.sin(tick * 0.37) * 18, 116, 276);

      setSnapshot((previous) => ({
        cpu,
        ram,
        ping,
        fps,
        cpuHistory: [...previous.cpuHistory.slice(-(HISTORY_LENGTH - 1)), cpu],
        ramHistory: [...previous.ramHistory.slice(-(HISTORY_LENGTH - 1)), ram],
      }));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, []);

  return snapshot;
}

export function createTelemetryPath(values: readonly number[], width = 320, height = 104) {
  if (values.length === 0) return "";
  const horizontalStep = width / Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = index * horizontalStep;
      const y = height - (Math.min(100, Math.max(0, value)) / 100) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
