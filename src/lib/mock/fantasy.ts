/**
 * Daily-fantasy mock.
 *
 * Backs the /fantasy lobby (contest cards, entry-fee filters, fill
 * bars), the team builder (player pool, credit budget, role and
 * per-team caps in TEAM_RULES) and the post-lock leaderboard.
 *
 * Player-level numbers — recent form, ownership, aggregate points —
 * are derived from a seeded stream keyed on the player id, so the
 * server and the first client render agree exactly. Squads are
 * fictional; only the club names are borrowed from the fixture list.
 */

import type { FantasyContest, FantasyPlayer, FantasyRole, LeaderboardEntry, SportKey } from "../types";
import { clamp, hashCode, seeded } from "../format";
import { SEED_NOW } from "./sports";

const MIN = 60_000;
const HOUR = 60 * MIN;

/* ============================================================
   Contests
   ============================================================ */

interface ContestSeed extends Omit<FantasyContest, "startsAt"> {
  /** Offset from SEED_NOW; every contest locks at its match start. */
  offsetMs: number;
}

const CONTEST_SEEDS: ContestSeed[] = [
  /* ---------- Cricket · flagship match ---------- */
  {
    id: "fc-01", title: "Mega Contest", sport: "cricket", matchLabel: "MI vs CSK",
    offsetMs: 4 * HOUR + 30 * MIN, entryFee: 49, prizePool: 5_000_000,
    totalSpots: 128_000, filledSpots: 87_342, winnersPct: 55, firstPrize: 1_000_000,
    guaranteed: true, multiEntry: true, tags: ["Mega", "Guaranteed", "Flexible"],
  },
  {
    id: "fc-02", title: "Head to Head", sport: "cricket", matchLabel: "MI vs CSK",
    offsetMs: 4 * HOUR + 30 * MIN, entryFee: 500, prizePool: 950,
    totalSpots: 2, filledSpots: 1, winnersPct: 50, firstPrize: 950,
    guaranteed: false, multiEntry: false, tags: ["Head to Head", "Single Entry"],
  },
  {
    id: "fc-03", title: "Beginner's Ground", sport: "cricket", matchLabel: "MI vs CSK",
    offsetMs: 4 * HOUR + 30 * MIN, entryFee: 0, prizePool: 15_000,
    totalSpots: 6_000, filledSpots: 3_128, winnersPct: 60, firstPrize: 1_500,
    guaranteed: true, multiEntry: false, tags: ["Free", "Beginner", "Guaranteed"],
  },
  {
    id: "fc-04", title: "Winner Takes All", sport: "cricket", matchLabel: "MI vs CSK",
    offsetMs: 4 * HOUR + 30 * MIN, entryFee: 1_000, prizePool: 9_500,
    totalSpots: 10, filledSpots: 6, winnersPct: 10, firstPrize: 9_500,
    guaranteed: false, multiEntry: false, tags: ["Winner Takes All", "Small League"],
  },
  {
    id: "fc-05", title: "Wankhede Vault", sport: "cricket", matchLabel: "MI vs CSK",
    offsetMs: 4 * HOUR + 30 * MIN, entryFee: 5_000, prizePool: 2_500_000,
    totalSpots: 550, filledSpots: 388, winnersPct: 30, firstPrize: 500_000,
    guaranteed: true, multiEntry: true, tags: ["Premium", "Guaranteed", "High Roller"],
  },

  /* ---------- Cricket · other fixtures ---------- */
  {
    id: "fc-06", title: "Powerplay Practice", sport: "cricket", matchLabel: "IND vs AUS · 2nd T20I",
    offsetMs: 26 * HOUR, entryFee: 25, prizePool: 250_000,
    totalSpots: 12_500, filledSpots: 7_455, winnersPct: 65, firstPrize: 30_000,
    guaranteed: true, multiEntry: true, tags: ["Beginner", "Mega", "Guaranteed"],
  },
  {
    id: "fc-07", title: "Hundred Blitz", sport: "cricket", matchLabel: "Oval Invincibles vs Trent Rockets",
    offsetMs: 22 * HOUR + 15 * MIN, entryFee: 99, prizePool: 600_000,
    totalSpots: 8_000, filledSpots: 5_204, winnersPct: 48, firstPrize: 120_000,
    guaranteed: true, multiEntry: true, tags: ["Mega", "Guaranteed"],
  },
  {
    id: "fc-08", title: "County Grind", sport: "cricket", matchLabel: "Surrey vs Lancashire",
    offsetMs: 20 * HOUR, entryFee: 149, prizePool: 42_000,
    totalSpots: 350, filledSpots: 191, winnersPct: 25, firstPrize: 12_000,
    guaranteed: false, multiEntry: false, tags: ["Small League", "Single Entry"],
  },

  /* ---------- Soccer ---------- */
  {
    id: "fc-09", title: "Derby Mega", sport: "soccer", matchLabel: "ARS vs MCI",
    offsetMs: 27 * HOUR + 45 * MIN, entryFee: 59, prizePool: 2_000_000,
    totalSpots: 48_000, filledSpots: 31_907, winnersPct: 52, firstPrize: 400_000,
    guaranteed: true, multiEntry: true, tags: ["Mega", "Guaranteed", "Flexible"],
  },
  {
    id: "fc-10", title: "Derby Head to Head", sport: "soccer", matchLabel: "ARS vs MCI",
    offsetMs: 27 * HOUR + 45 * MIN, entryFee: 250, prizePool: 475,
    totalSpots: 2, filledSpots: 1, winnersPct: 50, firstPrize: 475,
    guaranteed: false, multiEntry: false, tags: ["Head to Head", "Single Entry"],
  },
  {
    id: "fc-11", title: "Serie A Sprint", sport: "soccer", matchLabel: "Inter Milan vs Juventus",
    offsetMs: 2 * HOUR + 15 * MIN, entryFee: 149, prizePool: 320_000,
    totalSpots: 2_600, filledSpots: 2_118, winnersPct: 40, firstPrize: 65_000,
    guaranteed: true, multiEntry: true, tags: ["Guaranteed", "Fast Fill"],
  },
  {
    id: "fc-12", title: "Klassiker Free Roll", sport: "soccer", matchLabel: "Bayern München vs Dortmund",
    offsetMs: 5 * HOUR, entryFee: 0, prizePool: 25_000,
    totalSpots: 20_000, filledSpots: 14_602, winnersPct: 70, firstPrize: 2_500,
    guaranteed: true, multiEntry: false, tags: ["Free", "Beginner", "Guaranteed"],
  },

  /* ---------- Basketball & esports ---------- */
  {
    id: "fc-13", title: "Hardwood Mega", sport: "basketball", matchLabel: "Denver vs Golden State",
    offsetMs: 6 * HOUR + 45 * MIN, entryFee: 79, prizePool: 750_000,
    totalSpots: 14_000, filledSpots: 9_836, winnersPct: 50, firstPrize: 150_000,
    guaranteed: true, multiEntry: true, tags: ["Mega", "Guaranteed"],
  },
  {
    id: "fc-14", title: "Headshot Hundred", sport: "esports", matchLabel: "Team Spirit vs PSG.LGD",
    offsetMs: 7 * HOUR + 10 * MIN, entryFee: 39, prizePool: 100_000,
    totalSpots: 3_200, filledSpots: 1_744, winnersPct: 45, firstPrize: 20_000,
    guaranteed: true, multiEntry: true, tags: ["Guaranteed", "Esports"],
  },
];

