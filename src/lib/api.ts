/**
 * Mock API layer.
 *
 * Every function here mimics a network round-trip with realistic latency
 * so the skeleton loaders in the UI have something real to wait on.
 * Swapping this file for `fetch` calls against a live backend is the only
 * change required to take the app off mock data.
 */

import type {
  CasinoCategory,
  CasinoGame,
  FantasyContest,
  FantasyPlayer,
  LeaderboardEntry,
  Market,
  Match,
  OpenBet,
  PaymentMethod,
  Promotion,
  SportKey,
  Transaction,
  User,
} from "./types";

import {
  ALL_MATCHES,
  competitionsForSport,
  featuredMatches,
  findMatch,
  liveMatches,
  marketsForMatch,
  matchesBySport,
  primaryMarket,
  upcomingMatches,
} from "./mock/sports";

import {
  CASINO_CATEGORIES,
  CASINO_GAMES,
  PROVIDERS,
  findGame,
  gamesByCategory,
  hotGames,
  jackpotGames,
  newGames,
  relatedGames,
  searchGames,
} from "./mock/casino";

import {
  CONTESTS,
  LEADERBOARD,
  PLAYER_POOL,
  contestsBySport,
  findContest,
  playersForSport,
} from "./mock/fantasy";

import {
  CURRENT_USER,
  KYC_DOCUMENTS,
  OPEN_BETS,
  PAYMENT_METHODS,
  TRANSACTIONS,
} from "./mock/wallet";

import { PROMOTIONS, QUICK_STATS } from "./mock/promotions";

/** Simulated network latency, in ms. Kept short enough not to annoy. */
const LATENCY = { fast: 180, normal: 420, slow: 780 } as const;

function delay<T>(value: T, ms: number = LATENCY.normal): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* ---------- Sports ---------- */

export const api = {
  sports: {
    list: () => delay(ALL_MATCHES, LATENCY.fast),
    bySport: (sport?: SportKey) => delay(matchesBySport(sport)),
    live: () => delay(liveMatches(), LATENCY.fast),
    featured: () => delay(featuredMatches(), LATENCY.fast),
    upcoming: () => delay(upcomingMatches()),
    match: (id: string) => delay(findMatch(id), LATENCY.fast),
    markets: (matchId: string) => delay(marketsForMatch(matchId), LATENCY.normal),
    primaryMarket: (matchId: string) => delay(primaryMarket(matchId), LATENCY.fast),
    competitions: (sport: SportKey) => delay(competitionsForSport(sport), LATENCY.fast),
  },

  casino: {
    categories: () => delay(CASINO_CATEGORIES, LATENCY.fast),
    all: () => delay(CASINO_GAMES),
    byCategory: (cat?: CasinoCategory) => delay(gamesByCategory(cat)),
    game: (slug: string) => delay(findGame(slug), LATENCY.fast),
    related: (slug: string, limit = 6) => delay(relatedGames(slug, limit), LATENCY.fast),
    providers: () => delay(PROVIDERS, LATENCY.fast),
    hot: () => delay(hotGames(), LATENCY.fast),
    fresh: () => delay(newGames(), LATENCY.fast),
    jackpots: () => delay(jackpotGames(), LATENCY.fast),
    search: (q: string) => delay(searchGames(q), LATENCY.fast),
  },

  fantasy: {
    contests: (sport?: SportKey) => delay(sport ? contestsBySport(sport) : CONTESTS),
    contest: (id: string) => delay(findContest(id), LATENCY.fast),
    players: (sport: SportKey) => delay(playersForSport(sport), LATENCY.normal),
    pool: () => delay(PLAYER_POOL),
    // The mock returns one shared board; a real endpoint would key on the id.
    leaderboard: (_contestId: string) => delay(LEADERBOARD, LATENCY.slow),
  },

  wallet: {
    user: () => delay(CURRENT_USER, LATENCY.fast),
    transactions: () => delay(TRANSACTIONS, LATENCY.normal),
    methods: () => delay(PAYMENT_METHODS, LATENCY.fast),
    kycDocs: () => delay(KYC_DOCUMENTS, LATENCY.fast),
    openBets: () => delay(OPEN_BETS, LATENCY.normal),

    /** Mock deposit — always succeeds above the method minimum. */
    deposit: (amount: number, method: string) =>
      delay(
        {
          ok: amount > 0,
          reference: `DEP-${Math.abs(Math.round(amount * 977)).toString(36).toUpperCase()}`,
          amount,
          method,
        },
        LATENCY.slow,
      ),

    /** Mock withdrawal — blocked until KYC clears, mirroring real platforms. */
    withdraw: (amount: number, method: string) =>
      delay(
        {
          ok: CURRENT_USER.kycStatus === "verified" && amount <= CURRENT_USER.withdrawable,
          reason:
            CURRENT_USER.kycStatus !== "verified"
              ? "Complete identity verification before withdrawing."
              : amount > CURRENT_USER.withdrawable
                ? "Amount exceeds your withdrawable balance."
                : null,
          reference: `WDR-${Math.abs(Math.round(amount * 613)).toString(36).toUpperCase()}`,
          amount,
          method,
        },
        LATENCY.slow,
      ),
  },

  promotions: {
    list: () => delay(PROMOTIONS, LATENCY.fast),
    stats: () => delay(QUICK_STATS, LATENCY.fast),
  },
};

/* ---------- Re-exports so pages can render synchronously where useful ---------- */

export type {
  CasinoGame,
  FantasyContest,
  FantasyPlayer,
  LeaderboardEntry,
  Market,
  Match,
  OpenBet,
  PaymentMethod,
  Promotion,
  Transaction,
  User,
};
