/**
 * Simulated data for the browser-only dashboard.
 * No backend, no Tauri — everything here is static seed data that the
 * widgets animate/mutate locally (ping jitter, install flips, etc.).
 */

export interface MockInstance {
  id: string;
  name: string;
  loader: "Fabric" | "NeoForge" | "Forge" | "Quilt";
  version: string;
  mods: number;
  installed: boolean;
  /** Accent color for the instance banner. */
  accent: string;
  /** JVM summary shown under the PLAY button. */
  java: string;
}

export const INSTANCES: MockInstance[] = [
  { id: "atomic", name: "Atomic SMP", loader: "Fabric", version: "1.21.1", mods: 68, installed: true, accent: "#7B2CBF", java: "Java 21 · 8 GB" },
  { id: "shadow", name: "Shadow Realms", loader: "NeoForge", version: "1.21.1", mods: 214, installed: false, accent: "#3C096C", java: "Java 21 · 12 GB" },
  { id: "garden", name: "Shadow Garden", loader: "Quilt", version: "1.20.1", mods: 132, installed: true, accent: "#5A18B0", java: "Java 17 · 10 GB" },
];

export interface MockServer {
  name: string;
  host: string;
  region: string;
  basePing: number;
  players: number;
}

export const SERVERS: MockServer[] = [
  { name: "Hypixel Network", host: "mc.hypixel.net", region: "NA", basePing: 24, players: 41203 },
  { name: "Atomic SMP", host: "play.atomic.gg", region: "EU", basePing: 18, players: 88 },
  { name: "CubeCraft Games", host: "play.cubecraft.net", region: "EU", basePing: 96, players: 12880 },
];
