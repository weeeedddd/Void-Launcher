import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

export interface IInstallerProgress {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: string;
}

export interface IInstallClientResult {
  installedExecutable: string;
  version: string;
}

interface IRawInstallerProgress {
  downloadedBytes?: unknown;
  totalBytes?: unknown;
  percentage?: unknown;
  status?: unknown;
}

const INSTALLER_PROGRESS_EVENT = "installer-progress";

export function isNativeRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeProgress(payload: IRawInstallerProgress): IInstallerProgress {
  const downloadedBytes = finiteNonNegative(payload.downloadedBytes);
  const totalBytes = finiteNonNegative(payload.totalBytes);
  const derivedPercentage = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
  const suppliedPercentage = finiteNonNegative(payload.percentage);
  const percentage = Math.min(100, Math.max(0, suppliedPercentage || derivedPercentage));
  const rawStatus = typeof payload.status === "string" ? payload.status : "Downloading Void Client payload...";
  const status = rawStatus.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 120);

  return {
    downloadedBytes,
    totalBytes,
    percentage,
    status: status || "Downloading Void Client payload...",
  };
}

export async function getDefaultInstallPath(): Promise<string> {
  return invoke<string>("get_default_install_path");
}

export async function chooseInstallDirectory(defaultPath: string): Promise<string | null> {
  const selection = await open({
    directory: true,
    multiple: false,
    defaultPath,
    title: "Choose the Void Launcher installation directory",
  });

  if (selection === null) return null;
  return Array.isArray(selection) ? selection[0] ?? null : selection;
}

export async function subscribeToInstallerProgress(
  onProgress: (progress: IInstallerProgress) => void,
): Promise<UnlistenFn> {
  return listen<IRawInstallerProgress>(INSTALLER_PROGRESS_EVENT, (event) => {
    onProgress(normalizeProgress(event.payload));
  });
}

export async function installClient(installationDir: string): Promise<IInstallClientResult> {
  return invoke<IInstallClientResult>("install_client", { installationDir });
}

export async function finishAndLaunch(): Promise<void> {
  await invoke<void>("finish_and_launch");
}

export async function minimizeInstallerWindow(): Promise<void> {
  await getCurrentWindow().minimize();
}

export async function closeInstallerWindow(): Promise<void> {
  await getCurrentWindow().close();
}
