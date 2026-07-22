import { api } from "@/lib/api";
import type {
  LauncherFolderKind,
  MusicProvider,
  Platform,
  StorageCategory,
} from "@/types";
import { publishLauncherNotification } from "./notificationStore";

function sourceLabel(platform: Platform) {
  return platform === "curseforge" ? "CurseForge" : "Modrinth";
}

function providerLabel(provider: MusicProvider) {
  return provider === "spotify" ? "Spotify" : "YouTube Music";
}

function publishOperationFailure(
  title: string,
  preference?: "content-installed" | "modpack-installing" | "opening-folder",
  dedupeKey?: string,
) {
  publishLauncherNotification({
    title,
    message: "The native command returned an error. The current panel contains the detailed message.",
    tone: "error",
    durationMs: 7_000,
    preference,
    dedupeKey,
  });
}

/**
 * Explicit notification-aware native operations.
 *
 * Call sites opt in to these functions instead of mutating the shared API
 * object. A completion notice is emitted only after the corresponding Tauri
 * command resolves successfully, and failures are rethrown unchanged so the
 * owning panel remains the authoritative error surface.
 */
export async function installModWithNotification(
  instanceId: string,
  platform: Platform,
  projectId: string,
) {
  const dedupeKey = `install-mod:${platform}:${projectId}:${instanceId}`;
  try {
    const installed = await api.installMod(instanceId, platform, projectId);
    publishLauncherNotification({
      title: "Mod installed",
      message: `${installed.name || projectId} was added from ${sourceLabel(platform)}.`,
      tone: "success",
      preference: "content-installed",
      dedupeKey,
    });
    return installed;
  } catch (error) {
    publishOperationFailure("Mod installation failed", "content-installed", dedupeKey);
    throw error;
  }
}

export async function installShaderWithNotification(
  instanceId: string,
  platform: Platform,
  projectId: string,
) {
  const dedupeKey = `install-shader:${platform}:${projectId}:${instanceId}`;
  try {
    const installed = await api.installShader(instanceId, platform, projectId);
    publishLauncherNotification({
      title: "Shader installed",
      message: `${installed.name || projectId} was added from ${sourceLabel(platform)}.`,
      tone: "success",
      preference: "content-installed",
      dedupeKey,
    });
    return installed;
  } catch (error) {
    publishOperationFailure("Shader installation failed", "content-installed", dedupeKey);
    throw error;
  }
}

export async function installModpackWithNotification(
  instanceId: string,
  platform: Platform,
  projectId: string,
) {
  const dedupeKey = `install-modpack:${platform}:${projectId}:${instanceId}`;
  publishLauncherNotification({
    title: "Installing modpack",
    message: `The ${sourceLabel(platform)} archive is being downloaded and imported.`,
    tone: "info",
    durationMs: 8_000,
    preference: "modpack-installing",
    dedupeKey,
  });

  try {
    const installed = await api.installModpack(instanceId, platform, projectId);
    publishLauncherNotification({
      title: "Modpack installed",
      message: `The native import completed with ${installed.filesInstalled} managed files.`,
      tone: "success",
      preference: "content-installed",
      dedupeKey,
    });
    return installed;
  } catch (error) {
    publishOperationFailure("Modpack installation failed", "modpack-installing", dedupeKey);
    throw error;
  }
}

export async function provisionModpackWithNotification(
  platform: Platform,
  projectId: string,
  instanceName: string,
) {
  const dedupeKey = `provision-modpack:${platform}:${projectId}`;
  publishLauncherNotification({
    title: "Creating modpack instance",
    message: `${instanceName} is being provisioned from ${sourceLabel(platform)}.`,
    tone: "info",
    durationMs: 8_000,
    preference: "modpack-installing",
    dedupeKey,
  });

  try {
    const provisioned = await api.provisionModpack(platform, projectId, instanceName);
    publishLauncherNotification({
      title: "Instance ready",
      message: `${provisioned.instance.name} was created by the native launcher.`,
      tone: "success",
      preference: "content-installed",
      dedupeKey,
    });
    return provisioned;
  } catch (error) {
    publishOperationFailure("Instance provisioning failed", "modpack-installing", dedupeKey);
    throw error;
  }
}

export async function connectMusicProviderWithNotification(provider: MusicProvider) {
  const dedupeKey = `oauth:music:${provider}`;
  try {
    const connection = await api.connectMusicProvider(provider);
    publishLauncherNotification({
      title: connection.connected
        ? `${providerLabel(provider)} connected`
        : `${providerLabel(provider)} authorization incomplete`,
      message: connection.connected
        ? "The native OAuth flow completed and the provider reports an active connection."
        : (connection.message || "The provider did not report an active connection."),
      tone: connection.connected ? "success" : "warning",
      dedupeKey,
    });
    return connection;
  } catch (error) {
    publishOperationFailure(`${providerLabel(provider)} authorization failed`, undefined, dedupeKey);
    throw error;
  }
}

export async function openLauncherFolderWithNotification(
  kind: LauncherFolderKind,
  instanceId?: string,
) {
  const dedupeKey = `storage:open:${kind}:${instanceId ?? "launcher"}`;
  try {
    await api.openLauncherFolder(kind, instanceId);
    publishLauncherNotification({
      title: "Folder opened",
      message: kind === "launcherLogs"
        ? "The native launcher opened its managed log folder."
        : "The native launcher opened the selected game log folder.",
      tone: "success",
      preference: "opening-folder",
      dedupeKey,
    });
  } catch (error) {
    publishOperationFailure("Could not open folder", "opening-folder", dedupeKey);
    throw error;
  }
}

export async function clearStorageCategoryWithNotification(
  category: Extract<StorageCategory, "logs" | "cache">,
) {
  const dedupeKey = `storage:clear:${category}`;
  try {
    const report = await api.clearStorageCategory(category);
    publishLauncherNotification({
      title: "Managed storage cleared",
      message: `${category === "logs" ? "Log files" : "Cached files"} were cleared and rescanned by the native launcher.`,
      tone: "success",
      preference: "opening-folder",
      dedupeKey,
    });
    return report;
  } catch (error) {
    publishOperationFailure("Could not clear managed storage", "opening-folder", dedupeKey);
    throw error;
  }
}
