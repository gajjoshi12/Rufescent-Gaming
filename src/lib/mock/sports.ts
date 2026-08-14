import type {
  Competitor,
  ExchangePrice,
  Market,
  MarketType,
  Match,
  Runner,
  Sport,
  SportKey,
} from "../types";
import { hashCode, seeded } from "../format";

/**
 * Fixed reference time. Every relative date in the mock derives from
 * this constant so the server-rendered HTML matches the first client
 * render exactly. Live "movement" is layered on top at runtime by the
 * odds ticker, never baked into this data.
 */
export const SEED_NOW = Date.UTC(2026, 7, 15, 14, 0, 0);

const MIN = 60_000;
const HOUR = 60 * MIN;

export const SPORTS: Sport[] = [
  { key: "soccer", name: "Soccer", icon: "⚽", liveCount: 24 },
  { key: "cricket", name: "Cricket", icon: "🏏", liveCount: 11 },
  { key: "basketball", name: "Basketball", icon: "🏀", liveCount: 8 },
  { key: "tennis", name: "Tennis", icon: "🎾", liveCount: 17 },
  { key: "esports", name: "Esports", icon: "🎮", liveCount: 13 },
];

/* ============================================================
   Price ladder — Betfair-style tick increments
   ============================================================ */

const TICKS: [number, number, number][] = [
  // [from, to, increment]
  [1.01, 2, 0.01],
  [2, 3, 0.02],
  [3, 4, 0.05],
  [4, 6, 0.1],
  [6, 10, 0.2],
  [10, 20, 0.5],
  [20, 30, 1],
  [30, 50, 2],
  [50, 100, 5],
  [100, 1000, 10],
];

/** Snap an arbitrary price to the nearest valid exchange tick. */
export function snapToTick(price: number): number {
  const band = TICKS.find(([from, to]) => price >= from && price < to) ?? TICKS[TICKS.length - 1];
  const inc = band[2];
  const snapped = Math.round(price / inc) * inc;
  return Number(snapped.toFixed(2));
}

/** Move a price by `steps` ticks (negative walks down the ladder). */
export function stepTick(price: number, steps: number): number {
  let p = price;
  const dir = Math.sign(steps);
  for (let i = 0; i < Math.abs(steps); i++) {
    const band = TICKS.find(([from, to]) => p >= from && p < to) ?? TICKS[TICKS.length - 1];
    p = Number((p + band[2] * dir).toFixed(2));
    if (p < 1.01) return 1.01;
    if (p > 1000) return 1000;
  }
  return snapToTick(p);
}

/* ============================================================
   Runner / market construction
   ============================================================ */

/**
 * Build a three-deep back and lay ladder around a fair price.
 * Back prices sit below the fair value and lay prices above it —
 * the gap between best back and best lay is the exchange spread.
 */
function buildLadders(
  fair: number,
  rng: () => number,
  liquidity: number,
): { back: ExchangePrice[]; lay: ExchangePrice[] } {
  const spreadTicks = fair < 3 ? 1 : fair < 8 ? 2 : 3;
  const bestBack = stepTick(fair, -spreadTicks);
  const bestLay = stepTick(fair, spreadTicks);

  const back: ExchangePrice[] = [];
  const lay: ExchangePrice[] = [];

  for (let i = 0; i < 3; i++) {
    // Depth thins as you walk away from the top of the book.
    const depthFactor = (1 - i * 0.28) * (0.55 + rng() * 0.9);
    back.push({
      price: stepTick(bestBack, -i),
      size: Math.round((liquidity * depthFactor) / 10) * 10,
    });
    lay.push({
      price: stepTick(bestLay, i),
      size: Math.round((liquidity * depthFactor * (0.7 + rng() * 0.6)) / 10) * 10,
    });
  }
  return { back, lay };
}

/**
 * Convert fair probabilities into a priced market. The book applies an
 * over-round so the sum of implied probabilities exceeds 100%.
 */
function priceRunners(
  marketId: string,
  names: string[],
  trueProbs: number[],
  overround: number,
  liquidity: number,
): Runner[] {
  const rng = seeded(hashCode(marketId));
  const total = trueProbs.reduce((a, b) => a + b, 0);
  return names.map((name, i) => {
    const normalised = trueProbs[i] / total;
    const bookProb = normalised * overround;
    const fair = snapToTick(1 / normalised);
    const fixed = Number((1 / bookProb).toFixed(2));
    const { back, lay } = buildLadders(fair, rng, liquidity * (0.4 + normalised));
    return {
      id: `${marketId}-r${i}`,
      name,
      fixed,
      back,
      lay,
    } satisfies Runner;
  });
}

