"use client";

import { Badge, Card, LinkButton } from "@/components/ui/primitives";
import { CURRENCY, clamp, cn, formatCompact, formatMoney } from "@/lib/format";
import { useSession } from "@/store/session";
import type { FantasyContest } from "@/lib/types";

/* Fill bar runs gold → ember as the contest approaches capacity, so a
   nearly-full contest reads as urgent without needing a second colour token. */
const GOLD_HUE = 45;
const EMBER_HUE = 4;

export function fillPercent(contest: FantasyContest): number {
  if (contest.totalSpots <= 0) return 0;
  return clamp((contest.filledSpots / contest.totalSpots) * 100, 0, 100);
}

export function spotsLeft(contest: FantasyContest): number {
  return Math.max(0, contest.totalSpots - contest.filledSpots);
}

export function FillBar({
  contest,
  className,
}: {
  contest: FantasyContest;
  className?: string;
}) {
  const pct = fillPercent(contest);
  const hue = GOLD_HUE - (GOLD_HUE - EMBER_HUE) * (pct / 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={contest.totalSpots}
      aria-valuenow={contest.filledSpots}
      aria-label={`${contest.filledSpots} of ${contest.totalSpots} spots filled`}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.max(pct, 2)}%`,
          background: `linear-gradient(90deg, hsl(${hue + 14} 92% 58%), hsl(${hue} 88% 50%))`,
        }}
      />
    </div>
  );
}

export function ContestCard({
  contest,
  className,
}: {
  contest: FantasyContest;
  className?: string;
}) {
  const { user } = useSession();
  const pct = fillPercent(contest);
  const left = spotsLeft(contest);
  const fillingFast = pct > 80 && left > 0;
  const full = left === 0;
  const affordable = contest.entryFee <= user.balance;

  return (
    <Card interactive className={cn("flex flex-col gap-3 p-3.5 sm:p-4", className)}>
      {/* Title + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white/90">{contest.title}</h3>
          <p className="mt-0.5 truncate text-[0.6875rem] text-white/40">{contest.matchLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {contest.multiEntry && (
            <span
              title="Multi-entry — you may join this contest with more than one team"
              aria-label="Multi-entry contest"
              className="grid size-5 place-items-center rounded-md border border-white/12 bg-white/6 text-[0.625rem] font-bold text-white/60"
            >
              M
            </span>
          )}
          {contest.guaranteed ? (
            <Badge tone="gold">
              <span aria-hidden="true">✦</span> Guaranteed
            </Badge>
          ) : (
            <Badge tone="neutral">Fills to run</Badge>
          )}
        </div>
      </div>

      {/* Prize pool hero + join */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.625rem] font-medium uppercase tracking-wider text-white/40">
            Prize pool
          </p>
          <p className="font-display text-2xl font-semibold leading-tight text-gilt tnum sm:text-[1.75rem]">
            {CURRENCY}
            {formatCompact(contest.prizePool)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <LinkButton
            href={`/fantasy/${contest.id}`}
            variant={contest.entryFee === 0 ? "gold" : "primary"}
            size="sm"
            className="min-w-[4.5rem]"
          >
            {contest.entryFee === 0 ? "Free" : formatMoney(contest.entryFee, { decimals: false })}
          </LinkButton>
          {!affordable && contest.entryFee > 0 && (
            <p className="mt-1 text-[0.625rem] text-ember-300">Top up to join</p>
          )}
        </div>
      </div>

      {/* Fill progress */}
      <div className="space-y-1.5">
        <FillBar contest={contest} />
        <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
          <span className={cn("tnum", fillingFast ? "font-medium text-ember-300" : "text-white/45")}>
            {full ? (
              "Contest full"
            ) : fillingFast ? (
              <>Filling fast · {formatCompact(left)} left</>
            ) : (
              <>{formatCompact(left)} spots left</>
            )}
          </span>
          <span className="text-white/35 tnum">
            {formatCompact(contest.filledSpots)}/{formatCompact(contest.totalSpots)}
          </span>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-2.5 text-[0.6875rem]">
        <span className="text-white/45">
          1st prize{" "}
          <span className="font-semibold text-gold-200 tnum">
            {CURRENCY}
            {formatCompact(contest.firstPrize)}
          </span>
        </span>
        <span className="text-white/45">
          <span className="font-semibold text-white/75 tnum">{contest.winnersPct}%</span> win
        </span>
        <span className="text-white/45">
          Entry{" "}
          <span className="font-semibold text-white/75 tnum">
            {contest.entryFee === 0 ? "Free" : formatMoney(contest.entryFee, { decimals: false })}
          </span>
        </span>
      </div>

      {contest.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {contest.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[0.625rem] text-white/45"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
