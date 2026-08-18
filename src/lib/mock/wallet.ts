/**
 * Wallet, account and open-bet mock.
 *
 * Backs /wallet (balance split, statement, deposit and withdrawal
 * sheets, KYC checklist, responsible-gambling limits) and the
 * "My Bets" panel with its cash-out offers.
 *
 * The statement is built backwards from CURRENT_USER.balance, so the
 * running `balanceAfter` column always reconciles with the headline
 * figure. Pending and failed rows deliberately leave the balance
 * untouched — money only moves when a row completes.
 */

import type {
  KycDocument,
  OpenBet,
  PaymentMethod,
  ResponsibleLimits,
  Transaction,
  TxKind,
  TxStatus,
  User,
} from "../types";
import { hashCode, seeded } from "../format";
import { SEED_NOW } from "./sports";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/* ============================================================
   Account holder
   ============================================================ */

export const CURRENT_USER: User = {
  id: "usr-88214",
  displayName: "Aarav Mehta",
  handle: "@aaravm",
  email: "aarav.mehta@example.in",
  avatarHue: 268,
  tier: "Gold",
  loyaltyPoints: 18_420,
  nextTierAt: 25_000,
  /** Total cash held. */
  balance: 42_580.5,
  /** Ring-fenced promo funds, not withdrawable until wagered. */
  bonusBalance: 5_000,
  /** Cleared for payout right now; the rest is pending settlement. */
  withdrawable: 31_240.5,
  kycStatus: "pending",
  memberSince: new Date(Date.UTC(2023, 10, 4)).toISOString(),
  currency: "AED",
};

/* ============================================================
   Statement

   Amounts are signed: money in is positive, money out is negative,
   so `formatMoney(amount, { sign: true })` renders the row directly.
   ============================================================ */

interface TxSeed {
  kind: TxKind;
  status: TxStatus;
  amount: number;
  method: string;
  /** Age at SEED_NOW, in milliseconds. */
  agoMs: number;
  note?: string;
}

/** Newest first — the order the statement renders in. */
const TX_SEEDS: TxSeed[] = [
  { kind: "bet", status: "completed", amount: -1_500, method: "Cash balance", agoMs: 35 * MIN, note: "MI vs CSK · Match Odds · Back @ 1.92" },
  { kind: "deposit", status: "pending", amount: 10_000, method: "UPI · aaravm@okhdfc", agoMs: 70 * MIN, note: "Awaiting bank confirmation" },
  { kind: "payout", status: "completed", amount: 4_620, method: "Cash balance", agoMs: 2 * HOUR + 5 * MIN, note: "ARS vs MCI · Over 2.5 Goals" },
  { kind: "bet", status: "completed", amount: -2_500, method: "Cash balance", agoMs: 3 * HOUR + 40 * MIN, note: "Treble · Serie A / LaLiga / Bundesliga" },
  { kind: "bonus", status: "completed", amount: 500, method: "Promo · ACCA5", agoMs: 5 * HOUR, note: "Accumulator boost credited" },
  { kind: "withdrawal", status: "pending", amount: -15_000, method: "Bank Transfer · HDFC ••4412", agoMs: 8 * HOUR + 20 * MIN, note: "Held for KYC review" },
  { kind: "bet", status: "completed", amount: -1_000, method: "Cash balance", agoMs: 11 * HOUR, note: "Skyfall Multiplier · casino round" },
  { kind: "payout", status: "completed", amount: 1_830, method: "Cash balance", agoMs: 13 * HOUR + 30 * MIN, note: "Skyfall Multiplier · cashed out 1.83x" },
  { kind: "deposit", status: "completed", amount: 25_000, method: "UPI · aaravm@okhdfc", agoMs: 20 * HOUR, note: "Instant credit" },
  { kind: "refund", status: "completed", amount: 1_200, method: "Cash balance", agoMs: 26 * HOUR, note: "Market voided · player retirement" },
  { kind: "bet", status: "completed", amount: -800, method: "Cash balance", agoMs: 30 * HOUR, note: "NAVI vs FaZe · Map 2 winner" },
  { kind: "bet", status: "completed", amount: -3_000, method: "Cash balance", agoMs: 34 * HOUR, note: "Fantasy entry · Wankhede Vault" },
  { kind: "withdrawal", status: "failed", amount: -12_000, method: "Visa ••7731", agoMs: 44 * HOUR, note: "Issuer declined — card not eligible for payouts" },
  { kind: "payout", status: "completed", amount: 7_350, method: "Cash balance", agoMs: 50 * HOUR, note: "Alcaraz vs Sinner · Match Winner" },
  { kind: "bonus", status: "completed", amount: 1_000, method: "Promo · SPIN100", agoMs: 58 * HOUR, note: "Free-spin winnings converted" },
  { kind: "bet", status: "completed", amount: -500, method: "Cash balance", agoMs: 66 * HOUR, note: "Neon Koi · 50 spins" },
  { kind: "deposit", status: "completed", amount: 8_000, method: "Net Banking · ICICI", agoMs: 74 * HOUR, note: "Credited in 4 minutes" },
  { kind: "bet", status: "completed", amount: -2_200, method: "Cash balance", agoMs: 80 * HOUR, note: "BOS vs LAL · Point Spread −4.5" },
  { kind: "refund", status: "completed", amount: 2_500, method: "Cash balance", agoMs: 92 * HOUR, note: "Contest cancelled · entry returned" },
  { kind: "bet", status: "completed", amount: -1_200, method: "Cash balance", agoMs: 100 * HOUR, note: "Fantasy entry · Derby Mega ×4" },
  { kind: "deposit", status: "failed", amount: 5_000, method: "Mastercard ••2098", agoMs: 110 * HOUR, note: "3-D Secure timed out" },
  { kind: "payout", status: "completed", amount: 2_100, method: "Cash balance", agoMs: 122 * HOUR, note: "Fantasy winnings · Powerplay Practice" },
  { kind: "bet", status: "completed", amount: -4_000, method: "Cash balance", agoMs: 134 * HOUR, note: "Dragon's Tithe · bonus buy" },
  { kind: "bonus", status: "pending", amount: 2_500, method: "Promo · RELOAD25", agoMs: 146 * HOUR, note: "Wagering 3.2x remaining" },
  { kind: "withdrawal", status: "completed", amount: -30_000, method: "Bank Transfer · HDFC ••4412", agoMs: 160 * HOUR, note: "Settled in 1 business day" },
  { kind: "deposit", status: "completed", amount: 30_000, method: "USDT · TRC-20", agoMs: 178 * HOUR, note: "12 network confirmations" },
  { kind: "bet", status: "completed", amount: -1_500, method: "Cash balance", agoMs: 196 * HOUR, note: "Voltage Roulette · straight up" },
  { kind: "payout", status: "completed", amount: 2_760, method: "Cash balance", agoMs: 214 * HOUR, note: "Voltage Roulette · 35x on 17" },
];

