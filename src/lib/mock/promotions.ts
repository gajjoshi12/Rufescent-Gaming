/**
 * Promotions & trust-strip mock.
 *
 * PROMOTIONS backs the landing-page hero carousel and the /promotions
 * grid — each banner's artwork is generated from its `hues` pair via
 * `hueGradient()` rather than shipping images. QUICK_STATS backs the
 * narrow trust strip that sits under the hero.
 *
 * Every offer here is illustrative demo copy for the prototype.
 */

import type { Promotion } from "../types";

export const PROMOTIONS: Promotion[] = [
  {
    id: "pr-welcome",
    title: "200% Welcome Bonus",
    subtitle: "Double your first deposit up to AED 20,000 and start with a bigger bankroll across sports and casino.",
    badge: "New players",
    cta: "Claim bonus",
    href: "/wallet",
    hues: [14, 46],
    terms: "Min deposit AED 500 · 6x wagering at odds 1.60+ · 30 days to complete.",
  },
  {
    id: "pr-cashback",
    title: "10% Weekly Cashback",
    subtitle: "Every Monday we return a tenth of last week's net losses as cash — no wagering, no catch.",
    badge: "Every Monday",
    cta: "See your rate",
    href: "/promotions",
    hues: [196, 232],
    terms: "Calculated on settled bets Mon–Sun · max AED 25,000 per week · paid by 12:00 GST.",
  },
  {
    id: "pr-acca",
    title: "Accumulator Boost up to 70%",
    subtitle: "Add legs, add value. Four-fold multis and longer earn an automatic boost on the winning return.",
    badge: "Sports",
    cta: "Build a multi",
    href: "/sports",
    hues: [268, 306],
    terms: "Min 4 legs at odds 1.30+ each · pre-match and in-play · max boost AED 50,000.",
  },
  {
    id: "pr-spins",
    title: "150 Free Spins on Ember Fortune",
    subtitle: "Deposit AED 1,000 and collect fifty spins a day for three days on our headline progressive slot.",
    badge: "Casino",
    cta: "Spin now",
    href: "/casino",
    hues: [332, 8],
    terms: "Spin value AED 5 · winnings credited as cash · expires 72 hours after issue.",
  },
  {
    id: "pr-fantasy",
    title: "AED 5M Fantasy Mega",
    subtitle: "One entry, one hundred and twenty-eight thousand seats, and a million-dirham prize pool every match day.",
    badge: "Guaranteed",
    cta: "Enter contest",
    href: "/fantasy",
    hues: [146, 178],
    terms: "Entry AED 49 · guaranteed prize pool · multi-entry up to 20 teams per user.",
  },
  {
    id: "pr-referral",
    title: "Refer a Friend, Get AED 1,000",
    subtitle: "Share your code. When they deposit and place their first bet, you both collect a thousand in cash.",
    badge: "Refer & earn",
    cta: "Get your code",
    href: "/wallet",
    hues: [88, 118],
    terms: "Friend must deposit AED 500+ and wager it once · max 10 referrals per account.",
  },
];

/* ============================================================
   Landing-page trust strip
   ============================================================ */

export interface QuickStat {
  label: string;
  value: string;
  hint: string;
}

export const QUICK_STATS: QuickStat[] = [
  { label: "Active players", value: "1.2M", hint: "Placed a bet in the last 30 days" },
  { label: "Payouts processed", value: "AED 840M", hint: "Withdrawn in the last 12 months" },
  { label: "Markets live", value: "18,400", hint: "Across 5 sports right now" },
  { label: "Avg. withdrawal", value: "8 min", hint: "UPI, median over the last week" },
  { label: "Casino titles", value: "3,100+", hint: "From 40 licensed studios" },
];
