/**
 * Seed data for "The Void" communications hub (browser-only, no backend).
 * Widgets mutate copies of this locally — sending a message just appends to
 * component state.
 */

export interface ChatMessage {
  id: string;
  author: string;
  color: string;
  role?: string;
  text: string;
  time: string;
}

export interface TextChannel {
  id: string;
  name: string;
  topic: string;
  seed: ChatMessage[];
}

export interface VoiceMember {
  name: string;
  color: string;
}

export interface VoiceChannel {
  id: string;
  name: string;
  members: VoiceMember[];
}

export interface DiscordMessage {
  from: "me" | "them";
  text: string;
  time: string;
}

export interface DiscordDM {
  id: string;
  name: string;
  /** DM channels (name starts with "#") render a hash instead of initials. */
  presence: "online" | "idle" | "dnd" | "offline";
  color: string;
  unread?: number;
  seed: DiscordMessage[];
}

export const ME = { name: "Shadow", color: "#7B2CBF" } as const;

export const TEXT_CHANNELS: TextChannel[] = [
  {
    id: "global-shadows",
    name: "global-shadows",
    topic: "The whole garden gathers here.",
    seed: [
      { id: "m1", author: "Alpha", color: "#7B2CBF", role: "Elite", text: "Just hit a 47-day streak — the Shadow-Coins are stacking 😈", time: "21:04" },
      { id: "m2", author: "Beta", color: "#3C79FF", text: "New shader pack in #mod-workshop looks unreal on the obsidian build.", time: "21:05" },
      { id: "m3", author: "Delta", color: "#46E0A8", role: "Mod", text: "Voice up in Shadow Garden if anyone wants to run Atomic SMP.", time: "21:07" },
    ],
  },
  {
    id: "lfg-parties",
    name: "lfg-parties",
    topic: "Find a squad for Atomic SMP.",
    seed: [
      { id: "l1", author: "Gamma", color: "#E0B646", text: "2 slots open for a dungeon run, need a healer.", time: "20:51" },
      { id: "l2", author: "Epsilon", color: "#C77DFF", text: "I'll heal. Booting the client now.", time: "20:52" },
    ],
  },
  {
    id: "mod-workshop",
    name: "mod-workshop",
    topic: "Share builds, shaders & configs.",
    seed: [
      { id: "w1", author: "Aurora", color: "#FF4D6D", role: "Creator", text: "Pushed v2 of the Violet Ember shader — 20% faster on low-end GPUs.", time: "19:30" },
    ],
  },
  {
    id: "pvp-arena",
    name: "pvp-arena",
    topic: "Bragging rights only.",
    seed: [{ id: "p1", author: "Nu", color: "#9D4EDD", text: "gg last night, that clutch was insane 🔥", time: "18:12" }],
  },
];

export const VOICE_CHANNELS: VoiceChannel[] = [
  {
    id: "shadow-garden",
    name: "Shadow Garden",
    members: [
      { name: "Alpha", color: "#7B2CBF" },
      { name: "Beta", color: "#3C79FF" },
      { name: "Gamma", color: "#E0B646" },
    ],
  },
  { id: "strategy-room", name: "Strategy Room", members: [{ name: "Delta", color: "#46E0A8" }] },
  { id: "afk-void", name: "AFK Void", members: [] },
];

export const DISCORD_DMS: DiscordDM[] = [
  {
    id: "cid",
    name: "Cid_K",
    presence: "online",
    color: "#7B2CBF",
    unread: 3,
    seed: [
      { from: "them", text: "be there in 5, prepping the ritual", time: "21:02" },
      { from: "me", text: "bringing the whole garden ⚡", time: "21:03" },
      { from: "them", text: "perfect. voice channel?", time: "21:03" },
    ],
  },
  {
    id: "aurora",
    name: "Aurora_777",
    presence: "idle",
    color: "#FF4D6D",
    seed: [{ from: "them", text: "shaders are done, pushing now", time: "19:28" }],
  },
  {
    id: "nu",
    name: "Nu_Oironi",
    presence: "offline",
    color: "#9D4EDD",
    seed: [{ from: "them", text: "gg 🔥", time: "Yesterday" }],
  },
  {
    id: "announcements",
    name: "#atomic-announcements",
    presence: "online",
    color: "#46E0A8",
    unread: 9,
    seed: [{ from: "them", text: "Season 4 drops Friday — new cosmetics in the vault.", time: "17:40" }],
  },
];