/** Bank-style reference, stable per row. */
function referenceFor(id: string, kind: TxKind): string {
  const rng = seeded(hashCode(id + kind));
  const prefix = kind.slice(0, 3).toUpperCase();
  return `${prefix}-${Math.floor(rng() * 900_000 + 100_000)}`;
}

export const TRANSACTIONS: Transaction[] = (() => {
  // Walk backwards from the headline balance: the newest completed row
  // lands on it, and each older row is the balance before the one after.
  let running = CURRENT_USER.balance;
  return TX_SEEDS.map((seed, i) => {
    const id = `tx-${String(TX_SEEDS.length - i).padStart(3, "0")}`;
    const balanceAfter = Number(running.toFixed(2));
    if (seed.status === "completed") running -= seed.amount;
    return {
      id,
      kind: seed.kind,
      status: seed.status,
      amount: seed.amount,
      balanceAfter,
      method: seed.method,
      reference: referenceFor(id, seed.kind),
      createdAt: new Date(SEED_NOW - seed.agoMs).toISOString(),
      note: seed.note,
    } satisfies Transaction;
  });
})();

/* ============================================================
   Cashier
   ============================================================ */

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm-card", label: "Visa / Mastercard", detail: "Debit and credit, 3-D Secure required",
    icon: "💳", minAmount: 50, maxAmount: 30_000, eta: "Instant", feePct: 1.5,
  },
  {
    id: "pm-applepay", label: "Apple Pay", detail: "Face ID or Touch ID confirmation",
    icon: "📲", minAmount: 25, maxAmount: 20_000, eta: "Instant", feePct: 0,
  },
  {
    id: "pm-googlepay", label: "Google Pay", detail: "Any card saved to your Google account",
    icon: "📱", minAmount: 25, maxAmount: 20_000, eta: "Instant", feePct: 0,
  },
  {
    id: "pm-bank", label: "Bank Transfer", detail: "UAE IBAN, local or international",
    icon: "🏦", minAmount: 200, maxAmount: 150_000, eta: "1–3 business days", feePct: 0,
  },
  {
    id: "pm-wallet", label: "Mobile Wallet", detail: "Careem Pay and e& money balances",
    icon: "👛", minAmount: 25, maxAmount: 10_000, eta: "Instant", feePct: 0.5,
  },
  {
    id: "pm-usdt", label: "USDT", detail: "TRC-20 network, 12 confirmations",
    icon: "🪙", minAmount: 100, maxAmount: 250_000, eta: "10–30 minutes", feePct: 0,
  },
  {
    id: "pm-skrill", label: "Skrill", detail: "E-wallet, multi-currency",
    icon: "💱", minAmount: 50, maxAmount: 40_000, eta: "Instant", feePct: 1.0,
  },
  {
    id: "pm-voucher", label: "Cash Voucher", detail: "Prepaid PIN from a partner retailer",
    icon: "🎟️", minAmount: 25, maxAmount: 3_000, eta: "Instant", feePct: 2.5,
  },
];

