/**
 * Payout maths for the Originals.
 *
 * Every table here is *derived* from the game's house edge rather than
 * hand-typed, so a change to `edge` moves the whole paytable and the RTP
 * stays honest. Where a table is rounded for display, `*Rtp()` reports the
 * return of the rounded table — not the ideal it was derived from.
 */

import type { RiskLevel } from "./types";

/* ============================================================
   Shared helpers
   ============================================================ */

/** n choose k, in floating point. Exact for the ranges used here. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  const m = Math.min(k, n - k);
  for (let i = 0; i < m; i++) result = (result * (n - i)) / (i + 1);
  return result;
}

/** Round to `dp`, avoiding the usual binary-float dust. */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(value * f + Number.EPSILON) / f;
}

/**
 * Display rounding for multipliers. The rounded value is what the board
 * prints *and* what it pays, so the two can never disagree; the drift this
 * introduces is folded back into the `*Rtp()` figures rather than hidden.
 */
function roundMultiplier(m: number): number {
  return m < 100 ? round(m, 2) : Math.round(m);
}

/* ============================================================
   Mines — 5x5 grid, `mines` buried, cash out after `picks`
   ============================================================ */

export const MINES_TILES = 25;

/**
 * Probability of surviving `picks` reveals with `mines` buried.
 * Hypergeometric: every safe tile removes one from both pools.
 */
export function minesSurvival(mines: number, picks: number, tiles = MINES_TILES): number {
  const safe = tiles - mines;
  if (picks > safe) return 0;
  return choose(safe, picks) / choose(tiles, picks);
}

/** Cash-out multiplier after `picks` safe reveals. `picks` of 0 pays nothing. */
export function minesMultiplier(mines: number, picks: number, edge: number): number {
  if (picks <= 0) return 1;
  const p = minesSurvival(mines, picks);
  if (p <= 0) return 0;
  return round((1 - edge) / p, 2);
}

/** Full ladder, index 0 = one pick. Used by the payout table sheet. */
export function minesLadder(mines: number, edge: number): number[] {
  const safe = MINES_TILES - mines;
  return Array.from({ length: safe }, (_, i) => minesMultiplier(mines, i + 1, edge));
}

/* ============================================================
   Crash — the multiplier curve for Ember Aviator
   ============================================================ */

/**
 * Draw a crash point from a uniform float.
 *
 * P(crash >= x) = (1 - edge) / x, so cashing out at any x returns
 * exactly (1 - edge) in expectation — the edge is the slice of rounds
 * that bust instantly at 1.00x.
 */
export function crashPoint(u: number, edge: number, cap: number): number {
  const bust = 1 - u;
  if (bust <= 0) return cap;
  const raw = (1 - edge) / bust;
  // Floor rather than round: a 2.999x curve must not settle as 3.00x.
  return Math.min(cap, Math.max(1, Math.floor(raw * 100) / 100));
}

/** Multiplier shown at `ms` into the flight. Tuned to feel like a real board. */
export function crashCurve(ms: number): number {
  return Math.max(1, 1.0000618 ** ms);
}

/** Inverse of `crashCurve` — when a given multiplier is reached. */
export function crashCurveTime(multiplier: number): number {
  return Math.log(Math.max(1, multiplier)) / Math.log(1.0000618);
}

/* ============================================================
   Plinko — binomial bins, shaped by risk
   ============================================================ */

export const PLINKO_ROWS = [8, 12, 16] as const;
export type PlinkoRows = (typeof PLINKO_ROWS)[number];

/** How hard the payout curve bends away from the centre. */
const PLINKO_SHAPE: Record<RiskLevel, number> = { low: 0.35, medium: 0.56, high: 0.8 };

/** Probability of landing in each bin, left to right. */
export function plinkoProbabilities(rows: number): number[] {
  const total = 2 ** rows;
  return Array.from({ length: rows + 1 }, (_, i) => choose(rows, i) / total);
}

