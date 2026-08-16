import type { Card, Rank, Seat, Suit } from "./types";
import { seeded } from "@/lib/format";

/* ============================================================
   Deck
   ============================================================ */

export const SUITS: Suit[] = ["s", "h", "d", "c"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const RANK_LABEL: Record<Rank, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
  10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

export const RANK_NAME: Record<Rank, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace",
};

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  return deck;
}

/**
 * Fisher–Yates against a seeded stream.
 *
 * A real money game would take its entropy from a certified hardware RNG and
 * publish a shuffle commitment; this is deterministic on purpose so a hand
 * replays identically on server and client.
 */
export function shuffle(deck: Card[], seed: number): Card[] {
  const rng = seeded(seed);
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/* ============================================================
   Hand evaluation

   Scores any 5–7 card holding. The result is a single comparable
   integer: category in the high digits, then up to five kickers in
   descending significance, each base-16.
   ============================================================ */

export const HAND_CATEGORIES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];

export interface HandResult {
  score: number;
  category: HandCategory;
  label: string;
  /** The exact five cards that make the hand, for highlighting. */
  best: Card[];
}

function encode(categoryIndex: number, kickers: number[]): number {
  let score = categoryIndex;
  for (let i = 0; i < 5; i++) score = score * 16 + (kickers[i] ?? 0);
  return score;
}

/** Highest straight in a rank set, honouring the wheel (A-2-3-4-5). */
function straightHigh(ranks: Set<number>): number | null {
  const has = (r: number) => ranks.has(r);
  for (let high = 14; high >= 5; high--) {
    if (has(high) && has(high - 1) && has(high - 2) && has(high - 3) && has(high - 4)) {
      return high;
    }
  }
  // Wheel: the ace plays low.
  if (has(14) && has(2) && has(3) && has(4) && has(5)) return 5;
  return null;
}

function pick(cards: Card[], ranks: number[], limit = 5): Card[] {
  const out: Card[] = [];
  for (const rank of ranks) {
    const found = cards.find((c) => c.rank === rank && !out.includes(c));
    if (found) out.push(found);
    if (out.length === limit) break;
  }
  return out;
}

export function evaluate(cards: Card[]): HandResult {
  const byRank = new Map<number, Card[]>();
  const bySuit = new Map<Suit, Card[]>();

  for (const card of cards) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank)!.push(card);
    if (!bySuit.has(card.suit)) bySuit.set(card.suit, []);
    bySuit.get(card.suit)!.push(card);
  }

  const flushSuit = [...bySuit.entries()].find(([, list]) => list.length >= 5)?.[0];

  /* --- Straight flush / royal --- */
  if (flushSuit) {
    const suited = bySuit.get(flushSuit)!;
    const suitedRanks = new Set(suited.map((c) => c.rank));
    const high = straightHigh(suitedRanks);
    if (high !== null) {
      const wheel = high === 5;
      const order = wheel ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
      const best = pick(suited, order);
      const royal = high === 14;
      return {
        score: encode(royal ? 9 : 8, [high]),
        category: royal ? "Royal Flush" : "Straight Flush",
        label: royal ? "Royal flush" : `Straight flush, ${RANK_NAME[high as Rank]} high`,
        best,
      };
    }
  }

  // Rank groups, sorted by count then rank — the shape of every made hand.
  const groups = [...byRank.entries()]
    .map(([rank, list]) => ({ rank, count: list.length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const quads = groups.find((g) => g.count === 4);
  const trips = groups.filter((g) => g.count === 3);
  const pairs = groups.filter((g) => g.count === 2);

  /* --- Four of a kind --- */
  if (quads) {
    const kicker = groups.find((g) => g.rank !== quads.rank)!.rank;
    return {
      score: encode(7, [quads.rank, kicker]),
      category: "Four of a Kind",
      label: `Four ${RANK_NAME[quads.rank as Rank].toLowerCase()}s`,
      best: pick(cards, [quads.rank, quads.rank, quads.rank, quads.rank, kicker]),
    };
  }

  /* --- Full house (two trips plays the lower as the pair) --- */
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const three = trips[0].rank;
    const pairRank = trips.length >= 2 ? Math.max(trips[1].rank, pairs[0]?.rank ?? 0) : pairs[0].rank;
    return {
      score: encode(6, [three, pairRank]),
      category: "Full House",
      label: `${RANK_NAME[three as Rank]}s full of ${RANK_NAME[pairRank as Rank].toLowerCase()}s`,
      best: pick(cards, [three, three, three, pairRank, pairRank]),
    };
  }

  /* --- Flush --- */
  if (flushSuit) {
    const suited = bySuit
      .get(flushSuit)!
      .slice()
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 5);
    return {
      score: encode(5, suited.map((c) => c.rank)),
      category: "Flush",
      label: `Flush, ${RANK_NAME[suited[0].rank]} high`,
      best: suited,
    };
  }

  /* --- Straight --- */
  const high = straightHigh(new Set(cards.map((c) => c.rank)));
  if (high !== null) {
    const wheel = high === 5;
    const order = wheel ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
    return {
      score: encode(4, [high]),
      category: "Straight",
      label: `Straight, ${RANK_NAME[high as Rank]} high`,
      best: pick(cards, order),
    };
  }

  /* --- Trips --- */
  if (trips.length === 1) {
    const kickers = groups.filter((g) => g.rank !== trips[0].rank).slice(0, 2).map((g) => g.rank);
    return {
      score: encode(3, [trips[0].rank, ...kickers]),
      category: "Three of a Kind",
      label: `Three ${RANK_NAME[trips[0].rank as Rank].toLowerCase()}s`,
      best: pick(cards, [trips[0].rank, trips[0].rank, trips[0].rank, ...kickers]),
    };
  }

  /* --- Two pair --- */
  if (pairs.length >= 2) {
    const [hi, lo] = [pairs[0].rank, pairs[1].rank];
    const kicker = groups.find((g) => g.rank !== hi && g.rank !== lo)!.rank;
    return {
      score: encode(2, [hi, lo, kicker]),
      category: "Two Pair",
      label: `${RANK_NAME[hi as Rank]}s and ${RANK_NAME[lo as Rank].toLowerCase()}s`,
      best: pick(cards, [hi, hi, lo, lo, kicker]),
    };
  }

  /* --- One pair --- */
  if (pairs.length === 1) {
    const kickers = groups.filter((g) => g.rank !== pairs[0].rank).slice(0, 3).map((g) => g.rank);
    return {
      score: encode(1, [pairs[0].rank, ...kickers]),
      category: "Pair",
      label: `Pair of ${RANK_NAME[pairs[0].rank as Rank].toLowerCase()}s`,
      best: pick(cards, [pairs[0].rank, pairs[0].rank, ...kickers]),
    };
  }

  /* --- High card --- */
  const top = groups.slice(0, 5).map((g) => g.rank);
  return {
    score: encode(0, top),
    category: "High Card",
    label: `${RANK_NAME[top[0] as Rank]} high`,
    best: pick(cards, top),
  };
}

