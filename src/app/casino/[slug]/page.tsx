"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useCallback, useMemo, useRef, useState } from "react";
import type { CasinoGame } from "@/lib/types";
import { api } from "@/lib/api";
import { useAsync, usePrefersReducedMotion } from "@/lib/hooks";
import { CURRENCY, cn, formatCompact, formatMoney, hashCode, seeded } from "@/lib/format";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import {
  Badge,
  Button,
  Divider,
  LinkButton,
  LivePip,
  SectionHeading,
  StatTile,
} from "@/components/ui/primitives";
import { Sheet, Toast } from "@/components/ui/Sheet";
import { GameArt, GameRail, useJackpotDrift } from "@/components/casino/GameCard";
import { Skeleton } from "@/components/ui/Skeletons";
import { useSession } from "@/store/session";

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <GameView slug={slug} />;
}

function GameView({ slug }: { slug: string }) {
  const { data: game, loading } = useAsync(() => api.casino.game(slug), [slug]);
  const { data: related } = useAsync(() => api.casino.related(slug, 8), [slug]);

  if (loading) return <GameSkeleton />;
  if (!game) notFound();

  return (
    <>
      <SubBar title={game.name} subtitle={game.provider} backHref="/casino" />

      <Shell slip={false}>
        <Hero game={game} />

        <DemoPanel game={game} />

        <Section aria-label="Game information">
          <SectionHeading title="Game details" icon="◇" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="RTP" value={`${game.rtp.toFixed(2)}%`} tone="gold" hint="Return to player" />
            <StatTile
              label="Volatility"
              value={<span className="capitalize">{game.volatility}</span>}
              hint={VOLATILITY_HINT[game.volatility]}
            />
            <StatTile label="Max win" value={game.maxWin} tone="win" hint="Of your stake" />
            <StatTile
              label={game.category === "slots" ? "Paylines" : "Seats"}
              value={game.paylines ?? game.tableSeats ?? "—"}
              hint={game.reels ?? (game.dealer ? `Dealer ${game.dealer}` : undefined)}
            />
            <StatTile label="Min bet" value={`${CURRENCY}${formatCompact(game.minBet)}`} />
            <StatTile label="Max bet" value={`${CURRENCY}${formatCompact(game.maxBet)}`} />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-white/60">{game.description}</p>

          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Game tags">
            {game.tags.map((tag) => (
              <li key={tag}>
                <Badge>{tag}</Badge>
              </li>
            ))}
          </ul>
        </Section>

        <Divider className="my-7" />

        <SafePlayNote />

        {related && related.length > 0 && (
          <GameRail
            title="You might also like"
            subtitle={`More ${game.category === "slots" ? "slots" : "tables"} in this style`}
            games={related}
            href="/casino"
          />
        )}
      </Shell>

      <StickyActions game={game} />
    </>
  );
}

const VOLATILITY_HINT: Record<CasinoGame["volatility"], string> = {
  low: "Frequent, smaller wins",
  medium: "Balanced pacing",
  high: "Rare, larger wins",
};

/* ============================================================
   Hero
   ============================================================ */

function Hero({ game }: { game: CasinoGame }) {
  const jackpot = useJackpotDrift(game.jackpot ?? 0);

  return (
    <Section aria-label={`${game.name} cover`}>
      <GameArt
        game={game}
        monogram="lg"
        className="aspect-[4/3] rounded-3xl border border-white/10 sm:aspect-[21/9]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-obsidian-950/92 via-obsidian-950/35 to-transparent"
        />

        <span className="absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-2 sm:inset-x-6 sm:top-6">
          <span className="flex flex-wrap gap-1.5">
            {game.isNew && <Badge tone="gold">New</Badge>}
            {game.isHot && <Badge tone="ember">Hot</Badge>}
            {game.category === "live" && (
              <Badge tone="live">
                <LivePip />
                Live dealer
              </Badge>
            )}
          </span>
          {game.jackpot !== undefined && (
            <span
              aria-live="polite"
              className="rounded-lg border border-gold-400/35 bg-obsidian-950/75 px-2.5 py-1 text-right"
            >
              <span className="block text-[0.5rem] font-semibold uppercase tracking-widest text-white/45">
                Progressive jackpot
              </span>
              <span className="block font-display text-base font-semibold text-gilt tnum sm:text-lg">
                {CURRENCY}
                {formatCompact(jackpot)}
              </span>
            </span>
          )}
        </span>

        <span className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            {game.name}
          </h1>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
            <span>{game.provider}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{game.category}</span>
            <span aria-hidden="true">·</span>
            <span className="tnum">RTP {game.rtp.toFixed(2)}%</span>
          </span>
        </span>
      </GameArt>
    </Section>
  );
}