/* ============================================================
   Fixtures
   ============================================================ */

function team(id: string, name: string, short: string, crest: string): Competitor {
  return { id, name, short, crest };
}

interface FixtureSeed {
  id: string;
  sport: SportKey;
  competition: string;
  home: Competitor;
  away: Competitor;
  status: "live" | "upcoming";
  offsetMs: number;
  clock?: string;
  score?: { home: number; away: number };
  detail?: string;
  featured?: boolean;
  streaming?: boolean;
  /** Fair win probabilities: [home, draw, away] or [home, away]. */
  probs: number[];
}

const FIXTURES: FixtureSeed[] = [
  /* ---------- Soccer ---------- */
  {
    id: "sc-1", sport: "soccer", competition: "Premier League",
    home: team("ars", "Arsenal", "ARS", "🔴"), away: team("mci", "Manchester City", "MCI", "🩵"),
    status: "live", offsetMs: -63 * MIN, clock: "63'", score: { home: 1, away: 1 },
    detail: "2nd half · 1 red card", featured: true, streaming: true, probs: [0.34, 0.29, 0.37],
  },
  {
    id: "sc-2", sport: "soccer", competition: "La Liga",
    home: team("rma", "Real Madrid", "RMA", "⚪"), away: team("atm", "Atlético Madrid", "ATM", "🔴"),
    status: "live", offsetMs: -22 * MIN, clock: "22'", score: { home: 0, away: 0 },
    detail: "1st half", streaming: true, probs: [0.52, 0.26, 0.22],
  },
  {
    id: "sc-3", sport: "soccer", competition: "Serie A",
    home: team("int", "Inter Milan", "INT", "🔵"), away: team("juv", "Juventus", "JUV", "⚫"),
    status: "upcoming", offsetMs: 2 * HOUR + 15 * MIN, featured: true, probs: [0.44, 0.28, 0.28],
  },
  {
    id: "sc-4", sport: "soccer", competition: "Bundesliga",
    home: team("bay", "Bayern München", "BAY", "🔴"), away: team("bvb", "Borussia Dortmund", "BVB", "🟡"),
    status: "upcoming", offsetMs: 5 * HOUR, streaming: true, probs: [0.55, 0.23, 0.22],
  },
  {
    id: "sc-5", sport: "soccer", competition: "Ligue 1",
    home: team("psg", "Paris Saint-Germain", "PSG", "🔵"), away: team("mar", "Marseille", "MAR", "⚪"),
    status: "upcoming", offsetMs: 26 * HOUR, probs: [0.63, 0.21, 0.16],
  },
  {
    id: "sc-6", sport: "soccer", competition: "UEFA Champions League",
    home: team("bar", "Barcelona", "BAR", "🔵"), away: team("liv", "Liverpool", "LIV", "🔴"),
    status: "upcoming", offsetMs: 49 * HOUR, featured: true, probs: [0.4, 0.26, 0.34],
  },

  /* ---------- Cricket ---------- */
  {
    id: "cr-1", sport: "cricket", competition: "The Hundred",
    home: team("obi", "Oval Invincibles", "OVI", "🔵"), away: team("trr", "Trent Rockets", "TRR", "🟢"),
    status: "live", offsetMs: -48 * MIN, clock: "12.4 ov", score: { home: 98, away: 0 },
    detail: "98/3 · RR 7.89 · needs 84 off 44", featured: true, streaming: true, probs: [0.58, 0.42],
  },
  {
    id: "cr-2", sport: "cricket", competition: "T20 International",
    home: team("ind", "India", "IND", "🇮🇳"), away: team("aus", "Australia", "AUS", "🇦🇺"),
    status: "live", offsetMs: -95 * MIN, clock: "18.2 ov", score: { home: 176, away: 0 },
    detail: "176/5 · Innings 1", streaming: true, probs: [0.62, 0.38],
  },
  {
    id: "cr-3", sport: "cricket", competition: "Indian Premier League",
    home: team("mi", "Mumbai Indians", "MI", "🔵"), away: team("csk", "Chennai Super Kings", "CSK", "🟡"),
    status: "upcoming", offsetMs: 4 * HOUR + 30 * MIN, featured: true, probs: [0.49, 0.51],
  },
  {
    id: "cr-4", sport: "cricket", competition: "County Championship",
    home: team("sur", "Surrey", "SUR", "🟤"), away: team("lan", "Lancashire", "LAN", "🔴"),
    status: "upcoming", offsetMs: 20 * HOUR, probs: [0.55, 0.45],
  },

  /* ---------- Basketball ---------- */
  {
    id: "bb-1", sport: "basketball", competition: "NBA",
    home: team("bos", "Boston Celtics", "BOS", "🟢"), away: team("lal", "LA Lakers", "LAL", "🟣"),
    status: "live", offsetMs: -34 * MIN, clock: "Q2 04:12", score: { home: 52, away: 48 },
    detail: "Q2 · BOS +4", featured: true, streaming: true, probs: [0.61, 0.39],
  },
  {
    id: "bb-2", sport: "basketball", competition: "NBA",
    home: team("den", "Denver Nuggets", "DEN", "🟡"), away: team("gsw", "Golden State Warriors", "GSW", "🔵"),
    status: "upcoming", offsetMs: 6 * HOUR + 45 * MIN, probs: [0.57, 0.43],
  },
  {
    id: "bb-3", sport: "basketball", competition: "EuroLeague",
    home: team("rea", "Real Madrid Bal.", "RMB", "⚪"), away: team("oly", "Olympiacos", "OLY", "🔴"),
    status: "upcoming", offsetMs: 23 * HOUR, probs: [0.53, 0.47],
  },

  /* ---------- Tennis ---------- */
  {
    id: "tn-1", sport: "tennis", competition: "ATP Masters 1000 · Cincinnati",
    home: team("alc", "C. Alcaraz", "ALC", "🇪🇸"), away: team("sin", "J. Sinner", "SIN", "🇮🇹"),
    status: "live", offsetMs: -71 * MIN, clock: "Set 2", score: { home: 1, away: 0 },
    detail: "6-4, 3-2 · Alcaraz serving 40-30", featured: true, streaming: true, probs: [0.66, 0.34],
  },
  {
    id: "tn-2", sport: "tennis", competition: "WTA 1000 · Cincinnati",
    home: team("swi", "I. Świątek", "SWI", "🇵🇱"), away: team("sab", "A. Sabalenka", "SAB", "🇧🇾"),
    status: "live", offsetMs: -18 * MIN, clock: "Set 1", score: { home: 0, away: 0 },
    detail: "2-1 · Sabalenka to serve", probs: [0.51, 0.49],
  },
  {
    id: "tn-3", sport: "tennis", competition: "ATP 250 · Winston-Salem",
    home: team("dje", "N. Djokovic", "DJO", "🇷🇸"), away: team("med", "D. Medvedev", "MED", "🇷🇺"),
    status: "upcoming", offsetMs: 3 * HOUR + 20 * MIN, probs: [0.58, 0.42],
  },

  /* ---------- Esports ---------- */
  {
    id: "es-1", sport: "esports", competition: "CS2 · IEM Cologne",
    home: team("nav", "Natus Vincere", "NAVI", "🟡"), away: team("fzn", "FaZe Clan", "FAZE", "🔴"),
    status: "live", offsetMs: -41 * MIN, clock: "Map 2", score: { home: 1, away: 0 },
    detail: "Mirage · 9-6 NAVI", featured: true, streaming: true, probs: [0.64, 0.36],
  },
  {
    id: "es-2", sport: "esports", competition: "League of Legends · LEC",
    home: team("g2", "G2 Esports", "G2", "⚫"), away: team("fnc", "Fnatic", "FNC", "🟠"),
    status: "live", offsetMs: -27 * MIN, clock: "28:14", score: { home: 12, away: 9 },
    detail: "Gold +3.2k G2 · Baron up", streaming: true, probs: [0.7, 0.3],
  },
  {
    id: "es-3", sport: "esports", competition: "Dota 2 · The International",
    home: team("tsp", "Team Spirit", "TS", "🔵"), away: team("lgd", "PSG.LGD", "LGD", "🟢"),
    status: "upcoming", offsetMs: 7 * HOUR + 10 * MIN, probs: [0.55, 0.45],
  },
  {
    id: "es-4", sport: "esports", competition: "Valorant · VCT Masters",
    home: team("sen", "Sentinels", "SEN", "🔴"), away: team("prx", "Paper Rex", "PRX", "🟣"),
    status: "upcoming", offsetMs: 30 * HOUR, probs: [0.47, 0.53],
  },
];