/* ============================================================
   Pots
   ============================================================ */

/**
 * Build the main pot plus any side pots from what each seat put in.
 * Side pots form whenever a short stack is all-in for less than the action.
 */
export function buildPots(seats: Seat[]): { amount: number; eligible: string[]; label: string }[] {
  const contributors = seats.filter((s) => s.totalCommitted > 0);
  if (contributors.length === 0) return [];

  const levels = [...new Set(contributors.map((s) => s.totalCommitted))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: string[]; label: string }[] = [];
  let previous = 0;

  levels.forEach((level, i) => {
    const slice = level - previous;
    const payers = contributors.filter((s) => s.totalCommitted >= level);
    const amount = slice * payers.length;
    if (amount <= 0) return;

    // Only seats still live can win; folded money still counts into the pot.
    const eligible = payers.filter((s) => s.status !== "folded").map((s) => s.id);

    pots.push({
      amount,
      eligible,
      label: i === 0 ? "Main pot" : `Side pot ${i}`,
    });
    previous = level;
  });

  // Merge adjacent pots with identical eligibility — cleaner to display.
  const merged: typeof pots = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligible.join() === pot.eligible.join()) {
      last.amount += pot.amount;
    } else {
      merged.push({ ...pot });
    }
  }
  return merged;
}

/* ============================================================
   Betting helpers
   ============================================================ */

export function activeSeats(seats: Seat[]): Seat[] {
  return seats.filter((s) => s.player && s.status !== "sitting-out" && s.status !== "busted");
}

export function liveSeats(seats: Seat[]): Seat[] {
  return activeSeats(seats).filter((s) => s.status !== "folded");
}

/** Seats that can still make a decision (not folded, not already all-in). */
export function actionableSeats(seats: Seat[]): Seat[] {
  return liveSeats(seats).filter((s) => s.status !== "all-in");
}

export function nextSeatIndex(seats: Seat[], from: number): number {
  const n = seats.length;
  for (let step = 1; step <= n; step++) {
    const seat = seats[(from + step) % n];
    if (seat.player && seat.status !== "sitting-out" && seat.status !== "busted") {
      return seat.index;
    }
  }
  return from;
}