/* ============================================================
   Demo play

   A deterministic reel simulation. The symbol stream comes from a
   seeded PRNG advanced by a spin counter, so nothing random is
   evaluated during render — only inside the click handler.
   ============================================================ */

const SYMBOLS = ["🍒", "⚜", "◆", "★", "7", "♠", "♦", "🔔"] as const;
const REEL_COUNT = 5;
const STARTING_CREDITS = 5000;

interface SpinResult {
  reels: number[];
  stake: number;
  payout: number;
  label: string;
}

function DemoPanel({ game }: { game: CasinoGame }) {
  const reduced = usePrefersReducedMotion();
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [stake, setStake] = useState(Math.max(10, Math.min(game.minBet, 100)));
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spent, setSpent] = useState(0);
  const spinCount = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [reels, setReels] = useState<number[]>(() => {
    // Seeded from the slug so the resting board is identical on both renders.
    const rng = seeded(hashCode(game.slug));
    return Array.from({ length: REEL_COUNT }, () => Math.floor(rng() * SYMBOLS.length));
  });

  const spin = useCallback(() => {
    if (spinning || credits < stake) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    spinCount.current += 1;
    const rng = seeded(hashCode(`${game.slug}:${spinCount.current}`));
    const next = Array.from({ length: REEL_COUNT }, () => Math.floor(rng() * SYMBOLS.length));

    setSpinning(true);
    setResult(null);
    setCredits((c) => c - stake);
    setSpent((s) => s + stake);

    // Reels come to rest left to right.
    const settle = reduced ? 0 : 260;
    next.forEach((symbol, i) => {
      const timer = setTimeout(() => {
        setReels((current) => {
          const copy = [...current];
          copy[i] = symbol;
          return copy;
        });
      }, settle * (i + 1));
      timers.current.push(timer);
    });

    const finish = setTimeout(() => {
      const counts = new Map<number, number>();
      for (const symbol of next) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
      const best = Math.max(...counts.values());

      const multiplier = best >= 5 ? 50 : best === 4 ? 12 : best === 3 ? 3 : 0;
      const payout = stake * multiplier;

      setCredits((c) => c + payout);
      setResult({
        reels: next,
        stake,
        payout,
        label:
          multiplier === 0
            ? "No win — spin again"
            : `${best} of a kind · ${multiplier}× your stake`,
      });
      setSpinning(false);
    }, settle * REEL_COUNT + 120);
    timers.current.push(finish);
  }, [spinning, credits, stake, reduced, game.slug]);

  const stakeSteps = useMemo(() => {
    const base = Math.max(10, game.minBet);
    return [base, base * 5, base * 10, base * 25].filter((v) => v <= game.maxBet).slice(0, 4);
  }, [game.minBet, game.maxBet]);

  return (
    <Section aria-labelledby="demo-heading">
      <div className="glass overflow-hidden rounded-2xl">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
          <h2 id="demo-heading" className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">🎰</span>
            Try it out
          </h2>
          <Badge tone="ember">Demo mode — no real money</Badge>
        </header>

        <div className="p-4">
          {/* Reels */}
          <div
            className="mb-4 grid grid-cols-5 gap-1.5 rounded-xl border border-white/8 bg-obsidian-950/60 p-2.5 sm:gap-2.5 sm:p-4"
            role="img"
            aria-label={
              spinning
                ? "Reels spinning"
                : `Reels showing ${reels.map((r) => SYMBOLS[r]).join(", ")}`
            }
          >
            {reels.map((symbol, i) => (
              <div
                key={i}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border border-white/8",
                  "bg-linear-to-br from-obsidian-700/80 to-obsidian-900/80",
                  "text-2xl transition-all duration-200 sm:text-4xl",
                  spinning && "animate-pulse blur-[1.5px]",
                )}
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <span aria-hidden="true">{SYMBOLS[symbol]}</span>
              </div>
            ))}
          </div>

          {/* Result line */}
          <p
            aria-live="polite"
            className={cn(
              "mb-3 min-h-5 text-center text-xs font-medium",
              result?.payout ? "text-win" : "text-white/40",
            )}
          >
            {spinning
              ? "Spinning…"
              : result
                ? result.payout > 0
                  ? `${result.label} — won ${formatMoney(result.payout, { decimals: false })}`
                  : result.label
                : "Set a stake and spin"}
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[0.625rem] uppercase tracking-wider text-white/35">Stake</span>
              {stakeSteps.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStake(value)}
                  aria-pressed={stake === value}
                  className={cn(
                    "h-8 rounded-lg border px-2.5 text-[0.6875rem] font-medium tnum transition-all",
                    stake === value
                      ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
                      : "border-white/10 bg-white/4 text-white/60 hover:border-gold-400/30",
                  )}
                >
                  {formatCompact(value)}
                </button>
              ))}
            </div>

            <Button
              variant="gold"
              className="ml-auto"
              onClick={spin}
              loading={spinning}
              disabled={credits < stake}
            >
              {credits < stake ? "Out of demo credits" : "Spin"}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-3 text-xs">
            <span className="text-white/40">
              Demo credits{" "}
              <span aria-live="polite" className="font-semibold text-gold-300 tnum">
                {credits.toLocaleString("en-IN")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setCredits(STARTING_CREDITS);
                setSpent(0);
                setResult(null);
              }}
              className="text-white/35 underline-offset-2 transition-colors hover:text-white/70 hover:underline"
            >
              Reset demo
            </button>
          </div>

          {spent > 0 && (
            <p className="mt-2 text-[0.625rem] text-white/30 tnum">
              Demo turnover this session: {spent.toLocaleString("en-IN")} credits
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   Responsible play + real-money gate
   ============================================================ */

function SafePlayNote() {
  const { sessionMinutes } = useSession();

  return (
    <Section aria-label="Responsible play">
      <div className="rounded-2xl border border-gold-400/20 bg-gold-700/8 p-4">
        <h2 className="mb-1.5 text-sm font-semibold text-gold-200">Keep it enjoyable</h2>
        <p className="text-xs leading-relaxed text-white/55">
          Casino games are designed to return less than they take over time — the RTP figure above is
          a long-run average, not a promise about any session. You have been on the platform for{" "}
          <span className="font-medium text-white/80 tnum">{sessionMinutes}</span> minute
          {sessionMinutes === 1 ? "" : "s"}.
        </p>
        <Link
          href="/responsible-gambling#limits"
          className="mt-2.5 inline-block text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
        >
          Set a deposit or session limit
        </Link>
      </div>
    </Section>
  );
}

function StickyActions({ game }: { game: CasinoGame }) {
  const [gateOpen, setGateOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const { user } = useSession();
  const verified = user.kycStatus === "verified";

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-70 border-t border-white/8 bg-obsidian-950/92 px-3 py-2.5 backdrop-blur-xl pb-safe xl:hidden">
        <div className="flex items-center gap-2">
          <a
            href="#demo-heading"
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-sm font-medium text-white/85"
          >
            Play demo
          </a>
          <Button variant="gold" className="flex-1" onClick={() => setGateOpen(true)}>
            Play for real
          </Button>
        </div>
      </div>

      <Sheet
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title="Play for real money"
        description={game.name}
        size="sm"
        footer={
          verified ? (
            <Button
              variant="gold"
              fullWidth
              onClick={() => {
                setGateOpen(false);
                setToast(true);
              }}
            >
              Launch game
            </Button>
          ) : (
            <LinkButton href="/wallet#kyc" variant="gold" fullWidth>
              Verify my account
            </LinkButton>
          )
        }
      >
        <div className="space-y-3 py-1 text-sm leading-relaxed text-white/60">
          {verified ? (
            <p>
              Your balance is {formatMoney(user.balance)}. Stakes on this game run from{" "}
              <span className="tnum">
                {CURRENCY}
                {game.minBet}
              </span>{" "}
              to{" "}
              <span className="tnum">
                {CURRENCY}
                {formatCompact(game.maxBet)}
              </span>
              .
            </p>
          ) : (
            <>
              <p>
                Real-money play needs a verified account. It takes a couple of minutes — upload an ID
                and a proof of address and we&rsquo;ll confirm by email.
              </p>
              <p className="text-white/40">
                Until then you can keep playing in demo mode, which uses no real funds and pays no
                real winnings.
              </p>
            </>
          )}
          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/45">
            18+ only. Set a deposit limit before you play —{" "}
            <Link href="/responsible-gambling#limits" className="text-gold-300 underline-offset-2 hover:underline">
              safer gambling tools
            </Link>
            .
          </p>
        </div>
      </Sheet>

      <Toast open={toast} tone="info" onDismiss={() => setToast(false)}>
        This is a demonstration build — no real-money game session was started.
      </Toast>
    </>
  );
}

/* ============================================================
   Loading
   ============================================================ */

function GameSkeleton() {
  return (
    <Shell slip={false}>
      <div role="status" aria-live="polite" aria-label="Loading game">
        <span className="sr-only">Loading game</span>
        <Skeleton className="mb-6 aspect-[4/3] w-full rounded-3xl sm:aspect-[21/9]" />
        <Skeleton className="mb-3 h-56 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </Shell>
  );
}