export const CONTESTS: FantasyContest[] = CONTEST_SEEDS.map(({ offsetMs, ...rest }) => ({
  ...rest,
  startsAt: new Date(SEED_NOW + offsetMs).toISOString(),
}));

/* ============================================================
   Player pool

   FantasyPlayer carries no sport field, so the squad tables below
   own that mapping and the accessors read it back.
   ============================================================ */

interface PlayerSeed {
  name: string;
  role: FantasyRole;
  credits: number;
}

interface SquadSeed {
  sport: SportKey;
  team: string;
  teamColor: string;
  prefix: string;
  players: PlayerSeed[];
}

/** Rough per-match fantasy ceiling by role, used to shape recent form. */
const ROLE_CEILING: Record<FantasyRole, number> = {
  WK: 78,
  BAT: 92,
  AR: 104,
  BOWL: 88,
  GK: 42,
  DEF: 56,
  MID: 68,
  FWD: 74,
};

const SQUADS: SquadSeed[] = [
  {
    sport: "cricket", team: "Mumbai Indians", teamColor: "#2563eb", prefix: "fp-mi",
    players: [
      { name: "Aryan Kulkarni", role: "WK", credits: 9.5 },
      { name: "Devansh Rane", role: "WK", credits: 7.5 },
      { name: "Rohit Vaidya", role: "BAT", credits: 11.0 },
      { name: "Kabir Sethi", role: "BAT", credits: 10.0 },
      { name: "Nikhil Warrier", role: "BAT", credits: 9.0 },
      { name: "Aditya Bhosale", role: "BAT", credits: 8.5 },
      { name: "Yash Tandon", role: "BAT", credits: 8.0 },
      { name: "Samar Pillai", role: "BAT", credits: 7.5 },
      { name: "Ishaan Chopra", role: "BAT", credits: 6.5 },
      { name: "Vikram Naik", role: "AR", credits: 10.5 },
      { name: "Rehan Qureshi", role: "AR", credits: 9.5 },
      { name: "Manav Deshpande", role: "AR", credits: 8.5 },
      { name: "Karthik Iyer", role: "AR", credits: 8.0 },
      { name: "Arjun Salvi", role: "AR", credits: 7.0 },
      { name: "Zaid Ansari", role: "BOWL", credits: 10.0 },
      { name: "Prithvi Gokhale", role: "BOWL", credits: 9.0 },
      { name: "Harsh Wagh", role: "BOWL", credits: 8.5 },
      { name: "Tanmay Joshi", role: "BOWL", credits: 8.0 },
      { name: "Rahul Kadam", role: "BOWL", credits: 7.5 },
      { name: "Omkar Shinde", role: "BOWL", credits: 6.5 },
    ],
  },
  {
    sport: "cricket", team: "Chennai Super Kings", teamColor: "#f5b301", prefix: "fp-csk",
    players: [
      { name: "Surya Ramanathan", role: "WK", credits: 10.5 },
      { name: "Nithin Balaji", role: "WK", credits: 7.0 },
      { name: "Dhruv Chidambaram", role: "BAT", credits: 11.5 },
      { name: "Aravind Menon", role: "BAT", credits: 9.5 },
      { name: "Sanjay Krishnan", role: "BAT", credits: 9.0 },
      { name: "Vivek Subramani", role: "BAT", credits: 8.5 },
      { name: "Hari Natarajan", role: "BAT", credits: 8.0 },
      { name: "Pranav Rajagopal", role: "BAT", credits: 7.0 },
      { name: "Girish Venkat", role: "BAT", credits: 6.5 },
      { name: "Jeevan Anand", role: "AR", credits: 11.0 },
      { name: "Mohit Sundaram", role: "AR", credits: 9.5 },
      { name: "Ravi Thyagarajan", role: "AR", credits: 8.5 },
      { name: "Ashwin Palani", role: "AR", credits: 7.5 },
      { name: "Naveen Ezhil", role: "AR", credits: 7.0 },
      { name: "Sathish Kumaran", role: "BOWL", credits: 10.0 },
      { name: "Bharath Elango", role: "BOWL", credits: 9.5 },
      { name: "Deepak Murali", role: "BOWL", credits: 8.5 },
      { name: "Lokesh Chandran", role: "BOWL", credits: 8.0 },
      { name: "Farhan Sheikh", role: "BOWL", credits: 7.5 },
      { name: "Yogesh Rathore", role: "BOWL", credits: 6.5 },
    ],
  },
  {
    sport: "soccer", team: "Arsenal", teamColor: "#ef4444", prefix: "fp-ars",
    players: [
      { name: "Liam Ashcroft", role: "GK", credits: 8.5 },
      { name: "Noah Brennan", role: "DEF", credits: 9.0 },
      { name: "Ethan Waverly", role: "DEF", credits: 8.5 },
      { name: "Callum Pike", role: "DEF", credits: 7.5 },
      { name: "Jonas Vogel", role: "DEF", credits: 7.0 },
      { name: "Marco Ferrante", role: "MID", credits: 10.5 },
      { name: "Idris Bamba", role: "MID", credits: 9.5 },
      { name: "Tomas Krejci", role: "MID", credits: 8.5 },
      { name: "Felix Duarte", role: "MID", credits: 7.5 },
      { name: "Rafael Sotto", role: "FWD", credits: 11.0 },
      { name: "Kwame Ofori", role: "FWD", credits: 9.0 },
    ],
  },
  {
    sport: "soccer", team: "Manchester City", teamColor: "#38bdf8", prefix: "fp-mci",
    players: [
      { name: "Viktor Haldan", role: "GK", credits: 9.0 },
      { name: "Andre Solano", role: "DEF", credits: 9.5 },
      { name: "Bruno Lindqvist", role: "DEF", credits: 8.5 },
      { name: "Mateo Rossi", role: "DEF", credits: 8.0 },
      { name: "Sam Odell", role: "DEF", credits: 6.5 },
      { name: "Julian Reyes", role: "MID", credits: 11.5 },
      { name: "Nico Fahri", role: "MID", credits: 10.0 },
      { name: "Dmitri Vane", role: "MID", credits: 8.5 },
      { name: "Owen Castille", role: "MID", credits: 7.0 },
      { name: "Luca Brandt", role: "FWD", credits: 11.5 },
      { name: "Emeka Nwosu", role: "FWD", credits: 9.5 },
    ],
  },
];

