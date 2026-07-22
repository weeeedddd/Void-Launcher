import type { InstanceLoader, MinecraftReleaseVersion, MinecraftVersionCatalog } from "@/types";

export interface IMinecraftVersionGroup {
  major: string;
  title: string;
  era: string;
  versions: readonly string[];
  imageUrl: string;
  palette: readonly [string, string, string];
  releaseDate: string | null;
  isLatest: boolean;
}

interface IVersionGroupDefinition {
  major: string;
  title: string;
  era: string;
  versions: readonly string[];
  palette: readonly [string, string, string];
  releaseDate: string;
}

export const INSTANCE_LOADERS: readonly InstanceLoader[] = ["vanilla", "forge", "fabric", "neoforge", "quilt"];

const VERSION_GROUPS: readonly IVersionGroupDefinition[] = [
  { major: "26.2", title: "Chaos Cubed", era: "Sulfur caves · cinnabar · sulfur cubes", versions: ["26.2"], palette: ["#D4CF42", "#756F16", "#17130A"], releaseDate: "2026-06-16T12:03:33Z" },
  { major: "26.1", title: "Tiny Takeover", era: "Baby mobs · name tags · golden dandelions", versions: ["26.1.2", "26.1.1", "26.1"], palette: ["#D6A878", "#71513B", "#17110E"], releaseDate: "2026-04-09T10:12:23Z" },
  { major: "1.21", title: "Modern Game Drops", era: "Tricky Trials · Pale Garden · Copper Age · Mounts", versions: ["1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21"], palette: ["#C77943", "#277C78", "#14232A"], releaseDate: "2025-12-09T12:23:30Z" },
  { major: "1.20", title: "Trails & Tales", era: "Cherry groves · archaeology · armor trims", versions: ["1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20"], palette: ["#D985A5", "#734A36", "#233526"], releaseDate: "2024-04-29T12:40:45Z" },
  { major: "1.19", title: "The Wild Update", era: "Ancient cities · mangroves · the Warden", versions: ["1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19"], palette: ["#1E8A84", "#214E53", "#081C28"], releaseDate: "2023-03-14T12:56:18Z" },
  { major: "1.18", title: "Caves & Cliffs II", era: "World height · mountain biomes · aquifers", versions: ["1.18.2", "1.18.1", "1.18"], palette: ["#8294B3", "#405574", "#191827"], releaseDate: "2022-02-28T10:42:45Z" },
  { major: "1.17", title: "Caves & Cliffs I", era: "Copper · axolotls · amethyst geodes", versions: ["1.17.1", "1.17"], palette: ["#C2784B", "#7354A0", "#203847"], releaseDate: "2021-07-06T12:01:34Z" },
  { major: "1.16", title: "Nether Update", era: "Piglins · basalt deltas · netherite", versions: ["1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16"], palette: ["#A72A3D", "#4A1D2C", "#150D13"], releaseDate: "2021-01-14T16:05:32Z" },
  { major: "1.15", title: "Buzzy Bees", era: "Bees · honey · hives", versions: ["1.15.2", "1.15.1", "1.15"], palette: ["#E6B331", "#76531C", "#29331A"], releaseDate: "2020-01-17T10:03:52Z" },
  { major: "1.14", title: "Village & Pillage", era: "Villagers · raids · bamboo", versions: ["1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"], palette: ["#80AB51", "#826548", "#243220"], releaseDate: "2019-07-19T09:25:47Z" },
  { major: "1.13", title: "Update Aquatic", era: "Oceans · coral · tridents", versions: ["1.13.2", "1.13.1", "1.13"], palette: ["#1996BA", "#17547F", "#081C38"], releaseDate: "2018-10-22T11:41:07Z" },
  { major: "1.12", title: "World of Color", era: "Concrete · parrots · recipes", versions: ["1.12.2", "1.12.1", "1.12"], palette: ["#C83F91", "#4E79BB", "#2A1839"], releaseDate: "2017-09-18T08:39:46Z" },
  { major: "1.11", title: "Exploration Update", era: "Woodland mansions · shulkers · llamas", versions: ["1.11.2", "1.11.1", "1.11"], palette: ["#72523A", "#38472A", "#19151E"], releaseDate: "2016-12-21T09:29:12Z" },
  { major: "1.10", title: "Frostburn Update", era: "Polar bears · magma blocks · fossils", versions: ["1.10.2", "1.10.1", "1.10"], palette: ["#B8DDE3", "#4C7892", "#202638"], releaseDate: "2016-06-23T09:17:48Z" },
  { major: "1.9", title: "Combat Update", era: "End cities · shields · elytra", versions: ["1.9.4", "1.9.3", "1.9.2", "1.9.1", "1.9"], palette: ["#9E86C8", "#524675", "#171322"], releaseDate: "2016-05-10T10:29:35Z" },
  { major: "1.8", title: "Bountiful Update", era: "Ocean monuments · banners · armor stands", versions: ["1.8.9", "1.8.8", "1.8.7", "1.8.6", "1.8.5", "1.8.4", "1.8.3", "1.8.2", "1.8.1", "1.8"], palette: ["#377F7C", "#2B515B", "#17252D"], releaseDate: "2015-12-09T09:29:49Z" },
  { major: "1.7", title: "The Update that Changed the World", era: "New biomes · stained glass · commands", versions: ["1.7.10", "1.7.9", "1.7.8", "1.7.7", "1.7.6", "1.7.5", "1.7.4", "1.7.3", "1.7.2"], palette: ["#4B7845", "#73593E", "#1B2B20"], releaseDate: "2014-06-26T13:17:31Z" },
  { major: "1.6", title: "Horse Update", era: "Horses · leads · hardened clay", versions: ["1.6.4", "1.6.2", "1.6.1"], palette: ["#A4774D", "#513A29", "#21201C"], releaseDate: "2013-09-19T15:52:37Z" },
  { major: "1.5", title: "Redstone Update", era: "Hoppers · comparators · quartz", versions: ["1.5.2", "1.5.1", "1.5"], palette: ["#B02531", "#611C27", "#23151A"], releaseDate: "2013-05-02T17:45:00Z" },
  { major: "1.4", title: "Pretty Scary Update", era: "Wither · witches · anvils", versions: ["1.4.7", "1.4.6", "1.4.5", "1.4.4", "1.4.2"], palette: ["#654C76", "#382C40", "#151219"], releaseDate: "2013-01-09T10:22:00Z" },
  { major: "1.3", title: "Trading & Adventure", era: "Trading · temples · emeralds", versions: ["1.3.2", "1.3.1"], palette: ["#408169", "#594831", "#1A251E"], releaseDate: "2012-08-16T07:00:00Z" },
  { major: "1.2", title: "Jungle Frontier", era: "Jungles · ocelots · iron golems", versions: ["1.2.5", "1.2.4", "1.2.3", "1.2.2", "1.2.1"], palette: ["#447934", "#6E5230", "#172217"], releaseDate: "2012-04-04T07:00:00Z" },
  { major: "1.1", title: "The First Expansion", era: "Spawn eggs · superflat · bows", versions: ["1.1"], palette: ["#7587A5", "#506044", "#20242C"], releaseDate: "2012-01-12T14:00:00Z" },
] as const;

