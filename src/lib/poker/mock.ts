/**
 * Poker room fixtures: tournaments, the opponent pool and table seating.
 * Everything derives from SEED_NOW and a seeded PRNG so the room looks the
 * same on the server and on first paint.
 */

import type { BlindLevel, PayoutTier, PokerPlayer, Tournament, TournamentFormat } from "./types";
import { hashCode, seeded } from "@/lib/format";
import { SEED_NOW } from "@/lib/mock/sports";

const MIN = 60_000;
const HOUR = 60 * MIN;

/* ============================================================
   Blind structures
   ============================================================ */

function buildLevels(
  startSb: number,
  duration: number,
  count = 24,
  anteFrom = 4,
): BlindLevel[] {
  const levels: BlindLevel[] = [];
  let sb = startSb;
  for (let i = 1; i <= count; i++) {
    levels.push({
      level: i,
      smallBlind: sb,
      bigBlind: sb * 2,
      ante: i >= anteFrom ? Math.round(sb * 0.25) : 0,
      duration,
    });
    // ~1.4× per level, snapped to something a dealer would actually call.
    const next = sb * 1.4;
    const magnitude = 10 ** Math.floor(Math.log10(next));
    sb = Math.max(sb + 1, Math.round(next / (magnitude / 2)) * (magnitude / 2));
  }
  return levels;
}

/* ============================================================
   Payout ladders
   ============================================================ */

function buildPayouts(prizePool: number, entrants: number): PayoutTier[] {
  const paid = Math.max(1, Math.round(entrants * 0.15));
  const bands: { from: number; to: number; share: number }[] = [];

  if (paid === 1) {
    bands.push({ from: 1, to: 1, share: 1 });
  } else if (paid <= 3) {
    bands.push({ from: 1, to: 1, share: 0.5 }, { from: 2, to: 2, share: 0.3 }, { from: 3, to: 3, share: 0.2 });
  } else {
    bands.push(
      { from: 1, to: 1, share: 0.22 },
      { from: 2, to: 2, share: 0.148 },
      { from: 3, to: 3, share: 0.106 },
      { from: 4, to: 6, share: 0.062 },
      { from: 7, to: 9, share: 0.04 },
      { from: 10, to: 18, share: 0.024 },
      { from: 19, to: Math.max(19, paid), share: 0.013 },
    );
  }

  return bands
    .filter((b) => b.from <= paid)
    .map((b) => {
      const to = Math.min(b.to, paid);
      return {
        label: b.from === to ? ordinal(b.from) : `${ordinal(b.from)} – ${ordinal(to)}`,
        fromRank: b.from,
        toRank: to,
        amount: Math.round((prizePool * b.share) / 10) * 10,
      };
    });
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]);
}

/* ============================================================
   Tournaments
   ============================================================ */

interface TournamentSeed {
  id: string;
  name: string;
  format: TournamentFormat;
  buyIn: number;
  fee: number;
  startingStack: number;
  guaranteed: number;
  entrants: number;
  maxEntrants: number;
  playersLeft: number;
  offsetMs: number;
  status: Tournament["status"];
  currentLevel: number;
  levelMinutes: number;
  startSb: number;
  seatsPerTable: number;
  tags: string[];
  bounty?: number;
  description: string;
}

