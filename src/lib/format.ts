import type { OddsFormat } from "./types";

/* ============================================================
   Deterministic randomness
   Mock data is generated on both server and client, so every
   value must come from a seeded stream — Math.random() here
   would produce hydration mismatches.
   ============================================================ */

/** Mulberry32 — small, fast, and stable across runtimes. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string → 32-bit hash, for deriving seeds from ids. */
export function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ============================================================
   Odds conversion
   ============================================================ */

/** Greatest common divisor, used to reduce fractional odds. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Decimal → fractional. Uses the standard bookmaker fraction ladder
 * first (so 2.5 renders as 6/4, not 3/2, matching UK boards) and
 * falls back to a reduced approximation for prices off the ladder.
 */
export function toFractional(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "0/1";
  const profit = decimal - 1;

  const ladder: [number, string][] = [
    [0.02, "1/50"], [0.04, "1/25"], [0.05, "1/20"], [0.0625, "1/16"],
    [0.08, "2/25"], [0.1, "1/10"], [0.111, "1/9"], [0.125, "1/8"],
    [0.143, "1/7"], [0.167, "1/6"], [0.2, "1/5"], [0.222, "2/9"],
    [0.25, "1/4"], [0.286, "2/7"], [0.3, "3/10"], [0.333, "1/3"],
    [0.364, "4/11"], [0.4, "2/5"], [0.444, "4/9"], [0.5, "1/2"],
    [0.533, "8/15"], [0.571, "4/7"], [0.6, "3/5"], [0.615, "8/13"],
    [0.667, "4/6"], [0.727, "8/11"], [0.8, "4/5"], [0.833, "5/6"],
    [0.909, "10/11"], [1, "1/1"], [1.1, "11/10"], [1.2, "6/5"],
    [1.25, "5/4"], [1.375, "11/8"], [1.5, "6/4"], [1.625, "13/8"],
    [1.75, "7/4"], [1.875, "15/8"], [2, "2/1"], [2.2, "11/5"],
    [2.25, "9/4"], [2.5, "5/2"], [2.75, "11/4"], [3, "3/1"],
    [3.25, "13/4"], [3.5, "7/2"], [4, "4/1"], [4.5, "9/2"],
    [5, "5/1"], [5.5, "11/2"], [6, "6/1"], [7, "7/1"], [8, "8/1"],
    [9, "9/1"], [10, "10/1"], [11, "11/1"], [12, "12/1"],
    [14, "14/1"], [16, "16/1"], [20, "20/1"], [25, "25/1"],
    [33, "33/1"], [40, "40/1"], [50, "50/1"], [66, "66/1"],
    [100, "100/1"],
  ];

  let best = ladder[0];
  let bestDelta = Infinity;
  for (const entry of ladder) {
    const delta = Math.abs(entry[0] - profit);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  // Within 1.5% of a ladder rung: use the conventional fraction.
  if (bestDelta <= Math.max(0.015, profit * 0.015)) return best[1];

  const denominator = 100;
  const numerator = Math.round(profit * denominator);
  const divisor = gcd(numerator, denominator) || 1;
  return `${numerator / divisor}/${denominator / divisor}`;
}

/** Decimal → American moneyline. */
export function toAmerican(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—";
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
}

/** Render a decimal price in the viewer's chosen format. */
export function formatOdds(decimal: number, format: OddsFormat): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—";
  switch (format) {
    case "fractional":
      return toFractional(decimal);
    case "american":
      return toAmerican(decimal);
    default:
      return decimal.toFixed(2);
  }
}

/** Implied probability of a decimal price, as a percentage. */
export function impliedProbability(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0;
  return (1 / decimal) * 100;
}

/* ============================================================
   Money & numbers
   ============================================================ */

export const CURRENCY = "₹";

export function formatMoney(amount: number, opts: { decimals?: boolean; sign?: boolean } = {}): string {
  const { decimals = true, sign = false } = opts;
  const abs = Math.abs(amount);
  const body = abs.toLocaleString("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  const prefix = sign ? (amount < 0 ? "−" : "+") : amount < 0 ? "−" : "";
  return `${prefix}${CURRENCY}${body}`;
}

/** Compact liquidity/prize figures: 12500 → "12.5K", 2400000 → "24L". */
export function formatCompact(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(amount % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(amount % 100_000 === 0 ? 0 : 1)}L`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
  return `${Math.round(amount)}`;
}

/* ============================================================
   Bet maths
   ============================================================ */

/** Back bet: stake returns stake × odds. Lay bet: you risk liability. */
export function backReturn(stake: number, odds: number): number {
  return stake * odds;
}
export function backProfit(stake: number, odds: number): number {
  return stake * (odds - 1);
}
/** Laying at `odds` for `stake` exposes you to this much. */
export function layLiability(stake: number, odds: number): number {
  return stake * (odds - 1);
}

/** Combined price of a parlay/accumulator. */
export function parlayOdds(oddsList: number[]): number {
  return oddsList.reduce((acc, o) => acc * o, 1);
}

/* ============================================================
   Time
   ============================================================ */

/**
 * "Starts in 2h 14m" / "Live" / "Tomorrow 19:30".
 * `now` is injected so server and client agree during hydration.
 */
export function formatKickoff(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const diff = t - now;
  if (diff <= 0) return "In play";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Tomorrow" : `in ${days}d`;
}

export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatClockTime(iso)}`;
}

/* ============================================================
   Misc
   ============================================================ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Tailwind class merge without the dependency — last-wins on duplicates is not needed here. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Generated cover art gradient for casino tiles and avatars. */
export function hueGradient(hue: number, spread = 42): string {
  return `linear-gradient(145deg, hsl(${hue} 82% 46%) 0%, hsl(${(hue + spread) % 360} 74% 28%) 55%, hsl(${(hue + spread * 2) % 360} 62% 14%) 100%)`;
}
