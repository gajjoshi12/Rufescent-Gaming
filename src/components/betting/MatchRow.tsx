"use client";

import Link from "next/link";
import { cn, formatClockTime, formatKickoff } from "@/lib/format";
import type { Match } from "@/lib/types";
import { primaryMarket } from "@/lib/mock/sports";
import { useNow } from "@/lib/hooks";
import { Badge, LivePip } from "@/components/ui/primitives";
import { CouponPrices, type BoardMode } from "./MarketBoard";

/**
 * One fixture in a coupon list: teams and state on the left, the headline
 * market's prices on the right. Tapping the row opens the full market view;
 * tapping a price adds straight to the slip.
 */
export function MatchRow({ match, mode }: { match: Match; mode: BoardMode }) {
  const market = primaryMarket(match.id);
  const now = useNow();
  const live = match.status === "live";

  return (
    <article className="glass group relative overflow-hidden rounded-2xl transition-all duration-300 hover:border-gold-400/20">
      {/* Ember wash on the leading edge for live games */}
      {live && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-ember-400 via-live to-ember-700"
        />
      )}

      <Link
        href={`/sports/${match.sport}/${match.id}`}
        className="flex items-stretch gap-3 p-3.5 sm:gap-4 sm:p-4"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-[0.625rem] text-white/35">
            {live ? (
              <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[#ff8a84]">
                <LivePip />
                {match.clock}
              </span>
            ) : (
              <span className="font-medium tnum">
                {now === null ? formatClockTime(match.startsAt) : formatKickoff(match.startsAt, now)}
              </span>
            )}
            <span className="truncate">{match.competition}</span>
            {match.streaming && (
              <span className="hidden shrink-0 items-center gap-0.5 text-gold-300/70 sm:flex" title="Live stream available">
                <svg viewBox="0 0 16 16" className="size-2.5" fill="currentColor" aria-hidden="true">
                  <path d="M2 4h9v8H2zM12 6.5l3-2v7l-3-2z" />
                </svg>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <TeamLine
              competitor={match.home}
              score={match.score?.home}
              live={live}
              leading={Boolean(match.score && match.score.home > match.score.away)}
            />
            <TeamLine
              competitor={match.away}
              score={match.score?.away}
              live={live}
              leading={Boolean(match.score && match.score.away > match.score.home)}
            />
          </div>

          {match.detail && (
            <p className="truncate text-[0.625rem] text-white/30">{match.detail}</p>
          )}
        </div>

        <div className="flex flex-col justify-center gap-1.5">
          {market && <CouponPrices market={market} match={match} mode={mode} />}
          <p className="text-center text-[0.5625rem] text-white/25">
            +{match.marketCount} markets
          </p>
        </div>
      </Link>
    </article>
  );
}

function TeamLine({
  competitor,
  score,
  live,
  leading,
}: {
  competitor: Match["home"];
  score?: number;
  live: boolean;
  leading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs" aria-hidden="true">
        {competitor.crest}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[0.8125rem]",
          leading ? "font-semibold text-white" : "font-medium text-white/80",
        )}
      >
        {competitor.name}
      </span>
      {live && score !== undefined && (
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tnum",
            leading ? "text-gold-300" : "text-white/60",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/**
 * Wide hero card for the featured rail — same data, more room to breathe.
 */
export function FeaturedMatchCard({ match, mode }: { match: Match; mode: BoardMode }) {
  const market = primaryMarket(match.id);
  const now = useNow();
  const live = match.status === "live";

  return (
    <article className="glass relative w-[19rem] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-[22rem]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-ember-600/20 blur-3xl"
      />

      <Link href={`/sports/${match.sport}/${match.id}`} className="block p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="truncate text-[0.625rem] font-medium uppercase tracking-wider text-white/35">
            {match.competition}
          </span>
          {live ? (
            <Badge tone="live">
              <LivePip />
              {match.clock}
            </Badge>
          ) : (
            <Badge tone="gold">
              {now === null ? formatClockTime(match.startsAt) : formatKickoff(match.startsAt, now)}
            </Badge>
          )}
        </div>

        <div className="mb-3.5 flex items-center justify-between gap-3">
          <TeamBlock competitor={match.home} score={match.score?.home} live={live} />
          <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-widest text-white/20">
            vs
          </span>
          <TeamBlock competitor={match.away} score={match.score?.away} live={live} align="right" />
        </div>

        {match.detail && (
          <p className="mb-3 truncate text-center text-[0.625rem] text-white/30">{match.detail}</p>
        )}

        {market && <CouponPrices market={market} match={match} mode={mode} fill />}
      </Link>
    </article>
  );
}

function TeamBlock({
  competitor,
  score,
  live,
  align = "left",
}: {
  competitor: Match["home"];
  score?: number;
  live: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5",
          align === "right" && "flex-row-reverse",
        )}
      >
        <span className="text-base" aria-hidden="true">
          {competitor.crest}
        </span>
        {live && score !== undefined && (
          <span className="font-display text-xl font-semibold text-gold-300 tnum">{score}</span>
        )}
      </div>
      <p className="truncate text-[0.8125rem] font-medium text-white/85">{competitor.short}</p>
      <p className="truncate text-[0.625rem] text-white/30">{competitor.name}</p>
    </div>
  );
}