const SEEDS: TournamentSeed[] = [
  {
    id: "pt-01", name: "Ember Millions", format: "mtt", buyIn: 5000, fee: 450,
    startingStack: 30_000, guaranteed: 10_000_000, entrants: 1842, maxEntrants: 5000,
    playersLeft: 1842, offsetMs: 45 * MIN, status: "registering", currentLevel: 1,
    levelMinutes: 15, startSb: 100, seatsPerTable: 9,
    tags: ["Featured", "AED 10M GTD", "Deep stack"],
    description: "The flagship Sunday major. Thirty thousand starting chips, fifteen-minute levels and late registration open through level nine.",
  },
  {
    id: "pt-02", name: "Molten Turbo", format: "turbo", buyIn: 1000, fee: 90,
    startingStack: 10_000, guaranteed: 500_000, entrants: 612, maxEntrants: 2000,
    playersLeft: 388, offsetMs: -34 * MIN, status: "late-reg", currentLevel: 6,
    levelMinutes: 5, startSb: 50, seatsPerTable: 9,
    tags: ["Turbo", "Late reg", "Fast"],
    description: "Five-minute levels and a shallow stack. Built for players who want a result inside ninety minutes.",
  },
  {
    id: "pt-03", name: "Obsidian Bounty Hunter", format: "bounty", buyIn: 2500, fee: 200,
    startingStack: 20_000, guaranteed: 2_000_000, entrants: 944, maxEntrants: 3000,
    playersLeft: 517, offsetMs: -78 * MIN, status: "running", currentLevel: 9,
    levelMinutes: 12, startSb: 75, seatsPerTable: 9, bounty: 1250,
    tags: ["Bounty", "Progressive", "Knockout"],
    description: "Half the buy-in sits on your head. Knock a player out and half their bounty is paid instantly, half is added to yours.",
  },
  {
    id: "pt-04", name: "Gilded Final Table", format: "mtt", buyIn: 10_000, fee: 900,
    startingStack: 50_000, guaranteed: 5_000_000, entrants: 486, maxEntrants: 1000,
    playersLeft: 9, offsetMs: -4 * HOUR, status: "final-table", currentLevel: 22,
    levelMinutes: 20, startSb: 200, seatsPerTable: 9,
    tags: ["High roller", "Final table", "Streamed"],
    description: "Nine left, all in the money, playing for a seven-figure top prize. Cards-up stream on a thirty-minute delay.",
  },
  {
    id: "pt-05", name: "Rufescent Rush · Sit & Go", format: "sng", buyIn: 500, fee: 40,
    startingStack: 5000, guaranteed: 4500, entrants: 7, maxEntrants: 9,
    playersLeft: 7, offsetMs: 3 * MIN, status: "registering", currentLevel: 1,
    levelMinutes: 6, startSb: 25, seatsPerTable: 9,
    tags: ["Sit & Go", "9-max", "Starts when full"],
    description: "A single table that starts the moment the ninth seat fills. Top three places paid.",
  },
  {
    id: "pt-06", name: "Micro Ember", format: "mtt", buyIn: 100, fee: 10,
    startingStack: 15_000, guaranteed: 100_000, entrants: 2310, maxEntrants: 10_000,
    playersLeft: 2310, offsetMs: 2 * HOUR + 20 * MIN, status: "registering", currentLevel: 1,
    levelMinutes: 10, startSb: 50, seatsPerTable: 9,
    tags: ["Beginner", "Low stakes", "Huge field"],
    description: "A hundred-rupee entry into a six-figure pool. The friendliest way into tournament poker.",
  },
  {
    id: "pt-07", name: "Crimson Heads-Up", format: "sng", buyIn: 2000, fee: 150,
    startingStack: 8000, guaranteed: 4000, entrants: 1, maxEntrants: 2,
    playersLeft: 1, offsetMs: 1 * MIN, status: "registering", currentLevel: 1,
    levelMinutes: 5, startSb: 25, seatsPerTable: 2,
    tags: ["Heads-up", "1v1", "Winner takes all"],
    description: "One opponent, one winner, no chop. Blinds climb every five minutes to force a result.",
  },
  {
    id: "pt-08", name: "Night Shift Cash · NL200", format: "cash", buyIn: 20_000, fee: 0,
    startingStack: 20_000, guaranteed: 0, entrants: 54, maxEntrants: 180,
    playersLeft: 54, offsetMs: -6 * HOUR, status: "running", currentLevel: 1,
    levelMinutes: 0, startSb: 100, seatsPerTable: 6,
    tags: ["Cash game", "6-max", "Sit any time"],
    description: "Blinds AED 100/200, buy in between fifty and two hundred big blinds, leave whenever you like.",
  },
];

