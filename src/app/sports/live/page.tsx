"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { primaryMarket } from "@/lib/mock/sports";
import { clamp, cn, formatCompact, formatMoney, formatOdds } from "@/lib/format";
import type { Match, OpenBet } from "@/lib/types";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  LiveBadge,
  LinkButton,
  SectionHeading,
  Segmented,
  Toggle,
} from "@/components/ui/primitives";
import { LoadingRegion, MatchListSkeleton, Skeleton } from "@/components/ui/Skeletons";
import { Toast } from "@/components/ui/Sheet";
import { CouponPrices, type BoardMode } from "@/components/betting/MarketBoard";

const MODE_OPTIONS: { key: BoardMode; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "fixed", label: "Fixed odds" },
];

/** How often the mock cash-out desk re-quotes an open position. */
const REQUOTE_MS = 3400;
/** A cash-out offer never drifts further than this from its seeded value. */
const MAX_DRIFT = 0.055;

export default function LiveBoardPage() {
  const [mode, setMode] = useState<BoardMode>("exchange");
  const [streamingOnly, setStreamingOnly] = useState(false);

  const { data: matches, loading } = useAsync(() => api.sports.live(), []);
  const { data: bets, loading: betsLoading } = useAsync(() => api.wallet.openBets(), []);

  const visible = useMemo(
    () => (matches ?? []).filter((match) => !streamingOnly || match.streaming),
    [matches, streamingOnly],
  );

  const streamingCount = useMemo(
    () => (matches ?? []).filter((match) => match.streaming).length,
    [matches],
  );

  return (
    <>
      <SubBar
        title="In-play"
        subtitle="Live scores, live prices, live cash out"
        backHref="/sports"
        action={matches ? <LiveBadge label={`${matches.length} live`} /> : undefined}
      />

      <Shell>
        <div className="sticky top-26 z-60 mb-5 rounded-2xl border border-white/8 bg-obsidian-950/88 px-3 py-2 backdrop-blur-xl lg:top-28">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="min-w-60 flex-1">
              <Toggle
                checked={streamingOnly}
                onChange={setStreamingOnly}
                label="Streaming only"
                description={
                  matches
                    ? `${streamingCount} of ${matches.length} in-play matches have a stream`
                    : "Checking which matches have a stream…"
                }
              />
            </div>
            <Segmented
              className="shrink-0"
              size="sm"
              label="Odds view"
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
            />
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:items-start">
          <Section className="mb-0">
            <SectionHeading
              title="Live now"
              subtitle="Prices tick with the play — accept the move or step away"
            />

            {loading ? (
              <MatchListSkeleton count={4} />
            ) : visible.length > 0 ? (
              <div className="space-y-3" aria-live="polite">
                {visible.map((match) => (
                  <LiveScoreboard key={match.id} match={match} mode={mode} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="◉"
                title={streamingOnly ? "No streamed matches right now" : "Nothing in play"}
                message={
                  streamingOnly
                    ? "Turn off the streaming filter to see every live fixture."
                    : "The board fills up again as the next fixtures kick off."
                }
                action={
                  <LinkButton href="/sports" variant="outline" size="sm">
                    Browse upcoming
                  </LinkButton>
                }
              />
            )}
          </Section>

          <Section className="mb-0 2xl:sticky 2xl:top-32">
            <CashOutPanel bets={bets} loading={betsLoading} />
          </Section>
        </div>
      </Shell>
    </>
  );
}

/* ============================================================
   Live scoreboard
   ============================================================ */

function LiveScoreboard({ match, mode }: { match: Match; mode: BoardMode }) {
  const market = primaryMarket(match.id);
  const homeLeads = Boolean(match.score && match.score.home > match.score.away);
  const awayLeads = Boolean(match.score && match.score.away > match.score.home);

  return (
    <article className="glass relative overflow-hidden rounded-2xl">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-ember-400 via-live to-ember-700"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-ember-700/20 blur-3xl"
      />

      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate text-[0.625rem] font-medium uppercase tracking-wider text-white/35">
            {match.competition}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {match.streaming && (
              <Badge tone="gold">
                <svg viewBox="0 0 16 16" className="size-2.5" fill="currentColor" aria-hidden="true">
                  <path d="M2 4h9v8H2zM12 6.5l3-2v7l-3-2z" />
                </svg>
                Stream
              </Badge>
            )}
            <LiveBadge label={match.clock ?? "Live"} />
          </span>
        </div>

        <Link
          href={`/sports/${match.sport}/${match.id}`}
          className="block rounded-xl transition-colors hover:bg-white/3"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <ScoreSide competitor={match.home} score={match.score?.home} leading={homeLeads} />

            <div className="shrink-0 text-center">
              <span className="block text-[0.5625rem] font-semibold uppercase tracking-widest text-white/20">
                vs
              </span>
              {match.clock && (
                <span className="mt-0.5 block text-[0.625rem] font-medium text-[#ff8a84] tnum">
                  {match.clock}
                </span>
              )}
            </div>

            <ScoreSide
              competitor={match.away}
              score={match.score?.away}
              leading={awayLeads}
              align="right"
            />
          </div>

          {match.detail && (
            <p className="mt-2.5 truncate text-center text-[0.6875rem] text-white/40">
              {match.detail}
            </p>
          )}
        </Link>

        {market && (
          <>
            <Divider className="my-3" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[0.6875rem] font-medium text-white/55">{market.name}</p>
                <p className="text-[0.625rem] text-white/30">
                  Matched <span className="tnum">₹{formatCompact(market.matched)}</span> ·{" "}
                  <span className="tnum">+{match.marketCount}</span> markets
                </p>
              </div>
              <CouponPrices market={market} match={match} mode={mode} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ScoreSide({
  competitor,
  score,
  leading,
  align = "left",
}: {
  competitor: Match["home"];
  score?: number;
  leading: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", align === "right" && "flex-row-reverse")}>
      <span className="text-lg" aria-hidden="true">
        {competitor.crest}
      </span>
      <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
        <p
          className={cn(
            "truncate text-sm",
            leading ? "font-semibold text-white" : "font-medium text-white/80",
          )}
        >
          {competitor.short}
        </p>
        <p className="truncate text-[0.625rem] text-white/30">{competitor.name}</p>
      </div>
      {score !== undefined && (
        <span
          className={cn(
            "shrink-0 font-display text-2xl font-semibold tnum sm:text-3xl",
            leading ? "text-gold-300" : "text-white/70",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Cash out
   ============================================================ */

type CashOutStage = "idle" | "confirming" | "done";

function CashOutPanel({ bets, loading }: { bets: OpenBet[] | undefined; loading: boolean }) {
  const [drift, setDrift] = useState<Record<string, number>>({});
  const [stages, setStages] = useState<Record<string, CashOutStage>>({});
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);

  /**
   * Deterministic xorshift cursor rather than Math.random, so the drift is
   * driven by an effect and never differs between render and hydration.
   */
  const cursor = useRef(0x9e3779b9);

  const quotable = useMemo(
    () => (bets ?? []).filter((bet) => bet.cashOut !== null).map((bet) => bet.id),
    [bets],
  );

  useEffect(() => {
    if (quotable.length === 0) return;
    const id = setInterval(() => {
      setDrift((current) => {
        const next = { ...current };
        for (const betId of quotable) {
          cursor.current ^= cursor.current << 13;
          cursor.current ^= cursor.current >>> 17;
          cursor.current ^= cursor.current << 5;
          const roll = (Math.abs(cursor.current) % 1000) / 1000;
          next[betId] = clamp((current[betId] ?? 0) + (roll - 0.5) * 0.014, -MAX_DRIFT, MAX_DRIFT);
        }
        return next;
      });
    }, REQUOTE_MS);
    return () => clearInterval(id);
  }, [quotable]);

  function confirm(bet: OpenBet, offer: number) {
    setStages((current) => ({ ...current, [bet.id]: "done" }));
    setToast({ label: bet.matchLabel, amount: offer });
  }

  return (
    <>
      <SectionHeading
        title="Cash out"
        subtitle="Settle an open position at the current offer"
        icon="◈"
      />

      {loading ? (
        <LoadingRegion label="Loading open bets">
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : (bets ?? []).length === 0 ? (
        <EmptyState icon="◈" title="No open bets" message="Positions you place appear here." />
      ) : (
        <div className="space-y-3">
          {(bets ?? []).map((bet) => (
            <CashOutCard
              key={bet.id}
              bet={bet}
              offer={bet.cashOut === null ? null : bet.cashOut * (1 + (drift[bet.id] ?? 0))}
              stage={stages[bet.id] ?? "idle"}
              onArm={() => setStages((current) => ({ ...current, [bet.id]: "confirming" }))}
              onCancel={() => setStages((current) => ({ ...current, [bet.id]: "idle" }))}
              onConfirm={confirm}
            />
          ))}
        </div>
      )}

      <Toast open={toast !== null} tone="win" onDismiss={() => setToast(null)}>
        Cashed out <span className="font-semibold tnum">{formatMoney(toast?.amount ?? 0)}</span> on{" "}
        {toast?.label}. Funds are in your wallet.
      </Toast>
    </>
  );
}

function CashOutCard({
  bet,
  offer,
  stage,
  onArm,
  onCancel,
  onConfirm,
}: {
  bet: OpenBet;
  offer: number | null;
  stage: CashOutStage;
  onArm: () => void;
  onCancel: () => void;
  onConfirm: (bet: OpenBet, offer: number) => void;
}) {
  const profit = offer === null ? 0 : offer - bet.stake;

  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{bet.matchLabel}</p>
          <p className="mt-0.5 text-[0.625rem] uppercase tracking-wider text-white/35">
            {bet.mode === "single" ? "Single" : bet.mode === "multi" ? `${bet.legs.length}-fold` : "System"}
          </p>
        </div>
        {bet.inPlay ? <LiveBadge label="In play" /> : <Badge tone="neutral">Pre-match</Badge>}
      </div>

      <ul className="mb-3 space-y-1">
        {bet.legs.map((leg) => (
          <li key={leg.label} className="flex items-start justify-between gap-2 text-[0.6875rem]">
            <span
              className={cn(
                "min-w-0 flex-1",
                leg.status === "won"
                  ? "text-win"
                  : leg.status === "lost"
                    ? "text-loss line-through"
                    : "text-white/65",
              )}
            >
              {leg.status === "won" ? "✓ " : leg.status === "lost" ? "✕ " : "• "}
              {leg.label}
            </span>
            <span className="shrink-0 font-medium text-white/50 tnum">
              {formatOdds(leg.odds, "decimal")}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="glass-soft rounded-xl px-3 py-2">
          <p className="text-[0.5625rem] uppercase tracking-wider text-white/35">Stake</p>
          <p className="mt-0.5 text-sm font-semibold tnum">{formatMoney(bet.stake, { decimals: false })}</p>
        </div>
        <div className="glass-soft rounded-xl px-3 py-2">
          <p className="text-[0.5625rem] uppercase tracking-wider text-white/35">To return</p>
          <p className="mt-0.5 text-sm font-semibold text-gilt tnum">
            {formatMoney(bet.potentialReturn, { decimals: false })}
          </p>
        </div>
      </div>

      {offer === null ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-[0.6875rem] text-white/35">
          Cash out unavailable
        </p>
      ) : stage === "done" ? (
        <p className="rounded-xl border border-win/25 bg-win/10 px-3 py-2.5 text-center text-[0.6875rem] font-medium text-win">
          Cashed out at <span className="tnum">{formatMoney(offer)}</span>
        </p>
      ) : (
        <div className="space-y-2">
          <p className="flex items-baseline justify-between text-[0.6875rem] text-white/40">
            <span>Current offer</span>
            <span aria-live="polite" className="flex items-baseline gap-1.5">
              <span className="font-semibold text-white tnum">{formatMoney(offer)}</span>
              <span className={cn("tnum", profit >= 0 ? "text-win" : "text-loss")}>
                {formatMoney(profit, { decimals: false, sign: true })}
              </span>
            </span>
          </p>

          {stage === "confirming" ? (
            <div className="flex gap-2">
              <Button variant="subtle" size="sm" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                className="flex-[1.4]"
                onClick={() => onConfirm(bet, offer)}
              >
                Confirm <span className="tnum">{formatMoney(offer, { decimals: false })}</span>
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" fullWidth onClick={onArm}>
              Cash out <span className="tnum">{formatMoney(offer, { decimals: false })}</span>
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
