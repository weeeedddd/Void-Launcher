import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function minimizeCurrentWindow(): void {
  if (!isTauri()) return;
  void getCurrentWindow().minimize();
}

export function toggleCurrentWindowMaximized(): void {
  if (!isTauri()) return;
  void getCurrentWindow().toggleMaximize();
}

export function closeCurrentWindow(): void {
  if (!isTauri()) return;
  void getCurrentWindow().close();
}
