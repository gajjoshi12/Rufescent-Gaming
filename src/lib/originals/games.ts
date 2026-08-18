import type { OriginalConfig } from "./types";

/**
 * The Originals line-up.
 *
 * `edge` is the only economic dial: the paytables in ./math are derived
 * from it, so RTP below is `100 * (1 - edge)` by construction.
 */
export const ORIGINALS: OriginalConfig[] = [
  {
    slug: "ember-aviator",
    kind: "crash",
    name: "Ember Aviator",
    subtitle: "Ride the curve — bail before it burns",
    edge: 0.03,
    minBet: 5,
    maxBet: 25_000,
    maxWin: 10_000,
    volatility: "high",
    glyph: "✈",
    theme: {
      backdrop:
        "radial-gradient(ellipse 120% 90% at 18% 100%, #4a1016 0%, #240a12 45%, #0a0509 100%)",
      accent: "#f95d51",
      accent2: "#f5b418",
      glow: "rgba(249,93,81,0.32)",
    },
    howTo: [
      "Place a stake while the boarding clock runs.",
      "The multiplier climbs from 1.00x — cash out any time.",
      "If the flight burns out first, the stake is lost.",
    ],
  },
  {
    slug: "molten-mines",
    kind: "mines",
    name: "Molten Mines",
    subtitle: "Twenty-five tiles, you choose the danger",
    edge: 0.03,
    minBet: 5,
    maxBet: 15_000,
    maxWin: 24_000,
    volatility: "medium",
    glyph: "◈",
    theme: {
      backdrop:
        "radial-gradient(ellipse 100% 80% at 50% 0%, #123f36 0%, #0a2220 46%, #05100f 100%)",
      accent: "#2fd98a",
      accent2: "#38d8ff",
      glow: "rgba(47,217,138,0.28)",
    },
    howTo: [
      "Bury between 1 and 24 mines — more mines, steeper ladder.",
      "Every safe tile lifts your cash-out multiplier.",
      "Cash out whenever. Strike a mine and the round ends.",
    ],
  },
  {
    slug: "prism-plinko",
    kind: "plinko",
    name: "Prism Plinko",
    subtitle: "Drop the bead, take the slot it finds",
    edge: 0.03,
    minBet: 5,
    maxBet: 12_000,
    maxWin: 1_000,
    volatility: "medium",
    glyph: "◇",
    theme: {
      backdrop:
        "radial-gradient(ellipse 100% 85% at 50% -5%, #2b1a5e 0%, #170e33 48%, #080516 100%)",
      accent: "#c88bff",
      accent2: "#4db8ff",
      glow: "rgba(200,139,255,0.30)",
    },
    howTo: [
      "Pick a row count and a risk profile.",
      "The bead takes a coin-flip at every pin.",
      "Outer slots pay the most and are the hardest to reach.",
    ],
  },
  {
    slug: "dune-dice",
    kind: "dice",
    name: "Dune Dice",
    subtitle: "Set your own odds, roll against them",
    edge: 0.03,
    minBet: 5,
    maxBet: 20_000,
    maxWin: 48,
    volatility: "low",
    glyph: "⬢",
    theme: {
      backdrop:
        "radial-gradient(ellipse 110% 90% at 50% 0%, #5a3c10 0%, #2a1c08 48%, #0d0904 100%)",
      accent: "#f5b418",
      accent2: "#ff8f85",
      glow: "rgba(245,180,24,0.28)",
    },
    howTo: [
      "Drag the slider to set your win chance.",
      "Longer odds pay more — the edge never moves.",
      "Roll under (or over) the target to win.",
    ],
  },
  {
    slug: "gilded-wheel",
    kind: "wheel",
    name: "Gilded Wheel",
    subtitle: "Twenty segments, three temperaments",
    edge: 0.03,
    minBet: 5,
    maxBet: 10_000,
    maxWin: 19.4,
    volatility: "high",
    glyph: "✷",
    theme: {
      backdrop:
        "radial-gradient(ellipse 100% 85% at 50% 0%, #0f3a52 0%, #08202e 48%, #030b12 100%)",
      accent: "#38d8ff",
      accent2: "#f5b418",
      glow: "rgba(56,216,255,0.28)",
    },
    howTo: [
      "Low risk pays often and small.",
      "High risk leaves a single live segment.",
      "The pointer is fixed — the wheel finds it.",
    ],
  },
];

export function findOriginal(slug: string): OriginalConfig | undefined {
  return ORIGINALS.find((g) => g.slug === slug);
}

/** Catalogue slugs backed by an Originals engine. */
export const ORIGINAL_SLUGS = new Set(ORIGINALS.map((g) => g.slug));

/** Advertised RTP, derived rather than declared. */
export function originalRtp(config: OriginalConfig): number {
  return (1 - config.edge) * 100;
}
