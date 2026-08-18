/**
 * Rufescent Originals — the in-house instant games.
 *
 * Unlike the licensed catalogue (which is metadata only), every game
 * described here has a real math model behind it: the payout tables in
 * `./math` are derived from the configured house edge rather than typed
 * in, so the RTP printed on the cabinet is the RTP the player gets.
 */

export type OriginalKind = "crash" | "mines" | "plinko" | "dice" | "wheel";

export type RiskLevel = "low" | "medium" | "high";

export interface OriginalTheme {
  /** Play-surface backdrop — any CSS `background` value. */
  backdrop: string;
  /** Primary accent: curve, gems, pointer. */
  accent: string;
  /** Secondary accent, used as the far end of gradients. */
  accent2: string;
  /** Bloom colour behind the surface, as rgba(). */
  glow: string;
}

export interface OriginalConfig {
  slug: string;
  kind: OriginalKind;
  name: string;
  subtitle: string;
  /** House edge as a fraction of turnover. RTP is `1 - edge`. */
  edge: number;
  /** Stake bounds, in AED. */
  minBet: number;
  maxBet: number;
  /** Headline cap, as a multiple of the stake. */
  maxWin: number;
  volatility: "low" | "medium" | "high";
  /** Single-glyph mark used on lobby tiles. */
  glyph: string;
  theme: OriginalTheme;
  /** Rules, three lines, shown beside the cabinet. */
  howTo: [string, string, string];
}

/** One settled round, kept for the history strip. */
export interface RoundResult {
  id: number;
  /** Short label: "2.41x", "BOOM", "78.20". */
  label: string;
  multiplier: number;
  stake: number;
  payout: number;
}
