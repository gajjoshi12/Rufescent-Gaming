/**
 * Casino catalogue mock.
 *
 * Backs the /casino lobby (category rails, provider filter, search),
 * the game-detail page (RTP / volatility / limits panel) and the
 * "related games" rail. All artwork is generated from `hue` via
 * `hueGradient()` in ../format, so hues are chosen to contrast with
 * their neighbours in array order — tiles never sit next to a twin.
 *
 * Every studio and title here is invented for the prototype.
 */

import type { CasinoCategory, CasinoGame, Provider } from "../types";
import { hashCode, seeded } from "../format";

/* ============================================================
   Categories
   ============================================================ */

export interface CasinoCategoryMeta {
  key: CasinoCategory;
  label: string;
  icon: string;
  blurb: string;
}

export const CASINO_CATEGORIES: CasinoCategoryMeta[] = [
  {
    key: "slots",
    label: "Slots",
    icon: "🎰",
    blurb: "Reel games from every studio — cluster pays, ways pays and progressive jackpots.",
  },
  {
    key: "live",
    label: "Live Casino",
    icon: "🎥",
    blurb: "Real dealers, real tables, streamed in HD from the studio floor.",
  },
  {
    key: "table",
    label: "Table Games",
    icon: "🃏",
    blurb: "Roulette, blackjack, baccarat and poker variants with classic house rules.",
  },
  {
    key: "crash",
    label: "Crash",
    icon: "🚀",
    blurb: "Multiplier climbs, you decide when to bail. Provably fair rounds every few seconds.",
  },
  {
    key: "instant",
    label: "Instant Win",
    icon: "⚡",
    blurb: "One-tap games with instant settlement — mines, plinko and scratch style rounds.",
  },
];

/* ============================================================
   Providers
   ============================================================ */

const PROVIDER_META: { id: string; name: string; hue: number }[] = [
  { id: "pv-aurelia", name: "Aurelia Studios", hue: 14 },
  { id: "pv-nocturne", name: "Nocturne Interactive", hue: 268 },
  { id: "pv-pyre", name: "Pyre & Quill", hue: 32 },
  { id: "pv-vantablack", name: "Vantablack Labs", hue: 202 },
  { id: "pv-koi", name: "Koi Collective", hue: 176 },
  { id: "pv-mercury", name: "Mercury Reels", hue: 48 },
  { id: "pv-halcyon", name: "Halcyon Live", hue: 146 },
  { id: "pv-sable", name: "Sable Sixteen", hue: 306 },
  { id: "pv-tidewater", name: "Tidewater Play", hue: 214 },
  { id: "pv-grifon", name: "Grifon Interactive", hue: 88 },
];

/* ============================================================
   Progressive jackpots

   Seeded from the slug so the ticker starts at the same value on
   the server and the client; the runtime ticker adds drift on top.
   ============================================================ */

const JACKPOT_BASE: Record<string, number> = {
  "ember-fortune": 3_200_000,
  "sultans-vault": 8_400_000,
  "pharaohs-ledger": 1_450_000,
  "dragons-tithe": 12_900_000,
  "carnival-of-coins": 640_000,
  "sunken-sovereign": 2_050_000,
};

function seededJackpot(slug: string, base: number): number {
  const rng = seeded(hashCode(slug));
  return Math.round((base * (1 + rng() * 0.55)) / 50) * 50;
}

/* ============================================================
   Catalogue

   Hues walk the colour wheel in ~137° steps (the golden angle),
   which keeps every adjacent pair of tiles far apart in hue.
   ============================================================ */