function toTournament(seed: TournamentSeed): Tournament {
  const prizePool = Math.max(seed.guaranteed, seed.entrants * seed.buyIn);
  const chipsInPlay = seed.entrants * seed.startingStack;

  return {
    id: seed.id,
    name: seed.name,
    format: seed.format,
    buyIn: seed.buyIn,
    fee: seed.fee,
    startingStack: seed.startingStack,
    guaranteed: seed.guaranteed,
    prizePool,
    entrants: seed.entrants,
    maxEntrants: seed.maxEntrants,
    playersLeft: seed.playersLeft,
    startsAt: new Date(SEED_NOW + seed.offsetMs).toISOString(),
    status: seed.status,
    currentLevel: seed.currentLevel,
    levels: buildLevels(seed.startSb, seed.levelMinutes || 15),
    payouts: buildPayouts(prizePool, seed.entrants),
    averageStack: Math.round(chipsInPlay / Math.max(1, seed.playersLeft)),
    seatsPerTable: seed.seatsPerTable,
    tags: seed.tags,
    bounty: seed.bounty,
    description: seed.description,
  };
}

export const TOURNAMENTS: Tournament[] = SEEDS.map(toTournament);

export function findTournament(id: string): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}

export function tournamentsByFormat(format?: TournamentFormat): Tournament[] {
  return format ? TOURNAMENTS.filter((t) => t.format === format) : TOURNAMENTS;
}

export function currentLevel(tournament: Tournament): BlindLevel {
  return (
    tournament.levels.find((l) => l.level === tournament.currentLevel) ?? tournament.levels[0]
  );
}

/* ============================================================
   Opponent pool
   ============================================================ */

const NAMES: [string, string, string][] = [
  ["Priya Raghavan", "chipmuse", "IN"],
  ["Dmitri Volkov", "riverrat", "RU"],
  ["Yuki Tanaka", "quietfold", "JP"],
  ["Sofia Marchetti", "donkstar", "IT"],
  ["Marcus Bell", "rungood", "GB"],
  ["Ana Ferreira", "cardsharp", "BR"],
  ["Karim Haddad", "smallball", "AE"],
  ["Lena Fischer", "icequeen", "DE"],
  ["Tomás Rivera", "allinTom", "MX"],
  ["Chen Wei", "dragon88", "CN"],
  ["Aisling Byrne", "shamrock", "IE"],
  ["Ravi Deshmukh", "bluffcity", "IN"],
  ["Nadia Petrova", "hexqueen", "BG"],
  ["Oliver Grant", "nitlife", "AU"],
  ["Fatima Zahra", "desertfox", "MA"],
  ["Jonas Berg", "coldcall", "SE"],
];

/** Deterministic opponents for a given table. */
export function buildPlayers(tableId: string, count: number, startingStack: number): PokerPlayer[] {
  const rng = seeded(hashCode(tableId));
  const pool = [...NAMES];

  // Shuffle the name pool so different tables seat different regulars.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return Array.from({ length: count }, (_, i) => {
    const [name, handle, country] = pool[i % pool.length];
    // Stacks spread around the average, as they would mid-tournament.
    const multiplier = 0.45 + rng() * 1.5;
    return {
      id: `${tableId}-p${i}`,
      name,
      handle: `@${handle}`,
      avatarHue: Math.round((i * 137.5 + rng() * 40) % 360),
      country,
      stack: Math.max(startingStack * 0.2, Math.round((startingStack * multiplier) / 25) * 25),
      aggression: 0.25 + rng() * 0.6,
      looseness: 0.2 + rng() * 0.65,
    } satisfies PokerPlayer;
  });
}

export const HERO: PokerPlayer = {
  id: "hero",
  name: "Aarav Mehta",
  handle: "@aaravm",
  avatarHue: 18,
  country: "IN",
  stack: 0,
  isHero: true,
  aggression: 0.5,
  looseness: 0.5,
};

/** Tables the viewer is currently seated at, for the lobby strip. */
export const MY_SEATS = [
  { tournamentId: "pt-03", tableId: "pt-03-t14", rank: 212, stack: 34_800, bigBlinds: 29 },
  { tournamentId: "pt-02", tableId: "pt-02-t07", rank: 96, stack: 8150, bigBlinds: 11 },
];
