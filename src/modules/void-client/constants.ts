import type { IFriendEntry, IModCatalogItem, INewsEntry, SettingsSection, VoidView } from "./types";
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
  { id: "dashboard", label: "Command Center", eyebrow: "Overview", icon: "dashboard" },
  { id: "mods", label: "Shadow Archive", eyebrow: "Mod Hub", icon: "mods" },
  { id: "telemetry", label: "Battle Metrics", eyebrow: "Telemetry", icon: "telemetry" },
  { id: "settings", label: "Tuning Matrix", eyebrow: "Cid Kagenou", icon: "settings" },
  { id: "chronicle", label: "The Chronicle", eyebrow: "Cult of Diablos", icon: "chronicle" },
] as const;

export const SETTINGS_NAVIGATION: readonly ISettingsNavigationItem[] = [
  { id: "general", label: "General", description: "Client behavior and cache" },
  { id: "launch", label: "Launch", description: "Game and Java doctrine" },
  { id: "mission", label: "Mission Control", description: "Notifications and recovery" },
  { id: "rpc", label: "RPC", description: "Discord presence protocol" },
  { id: "privacy", label: "Privacy", description: "Consent and data boundaries" },
] as const;

export const MOD_CATALOG: readonly IModCatalogItem[] = [
  {
    id: "prominence-ii",
    name: "Prominence II: Hasturian Era",
    creator: "LunaPixel Studios",
    description: "A dense progression experience with bosses, dimensions and a carefully tuned combat loop.",
    version: "v3.1.8",
    gameVersion: "1.20.1",
    source: "curseforge",
    kind: "modpack",
    accent: "violet",
    downloads: "8.4M",
  },
  {
    id: "fabulously-optimized",
    name: "Fabulously Optimized",
    creator: "The FO Team",
    description: "A lightweight performance stack focused on fast startup, smooth frames and broad compatibility.",
    version: "v7.1.0",
    gameVersion: "1.21.1",
    source: "modrinth",
    kind: "modpack",
    accent: "blue",
    downloads: "12.7M",
  },
  {
    id: "complementary-reimagined",
    name: "Complementary Reimagined",
    creator: "EminGTR",
    description: "Cinematic lighting with excellent performance and a restrained, readable visual identity.",
    version: "r5.4",
    gameVersion: "1.21.x",
    source: "modrinth",
    kind: "shader",
    accent: "amber",
    downloads: "18.2M",
  },
  {
    id: "all-the-mods-10",
    name: "All the Mods 10",
    creator: "ATM Team",
    description: "A vast NeoForge collection shaped around automation, exploration and endgame mastery.",
    version: "v4.12",
    gameVersion: "1.21.1",
    source: "curseforge",
    kind: "modpack",
    accent: "crimson",
    downloads: "6.9M",
  },
  {
    id: "bliss",
    name: "Bliss Shaders",
    creator: "Xonk",
    description: "Atmospheric skies, volumetric clouds and shadow-rich color grading for cinematic worlds.",
    version: "v2.0.4",
    gameVersion: "1.21.x",
    source: "modrinth",
    kind: "shader",
    accent: "violet",
    downloads: "3.8M",
  },
  {
    id: "better-mc",
    name: "Better MC [NeoForge]",
    creator: "LunaPixel Studios",
    description: "Vanilla-plus exploration rebuilt with new biomes, structures, creatures and progression systems.",
    version: "v38",
    gameVersion: "1.21.1",
    source: "curseforge",
    kind: "modpack",
    accent: "blue",
    downloads: "5.1M",
  },
] as const;

export const NEWS_ENTRIES: readonly INewsEntry[] = [
  {
    id: "awakening-protocol",
    category: "Client Update",
    title: "The Awakening Protocol is now active",
    summary: "A new startup sequence, hardened account switching and native runtime telemetry enter the Void.",
    date: "20 July 2026",
    readTime: "4 min read",
    chapter: "Chronicle 01",
    body: [
      "The launcher now opens with a deliberate awakening sequence that prepares audio, visual layers and local runtime state before the command center mounts.",
      "Account switching has been rebuilt around explicit identity states. Microsoft identities remain tied to native authentication, while offline identities are visually separated and restricted to the local simulation flow.",
      "The new telemetry surface uses deterministic sampling to keep motion stable under React Strict Mode while still feeling alive at gaming refresh rates.",
    ],
  },
  {
    id: "native-engine",
    category: "Engineering",
    title: "Native Engine: forged beneath the interface",
    summary: "Java selection, Windows process isolation and verified game files now share one launch doctrine.",
    date: "18 July 2026",
    readTime: "6 min read",
    chapter: "Chronicle 02",
    body: [
      "The native layer resolves the correct Java runtime for each Minecraft generation and launches through the windowless Java executable on Windows.",
      "Game metadata, libraries, assets and loader artifacts are validated before execution. Authentication material remains on the Rust side and is never exposed to the React WebView.",
      "Every launch failure now returns a readable error to the command center, replacing silent black screens with actionable feedback.",
    ],
  },
  {
    id: "shadow-archive",
    category: "Archive",
    title: "The Shadow Archive opens its first vault",
    summary: "Modrinth and CurseForge discoveries now share a focused, source-aware browsing surface.",
    date: "15 July 2026",
    readTime: "3 min read",
    chapter: "Chronicle 03",
    body: [
      "The Archive separates source, content type and installation state without burying the player beneath enterprise-style controls.",
      "Install actions move through an explicit three-second preparation sequence so every card communicates progress, completion and repeat interaction consistently.",
      "The catalog architecture is ready to be replaced by native search results without changing the card or progress contracts.",
    ],
  },
  {
    id: "diablos-signal",
    category: "World Signal",
    title: "A signal beneath the capital",
    summary: "Strange readings appear across the network as the next seasonal chapter approaches.",
    date: "12 July 2026",
    readTime: "5 min read",
    chapter: "Chronicle 04",
    body: [
      "Telemetry relays detected synchronized latency drops across several community routes shortly before midnight.",
      "The event has been catalogued as a harmless seasonal teaser, though the repeating violet signature remains under observation.",
      "More details will surface through the Chronicle as the deployment window moves closer.",
    ],
  },
] as const;

export const FRIENDS: readonly IFriendEntry[] = [
  { id: "kitten-slayer", username: "KittenSlayer99", status: "Playing Bedwars", online: true },
  { id: "dark-knight", username: "DarkKnight_AT", status: "Building a modpack", online: true },
  { id: "violet-kitsune", username: "VioletKitsune", status: "In the Shadow Archive", online: true },
  { id: "abyss-walker", username: "AbyssWalker_13", status: "Last seen 34m ago", online: false },
] as const;

export const DEFAULT_JVM_ARGUMENTS = "-Xms2G -Xmx12G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=50 -XX:+UseStringDeduplication";
