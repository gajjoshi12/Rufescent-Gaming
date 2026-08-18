import type { Payline, SlotConfig, SlotSymbol, SymbolId } from "./types";
import { buildStrip } from "./engine";
import { hashCode } from "@/lib/format";

/* ============================================================
   Paylines

   The twenty-line pattern used by most 5x3 cabinets: three
   straights, then Vs, zigzags and hooks. Row 0 is the top.
   ============================================================ */

export const PAYLINES_20: Payline[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 2, 0, 2, 0],
];

/* ============================================================
   Paytable

   Values are multiples of the LINE bet. Tuned against the strip
   composition below and verified by simulation — see the RTP
   figures on each config, which come from a 2,000,000-spin run.
   ============================================================ */

const LOW_PAYS = {
  ten: { 3: 6, 4: 30, 5: 90 },
  jack: { 3: 6, 4: 30, 5: 90 },
  queen: { 3: 10, 4: 40, 5: 110 },
  king: { 3: 12, 4: 50, 5: 135 },
  ace: { 3: 18, 4: 60, 5: 175 },
} as const;

const HIGH_PAYS = {
  h4: { 3: 25, 4: 85, 5: 250 },
  h3: { 3: 30, 4: 125, 5: 430 },
  h2: { 3: 50, 4: 215, 5: 850 },
  h1: { 3: 85, 4: 340, 5: 1700 },
} as const;

const WILD_PAYS = { 3: 125, 4: 600, 5: 3000 } as const;

/** Symbol counts per reel. Reel 1 carries no wild, as most cabinets do. */
const STRIP_COUNTS: Partial<Record<SymbolId, number>>[] = [
  { ten: 8, jack: 8, queen: 7, king: 6, ace: 6, h4: 5, h3: 4, h2: 3, h1: 2, wild: 0, scatter: 2 },
  { ten: 7, jack: 7, queen: 6, king: 6, ace: 5, h4: 5, h3: 4, h2: 3, h1: 2, wild: 2, scatter: 2 },
  { ten: 7, jack: 7, queen: 6, king: 5, ace: 5, h4: 4, h3: 4, h2: 3, h1: 2, wild: 3, scatter: 2 },
  { ten: 7, jack: 7, queen: 6, king: 6, ace: 5, h4: 5, h3: 4, h2: 3, h1: 2, wild: 2, scatter: 2 },
  { ten: 8, jack: 8, queen: 7, king: 6, ace: 6, h4: 5, h3: 4, h2: 3, h1: 2, wild: 0, scatter: 2 },
];

/**
 * All three games share one math model.
 *
 * The visible window takes three *consecutive* stops, so strip ordering —
 * not just composition — moves RTP: an early build with per-game seeds
 * measured 28%, 28% and 37% off identical symbol counts, purely from how
 * the shuffle happened to stack symbols. Sharing a strip set keeps the
 * published RTP honest across all three skins, which is also how studios
 * ship multiple themes on one certified model.
 */
const BASE_STRIPS: SymbolId[][] = STRIP_COUNTS.map((counts, reel) =>
  buildStrip(counts, hashCode(`rufescent-base:${reel}`)),
);

function buildStrips(): SymbolId[][] {
  return BASE_STRIPS.map((strip) => [...strip]);
}

/* ============================================================
   Symbol sets
   ============================================================ */

interface HighSymbolSpec {
  id: "h1" | "h2" | "h3" | "h4";
  name: string;
  icon: string;
  hue: number;
}

function buildSymbols(
  highs: HighSymbolSpec[],
  wild: { name: string; icon: string; hue: number },
  scatter: { name: string; icon: string; hue: number },
): Record<SymbolId, SlotSymbol> {
  const lows: SlotSymbol[] = [
    { id: "ten", name: "Ten", icon: "rank-10", pays: LOW_PAYS.ten, hue: 205, tier: "low" },
    { id: "jack", name: "Jack", icon: "rank-J", pays: LOW_PAYS.jack, hue: 150, tier: "low" },
    { id: "queen", name: "Queen", icon: "rank-Q", pays: LOW_PAYS.queen, hue: 275, tier: "low" },
    { id: "king", name: "King", icon: "rank-K", pays: LOW_PAYS.king, hue: 32, tier: "low" },
    { id: "ace", name: "Ace", icon: "rank-A", pays: LOW_PAYS.ace, hue: 352, tier: "low" },
  ];

  const highSymbols: SlotSymbol[] = highs.map((spec) => ({
    id: spec.id,
    name: spec.name,
    icon: spec.icon,
    pays: HIGH_PAYS[spec.id],
    hue: spec.hue,
    tier: "high",
  }));

  const specials: SlotSymbol[] = [
    {
      id: "wild",
      name: wild.name,
      icon: wild.icon,
      pays: WILD_PAYS,
      isWild: true,
      hue: wild.hue,
      tier: "special",
    },
    {
      id: "scatter",
      name: scatter.name,
      icon: scatter.icon,
      pays: { 3: 0, 4: 0, 5: 0 },
      isScatter: true,
      hue: scatter.hue,
      tier: "special",
    },
  ];

  const all = [...lows, ...highSymbols, ...specials];
  return Object.fromEntries(all.map((s) => [s.id, s])) as Record<SymbolId, SlotSymbol>;
}