export const KYC_DOCUMENTS: KycDocument[] = [
  {
    id: "kyc-identity",
    label: "Identity Proof",
    description: "PAN card, passport or driving licence showing your full name and date of birth.",
    required: true,
    accepts: "JPG, PNG or PDF · max 8MB",
    status: "verified",
    fileName: "pan-card-front.jpg",
  },
  {
    id: "kyc-address",
    label: "Address Proof",
    description: "Aadhaar, a utility bill or a bank statement issued in the last 90 days.",
    required: true,
    accepts: "JPG, PNG or PDF · max 8MB",
    status: "pending",
    fileName: "electricity-bill-jul.pdf",
  },
  {
    id: "kyc-selfie",
    label: "Selfie Verification",
    description: "A clear photo of your face holding your identity document.",
    required: true,
    accepts: "JPG or PNG · max 5MB",
    status: "not_started",
  },
  {
    id: "kyc-funds",
    label: "Source of Funds",
    description: "Only requested for cumulative withdrawals above AED 1,000,000 in a calendar year.",
    required: false,
    accepts: "PDF · max 12MB",
    status: "not_started",
  },
];

export const DEFAULT_LIMITS: ResponsibleLimits = {
  dailyDeposit: 25_000,
  weeklyDeposit: 100_000,
  monthlyDeposit: 300_000,
  sessionMinutes: 120,
  lossLimitWeekly: 50_000,
  realityCheckMinutes: 30,
  selfExclusion: "none",
};

/* ============================================================
   Open bets & cash out
   ============================================================ */

export const OPEN_BETS: OpenBet[] = [
  {
    id: "ob-1",
    placedAt: new Date(SEED_NOW - 80 * MIN).toISOString(),
    matchLabel: "Arsenal vs Manchester City",
    legs: [{ label: "Arsenal to win", odds: 2.94, status: "open" }],
    stake: 2_000,
    potentialReturn: 5_880,
    cashOut: 1_640.25,
    mode: "single",
    inPlay: true,
  },
  {
    id: "ob-2",
    placedAt: new Date(SEED_NOW - 3 * HOUR).toISOString(),
    matchLabel: "Treble · Soccer",
    legs: [
      { label: "Inter Milan vs Juventus — Both Teams to Score", odds: 1.72, status: "open" },
      { label: "Bayern München vs Dortmund — Over 2.5 Goals", odds: 1.61, status: "open" },
      { label: "PSG vs Marseille — PSG −0.5", odds: 1.55, status: "open" },
    ],
    stake: 2_500,
    potentialReturn: 10_730.65,
    cashOut: null,
    mode: "multi",
    inPlay: false,
  },
  {
    id: "ob-3",
    placedAt: new Date(SEED_NOW - 52 * MIN).toISOString(),
    matchLabel: "Oval Invincibles vs Trent Rockets",
    legs: [{ label: "Oval Invincibles to win", odds: 1.74, status: "open" }],
    stake: 5_000,
    potentialReturn: 8_700,
    cashOut: 6_915.5,
    mode: "single",
    inPlay: true,
  },
  {
    id: "ob-4",
    placedAt: new Date(SEED_NOW - 6 * HOUR).toISOString(),
    matchLabel: "Double · Basketball",
    legs: [
      { label: "Boston Celtics vs LA Lakers — Celtics −4.5", odds: 1.91, status: "won" },
      { label: "Denver vs Golden State — Over 221.5 Points", odds: 1.88, status: "open" },
    ],
    stake: 1_500,
    potentialReturn: 5_386.2,
    cashOut: 2_684.75,
    mode: "multi",
    inPlay: true,
  },
  {
    id: "ob-5",
    placedAt: new Date(SEED_NOW - 27 * HOUR).toISOString(),
    matchLabel: "Alcaraz vs Sinner",
    legs: [{ label: "Over 22.5 Games", odds: 1.83, status: "open" }],
    stake: 1_200,
    potentialReturn: 2_196,
    cashOut: null,
    mode: "single",
    inPlay: false,
  },
  {
    id: "ob-6",
    placedAt: new Date(SEED_NOW - 44 * MIN).toISOString(),
    matchLabel: "Four-fold · Multi-sport",
    legs: [
      { label: "NAVI vs FaZe — NAVI to win Map 2", odds: 1.66, status: "open" },
      { label: "G2 vs Fnatic — G2 to win", odds: 1.43, status: "won" },
      { label: "India vs Australia — Over 165.5 Runs", odds: 1.96, status: "open" },
      { label: "Real Madrid vs Atlético — Draw", odds: 3.6, status: "open" },
    ],
    stake: 800,
    potentialReturn: 13_399.5,
    cashOut: null,
    mode: "multi",
    inPlay: true,
  },
];

/* ============================================================
   Accessors
   ============================================================ */

export function transactionsByKind(kind?: TxKind): Transaction[] {
  return kind ? TRANSACTIONS.filter((t) => t.kind === kind) : TRANSACTIONS;
}

/** Statement rows from the last `days` days, measured against SEED_NOW. */
export function transactionsInRange(days: number): Transaction[] {
  const cutoff = SEED_NOW - days * DAY;
  return TRANSACTIONS.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
}