function buildSquad(squad: SquadSeed): FantasyPlayer[] {
  return squad.players.map((seed, i) => {
    const id = `${squad.prefix}-${String(i + 1).padStart(2, "0")}`;
    const rng = seeded(hashCode(id + seed.name));
    const ceiling = ROLE_CEILING[seed.role];
    // Better-credited players sit higher in the band, but every score
    // still has a floor and a tail — fantasy form is noisy.
    const quality = (seed.credits - 6.5) / 5;
    const form = Array.from({ length: 5 }, () =>
      Math.round(ceiling * (0.1 + quality * 0.35 + rng() * 0.6)),
    );
    const selectedBy = Number(clamp(quality * 74 + rng() * 22 + 2, 0.6, 96.4).toFixed(1));
    return {
      id,
      name: seed.name,
      short: seed.name.split(" ").slice(-1)[0],
      team: squad.team,
      teamColor: squad.teamColor,
      role: seed.role,
      credits: seed.credits,
      // Season-to-date total across the five listed appearances.
      points: form.reduce((a, b) => a + b, 0),
      selectedBy,
      form,
    } satisfies FantasyPlayer;
  });
}

export const PLAYER_POOL: FantasyPlayer[] = SQUADS.flatMap(buildSquad);

/** Team name → sport, so the pool can be sliced without a sport field. */
const TEAM_SPORT: Record<string, SportKey> = Object.fromEntries(
  SQUADS.map((s) => [s.team, s.sport]),
);