/** Legal raise range for a seat facing `currentBet`. */
export function raiseBounds(
  seat: Seat,
  currentBet: number,
  minRaise: number,
): { min: number; max: number } {
  const toCall = Math.max(0, currentBet - seat.committed);
  const max = seat.committed + seat.player!.stack;
  const min = Math.min(max, currentBet + Math.max(minRaise, toCall > 0 ? minRaise : 0));
  return { min, max };
}

/** Pot-relative sizing shortcuts offered in the action bar. */
export function potSizedBets(
  potTotal: number,
  currentBet: number,
  seat: Seat,
): { label: string; amount: number }[] {
  const stack = seat.player?.stack ?? 0;
  const cap = seat.committed + stack;
  const sizes: { label: string; amount: number }[] = [
    { label: "⅓ pot", amount: currentBet + potTotal / 3 },
    { label: "½ pot", amount: currentBet + potTotal / 2 },
    { label: "¾ pot", amount: currentBet + potTotal * 0.75 },
    { label: "Pot", amount: currentBet + potTotal },
  ];
  return sizes
    .map((s) => ({ ...s, amount: Math.min(cap, Math.round(s.amount)) }))
    .filter((s, i, arr) => s.amount < cap && arr.findIndex((o) => o.amount === s.amount) === i);
}

/* ============================================================
   Bot policy

   Deliberately simple: a hand-strength estimate crossed with the
   seat's temperament and the price being laid. Enough to produce
   believable table rhythm without pretending to be a solver.
   ============================================================ */

/** Rough 0–1 strength for two hole cards plus whatever board is out. */
export function handStrength(hole: Card[], board: Card[]): number {
  if (hole.length < 2) return 0;

  if (board.length === 0) {
    const [a, b] = hole;
    const high = Math.max(a.rank, b.rank);
    const low = Math.min(a.rank, b.rank);
    const paired = a.rank === b.rank;
    const suited = a.suit === b.suit;
    const gap = high - low;

    let score = (high - 2) / 12 * 0.45 + (low - 2) / 12 * 0.25;
    if (paired) score += 0.32 + (high - 2) / 12 * 0.16;
    if (suited) score += 0.07;
    if (!paired && gap <= 4) score += (5 - gap) * 0.018;
    return Math.max(0, Math.min(1, score));
  }

  const made = evaluate([...hole, ...board]);
  const categoryIndex = HAND_CATEGORIES.indexOf(made.category);
  // Compress the ladder: a pair on the river is not half a straight flush.
  return Math.min(1, 0.14 + categoryIndex * 0.105);
}

export interface BotDecision {
  kind: "fold" | "check" | "call" | "raise";
  /** Total the seat wants committed on this street, for a raise. */
  to?: number;
}

/**
 * Snap a bet to a chip increment. Dealers push round numbers, so raw
 * pot-fraction arithmetic like 14,266 reads as obviously synthetic.
 */
function roundBet(amount: number, bigBlind: number): number {
  const step = Math.max(1, Math.round(bigBlind / 4));
  return Math.round(amount / step) * step;
}

export function decideBotAction(
  seat: Seat,
  board: Card[],
  currentBet: number,
  minRaise: number,
  potTotal: number,
  rng: () => number,
  bigBlind = minRaise,
): BotDecision {
  const player = seat.player!;
  const toCall = Math.max(0, currentBet - seat.committed);
  const strength = handStrength(seat.holeCards, board);
  const noise = (rng() - 0.5) * 0.16;
  const effective = Math.max(0, Math.min(1, strength + noise));

  // Price of a call as a fraction of the pot it would win.
  const potOdds = toCall === 0 ? 0 : toCall / (potTotal + toCall);
  const stackPressure = player.stack <= currentBet * 3 ? 0.12 : 0;

  if (toCall === 0) {
    const betUrge = effective * 0.85 + player.aggression * 0.35 - 0.42;
    if (betUrge > 0 && rng() < 0.62) {
      const size = roundBet(potTotal * (0.42 + player.aggression * 0.5 + rng() * 0.25), bigBlind);
      return { kind: "raise", to: Math.max(minRaise, currentBet + Math.max(minRaise, size)) };
    }
    return { kind: "check" };
  }

  const callThreshold = potOdds * (1.5 - player.looseness * 0.55) - stackPressure;
  if (effective < callThreshold) return { kind: "fold" };

  const raiseUrge = effective * 0.9 + player.aggression * 0.4 - 0.72;
  if (raiseUrge > 0 && rng() < 0.42) {
    const size = roundBet((potTotal + toCall) * (0.55 + player.aggression * 0.45), bigBlind);
    return { kind: "raise", to: currentBet + Math.max(minRaise, size) };
  }

  return { kind: "call" };
}