/* ============================================================
   Market templates per sport
   ============================================================ */

interface MarketTemplate {
  name: string;
  type: MarketType;
  /** Derives runner names and fair probabilities from the fixture. */
  build: (f: FixtureSeed) => { names: string[]; probs: number[] };
  overround: number;
  liquidity: number;
}

const hasDraw = (f: FixtureSeed) => f.probs.length === 3;

function matchOddsTemplate(f: FixtureSeed) {
  return hasDraw(f)
    ? { names: [f.home.name, "Draw", f.away.name], probs: f.probs }
    : { names: [f.home.name, f.away.name], probs: f.probs };
}

const COMMON_TEMPLATES: Record<SportKey, MarketTemplate[]> = {
  soccer: [
    { name: "Match Odds", type: "match_odds", build: matchOddsTemplate, overround: 1.045, liquidity: 480_000 },
    {
      name: "Over/Under 2.5 Goals", type: "over_under",
      build: () => ({ names: ["Over 2.5", "Under 2.5"], probs: [0.53, 0.47] }),
      overround: 1.038, liquidity: 210_000,
    },
    {
      name: "Both Teams to Score", type: "both_teams_score",
      build: () => ({ names: ["Yes", "No"], probs: [0.58, 0.42] }),
      overround: 1.04, liquidity: 145_000,
    },
    {
      name: "Asian Handicap −0.5", type: "handicap",
      build: (f) => ({ names: [`${f.home.short} −0.5`, `${f.away.short} +0.5`], probs: [0.46, 0.54] }),
      overround: 1.032, liquidity: 168_000,
    },
    {
      name: "Correct Score", type: "correct_score",
      build: () => ({
        names: ["1-0", "2-0", "2-1", "0-0", "1-1", "2-2", "0-1", "0-2", "1-2"],
        probs: [0.11, 0.08, 0.1, 0.08, 0.13, 0.06, 0.1, 0.07, 0.09],
      }),
      overround: 1.12, liquidity: 62_000,
    },
    {
      name: "First Goalscorer", type: "player_props",
      build: () => ({
        names: ["Haaland", "Saka", "Ødegaard", "Foden", "Havertz", "No goalscorer"],
        probs: [0.18, 0.13, 0.1, 0.12, 0.09, 0.08],
      }),
      overround: 1.16, liquidity: 38_000,
    },
  ],
  cricket: [
    { name: "Match Odds", type: "match_odds", build: matchOddsTemplate, overround: 1.03, liquidity: 720_000 },
    {
      name: "Total Runs Over/Under 165.5", type: "over_under",
      build: () => ({ names: ["Over 165.5", "Under 165.5"], probs: [0.51, 0.49] }),
      overround: 1.04, liquidity: 260_000,
    },
    {
      name: "Top Batsman", type: "player_props",
      build: () => ({
        names: ["V. Kohli", "R. Sharma", "T. Head", "S. Yadav", "G. Maxwell", "H. Pandya"],
        probs: [0.22, 0.18, 0.17, 0.16, 0.14, 0.13],
      }),
      overround: 1.14, liquidity: 44_000,
    },
    {
      name: "Method of Next Dismissal", type: "player_props",
      build: () => ({ names: ["Caught", "Bowled", "LBW", "Run out", "Stumped"], probs: [0.52, 0.19, 0.16, 0.08, 0.05] }),
      overround: 1.11, liquidity: 21_000,
    },
  ],
  basketball: [
    { name: "Moneyline", type: "match_odds", build: matchOddsTemplate, overround: 1.038, liquidity: 390_000 },
    {
      name: "Point Spread −4.5", type: "handicap",
      build: (f) => ({ names: [`${f.home.short} −4.5`, `${f.away.short} +4.5`], probs: [0.5, 0.5] }),
      overround: 1.04, liquidity: 305_000,
    },
    {
      name: "Total Points Over/Under 221.5", type: "over_under",
      build: () => ({ names: ["Over 221.5", "Under 221.5"], probs: [0.5, 0.5] }),
      overround: 1.04, liquidity: 280_000,
    },
    {
      name: "Player Points — 25+", type: "player_props",
      build: () => ({ names: ["J. Tatum", "L. James", "J. Brown", "A. Davis"], probs: [0.44, 0.4, 0.33, 0.36] }),
      overround: 1.09, liquidity: 55_000,
    },
  ],
  tennis: [
    { name: "Match Winner", type: "match_odds", build: matchOddsTemplate, overround: 1.028, liquidity: 340_000 },
    {
      name: "Set Betting", type: "correct_score",
      build: (f) => ({
        names: [`${f.home.short} 2-0`, `${f.home.short} 2-1`, `${f.away.short} 2-0`, `${f.away.short} 2-1`],
        probs: [0.36, 0.24, 0.21, 0.19],
      }),
      overround: 1.07, liquidity: 74_000,
    },
    {
      name: "Total Games Over/Under 22.5", type: "over_under",
      build: () => ({ names: ["Over 22.5", "Under 22.5"], probs: [0.52, 0.48] }),
      overround: 1.045, liquidity: 96_000,
    },
  ],
  esports: [
    { name: "Match Winner", type: "match_odds", build: matchOddsTemplate, overround: 1.05, liquidity: 128_000 },
    {
      name: "Map Handicap −1.5", type: "handicap",
      build: (f) => ({ names: [`${f.home.short} −1.5`, `${f.away.short} +1.5`], probs: [0.42, 0.58] }),
      overround: 1.055, liquidity: 61_000,
    },
    {
      name: "Total Maps Over/Under 2.5", type: "over_under",
      build: () => ({ names: ["Over 2.5", "Under 2.5"], probs: [0.47, 0.53] }),
      overround: 1.05, liquidity: 48_000,
    },
    {
      name: "First Blood", type: "player_props",
      build: (f) => ({ names: [f.home.short, f.away.short], probs: [0.5, 0.5] }),
      overround: 1.06, liquidity: 19_000,
    },
  ],
};