const GROUP_METADATA = new Map(VERSION_GROUPS.map((group) => [group.major, group]));

export const MINECRAFT_VERSION_GROUPS: readonly IMinecraftVersionGroup[] = VERSION_GROUPS.map((group, index) => hydrateGroup(group, group.versions, group.releaseDate, index, group.major === "26.2"));

export const ALL_MINECRAFT_VERSIONS = MINECRAFT_VERSION_GROUPS.flatMap((group) => group.versions);

export function buildMinecraftVersionGroups(catalog: MinecraftVersionCatalog): readonly IMinecraftVersionGroup[] {
  const releasesByGroup = new Map<string, MinecraftReleaseVersion[]>();
  for (const release of catalog.releases) {
    const major = majorForVersion(release.id);
    const existing = releasesByGroup.get(major) ?? [];
    existing.push(release);
    releasesByGroup.set(major, existing);
  }

  return Array.from(releasesByGroup.entries()).map(([major, releases], index) => {
    const metadata = GROUP_METADATA.get(major) ?? unknownGroupDefinition(major, releases[0]?.releaseTime ?? "");
    return hydrateGroup(
      metadata,
      releases.map((release) => release.id),
      releases[0]?.releaseTime ?? metadata.releaseDate,
      index,
      releases.some((release) => release.id === catalog.latestRelease),
    );
  });
}

