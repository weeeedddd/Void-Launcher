import type { IModCatalogItem, INewsEntry, SettingsSection, VoidView } from "./types";
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
  { id: "dashboard", label: "Home", eyebrow: "Overview", icon: "dashboard" },
  { id: "deployments", label: "Instances", eyebrow: "Minecraft", icon: "vault" },
  { id: "mods", label: "Shadow Archive", eyebrow: "Content", icon: "mods" },
  { id: "telemetry", label: "Performance", eyebrow: "System", icon: "telemetry" },
  { id: "settings", label: "Settings", eyebrow: "Launcher", icon: "settings" },
  { id: "chronicle", label: "News", eyebrow: "Updates", icon: "chronicle" },
  { id: "systems", label: "Shadow Systems", eyebrow: "AAA Suite", icon: "spark" },
] as const;

export const SETTINGS_NAVIGATION: readonly ISettingsNavigationItem[] = [
  { id: "general", label: "General", description: "Client behavior and cache" },
  { id: "launch", label: "Game & Java", description: "Runtime and display" },
  { id: "mission", label: "Notifications", description: "Alerts and recovery" },
  { id: "rpc", label: "Discord", description: "Rich Presence" },
  { id: "privacy", label: "Privacy", description: "Consent and data boundaries" },
] as const;

