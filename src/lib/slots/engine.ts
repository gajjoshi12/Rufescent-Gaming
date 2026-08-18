import type { Payline, SlotConfig, SpinOutcome, SymbolId, WinLine } from "./types";

/* ============================================================
   Spin

   A real cabinet picks one stop per reel from a physical strip.
   The strip composition — how many of each symbol, and how they
   are spaced — is what actually sets hit frequency and RTP, so
   the maths lives in the strips rather than in a payout fudge.
   ============================================================ */

/** Visible window for a reel, wrapping around the end of the strip. */
export function windowFor(strip: SymbolId[], stop: number, rows: number): SymbolId[] {
  const out: SymbolId[] = [];
  for (let r = 0; r < rows; r++) out.push(strip[(stop + r) % strip.length]);
  return out;
}

export function spin(config: SlotConfig, random: () => number): SpinOutcome {
  const stops = config.strips.map((strip) => Math.floor(random() * strip.length));
  const grid = config.strips.map((strip, i) => windowFor(strip, stops[i], config.rows));
  return evaluate(config, grid, stops, 1, 1);
}

/* ============================================================
   Evaluation
   ============================================================ */

/**
 * Score a grid. `lineBet` is the stake per payline and `multiplier`
 * is the free-spin enhancement applied to every win.
 */
export function evaluate(
  config: SlotConfig,
  grid: SymbolId[][],
  stops: number[],
  lineBet: number,
  multiplier: number,
): SpinOutcome {
  const lines: WinLine[] = [];
  const totalBet = lineBet * config.paylines.length;

  config.paylines.forEach((line, lineIndex) => {
    const win = scoreLine(config, grid, line, lineIndex, lineBet, multiplier);
    if (win) lines.push(win);
  });

  /* --- Scatters pay from anywhere on the grid --- */
  const scatterPositions: { reel: number; row: number }[] = [];
  for (let reel = 0; reel < config.reels; reel++) {
    for (let row = 0; row < config.rows; row++) {
      if (config.symbols[grid[reel][row]]?.isScatter) scatterPositions.push({ reel, row });
    }
  }

  const scatterCount = scatterPositions.length;
  const scatterMultiple = config.scatterPays[scatterCount] ?? 0;
  const scatterWin = scatterMultiple * totalBet * multiplier;

  if (scatterWin > 0) {
    lines.push({
      lineIndex: -1,
      symbolId: "scatter",
      count: scatterCount,
      positions: scatterPositions,
      amount: scatterWin,
    });
  }

  const freeSpinsAwarded = config.freeSpins[scatterCount] ?? 0;
  const totalWin = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    stops,
    grid,
    lines,
    scatterCount,
    scatterWin,
    freeSpinsAwarded,
    totalWin,
    winMultiple: totalBet > 0 ? totalWin / totalBet : 0,
  };
}

/**
 * Score a single payline: count matching symbols from reel 0 leftward,
 * letting wilds stand in for anything but a scatter.
 */
function scoreLine(
  config: SlotConfig,
  grid: SymbolId[][],
  line: Payline,
  lineIndex: number,
  lineBet: number,
  multiplier: number,
): WinLine | null {
  const first = grid[0][line[0]];
  const firstSymbol = config.symbols[first];
  if (!firstSymbol || firstSymbol.isScatter) return null;

  // A line opening with wilds takes whichever pays more: the wild's own
  // prize, or the first natural symbol it substitutes for.
  const candidates: SymbolId[] = firstSymbol.isWild
    ? [...new Set(["wild" as SymbolId, findFirstNatural(config, grid, line)].filter(Boolean) as SymbolId[])]
    : [first];

  let best: WinLine | null = null;

  for (const candidate of candidates) {
    const symbol = config.symbols[candidate];
    if (!symbol || symbol.isScatter) continue;

    const positions: { reel: number; row: number }[] = [];
    let count = 0;

    for (let reel = 0; reel < config.reels; reel++) {
      const id = grid[reel][line[reel]];
      const cell = config.symbols[id];
      const matches = id === candidate || (cell?.isWild && !symbol.isScatter);
      if (!matches) break;
      positions.push({ reel, row: line[reel] });
      count++;
    }

    if (count < 3) continue;
    const pay = symbol.pays[count as 3 | 4 | 5] ?? 0;
    if (pay <= 0) continue;

    const amount = pay * lineBet * multiplier;
    if (!best || amount > best.amount) {
      best = { lineIndex, symbolId: candidate, count, positions, amount };
    }
  }

  return best;
}