function majorForVersion(version: string) {
  const parts = version.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version;
}

function unknownGroupDefinition(major: string, releaseDate: string): IVersionGroupDefinition {
  const palette = paletteFromVersion(major);
  return {
    major,
    title: `Minecraft ${major}`,
    era: "Official Java Edition release",
    versions: [major],
    palette,
    releaseDate,
  };
}

function hydrateGroup(
  definition: IVersionGroupDefinition,
  versions: readonly string[],
  releaseDate: string | null,
  index: number,
  isLatest: boolean,
): IMinecraftVersionGroup {
  return {
    ...definition,
    versions,
    releaseDate,
    isLatest,
    imageUrl: createPixelUpdateArtwork(definition.palette, index),
  };
}

function paletteFromVersion(version: string): readonly [string, string, string] {
  const seed = Array.from(version).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const palettes: readonly (readonly [string, string, string])[] = [
    ["#A56BE2", "#4C3268", "#15101C"],
    ["#4FA9A0", "#285651", "#0E1C1B"],
    ["#D28A54", "#70472F", "#1E1510"],
    ["#6F8FC8", "#354867", "#111721"],
  ];
  return palettes[seed % palettes.length];
}

function createPixelUpdateArtwork(palette: readonly [string, string, string], seed: number) {
  const [highlight, middle, shadow] = palette;
  const sunX = 390 + (seed % 4) * 48;
  const ridgeOffset = (seed % 3) * 20;
  const treeX = 80 + (seed % 5) * 44;
  const water = seed % 3 === 0;
  const feature = seed % 4;
  const foreground = feature === 0
    ? `<rect x="${treeX}" y="146" width="24" height="92" fill="${shadow}"/><rect x="${treeX - 34}" y="112" width="92" height="58" fill="${middle}"/><rect x="${treeX - 18}" y="92" width="60" height="42" fill="${highlight}"/>`
    : feature === 1
      ? `<path d="M86 226v-72h34v-34h36v34h34v72z" fill="${middle}"/><rect x="123" y="86" width="30" height="30" fill="${highlight}"/><rect x="96" y="180" width="22" height="28" fill="${shadow}"/>`
      : feature === 2
        ? `<rect x="92" y="152" width="82" height="74" fill="${middle}"/><rect x="110" y="128" width="46" height="30" fill="${highlight}"/><rect x="116" y="180" width="18" height="46" fill="${shadow}"/>`
        : `<path d="M84 226l42-104 42 104z" fill="${middle}"/><path d="M111 164l15-42 16 42z" fill="${highlight}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320"><rect width="720" height="320" fill="${shadow}"/><rect width="720" height="212" fill="${middle}" opacity="0.34"/><circle cx="${sunX}" cy="74" r="42" fill="${highlight}" opacity="0.8"/><path d="M0 204L112 ${118 + ridgeOffset}l78 66 96-104 102 104 78-78 116 98 138-80v196H0z" fill="${middle}" opacity="0.72"/><path d="M0 236l92-42 72 26 86-58 104 66 92-52 114 58 160-72v158H0z" fill="${shadow}"/>${foreground}<path d="M0 238h720v82H0z" fill="${water ? middle : shadow}"/>${water ? `<path d="M0 258h720M0 282h720M0 306h720" stroke="${highlight}" stroke-width="5" opacity="0.35"/>` : `<path d="M0 254h720M0 286h720" stroke="${middle}" stroke-width="3" opacity="0.5"/>`}<g fill="${highlight}" opacity="0.55"><rect x="552" y="206" width="26" height="26"/><rect x="584" y="180" width="26" height="52"/><rect x="616" y="194" width="26" height="38"/></g><path d="M0 0h720v320H0z" fill="none" stroke="${highlight}" stroke-width="3" opacity="0.16"/></svg>`;
  const utf8Bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const byte of utf8Bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
