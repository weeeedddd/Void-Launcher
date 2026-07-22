import type { INewsEntry, SettingsSection, VoidView } from "./types";
import type { ShadowGlyphName } from "./components/ShadowGlyph";

export interface INavigationItem {
  id: VoidView;
  label: string;
  eyebrow: string;
  icon: ShadowGlyphName;
}

export interface ISettingsNavigationItem {
  id: SettingsSection;
  label: string;
  description: string;
}

export const NAVIGATION_ITEMS: readonly INavigationItem[] = [
  { id: "dashboard", label: "Home", eyebrow: "", icon: "dashboard" },
  { id: "deployments", label: "Instances", eyebrow: "", icon: "vault" },
  { id: "mods", label: "Mods", eyebrow: "", icon: "mods" },
  { id: "telemetry", label: "Performance", eyebrow: "", icon: "telemetry" },
  { id: "chronicle", label: "News", eyebrow: "", icon: "chronicle" },
  { id: "settings", label: "Settings", eyebrow: "", icon: "settings" },
] as const;

export const SETTINGS_NAVIGATION: readonly ISettingsNavigationItem[] = [
  { id: "general", label: "General", description: "Client behavior and cache" },
  { id: "launch", label: "Game & Java", description: "Runtime and display" },
  { id: "mission", label: "Notifications", description: "Alerts and recovery" },
  { id: "rpc", label: "Discord", description: "Rich Presence" },
  { id: "privacy", label: "Privacy", description: "Consent and data boundaries" },
] as const;

/**
 * Release notes bundled with this exact launcher build. These are product
 * documentation, not a fabricated network feed; live project data comes only
 * from the native Modrinth and CurseForge clients.
 */
export const NEWS_ENTRIES: readonly INewsEntry[] = [
  {
    id: "native-launch-pipeline",
    category: "Engineering",
    title: "Native Minecraft launch pipeline connected",
    summary: "Verified Microsoft sessions now flow through the Rust service into the real Minecraft installer and windowless Java process.",
    date: "22 July 2026",
    readTime: "3 min read",
    chapter: "Release note 01",
    body: [
      "The launch action no longer has an offline, preview, or simulated success branch. A valid Microsoft Minecraft session is required before the native service resolves game assets and starts the selected instance.",
      "Fabric, Forge, NeoForge, Quilt, and Vanilla profiles are resolved by the native launcher. On Windows the game starts with javaw.exe, so no command prompt remains open behind the launcher.",
      "Mission Control receives launcher phases and the game process stdout exposed by the launch library. Authentication tokens remain in Rust memory and the Windows-encrypted session store.",
    ],
  },
  {
    id: "live-content-catalog",
    category: "Content",
    title: "Live Modrinth and CurseForge catalogs",
    summary: "The archive now uses paged native API searches and verified downloads instead of a finite bundled card list.",
    date: "22 July 2026",
    readTime: "2 min read",
    chapter: "Release note 02",
    body: [
      "Search, filters, pagination, project details, and install actions are backed by the selected platform API. When one provider is unavailable, the interface identifies the responding source instead of inventing fallback results.",
      "CurseForge credentials are encrypted with the current Windows user account and never returned to React after they are saved.",
      "Downloaded mods, shaders, and modpack dependencies are validated before being written into a selected local instance.",
    ],
  },
  {
    id: "flat-dashboard",
    category: "Interface",
    title: "Tactical command deck interface deployed",
    summary: "The daily-use client now uses a rigid three-column operations grid and a dedicated bottom deployment deck.",
    date: "22 July 2026",
    readTime: "2 min read",
    chapter: "Release note 03",
    body: [
      "The dashboard now separates live files, release intelligence, squad status, and native telemetry into a sharp high-tech e-sports workspace. Launch control remains fixed in a dedicated bottom command deck.",
      "Instance, content, telemetry, and settings panels use bounded scroll regions so controls stay reachable at common desktop window sizes.",
      "Hardware values are sampled by the native service. Metrics the launcher cannot currently measure, such as in-game FPS or server ping, are explicitly left unavailable.",
    ],
  },
] as const;

export const DEFAULT_JVM_ARGUMENTS = "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=50 -XX:+UseStringDeduplication";
