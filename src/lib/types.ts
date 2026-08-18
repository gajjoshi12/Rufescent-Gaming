/** Domain model for the Rufescent Gaming platform. */

export type SportKey = "soccer" | "cricket" | "basketball" | "tennis" | "esports";

export interface Sport {
  key: SportKey;
  name: string;
  icon: string;
  /** Number of markets currently open, used for nav badges. */
  liveCount: number;
}

export type MatchStatus = "live" | "upcoming" | "settled";

export interface Competitor {
  id: string;
  name: string;
  short: string;
  /** Two-letter or emoji flag/crest stand-in for the mock. */
  crest: string;
}

export interface Match {
  id: string;
  sport: SportKey;
  competition: string;
  home: Competitor;
  away: Competitor;
  status: MatchStatus;
  /** ISO string. */
  startsAt: string;
  /** Human clock for live games, e.g. "63'" or "Set 2 · 4-3". */
  clock?: string;
  score?: { home: number; away: number };
  /** Extra live context line, e.g. "12.4 ov · 98/3". */
  detail?: string;
  marketCount: number;
  /** Marks a match for the landing-page highlight rail. */
  featured?: boolean;
  streaming?: boolean;
}

/** Exchange-style two-sided price. */
export interface ExchangePrice {
  /** Decimal odds. */
  price: number;
  /** Liquidity available at that price, in currency units. */
  size: number;
}

export interface Runner {
  id: string;
  name: string;
  /** Fixed-odds decimal price offered by the book. */
  fixed: number;
  /** Best three back prices, index 0 is best available. */
  back: ExchangePrice[];
  /** Best three lay prices, index 0 is best available. */
  lay: ExchangePrice[];
  /** Prior price, used to render up/down flashes. */
  prev?: number;
  suspended?: boolean;
}

export type MarketType =
  | "match_odds"
  | "over_under"
  | "handicap"
  | "both_teams_score"
  | "correct_score"
  | "player_props"
  | "outright";

export interface Market {
  id: string;
  matchId: string;
  name: string;
  type: MarketType;
  runners: Runner[];
  /** Book over-round as a percentage, e.g. 102.4 */
  margin: number;
  inPlay: boolean;
  suspended?: boolean;
  /** Total matched on the exchange, in currency units. */
  matched: number;
  cashOutEligible: boolean;
}

/* ---------- Bet slip ---------- */

export type BetSide = "back" | "lay";
export type OddsFormat = "decimal" | "fractional" | "american";

export interface Selection {
  id: string;
  matchId: string;
  marketId: string;
  runnerId: string;
  matchLabel: string;
  marketLabel: string;
  runnerLabel: string;
  side: BetSide;
  odds: number;
  /** Set when the price moved after the selection was added. */
  priceChanged?: "up" | "down";
  stake?: number;
  inPlay: boolean;
}

export type SlipMode = "single" | "multi" | "system";

/* ---------- Casino ---------- */

export type CasinoCategory = "slots" | "live" | "table" | "crash" | "instant";

export interface CasinoGame {
  id: string;
  slug: string;
  name: string;
  provider: string;
  category: CasinoCategory;
  /** Return to player, percent. */
  rtp: number;
  volatility: "low" | "medium" | "high";
  maxWin: string;
  reels?: string;
  paylines?: number | string;
  minBet: number;
  maxBet: number;
  /** Deterministic hue used to generate the cover art gradient. */
  hue: number;
  tags: string[];
  isNew?: boolean;
  isHot?: boolean;
  jackpot?: number;
  /** Live-dealer only. */
  tableSeats?: number;
  dealer?: string;
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  gameCount: number;
  hue: number;
}

/* ---------- Fantasy ---------- */

export interface FantasyContest {
  id: string;
  title: string;
  sport: SportKey;
  matchLabel: string;
  startsAt: string;
  entryFee: number;
  prizePool: number;
  totalSpots: number;
  filledSpots: number;
  winnersPct: number;
  /** e.g. "AED 10,000" */
  firstPrize: number;
  guaranteed: boolean;
  multiEntry: boolean;
  tags: string[];
}

export type FantasyRole = "WK" | "BAT" | "AR" | "BOWL" | "GK" | "DEF" | "MID" | "FWD";

export interface FantasyPlayer {
  id: string;
  name: string;
  short: string;
  team: string;
  teamColor: string;
  role: FantasyRole;
  credits: number;
  points: number;
  /** Percentage of entrants who picked this player. */
  selectedBy: number;
  form: number[];
}

export interface LeaderboardEntry {
  rank: number;
  user: string;
  avatarHue: number;
  points: number;
  teamName: string;
  prize: number;
  isYou?: boolean;
  movement: number;
}

/* ---------- Wallet ---------- */

export type TxKind = "deposit" | "withdrawal" | "bet" | "payout" | "bonus" | "refund";
export type TxStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  kind: TxKind;
  status: TxStatus;
  amount: number;
  balanceAfter: number;
  method: string;
  reference: string;
  createdAt: string;
  note?: string;
}

export interface PaymentMethod {
  id: string;
  label: string;
  detail: string;
  icon: string;
  minAmount: number;
  maxAmount: number;
  /** Human ETA, e.g. "Instant" or "1–3 business days". */
  eta: string;
  feePct: number;
}

export type KycStatus = "not_started" | "pending" | "verified" | "rejected";

export interface KycDocument {
  id: string;
  label: string;
  description: string;
  required: boolean;
  accepts: string;
  status: KycStatus;
  fileName?: string;
}

/* ---------- User ---------- */

export interface User {
  id: string;
  displayName: string;
  handle: string;
  email: string;
  avatarHue: number;
  tier: "Bronze" | "Silver" | "Gold" | "Obsidian";
  loyaltyPoints: number;
  nextTierAt: number;
  balance: number;
  bonusBalance: number;
  withdrawable: number;
  kycStatus: KycStatus;
  memberSince: string;
  currency: string;
}

export interface ResponsibleLimits {
  dailyDeposit: number;
  weeklyDeposit: number;
  monthlyDeposit: number;
  sessionMinutes: number;
  lossLimitWeekly: number;
  realityCheckMinutes: number;
  selfExclusion: "none" | "24h" | "7d" | "30d" | "6m" | "permanent";
}

/* ---------- Promotions ---------- */

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
  href: string;
  /** Gradient hues for the generated art. */
  hues: [number, number];
  terms: string;
}

/* ---------- Open bets / cash out ---------- */

export interface OpenBet {
  id: string;
  placedAt: string;
  matchLabel: string;
  legs: { label: string; odds: number; status: "won" | "lost" | "open" }[];
  stake: number;
  potentialReturn: number;
  /** Live cash-out offer; null when unavailable. */
  cashOut: number | null;
  mode: SlipMode;
  inPlay: boolean;
}