/* ============================================================
   Public accessors
   ============================================================ */

function toMatch(f: FixtureSeed): Match {
  return {
    id: f.id,
    sport: f.sport,
    competition: f.competition,
    home: f.home,
    away: f.away,
    status: f.status,
    startsAt: new Date(SEED_NOW + f.offsetMs).toISOString(),
    clock: f.clock,
    score: f.score,
    detail: f.detail,
    marketCount: COMMON_TEMPLATES[f.sport].length + (f.status === "live" ? 18 : 34),
    featured: f.featured,
    streaming: f.streaming,
  };
}

export const ALL_MATCHES: Match[] = FIXTURES.map(toMatch);

export function matchesBySport(sport?: SportKey): Match[] {
  return sport ? ALL_MATCHES.filter((m) => m.sport === sport) : ALL_MATCHES;
}

export function findMatch(id: string): Match | undefined {
  return ALL_MATCHES.find((m) => m.id === id);
}

export function marketsForMatch(matchId: string): Market[] {
  const fixture = FIXTURES.find((f) => f.id === matchId);
  if (!fixture) return [];
  const rng = seeded(hashCode(matchId));

  return COMMON_TEMPLATES[fixture.sport].map((tpl, i) => {
    const marketId = `${matchId}-m${i}`;
    const { names, probs } = tpl.build(fixture);
    const inPlay = fixture.status === "live";
    return {
      id: marketId,
      matchId,
      name: tpl.name,
      type: tpl.type,
      runners: priceRunners(marketId, names, probs, tpl.overround, tpl.liquidity),
      margin: Number(((tpl.overround - 1) * 100 + 100).toFixed(1)),
      inPlay,
      // A live market occasionally suspends between points/balls.
      suspended: inPlay && i > 0 && rng() > 0.88,
      matched: Math.round(tpl.liquidity * (0.6 + rng() * 1.4)),
      cashOutEligible: tpl.type === "match_odds" || tpl.type === "over_under" || tpl.type === "handicap",
    } satisfies Market;
  });
}

/** The headline market used on list rows and coupon cards. */
export function primaryMarket(matchId: string): Market | undefined {
  return marketsForMatch(matchId)[0];
}

export function liveMatches(): Match[] {
  return ALL_MATCHES.filter((m) => m.status === "live");
}

export function featuredMatches(): Match[] {
  return ALL_MATCHES.filter((m) => m.featured);
}

export function upcomingMatches(): Match[] {
  return ALL_MATCHES.filter((m) => m.status === "upcoming");
}

/** Competitions grouped for the sport-detail page's left rail. */
export function competitionsForSport(sport: SportKey): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of matchesBySport(sport)) {
    counts.set(m.competition, (counts.get(m.competition) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}