/**
 * Bin payouts. Raw shape is `(1/p)^alpha`, then the whole row is scaled so
 * `sum(p_i * m_i)` lands on the target RTP before display rounding.
 */
export function plinkoPayouts(rows: number, risk: RiskLevel, edge: number): number[] {
  const probabilities = plinkoProbabilities(rows);
  const alpha = PLINKO_SHAPE[risk];
  const raw = probabilities.map((p) => (1 / p) ** alpha);
  const expectation = probabilities.reduce((sum, p, i) => sum + p * raw[i], 0);
  const scale = (1 - edge) / expectation;
  const table = raw.map((r) => roundMultiplier(r * scale));

  // Rounding to two decimals costs the most in the centre bins, which carry
  // most of the probability — on a 12-row board that alone moved the return
  // by a third of a point. The residual is pushed back into the centre slot,
  // where one hundredth of a multiplier is worth the most.
  const centre = Math.floor(rows / 2);
  const achieved = probabilities.reduce((sum, p, i) => sum + p * table[i], 0);
  const correction = round((1 - edge - achieved) / probabilities[centre], 2);
  table[centre] = Math.max(0, round(table[centre] + correction, 2));

  return table;
}

/** Actual return of the rounded table, as a percentage. */
export function plinkoRtp(rows: number, risk: RiskLevel, edge: number): number {
  const probabilities = plinkoProbabilities(rows);
  const payouts = plinkoPayouts(rows, risk, edge);
  return probabilities.reduce((sum, p, i) => sum + p * payouts[i], 0) * 100;
}

/* ============================================================
   Dice — roll under a target on a 0.00-99.99 scale
   ============================================================ */

export const DICE_MIN_CHANCE = 2;
export const DICE_MAX_CHANCE = 98;

export function diceMultiplier(chance: number, edge: number): number {
  const c = Math.min(DICE_MAX_CHANCE, Math.max(DICE_MIN_CHANCE, chance));
  return round(((1 - edge) * 100) / c, 4);
}

/** Uniform float to a 0.00-99.99 roll. */
export function diceRoll(u: number): number {
  return Math.floor(u * 10_000) / 100;
}

/* ============================================================
   Wheel — 20 segments, shape set by risk
   ============================================================ */

export const WHEEL_SEGMENTS = 20;

/**
 * Relative segment weights. Zeros are losing segments; the non-zero
 * values are scaled together so the wheel returns `1 - edge`.
 */
const WHEEL_SHAPE: Record<RiskLevel, number[]> = {
  low: [0, 1, 0, 1, 0, 1.2, 0, 1, 0, 1.5, 0, 1, 0, 1.2, 0, 1, 0, 1, 0, 2],
  medium: [0, 0, 1.5, 0, 0, 2, 0, 0, 3, 0, 0, 1.5, 0, 0, 4, 0, 0, 2, 0, 8],
  high: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
};

export function wheelPayouts(risk: RiskLevel, edge: number): number[] {
  const shape = WHEEL_SHAPE[risk];
  const total = shape.reduce((a, b) => a + b, 0);
  const scale = ((1 - edge) * shape.length) / total;
  return shape.map((s) => (s === 0 ? 0 : roundMultiplier(s * scale)));
}

/** Actual return of the rounded wheel, as a percentage. */
export function wheelRtp(risk: RiskLevel, edge: number): number {
  const payouts = wheelPayouts(risk, edge);
  return (payouts.reduce((a, b) => a + b, 0) / payouts.length) * 100;
}

/** Distinct multipliers on the wheel, richest first — for the legend. */
export function wheelLegend(risk: RiskLevel, edge: number): { multiplier: number; count: number }[] {
  const payouts = wheelPayouts(risk, edge);
  const counts = new Map<number, number>();
  for (const m of payouts) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts.entries()]
    .map(([multiplier, count]) => ({ multiplier, count }))
    .sort((a, b) => b.multiplier - a.multiplier);
}