/* ============================================================
   Squad construction rules
   ============================================================ */

export interface SquadRules {
  /** Players in a valid line-up. */
  size: number;
  /** Credit budget the line-up must not exceed. */
  credits: number;
  roleMin: Partial<Record<FantasyRole, number>>;
  roleMax: Partial<Record<FantasyRole, number>>;
  /** Cap on picks from a single real-world team. */
  maxPerTeam: number;
  captainMultiplier: number;
  viceCaptainMultiplier: number;
}

export const TEAM_RULES: Record<"cricket" | "soccer", SquadRules> = {
  cricket: {
    size: 11,
    credits: 100,
    roleMin: { WK: 1, BAT: 3, AR: 1, BOWL: 3 },
    roleMax: { WK: 4, BAT: 6, AR: 4, BOWL: 6 },
    maxPerTeam: 7,
    captainMultiplier: 2,
    viceCaptainMultiplier: 1.5,
  },
  soccer: {
    size: 11,
    credits: 100,
    roleMin: { GK: 1, DEF: 3, MID: 3, FWD: 1 },
    roleMax: { GK: 1, DEF: 5, MID: 5, FWD: 3 },
    maxPerTeam: 7,
    captainMultiplier: 2,
    viceCaptainMultiplier: 1.5,
  },
};