/** First non-wild, non-scatter symbol along a line. */
function findFirstNatural(
  config: SlotConfig,
  grid: SymbolId[][],
  line: Payline,
): SymbolId | null {
  for (let reel = 0; reel < config.reels; reel++) {
    const id = grid[reel][line[reel]];
    const symbol = config.symbols[id];
    if (symbol && !symbol.isWild && !symbol.isScatter) return id;
  }
  return null;
}

/* ============================================================
   Strip construction
   ============================================================ */

/**
 * Build a reel strip from a symbol->count map, spacing repeats out so
 * identical symbols rarely land stacked. Real strips are hand-tuned;
 * this keeps them reproducible while avoiding obvious clumping.
 */
export function buildStrip(counts: Partial<Record<SymbolId, number>>, seed: number): SymbolId[] {
  const pool: SymbolId[] = [];
  for (const [id, count] of Object.entries(counts) as [SymbolId, number][]) {
    for (let i = 0; i < count; i++) pool.push(id);
  }

  // Deterministic shuffle.
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // One de-clumping pass: push a symbol along if it repeats immediately.
  for (let i = 1; i < pool.length; i++) {
    if (pool[i] !== pool[i - 1]) continue;
    const swap = pool.findIndex(
      (s, j) => j > i && s !== pool[i] && s !== pool[(i + 1) % pool.length],
    );
    if (swap > -1) [pool[i], pool[swap]] = [pool[swap], pool[i]];
  }

  return pool;
}

/* ============================================================
   Verification

   Monte Carlo over the real spin path. Used by the test script to
   confirm the strips actually deliver the advertised RTP rather
   than taking the number on trust.
   ============================================================ */

export interface SimulationResult {
  spins: number;
  totalStaked: number;
  totalReturned: number;
  rtp: number;
  hitFrequency: number;
  freeSpinTriggers: number;
  biggestWinMultiple: number;
}

export function simulate(
  config: SlotConfig,
  spins: number,
  random: () => number,
): SimulationResult {
  const lineBet = 1;
  const totalBet = lineBet * config.paylines.length;

  let staked = 0;
  let returned = 0;
  let hits = 0;
  let triggers = 0;
  let biggest = 0;

  for (let i = 0; i < spins; i++) {
    staked += totalBet;

    const stops = config.strips.map((strip) => Math.floor(random() * strip.length));
    const grid = config.strips.map((strip, r) => windowFor(strip, stops[r], config.rows));
    const outcome = evaluate(config, grid, stops, lineBet, 1);

    returned += outcome.totalWin;
    if (outcome.totalWin > 0) hits++;
    biggest = Math.max(biggest, outcome.winMultiple);

    // Free spins are played out at the same stake, cost-free.
    if (outcome.freeSpinsAwarded > 0) {
      triggers++;
      let remaining = outcome.freeSpinsAwarded;
      let guard = 0;
      while (remaining > 0 && guard < 500) {
        guard++;
        remaining--;
        const fsStops = config.strips.map((strip) => Math.floor(random() * strip.length));
        const fsGrid = config.strips.map((strip, r) => windowFor(strip, fsStops[r], config.rows));
        const fs = evaluate(config, fsGrid, fsStops, lineBet, config.freeSpinMultiplier);
        returned += fs.totalWin;
        biggest = Math.max(biggest, fs.winMultiple * config.freeSpinMultiplier);
        // Retriggers, capped by the guard above.
        remaining += fs.freeSpinsAwarded;
      }
    }
  }

  return {
    spins,
    totalStaked: staked,
    totalReturned: returned,
    rtp: (returned / staked) * 100,
    hitFrequency: (hits / spins) * 100,
    freeSpinTriggers: triggers,
    biggestWinMultiple: biggest,
  };
}