const CATALOGUE: CasinoGame[] = [
  /* ---------- Slots ---------- */
  {
    id: "cg-01", slug: "ember-fortune", name: "Ember Fortune", provider: "Aurelia Studios",
    category: "slots", rtp: 96.4, volatility: "high", maxWin: "12,500x",
    reels: "5×3", paylines: 25, minBet: 10, maxBet: 6_000, hue: 12,
    tags: ["Jackpot", "Free Spins", "Expanding Wilds"], isHot: true,
    description: "Forge-lit reels where every wild lands molten and spreads to the full column. Three scatters open the ember free-spin round with a growing multiplier.",
  },
  {
    id: "cg-02", slug: "neon-koi", name: "Neon Koi", provider: "Koi Collective",
    category: "slots", rtp: 96.9, volatility: "medium", maxWin: "5,000x",
    reels: "6×5", paylines: "Cluster", minBet: 10, maxBet: 4_000, hue: 149,
    tags: ["Cluster Pays", "Cascading", "Asian"], isNew: true,
    description: "A rain-slick night market rendered in electric blue. Winning clusters drain away and the koi above the grid drop replacement symbols.",
  },
  {
    id: "cg-03", slug: "sultans-vault", name: "Sultan's Vault", provider: "Pyre & Quill",
    category: "slots", rtp: 95.6, volatility: "high", maxWin: "20,000x",
    reels: "5×4", paylines: 40, minBet: 20, maxBet: 8_000, hue: 286,
    tags: ["Jackpot", "Hold & Win", "Bonus Buy"], isHot: true,
    description: "Six locked vault doors sit above the reels and open one tier at a time. Fill the grid with coins to trigger the four-level progressive.",
  },
  {
    id: "cg-04", slug: "frost-talon", name: "Frost Talon", provider: "Vantablack Labs",
    category: "slots", rtp: 96.1, volatility: "high", maxWin: "9,800x",
    reels: "5×3", paylines: 243, minBet: 10, maxBet: 5_000, hue: 63,
    tags: ["Ways Pays", "Animals", "Sticky Wilds"],
    description: "A snow-owl hunt across 243 ways. Talon symbols freeze in place for the rest of the feature and count on every subsequent spin.",
  },
  {
    id: "cg-05", slug: "gilded-mirage", name: "Gilded Mirage", provider: "Mercury Reels",
    category: "slots", rtp: 96.7, volatility: "medium", maxWin: "6,400x",
    reels: "5×3", paylines: 20, minBet: 10, maxBet: 3_000, hue: 200,
    tags: ["Desert", "Free Spins", "Multiplier"],
    description: "Heat-haze reels that shimmer between two symbol sets. The mirage respin swaps low pays for high pays before the win is evaluated.",
  },
  {
    id: "cg-06", slug: "midnight-bazaar", name: "Midnight Bazaar", provider: "Nocturne Interactive",
    category: "slots", rtp: 96.2, volatility: "medium", maxWin: "7,200x",
    reels: "6×4", paylines: "4,096 ways", minBet: 15, maxBet: 5_000, hue: 337,
    tags: ["Ways Pays", "Pick Bonus", "Adventure"],
    description: "Lantern-lit stalls hide a three-tier pick round. Choose a merchant and haggle up your multiplier — or walk away with the coin on the table.",
  },
  {
    id: "cg-07", slug: "thunder-serpent", name: "Thunder Serpent", provider: "Grifon Interactive",
    category: "slots", rtp: 95.9, volatility: "high", maxWin: "15,000x",
    reels: "5×4", paylines: 50, minBet: 20, maxBet: 7_500, hue: 114,
    tags: ["Mythology", "High Volatility", "Multiplier"], isHot: true,
    description: "Storm-god reels where lightning strikes random positions and applies a 2x–100x multiplier. Rare, loud and worth the wait.",
  },
  {
    id: "cg-08", slug: "aztec-ember", name: "Aztec Ember", provider: "Aurelia Studios",
    category: "slots", rtp: 96.5, volatility: "high", maxWin: "11,000x",
    reels: "6×5", paylines: "Cluster", minBet: 10, maxBet: 6_000, hue: 251,
    tags: ["Aztec", "Cluster Pays", "Cascading", "Bonus Buy"],
    description: "Stone glyphs burn away as they pay, dropping the tumble multiplier one rung higher each time. The free-spin multiplier never resets.",
  },
  {
    id: "cg-09", slug: "velvet-reign", name: "Velvet Reign", provider: "Sable Sixteen",
    category: "slots", rtp: 97.1, volatility: "low", maxWin: "2,400x",
    reels: "5×3", paylines: 10, minBet: 10, maxBet: 2_500, hue: 28,
    tags: ["Classic", "Low Volatility", "Gems"],
    description: "A deliberately gentle ten-line game with a 97.1% return. Small, frequent wins and a single expanding crown wild.",
  },
  {
    id: "cg-10", slug: "cosmic-cascade", name: "Cosmic Cascade", provider: "Vantablack Labs",
    category: "slots", rtp: 96.8, volatility: "medium", maxWin: "8,000x",
    reels: "7×7", paylines: "Cluster", minBet: 10, maxBet: 4_500, hue: 165,
    tags: ["Sci-Fi", "Cluster Pays", "Cascading"], isNew: true,
    description: "A 7×7 star field where clusters collapse into nebulae. Every fourth cascade charges the singularity wild at the centre of the grid.",
  },
  {
    id: "cg-11", slug: "pharaohs-ledger", name: "Pharaoh's Ledger", provider: "Pyre & Quill",
    category: "slots", rtp: 95.4, volatility: "high", maxWin: "10,000x",
    reels: "5×3", paylines: 10, minBet: 10, maxBet: 5_000, hue: 302,
    tags: ["Egyptian", "Jackpot", "Free Spins"],
    description: "The scribe records every scatter you land across the session and pays it back in the ledger bonus. Ten lines, one very patient accountant.",
  },
  {
    id: "cg-12", slug: "wildwood-crown", name: "Wildwood Crown", provider: "Koi Collective",
    category: "slots", rtp: 96.3, volatility: "medium", maxWin: "5,600x",
    reels: "5×4", paylines: 30, minBet: 10, maxBet: 3_500, hue: 79,
    tags: ["Fantasy", "Free Spins", "Animals"],
    description: "Antlered woodland royalty on a mossy five-reel set. The crown scatter awards spins where every stag symbol turns wild on landing.",
  },
  {
    id: "cg-13", slug: "sakura-spindle", name: "Sakura Spindle", provider: "Nocturne Interactive",
    category: "slots", rtp: 96.6, volatility: "low", maxWin: "3,200x",
    reels: "5×3", paylines: 25, minBet: 10, maxBet: 2_000, hue: 216,
    tags: ["Asian", "Low Volatility", "Free Spins"],
    description: "Blossom petals drift across the reels and nudge single positions wild. Calm pacing, steady returns, ideal for long sessions.",
  },
  {
    id: "cg-14", slug: "kraken-depths", name: "Kraken Depths", provider: "Tidewater Play",
    category: "slots", rtp: 95.8, volatility: "high", maxWin: "18,000x",
    reels: "6×4", paylines: "4,096 ways", minBet: 20, maxBet: 8_000, hue: 353,
    tags: ["Ocean", "High Volatility", "Ways Pays"], isHot: true,
    description: "Tentacles drag entire reels beneath the surface and return them stacked wild. The deeper the dive, the bigger the ways count.",
  },
  {
    id: "cg-15", slug: "molten-vault", name: "Molten Vault", provider: "Aurelia Studios",
    category: "slots", rtp: 96.0, volatility: "high", maxWin: "13,300x",
    reels: "5×3", paylines: 20, minBet: 15, maxBet: 6_000, hue: 130,
    tags: ["Hold & Win", "Bonus Buy", "Multiplier"],
    description: "Fill six or more coin positions to lock the hold-and-win round. Each respin resets the counter and pours another ingot into the vault.",
  },
  {
    id: "cg-16", slug: "prism-drifter", name: "Prism Drifter", provider: "Vantablack Labs",
    category: "slots", rtp: 96.9, volatility: "medium", maxWin: "6,000x",
    reels: "5×4", paylines: 40, minBet: 10, maxBet: 4_000, hue: 267,
    tags: ["Sci-Fi", "Multiplier", "Free Spins"], isNew: true,
    description: "Refracted symbols split into two on the middle reels. Every split doubles the line count for that spin only.",
  },
  {
    id: "cg-17", slug: "bandit-skyline", name: "Bandit Skyline", provider: "Grifon Interactive",
    category: "slots", rtp: 96.1, volatility: "medium", maxWin: "7,700x",
    reels: "5×3", paylines: 243, minBet: 10, maxBet: 5_000, hue: 44,
    tags: ["Wild West", "Ways Pays", "Free Spins"],
    description: "A rooftop chase across a dust-red frontier town. Collect three safes to unlock the getaway spins with a sticky wild train.",
  },
  {
    id: "cg-18", slug: "frozen-lotus", name: "Frozen Lotus", provider: "Koi Collective",
    category: "slots", rtp: 96.4, volatility: "medium", maxWin: "4,800x",
    reels: "5×3", paylines: 25, minBet: 10, maxBet: 3_000, hue: 181,
    tags: ["Asian", "Cascading", "Expanding Wilds"],
    description: "Ice-locked petals shatter on a win and refill from above. Four cascades in a row bloom the lotus wild across the centre reel.",
  },
  {
    id: "cg-19", slug: "dragons-tithe", name: "Dragon's Tithe", provider: "Pyre & Quill",
    category: "slots", rtp: 95.2, volatility: "high", maxWin: "25,000x",
    reels: "6×5", paylines: "Cluster", minBet: 25, maxBet: 10_000, hue: 318,
    tags: ["Jackpot", "Mythology", "High Volatility", "Bonus Buy"], isHot: true,
    description: "The headline progressive: a hoard that grows across the whole network until one grid fills with gold. Brutal variance, enormous ceiling.",
  },
  {
    id: "cg-20", slug: "rust-and-ruin", name: "Rust & Ruin", provider: "Sable Sixteen",
    category: "slots", rtp: 96.2, volatility: "high", maxWin: "9,000x",
    reels: "5×4", paylines: 50, minBet: 10, maxBet: 5_500, hue: 95,
    tags: ["Post-Apocalyptic", "Multiplier", "Free Spins"],
    description: "Scavenger reels built from scrap metal. Salvage tokens stack into a multiplier meter that carries between free spins.",
  },
  {
    id: "cg-21", slug: "starlit-caravan", name: "Starlit Caravan", provider: "Mercury Reels",
    category: "slots", rtp: 96.5, volatility: "medium", maxWin: "5,200x",
    reels: "5×3", paylines: 30, minBet: 10, maxBet: 3_500, hue: 232,
    tags: ["Adventure", "Free Spins", "Pick Bonus"],
    description: "A night crossing under a painted sky. Each caravan symbol you collect adds one spin and one wagon-wheel wild to the bonus.",
  },
  {
    id: "cg-22", slug: "honeyfall-reels", name: "Honeyfall Reels", provider: "Grifon Interactive",
    category: "slots", rtp: 97.0, volatility: "low", maxWin: "2,000x",
    reels: "5×3", paylines: 20, minBet: 10, maxBet: 2_000, hue: 9,
    tags: ["Fruit", "Low Volatility", "Cascading"],
    description: "Sweet, slow and forgiving. Honey drips down the reels after every win and glues one symbol in place for the next spin.",
  },
  {
    id: "cg-23", slug: "obsidian-oracle", name: "Obsidian Oracle", provider: "Nocturne Interactive",
    category: "slots", rtp: 95.7, volatility: "high", maxWin: "14,000x",
    reels: "5×4", paylines: 40, minBet: 20, maxBet: 7_000, hue: 146,
    tags: ["Mythology", "High Volatility", "Sticky Wilds"],
    description: "A black-glass scrying table that predicts one reel before it spins. Correct prophecies turn that reel fully wild.",
  },
  {
    id: "cg-24", slug: "tundra-tusk", name: "Tundra Tusk", provider: "Vantablack Labs",
    category: "slots", rtp: 96.3, volatility: "medium", maxWin: "6,800x",
    reels: "6×4", paylines: "4,096 ways", minBet: 15, maxBet: 4_500, hue: 283,
    tags: ["Animals", "Ways Pays", "Hold & Win"],
    description: "Mammoth herds crossing an ice shelf. Landing six tusk coins locks the herd in place for three respins of hold-and-win.",
  },
  {
    id: "cg-25", slug: "carnival-of-coins", name: "Carnival of Coins", provider: "Mercury Reels",
    category: "slots", rtp: 96.0, volatility: "medium", maxWin: "8,500x",
    reels: "5×3", paylines: 25, minBet: 10, maxBet: 4_000, hue: 60,
    tags: ["Jackpot", "Carnival", "Pick Bonus"],
    description: "A funfair wheel sits beside the reels and pays a minor, major or mega tier. Landing three tickets always spins it at least once.",
  },
  {
    id: "cg-26", slug: "sunken-sovereign", name: "Sunken Sovereign", provider: "Tidewater Play",
    category: "slots", rtp: 95.9, volatility: "high", maxWin: "16,000x",
    reels: "5×4", paylines: 50, minBet: 20, maxBet: 7_500, hue: 197,
    tags: ["Jackpot", "Pirates", "Ocean", "Free Spins"],
    description: "A drowned treasury on the seabed, guarded by a progressive that seeds from every spin on the network. Dive bonus awards up to 30 spins.",
  },
  {
    id: "cg-27", slug: "voltage-vipers", name: "Voltage Vipers", provider: "Grifon Interactive",
    category: "slots", rtp: 96.6, volatility: "high", maxWin: "10,500x",
    reels: "5×3", paylines: 243, minBet: 10, maxBet: 6_000, hue: 334,
    tags: ["Sci-Fi", "Ways Pays", "Multiplier"], isNew: true, isHot: true,
    description: "Charged snakes slither between reels and leave a live wire behind them. Every wire crossed multiplies the win by two.",
  },
  {
    id: "cg-28", slug: "papercraft-riches", name: "Papercraft Riches", provider: "Sable Sixteen",
    category: "slots", rtp: 96.8, volatility: "low", maxWin: "3,000x",
    reels: "5×3", paylines: 20, minBet: 10, maxBet: 2_500, hue: 111,
    tags: ["Cute", "Low Volatility", "Free Spins"],
    description: "Folded-paper symbols that unfold into bigger ones when they pay. A soft, tactile game built for short bursts.",
  },

  /* ---------- Live dealer ---------- */
  {
    id: "cg-29", slug: "voltage-roulette", name: "Voltage Roulette", provider: "Halcyon Live",
    category: "live", rtp: 97.3, volatility: "medium", maxWin: "500x",
    minBet: 50, maxBet: 300_000, hue: 248, tableSeats: 7, dealer: "Anika Rao",
    tags: ["Roulette", "Multiplier", "HD Stream"], isHot: true,
    description: "European roulette with up to five charged numbers per spin, each carrying a 50x–500x multiplier on straight-up bets.",
  },
  {
    id: "cg-30", slug: "crimson-baccarat-salon", name: "Crimson Baccarat Salon", provider: "Halcyon Live",
    category: "live", rtp: 98.9, volatility: "low", maxWin: "12x",
    minBet: 100, maxBet: 500_000, hue: 25, tableSeats: 7, dealer: "Mei Lin",
    tags: ["Baccarat", "High Limit", "Squeeze"],
    description: "A high-limit salon table with a full squeeze reveal on every hand. Side bets on pairs and perfect pairs stay open until the deal.",
  },
  {
    id: "cg-31", slug: "speed-blackjack-noir", name: "Speed Blackjack Noir", provider: "Halcyon Live",
    category: "live", rtp: 99.3, volatility: "low", maxWin: "3x",
    minBet: 100, maxBet: 200_000, hue: 299, tableSeats: 5, dealer: "Dario Costa",
    tags: ["Blackjack", "Fast Play", "Side Bets"],
    description: "Seven-seat blackjack run at roughly half the usual hand time — the fastest decision at the table is served first.",
  },
  {
    id: "cg-32", slug: "mahal-teen-patti-live", name: "Mahal Teen Patti Live", provider: "Halcyon Live",
    category: "live", rtp: 97.8, volatility: "medium", maxWin: "60x",
    minBet: 50, maxBet: 150_000, hue: 76, tableSeats: 6, dealer: "Priya Nandan",
    tags: ["Teen Patti", "Card Game", "Side Bets"], isHot: true,
    description: "Three-card Teen Patti dealt live from a marble-topped table, with pair-plus and 3+3 bonus side bets on every round.",
  },
  {
    id: "cg-33", slug: "andar-bahar-imperial", name: "Andar Bahar Imperial", provider: "Halcyon Live",
    category: "live", rtp: 97.9, volatility: "medium", maxWin: "120x",
    minBet: 50, maxBet: 120_000, hue: 213, tableSeats: 8, dealer: "Rhea Kapoor",
    tags: ["Andar Bahar", "Fast Play", "Side Bets"],
    description: "Classic Andar Bahar with a first-three-cards side bet. Rounds settle in under thirty seconds from the joker card up.",
  },
  {
    id: "cg-34", slug: "dragon-tiger-lantern", name: "Dragon Tiger Lantern", provider: "Nocturne Interactive",
    category: "live", rtp: 96.3, volatility: "medium", maxWin: "50x",
    minBet: 50, maxBet: 100_000, hue: 350, tableSeats: 7, dealer: "Sofia Marek",
    tags: ["Dragon Tiger", "Fast Play", "Asian"],
    description: "Two cards, one decision. A lantern-lit studio table that resolves a full round every twenty-five seconds.",
  },
  {
    id: "cg-35", slug: "monarch-money-wheel", name: "Monarch Money Wheel", provider: "Halcyon Live",
    category: "live", rtp: 96.6, volatility: "high", maxWin: "2,000x",
    minBet: 20, maxBet: 80_000, hue: 127, tableSeats: 10, dealer: "Elena Petrova",
    tags: ["Game Show", "Multiplier", "Bonus Rounds"], isHot: true,
    description: "A 54-segment wheel with four bonus wedges leading into separate mini-games. The top slice carries a live 2,000x multiplier.",
  },
  {
    id: "cg-36", slug: "sic-bo-skyline", name: "Sic Bo Skyline", provider: "Tidewater Play",
    category: "live", rtp: 97.2, volatility: "high", maxWin: "1,000x",
    minBet: 50, maxBet: 90_000, hue: 264, tableSeats: 8, dealer: "Kenji Aoki",
    tags: ["Sic Bo", "Dice", "Multiplier"],
    description: "Three dice under glass on a rooftop set, with random multipliers applied to triples and totals before every shake.",
  },
  {
    id: "cg-37", slug: "auction-hall-blackjack", name: "Auction Hall Blackjack", provider: "Halcyon Live",
    category: "live", rtp: 99.5, volatility: "low", maxWin: "3x",
    minBet: 200, maxBet: 400_000, hue: 41, tableSeats: 5, dealer: "Tomás Rivera",
    tags: ["Blackjack", "High Limit", "Surrender"], isNew: true,
    description: "Five seats, late surrender and dealer stands on soft 17 — the best house edge on the floor for players who know basic strategy.",
  },
  {
    id: "cg-38", slug: "cash-cascade-live", name: "Cash Cascade Live", provider: "Halcyon Live",
    category: "live", rtp: 95.8, volatility: "high", maxWin: "5,000x",
    minBet: 20, maxBet: 60_000, hue: 178, tableSeats: 9, dealer: "Noor Haddad",
    tags: ["Game Show", "Bonus Rounds", "Multiplier"], isNew: true,
    description: "A physical drop board where a presenter releases coins into multiplier slots. Qualifying bets carry into the top-up bonus round.",
  },

  /* ---------- Table games ---------- */
  {
    id: "cg-39", slug: "european-roulette-pro", name: "European Roulette Pro", provider: "Vantablack Labs",
    category: "table", rtp: 97.3, volatility: "medium", maxWin: "35x",
    minBet: 20, maxBet: 100_000, hue: 315,
    tags: ["Roulette", "Single Zero", "Racetrack"],
    description: "Single-zero roulette with a full racetrack, neighbour bets and saved favourite layouts.",
  },
  {
    id: "cg-40", slug: "blackjack-surrender", name: "Blackjack Surrender", provider: "Vantablack Labs",
    category: "table", rtp: 99.6, volatility: "low", maxWin: "3x",
    minBet: 20, maxBet: 80_000, hue: 92,
    tags: ["Blackjack", "Surrender", "Low Edge"],
    description: "Six decks, late surrender, double after split. One of the lowest house edges in the whole catalogue.",
  },
  {
    id: "cg-41", slug: "baccarat-punto-grande", name: "Baccarat Punto Grande", provider: "Sable Sixteen",
    category: "table", rtp: 98.9, volatility: "low", maxWin: "11x",
    minBet: 50, maxBet: 150_000, hue: 229,
    tags: ["Baccarat", "Roadmaps", "High Limit"],
    description: "Punto banco with big road, bead plate and cockroach roadmaps rendered live beside the table.",
  },
  {
    id: "cg-42", slug: "casino-holdem-classic", name: "Casino Hold'em Classic", provider: "Mercury Reels",
    category: "table", rtp: 97.8, volatility: "medium", maxWin: "100x",
    minBet: 30, maxBet: 50_000, hue: 6,
    tags: ["Poker", "Ante Bonus", "Side Bets"],
    description: "Heads-up hold'em against the house with an AA+ side bet that pays from a pair of aces upward.",
  },
  {
    id: "cg-43", slug: "craps-boardwalk", name: "Craps Boardwalk", provider: "Grifon Interactive",
    category: "table", rtp: 98.6, volatility: "high", maxWin: "30x",
    minBet: 20, maxBet: 60_000, hue: 143,
    tags: ["Craps", "Dice", "Odds Bets"],
    description: "Full craps layout with 3-4-5x free odds behind the line. Hot-roll history tracked along the rail.",
  },
  {
    id: "cg-44", slug: "deuces-reign-poker", name: "Deuces Reign Poker", provider: "Mercury Reels",
    category: "table", rtp: 97.4, volatility: "medium", maxWin: "4,000x",
    minBet: 10, maxBet: 25_000, hue: 280,
    tags: ["Video Poker", "Wild Cards", "Multi-Hand"],
    description: "Deuces-wild video poker in single, ten or fifty hand mode, with an optional double-or-nothing on any win.",
  },
  {
    id: "cg-45", slug: "pai-gow-twin-dragons", name: "Pai Gow Twin Dragons", provider: "Koi Collective",
    category: "table", rtp: 97.2, volatility: "low", maxWin: "8x",
    minBet: 30, maxBet: 40_000, hue: 57,
    tags: ["Pai Gow", "Poker", "Fortune Bonus"],
    description: "Seven-card pai gow poker with a house-way auto-set button and a fortune bonus side bet.",
  },

  /* ---------- Crash & instant ---------- */
  {
    id: "cg-46", slug: "skyfall-multiplier", name: "Skyfall Multiplier", provider: "Tidewater Play",
    category: "crash", rtp: 97.0, volatility: "high", maxWin: "10,000x",
    minBet: 10, maxBet: 25_000, hue: 194,
    tags: ["Crash", "Provably Fair", "Auto Cash Out"], isHot: true,
    description: "The curve climbs until it doesn't. Set an auto cash-out, split your stake across two bets, and watch the live player feed.",
  },
  {
    id: "cg-47", slug: "rocket-rupee", name: "Rocket Rupee", provider: "Grifon Interactive",
    category: "crash", rtp: 96.5, volatility: "high", maxWin: "5,000x",
    minBet: 10, maxBet: 20_000, hue: 331,
    tags: ["Crash", "Provably Fair", "Fast Rounds"], isNew: true,
    description: "A six-second crash round with a shared chat and public cash-out ticker. Every seed is published after the round settles.",
  },
  {
    id: "cg-48", slug: "mine-runner", name: "Mine Runner", provider: "Vantablack Labs",
    category: "instant", rtp: 97.0, volatility: "medium", maxWin: "1,000x",
    minBet: 10, maxBet: 15_000, hue: 108,
    tags: ["Mines", "Provably Fair", "Instant"],
    description: "Pick safe tiles across a 5×5 grid and cash out before you hit a mine. You choose how many mines are buried.",
  },
  {
    id: "cg-49", slug: "plinko-prism", name: "Plinko Prism", provider: "Aurelia Studios",
    category: "instant", rtp: 97.2, volatility: "medium", maxWin: "1,200x",
    minBet: 10, maxBet: 12_000, hue: 245,
    tags: ["Plinko", "Instant", "Auto Play"],
    description: "Drop a bead through eight to sixteen pin rows and take whatever slot it settles in. Three risk profiles reshape the payout curve.",
  },
];