/* ============================================================
   Leaderboard — the flagship contest after lock
   ============================================================ */

const LEADERBOARD_SEED: [user: string, teamName: string][] = [
  ["shardul_47", "Wankhede Warlords"],
  ["pitchmap", "Yorker Republic"],
  ["neha.batts", "Silly Point XI"],
  ["dugoutdon", "Cover Drive Co."],
  ["ravi_kx", "Third Man Tactics"],
  ["mid_on_maya", "Powerplay Pirates"],
  ["aaravm", "Mehta Marauders"],
  ["swingking", "Reverse Swing FC"],
  ["captain_cool9", "Chepauk Chargers"],
  ["dot.ball", "Economy Rate United"],
  ["thala_tanvi", "Whistle Podu XI"],
  ["gullycricket", "Tennis Ball Titans"],
  ["arjun.picks", "Death Over Dynasty"],
  ["seam_up", "New Ball Nomads"],
  ["fine_leg_fi", "Boundary Rope Boys"],
  ["googly_guru", "Wrong'un Warriors"],
  ["ipl_intern", "Auction Room XI"],
  ["nightwatch", "Nightwatchman FC"],
  ["run_a_ball", "Strike Rate Syndicate"],
  ["slipcordon", "Slip Cordon Society"],
  ["duck_lord", "Golden Duck Gang"],
  ["helicopter7", "Helicopter Shot Heroes"],
  ["pavilion_p", "Long Handle Legion"],
  ["freehit_fk", "Free Hit Federation"],
  ["stumped_it", "Behind The Sticks"],
];

/** Prize ladder for the flagship mega contest, in dirhams. */
function prizeForRank(rank: number): number {
  if (rank === 1) return 1_000_000;
  if (rank === 2) return 400_000;
  if (rank === 3) return 200_000;
  if (rank === 4) return 100_000;
  if (rank === 5) return 60_000;
  if (rank <= 8) return 30_000;
  if (rank <= 12) return 12_000;
  if (rank <= 18) return 4_500;
  return 1_800;
}

export const LEADERBOARD: LeaderboardEntry[] = LEADERBOARD_SEED.map(([user, teamName], i) => {
  const rank = i + 1;
  const rng = seeded(hashCode(`${user}#${rank}`));
  // Decrement is always positive, so points stay strictly descending.
  const points = Number((1_184.5 - i * 9.4 - rng() * 5.8).toFixed(1));
  return {
    rank,
    user,
    avatarHue: hashCode(user) % 360,
    points,
    teamName,
    prize: prizeForRank(rank),
    isYou: user === "aaravm" ? true : undefined,
    movement: Math.round(rng() * 12) - 6,
  } satisfies LeaderboardEntry;
});

/* ============================================================
   Accessors
   ============================================================ */

export function contestsBySport(sport?: SportKey): FantasyContest[] {
  return sport ? CONTESTS.filter((c) => c.sport === sport) : CONTESTS;
}

export function findContest(id: string): FantasyContest | undefined {
  return CONTESTS.find((c) => c.id === id);
}

export function playersForSport(sport: SportKey): FantasyPlayer[] {
  return PLAYER_POOL.filter((p) => TEAM_SPORT[p.team] === sport);
}

export function playersByRole(sport: SportKey, role: FantasyRole): FantasyPlayer[] {
  return playersForSport(sport).filter((p) => p.role === role);
}
