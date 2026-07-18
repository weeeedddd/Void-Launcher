import type { Platform } from "@/types";

/**
 * Deep links let the website (or a chat message) open the launcher:
 *
 *   voidlauncher://mod/modrinth/sodium
 *   voidlauncher://modpack/curseforge/875401
 *
 * The scheme is registered by the installer (see tauri.conf.json →
 * plugins.deep-link); the Rust side forwards incoming URLs as a
 * "deep-link" event which App.tsx consumes.
 */
export interface DeepLink {
  kind: "mod" | "modpack";
  platform: Platform;
  projectId: string;
}

/**
 * Strict parser — deep links are UNTRUSTED input (anyone can put a
 * voidlauncher:// link on a website), so we only accept the exact grammar
 * and a conservative id charset, and never execute anything from the URL.
 */
export function parseDeepLink(url: string): DeepLink | null {
  const match = /^voidlauncher:\/\/(mod|modpack)\/(modrinth|curseforge)\/([A-Za-z0-9_.-]{1,64})\/?$/.exec(
    url.trim(),
  );
  if (!match) return null;
  return {
    kind: match[1] as DeepLink["kind"],
    platform: match[2] as Platform,
    projectId: match[3],
  };
}
