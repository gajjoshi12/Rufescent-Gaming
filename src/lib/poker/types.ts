/** Texas Hold'em domain model. */

export type Suit = "s" | "h" | "d" | "c";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Street the hand is currently on. */
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type ActionKind = "fold" | "check" | "call" | "bet" | "raise" | "all-in" | "post";

export interface Action {
  kind: ActionKind;
  /** Chips committed by this action, above what the seat had already put in. */
  amount: number;
  seatId: string;
}

export type SeatStatus = "active" | "folded" | "all-in" | "sitting-out" | "busted";

export interface PokerPlayer {
  id: string;
  name: string;
  handle: string;
  avatarHue: number;
  country: string;
  /** Chip stack behind. */
  stack: number;
  /** Marks the viewer's own seat. */
  isHero?: boolean;
  /** Loose/tight and passive/aggressive, 0–1, drives the bot policy. */
  aggression: number;
  looseness: number;
}

export interface Seat {
  id: string;
  /** 0-indexed position around the table, 0 is the hero's chair. */
  index: number;
  player: PokerPlayer | null;
  status: SeatStatus;
  holeCards: Card[];
  /** Chips pushed forward on the current street. */
  committed: number;
  /** Total chips in the pot from this seat this hand. */
  totalCommitted: number;
  lastAction: ActionKind | null;
  lastActionAmount: number;
  /** Set at showdown. */
  handLabel?: string;
  isWinner?: boolean;
}

export interface Pot {
  amount: number;
  /** Seat ids eligible to win this pot. */
  eligible: string[];
  label: string;
}

export interface TableState {
  handNumber: number;
  street: Street;
  seats: Seat[];
  board: Card[];
  pots: Pot[];
  /** Seat index holding the dealer button. */
  buttonIndex: number;
  /** Seat whose turn it is, or null between streets. */
  toActSeatId: string | null;
  /** Highest total committed on this street — what a caller must match. */
  currentBet: number;
  /** Smallest legal raise increment. */
  minRaise: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  /** Rolling commentary shown in the hand log. */
  log: string[];
}

/* ---------- Tournament ---------- */

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  /** Minutes. */
  duration: number;
}

export interface PayoutTier {
  label: string;
  fromRank: number;
  toRank: number;
  amount: number;
}

export type TournamentFormat = "mtt" | "sng" | "cash" | "bounty" | "turbo";

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  buyIn: number;
  fee: number;
  startingStack: number;
  guaranteed: number;
  prizePool: number;
  entrants: number;
  maxEntrants: number;
  playersLeft: number;
  /** ISO string. */
  startsAt: string;
  status: "registering" | "late-reg" | "running" | "final-table" | "finished";
  currentLevel: number;
  levels: BlindLevel[];
  payouts: PayoutTier[];
  /** Average stack in chips, for the running state. */
  averageStack: number;
  seatsPerTable: number;
  tags: string[];
  /** Knockout bounty per elimination, bounty formats only. */
  bounty?: number;
  description: string;
}

/** A seat at a running tournament, used by the lobby's "my tables" strip. */
export interface TournamentSeat {
  tournamentId: string;
  tableId: string;
  rank: number;
  stack: number;
  bigBlinds: number;
}