export const MOD_CATALOG: readonly IModCatalogItem[] = [
  {
    id: "prominence-ii", name: "Prominence II: Hasturian Era", creator: "LunaPixel Studios",
    description: "Bosses, dimensions and a carefully tuned dark-fantasy combat loop.", version: "v3.1.8",
    gameVersion: "1.20.1", source: "curseforge", kind: "modpack", category: "Adventure", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-18", downloadCount: 8_400_000, accent: "violet", downloads: "8.4M",
  },
  {
    id: "fabulously-optimized", name: "Fabulously Optimized", creator: "The FO Team",
    description: "A lightweight performance stack focused on fast startup and smooth frames.", version: "v7.1.0",
    gameVersion: "1.21.1", source: "modrinth", kind: "modpack", category: "Optimization", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-20", downloadCount: 12_700_000, accent: "blue", downloads: "12.7M",
  },
  {
    id: "all-the-mods-10", name: "All the Mods 10", creator: "ATM Team",
    description: "Automation, exploration and endgame mastery inside one vast collection.", version: "v4.12",
    gameVersion: "1.21.1", source: "curseforge", kind: "modpack", category: "Technology", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-14", downloadCount: 6_900_000, accent: "crimson", downloads: "6.9M",
  },
  {
    id: "better-mc", name: "Better MC: Shadow Edition", creator: "LunaPixel Studios",
    description: "Vanilla-plus exploration rebuilt with biomes, structures and creatures.", version: "v38",
    gameVersion: "1.21.1", source: "curseforge", kind: "modpack", category: "Vanilla+", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-11", downloadCount: 5_100_000, accent: "blue", downloads: "5.1M",
  },
  {
    id: "vault-hunters", name: "Vault Hunters: Eclipse", creator: "Iskallia",
    description: "A progression-driven vault expedition with relics, talents and risk.", version: "v4.8.2",
    gameVersion: "1.20.1", source: "curseforge", kind: "modpack", category: "RPG", loader: "Forge",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-06-28", downloadCount: 4_800_000, accent: "amber", downloads: "4.8M",
  },
  {
    id: "dawncraft", name: "DawnCraft: Fallen Kingdom", creator: "DawnCraft Team",
    description: "A combat-first adventure pack with quests, bosses and guarded ruins.", version: "v2.0.14",
    gameVersion: "1.18.2", source: "curseforge", kind: "modpack", category: "Adventure", loader: "Forge",
    imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-06-22", downloadCount: 3_600_000, accent: "crimson", downloads: "3.6M",
  },
  {
    id: "create-above-beyond", name: "Create: Above the Veil", creator: "Simibubi Collective",
    description: "Mechanical automation and engineering puzzles with a focused quest path.", version: "v1.9.6",
    gameVersion: "1.20.1", source: "modrinth", kind: "modpack", category: "Technology", loader: "Forge",
    imageUrl: "https://images.unsplash.com/photo-1487875961445-47a00398c267?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-02", downloadCount: 2_900_000, accent: "amber", downloads: "2.9M",
  },
  {
    id: "cobblemon-void", name: "Cobblemon: Void League", creator: "Mythic Network",
    description: "Creature collecting, exploration and competitive progression for Fabric.", version: "v1.4.0",
    gameVersion: "1.21.1", source: "modrinth", kind: "modpack", category: "Multiplayer", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-16", downloadCount: 2_300_000, accent: "violet", downloads: "2.3M",
  },
  {
    id: "stoneblock-3", name: "StoneBlock III: Abyss", creator: "FTB",
    description: "A subterranean technology challenge built around automation and discovery.", version: "v1.12.1",
    gameVersion: "1.18.2", source: "curseforge", kind: "modpack", category: "Skyblock", loader: "Forge",
    imageUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-05-30", downloadCount: 7_200_000, accent: "blue", downloads: "7.2M",
  },
  {
    id: "enigmatica-void", name: "Enigmatica: Void", creator: "Enigmatica",
    description: "Expert progression with deep crafting chains and isolated world states.", version: "v0.9.9",
    gameVersion: "1.21.1", source: "modrinth", kind: "modpack", category: "Expert", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-09", downloadCount: 1_800_000, accent: "violet", downloads: "1.8M",
  },
  {
    id: "sodium", name: "Sodium", creator: "CaffeineMC",
    description: "A modern rendering engine engineered for high frame rates and low latency.", version: "v0.6.9",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Optimization", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-19", downloadCount: 48_200_000, accent: "blue", downloads: "48.2M",
  },
  {
    id: "iris", name: "Iris Shaders", creator: "Iris Team",
    description: "Shader compatibility paired with a performance-focused rendering pipeline.", version: "v1.8.8",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Visual", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-17", downloadCount: 32_400_000, accent: "violet", downloads: "32.4M",
  },
  {
    id: "jei", name: "Just Enough Items", creator: "mezz",
    description: "A precise item and recipe index for complex modded instances.", version: "v19.21.0",
    gameVersion: "1.21.1", source: "curseforge", kind: "mod", category: "Utility", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-15", downloadCount: 210_000_000, accent: "amber", downloads: "210M",
  },
  {
    id: "create", name: "Create", creator: "simibubi",
    description: "Kinetic contraptions, automation and expressive mechanical engineering.", version: "v6.0.6",
    gameVersion: "1.21.1", source: "curseforge", kind: "mod", category: "Technology", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-13", downloadCount: 92_600_000, accent: "crimson", downloads: "92.6M",
  },
  {
    id: "emi", name: "EMI", creator: "Emi",
    description: "A compact recipe viewer designed for speed and extensibility.", version: "v1.1.18",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Utility", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-12", downloadCount: 18_900_000, accent: "blue", downloads: "18.9M",
  },
  {
    id: "voice-chat", name: "Simple Voice Chat", creator: "henkelmax",
    description: "Proximity voice channels with privacy controls for multiplayer worlds.", version: "v2.6.1",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Social", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-10", downloadCount: 26_500_000, accent: "violet", downloads: "26.5M",
  },
  {
    id: "distant-horizons", name: "Distant Horizons", creator: "James Seibel",
    description: "Level-of-detail terrain rendering for massive, readable horizons.", version: "v2.3.0",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Visual", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-08", downloadCount: 21_100_000, accent: "amber", downloads: "21.1M",
  },
  {
    id: "applied-energistics", name: "Applied Energistics 2", creator: "AE2 Team",
    description: "Networked storage and automation for high-complexity technical instances.", version: "v19.2.8",
    gameVersion: "1.21.1", source: "curseforge", kind: "mod", category: "Technology", loader: "NeoForge",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-07", downloadCount: 130_000_000, accent: "blue", downloads: "130M",
  },
  {
    id: "farmers-delight", name: "Farmer's Delight", creator: "vectorwing",
    description: "A grounded cooking and farming expansion with tactile progression.", version: "v1.2.7",
    gameVersion: "1.20.1", source: "curseforge", kind: "mod", category: "Food", loader: "Forge",
    imageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-06-29", downloadCount: 119_000_000, accent: "crimson", downloads: "119M",
  },
  {
    id: "lithium", name: "Lithium", creator: "CaffeineMC",
    description: "Server and game logic optimization with a conservative compatibility profile.", version: "v0.14.8",
    gameVersion: "1.21.1", source: "modrinth", kind: "mod", category: "Optimization", loader: "Fabric",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-06", downloadCount: 41_600_000, accent: "violet", downloads: "41.6M",
  },
  {
    id: "complementary-reimagined", name: "Complementary Reimagined", creator: "EminGTR",
    description: "Cinematic lighting with excellent performance and restrained color grading.", version: "r5.4",
    gameVersion: "1.21.1", source: "modrinth", kind: "shader", category: "Cinematic", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-20", downloadCount: 18_200_000, accent: "amber", downloads: "18.2M",
  },
  {
    id: "bliss", name: "Bliss Shaders", creator: "Xonk",
    description: "Atmospheric skies, volumetric clouds and shadow-rich world lighting.", version: "v2.0.4",
    gameVersion: "1.21.1", source: "modrinth", kind: "shader", category: "Cinematic", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-17", downloadCount: 3_800_000, accent: "violet", downloads: "3.8M",
  },
  {
    id: "bsl", name: "BSL Shaders", creator: "capttatsu",
    description: "Warm cinematic lighting, soft shadows and recognizable atmospheric color.", version: "v10.1",
    gameVersion: "1.21.1", source: "curseforge", kind: "shader", category: "Realistic", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-15", downloadCount: 42_700_000, accent: "amber", downloads: "42.7M",
  },
  {
    id: "solas", name: "Solas Shader", creator: "Septonious",
    description: "Dramatic clouds, colored lighting and deep night-time silhouettes.", version: "v3.2",
    gameVersion: "1.21.1", source: "modrinth", kind: "shader", category: "Fantasy", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-12", downloadCount: 2_600_000, accent: "crimson", downloads: "2.6M",
  },
  {
    id: "super-duper-vanilla", name: "Super Duper Vanilla", creator: "eldeston",
    description: "A faithful visual upgrade with clean water, skies and balanced bloom.", version: "v1.3.7",
    gameVersion: "1.20.1", source: "modrinth", kind: "shader", category: "Vanilla+", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-10", downloadCount: 5_900_000, accent: "blue", downloads: "5.9M",
  },
  {
    id: "project-luma", name: "ProjectLUMA", creator: "Dedelner",
    description: "High-contrast skies and polished reflections for dramatic landscapes.", version: "v1.54",
    gameVersion: "1.20.1", source: "curseforge", kind: "shader", category: "Realistic", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-06-25", downloadCount: 8_200_000, accent: "violet", downloads: "8.2M",
  },
  {
    id: "makeup-ultra-fast", name: "MakeUp Ultra Fast", creator: "X0nk",
    description: "Configurable visuals designed to preserve frame rate on modest hardware.", version: "v9.2a",
    gameVersion: "1.21.1", source: "modrinth", kind: "shader", category: "Performance", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-18", downloadCount: 11_800_000, accent: "blue", downloads: "11.8M",
  },
  {
    id: "astralex", name: "AstraLex", creator: "LexBoosT",
    description: "Stylized celestial skies and vivid fantasy lighting for showcase worlds.", version: "v98.0",
    gameVersion: "1.21.1", source: "curseforge", kind: "shader", category: "Fantasy", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-04", downloadCount: 7_400_000, accent: "crimson", downloads: "7.4M",
  },
  {
    id: "photon", name: "Photon Shader", creator: "sixthsurge",
    description: "Physically inspired lighting with exceptional cloud and water rendering.", version: "v1.1",
    gameVersion: "1.21.1", source: "modrinth", kind: "shader", category: "Realistic", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1497436072909-f5e4be1713c0?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-07-14", downloadCount: 4_100_000, accent: "amber", downloads: "4.1M",
  },
  {
    id: "insanity", name: "Insanity Shader", creator: "ElocinDev",
    description: "A horror-focused visual profile with oppressive fog and hostile darkness.", version: "v1.7.1",
    gameVersion: "1.20.1", source: "curseforge", kind: "shader", category: "Horror", loader: "Iris",
    imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=960&q=82",
    updatedAt: "2026-06-18", downloadCount: 3_300_000, accent: "crimson", downloads: "3.3M",
  },
] as const;