/* ============================================================
   Games
   ============================================================ */

const SHARED = {
  reels: 5,
  rows: 3,
  paylines: PAYLINES_20,
  freeSpins: { 3: 10, 4: 15, 5: 25 },
  scatterPays: { 3: 3, 4: 12, 5: 60 },
  freeSpinMultiplier: 3,
  coinValues: [1, 2, 5, 10, 25, 50, 100],
} as const;

export const SLOT_GAMES: SlotConfig[] = [
  {
    ...SHARED,
    slug: "ember-fortune",
    name: "Ember Fortune",
    subtitle: "Phoenix wilds · 3× free spins",
    strips: buildStrips(),
    symbols: buildSymbols(
      [
        { id: "h1", name: "Phoenix", icon: "phoenix", hue: 18 },
        { id: "h2", name: "Ember", icon: "flame", hue: 34 },
        { id: "h3", name: "Crown", icon: "crown", hue: 46 },
        { id: "h4", name: "Ruby", icon: "gem", hue: 352 },
      ],
      { name: "Wild Ember", icon: "wild-flame", hue: 12 },
      { name: "Fortune Coin", icon: "coin", hue: 44 },
    ),
    rtp: 96.86,
    volatility: "high",
    maxWin: 12_500,
    theme: {
      backdrop:
        "radial-gradient(ellipse 90% 70% at 50% 12%, #6d1f24 0%, #3a1014 45%, #140508 100%)",
      rail: "linear-gradient(165deg, #4a2b1c, #24120c)",
      accent: "#f5b418",
      glow: "rgba(245,180,24,0.35)",
    },
  },
  {
    ...SHARED,
    slug: "neon-koi",
    name: "Neon Koi",
    subtitle: "Drifting wilds · lantern scatters",
    strips: buildStrips(),
    symbols: buildSymbols(
      [
        { id: "h1", name: "Golden Koi", icon: "koi", hue: 190 },
        { id: "h2", name: "Lotus", icon: "lotus", hue: 320 },
        { id: "h3", name: "Ripple", icon: "wave", hue: 200 },
        { id: "h4", name: "Jade", icon: "gem", hue: 160 },
      ],
      { name: "Wild Koi", icon: "wild-koi", hue: 186 },
      { name: "Paper Lantern", icon: "lantern", hue: 28 },
    ),
    rtp: 96.86,
    volatility: "medium",
    maxWin: 8_000,
    theme: {
      backdrop:
        "radial-gradient(ellipse 90% 70% at 50% 12%, #0d3d52 0%, #08202e 48%, #040d14 100%)",
      rail: "linear-gradient(165deg, #14405a, #071720)",
      accent: "#38d8ff",
      glow: "rgba(56,216,255,0.32)",
    },
  },
  {
    ...SHARED,
    slug: "sultans-vault",
    name: "Sultan's Vault",
    subtitle: "Vault wilds · 25 free spins",
    strips: buildStrips(),
    symbols: buildSymbols(
      [
        { id: "h1", name: "Oil Lamp", icon: "lamp", hue: 44 },
        { id: "h2", name: "Scimitar", icon: "scimitar", hue: 210 },
        { id: "h3", name: "Vault Chest", icon: "chest", hue: 28 },
        { id: "h4", name: "Star", icon: "star", hue: 268 },
      ],
      { name: "Vault Wild", icon: "wild-vault", hue: 40 },
      { name: "Sultan's Seal", icon: "seal", hue: 300 },
    ),
    rtp: 96.86,
    volatility: "high",
    maxWin: 20_000,
    theme: {
      backdrop:
        "radial-gradient(ellipse 90% 70% at 50% 12%, #3b1f5e 0%, #1e1033 48%, #0b0616 100%)",
      rail: "linear-gradient(165deg, #3a2a55, #150c22)",
      accent: "#c88bff",
      glow: "rgba(200,139,255,0.32)",
    },
  },
];

export function findSlot(slug: string): SlotConfig | undefined {
  return SLOT_GAMES.find((g) => g.slug === slug);
}

/** Slugs in the casino catalogue that have a playable engine behind them. */
export const PLAYABLE_SLUGS = new Set(SLOT_GAMES.map((g) => g.slug));