/**
 * Public catalogue. Progressive jackpots are attached here so the
 * literal table above stays readable and the values stay seeded.
 */
export const CASINO_GAMES: CasinoGame[] = CATALOGUE.map((game) => {
  const base = JACKPOT_BASE[game.slug];
  return base === undefined ? game : { ...game, jackpot: seededJackpot(game.slug, base) };
});

export const PROVIDERS: Provider[] = PROVIDER_META.map(
  (meta) =>
    ({
      id: meta.id,
      name: meta.name,
      hue: meta.hue,
      gameCount: CASINO_GAMES.filter((g) => g.provider === meta.name).length,
    }) satisfies Provider,
);

/* ============================================================
   Accessors
   ============================================================ */

export function gamesByCategory(cat?: CasinoCategory): CasinoGame[] {
  return cat ? CASINO_GAMES.filter((g) => g.category === cat) : CASINO_GAMES;
}

export function findGame(slug: string): CasinoGame | undefined {
  return CASINO_GAMES.find((g) => g.slug === slug);
}

export function gamesByProvider(name: string): CasinoGame[] {
  return CASINO_GAMES.filter((g) => g.provider === name);
}

export function hotGames(): CasinoGame[] {
  return CASINO_GAMES.filter((g) => g.isHot);
}

export function newGames(): CasinoGame[] {
  return CASINO_GAMES.filter((g) => g.isNew);
}

/** Progressive titles, richest pot first. */
export function jackpotGames(): CasinoGame[] {
  return CASINO_GAMES.filter((g) => g.jackpot !== undefined).sort(
    (a, b) => (b.jackpot ?? 0) - (a.jackpot ?? 0),
  );
}

/** Matches on title, studio or tag. Empty query returns the full list. */
export function searchGames(query: string): CasinoGame[] {
  const q = query.trim().toLowerCase();
  if (!q) return CASINO_GAMES;
  return CASINO_GAMES.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.provider.toLowerCase().includes(q) ||
      g.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

/** Same category, excluding the game itself. */
export function relatedGames(slug: string, limit = 6): CasinoGame[] {
  const game = findGame(slug);
  if (!game) return [];
  return CASINO_GAMES.filter((g) => g.category === game.category && g.slug !== slug).slice(0, limit);
}