export const NEWS_ENTRIES: readonly INewsEntry[] = [
  {
    id: "awakening-update",
    category: "Client Update",
    title: "The Awakening update is now available",
    summary: "A refined startup sequence, secure account switching and clearer performance reporting arrive in Void Launcher.",
    date: "20 July 2026",
    readTime: "4 min read",
    chapter: "Chronicle 01",
    body: [
      "The launcher now opens with a focused startup sequence that prepares audio, visual layers and local runtime state before the dashboard appears.",
      "Account switching has been rebuilt around verified Microsoft identities. Authentication tokens remain inside the encrypted native store and never cross into the React interface.",
      "The performance view uses stable sampling to keep motion smooth under React Strict Mode while still feeling responsive at gaming refresh rates.",
    ],
  },
  {
    id: "native-engine",
    category: "Engineering",
    title: "Native Engine: forged beneath the interface",
    summary: "Java selection, Windows process isolation and verified game files now share one reliable launch flow.",
    date: "18 July 2026",
    readTime: "6 min read",
    chapter: "Chronicle 02",
    body: [
      "The native layer resolves the correct Java runtime for each Minecraft generation and launches through the windowless Java executable on Windows.",
      "Game metadata, libraries, assets and loader artifacts are validated before execution. Authentication material remains on the Rust side and is never exposed to the React WebView.",
      "Every launch failure now returns a readable error to the live console, replacing silent black screens with actionable feedback.",
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
      "Network checks detected synchronized latency drops across several community routes shortly before midnight.",
      "The event has been catalogued as a harmless seasonal teaser, though the repeating violet signature remains under observation.",
      "More details will surface through the Chronicle as the deployment window moves closer.",
    ],
  },
] as const;

export const DEFAULT_JVM_ARGUMENTS = "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=50 -XX:+UseStringDeduplication";
