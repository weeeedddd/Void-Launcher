import type { InstanceLoader } from "@/types";

export interface IMinecraftVersionGroup {
  major: string;
  title: string;
  era: string;
  versions: readonly string[];
  imageUrl: string;
  palette: readonly [string, string, string];
}

export const INSTANCE_LOADERS: readonly InstanceLoader[] = ["vanilla", "forge", "fabric", "neoforge", "quilt"];

const VERSION_GROUPS: readonly Omit<IMinecraftVersionGroup, "imageUrl">[] = [
  { major: "1.21", title: "Tricky Trials", era: "Trial chambers · copper · breeze", versions: ["1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21"], palette: ["#c26f38", "#157a75", "#202b32"] },
  { major: "1.20", title: "Trails & Tales", era: "Cherry groves · archaeology", versions: ["1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20"], palette: ["#df7fa0", "#7b4e35", "#243d2a"] },
  { major: "1.19", title: "The Wild Update", era: "Ancient cities · mangroves", versions: ["1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19"], palette: ["#0f5d5e", "#173a40", "#071c2b"] },
  { major: "1.18", title: "Caves & Cliffs II", era: "World height · mountain biomes", versions: ["1.18.2", "1.18.1", "1.18"], palette: ["#6f7c94", "#35445d", "#1b1727"] },
  { major: "1.17", title: "Caves & Cliffs I", era: "Copper · axolotls · geodes", versions: ["1.17.1", "1.17"], palette: ["#b66e45", "#8054a8", "#253b4a"] },
  { major: "1.16", title: "Nether Update", era: "Piglins · basalt deltas", versions: ["1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16"], palette: ["#8f1d31", "#3b1725", "#171019"] },
  { major: "1.15", title: "Buzzy Bees", era: "Bees · honey · hives", versions: ["1.15.2", "1.15.1", "1.15"], palette: ["#e4ad2d", "#72511d", "#27331c"] },
  { major: "1.14", title: "Village & Pillage", era: "Villagers · raids · bamboo", versions: ["1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"], palette: ["#77a64b", "#806447", "#243221"] },
  { major: "1.13", title: "Update Aquatic", era: "Oceans · coral · tridents", versions: ["1.13.2", "1.13.1", "1.13"], palette: ["#1589a8", "#174d76", "#081a35"] },
  { major: "1.12", title: "World of Color", era: "Concrete · parrots · recipes", versions: ["1.12.2", "1.12.1", "1.12"], palette: ["#c73e8f", "#4a78bb", "#2b193b"] },
  { major: "1.11", title: "Exploration Update", era: "Woodland mansions · shulkers", versions: ["1.11.2", "1.11.1", "1.11"], palette: ["#6f513a", "#344226", "#19161f"] },
  { major: "1.10", title: "Frostburn Update", era: "Polar bears · magma blocks", versions: ["1.10.2", "1.10.1", "1.10"], palette: ["#b8d9df", "#4c7790", "#212638"] },
  { major: "1.9", title: "Combat Update", era: "End cities · shields · elytra", versions: ["1.9.4", "1.9.3", "1.9.2", "1.9.1", "1.9"], palette: ["#9b82c4", "#514472", "#171322"] },
  { major: "1.8", title: "Bountiful Update", era: "Ocean monuments · banners", versions: ["1.8.9", "1.8.8", "1.8.7", "1.8.6", "1.8.5", "1.8.4", "1.8.3", "1.8.2", "1.8.1", "1.8"], palette: ["#337b79", "#284e58", "#18252d"] },
  { major: "1.7", title: "The Update that Changed the World", era: "Biomes · stained glass", versions: ["1.7.10", "1.7.9", "1.7.8", "1.7.7", "1.7.6", "1.7.5", "1.7.4", "1.7.3", "1.7.2"], palette: ["#477342", "#72583e", "#1c2c21"] },
  { major: "1.6", title: "Horse Update", era: "Horses · leads · hardened clay", versions: ["1.6.4", "1.6.2", "1.6.1"], palette: ["#9d724a", "#4f3828", "#21201d"] },
  { major: "1.5", title: "Redstone Update", era: "Hoppers · comparators · quartz", versions: ["1.5.2", "1.5.1", "1.5"], palette: ["#a6212c", "#5e1b26", "#23151b"] },
  { major: "1.4", title: "Pretty Scary Update", era: "Wither · witches · anvils", versions: ["1.4.7", "1.4.6", "1.4.5", "1.4.4", "1.4.2"], palette: ["#5c476d", "#35293c", "#15131a"] },
  { major: "1.3", title: "Trading & Adventure", era: "Trading · temples · emeralds", versions: ["1.3.2", "1.3.1"], palette: ["#3b7b62", "#57462f", "#1b251e"] },
  { major: "1.2", title: "Jungle Frontier", era: "Jungles · ocelots · iron golems", versions: ["1.2.5", "1.2.4", "1.2.3", "1.2.2", "1.2.1"], palette: ["#3f7130", "#6b4f2e", "#182218"] },
  { major: "1.1", title: "The First Expansion", era: "Spawn eggs · superflat · bows", versions: ["1.1"], palette: ["#7384a1", "#4e5c42", "#20242c"] },
];

export const MINECRAFT_VERSION_GROUPS: readonly IMinecraftVersionGroup[] = VERSION_GROUPS.map((group, index) => ({
  ...group,
  imageUrl: createPixelUpdateArtwork(group.major, group.title, group.palette, index),
}));

export const ALL_MINECRAFT_VERSIONS = MINECRAFT_VERSION_GROUPS.flatMap((group) => group.versions);

function createPixelUpdateArtwork(major: string, title: string, palette: readonly [string, string, string], seed: number) {
  const [accent, mid, dark] = palette;
  const towerHeight = 62 + (seed % 4) * 12;
  const moonX = 420 + (seed % 3) * 34;
  const safeTitle = escapeXml(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="#050505"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="640" height="360" fill="url(#sky)"/><circle cx="${moonX}" cy="78" r="46" fill="${accent}" opacity=".2" filter="url(#glow)"/><circle cx="${moonX}" cy="78" r="32" fill="${accent}" opacity=".42"/><path d="M0 248h72v-34h54v22h58v-68h58v44h64v-28h52v64h62v-42h64v42h76v112H0z" fill="${mid}" opacity=".78"/><path d="M0 284h86v-42h52v42h74v-${towerHeight}h62v${towerHeight}h80v-56h50v56h76v-36h64v36h96v76H0z" fill="#07070a"/><g opacity=".55" fill="${accent}"><rect x="226" y="${284 - towerHeight + 15}" width="12" height="18"/><rect x="247" y="${284 - towerHeight + 15}" width="12" height="18"/><rect x="368" y="246" width="10" height="14"/><rect x="386" y="246" width="10" height="14"/></g><path d="M0 302L640 214v146H0z" fill="#050505" opacity=".7"/><text x="34" y="58" fill="#fff" font-family="monospace" font-size="34" font-weight="900">${major}</text><text x="35" y="87" fill="${accent}" font-family="monospace" font-size="14" font-weight="700" letter-spacing="2">${safeTitle.toUpperCase()}</text><path d="M34 104h190" stroke="${accent}" stroke-width="3" opacity=".7"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
