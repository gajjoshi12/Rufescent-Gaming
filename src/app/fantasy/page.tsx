"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ContestCard, FillBar, spotsLeft } from "@/components/fantasy/ContestCard";
import { Rail, Section, Shell } from "@/components/layout/Shell";
import { SPORT_NAV } from "@/components/layout/navigation";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import { ContestListSkeleton } from "@/components/ui/Skeletons";
import { api } from "@/lib/api";
import { CURRENCY, cn, formatCompact, formatKickoff, formatMoney, hashCode, seeded } from "@/lib/format";
import { useAsync, useNow } from "@/lib/hooks";
import { CONTESTS } from "@/lib/mock/fantasy";
import type { FantasyContest, SportKey } from "@/lib/types";

type SportFilter = "all" | SportKey;
type SortKey = "prize" | "entry" | "spots";

const SPORT_OPTIONS: { key: SportFilter; label: string; icon?: React.ReactNode }[] = [
  { key: "all", label: "All" },
  ...SPORT_NAV.map((s) => ({
    key: s.key as SportFilter,
    label: s.label,
    icon: <span aria-hidden="true">{s.icon}</span>,
  })),
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "prize", label: "Prize pool" },
  { key: "entry", label: "Entry fee" },
  { key: "spots", label: "Spots left" },
];

function sortContests(list: FantasyContest[], sort: SortKey): FantasyContest[] {
  const copy = [...list];
  switch (sort) {
    case "entry":
      return copy.sort((a, b) => a.entryFee - b.entryFee || b.prizePool - a.prizePool);
    case "spots":
      return copy.sort((a, b) => spotsLeft(a) - spotsLeft(b) || b.prizePool - a.prizePool);
    default:
      return copy.sort((a, b) => b.prizePool - a.prizePool);
  }
}

/** Contests grouped by fixture, groups ordered by the earliest lock time. */
function groupByMatch(list: FantasyContest[], sort: SortKey) {
  const groups = new Map<string, FantasyContest[]>();
  for (const contest of list) {
    const bucket = groups.get(contest.matchLabel);
    if (bucket) bucket.push(contest);
    else groups.set(contest.matchLabel, [contest]);
  }
  return Array.from(groups, ([matchLabel, contests]) => ({
    matchLabel,
    sport: contests[0].sport,
    contests: sortContests(contests, sort),
    startsAt: contests.reduce((a, c) => (c.startsAt < a ? c.startsAt : a), contests[0].startsAt),
  })).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/* The demo user's "joined" contests. Rank and points are seeded off the
   contest id so server and client render the same numbers. */
const MY_ENTRIES = CONTESTS.slice(0, 3).map((contest) => {
  const rng = seeded(hashCode(`entry-${contest.id}`));
  const field = Math.max(1, Math.round(contest.filledSpots * 0.6));
  return {
    contest,
    rank: 1 + Math.floor(rng() * Math.min(field, 4_000)),
    points: Number((512 + rng() * 340).toFixed(1)),
    movement: Math.round(rng() * 10) - 4,
  };
});

export default function FantasyLobbyPage() {
  const [sport, setSport] = useState<SportFilter>("all");
  const [sort, setSort] = useState<SortKey>("prize");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const now = useNow(15_000);

  const { data, loading } = useAsync(
    () => api.fantasy.contests(sport === "all" ? undefined : sport),
    [sport],
  );

  const contests = useMemo(() => data ?? [], [data]);
  const featured = useMemo(
    () => contests.reduce<FantasyContest | null>((best, c) => (!best || c.prizePool > best.prizePool ? c : best), null),
    [contests],
  );
  const groups = useMemo(() => groupByMatch(contests, sort), [contests, sort]);

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));

  return (
    <Shell slip={false}>
      <header className="mb-5">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-gold-300/70">
          Daily fantasy
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Pick a squad. <span className="text-ember">Win the pot.</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/45">
          Build an eleven inside the credit budget, back a captain, and climb the live leaderboard
          until the fixture locks.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-5 space-y-2.5">
        <div className="scroll-x -mx-3 px-3 sm:-mx-5 sm:px-5">
          <Segmented
            label="Filter contests by sport"
            options={SPORT_OPTIONS}
            value={sport}
            onChange={setSport}
          />
        </div>
        <div className="scroll-x -mx-3 flex items-center gap-2 px-3 sm:-mx-5 sm:px-5">
          <span className="shrink-0 text-[0.6875rem] text-white/35">Sort by</span>
          <Segmented
            label="Sort contests"
            size="sm"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
        </div>
      </div>

      {/* My contests */}
      <Section>
        <SectionHeading
          title="My contests"
          subtitle="Live ranks update as the fixtures play out"
          action={
            <Link href="/profile" className="text-xs text-gold-300 hover:text-gold-200">
              History
            </Link>
          }
        />
        <Rail label="Your joined contests">
          {MY_ENTRIES.map(({ contest, rank, points, movement }) => (
            <Link
              key={contest.id}
              href={`/fantasy/${contest.id}`}
              className="glass w-[15rem] shrink-0 snap-start rounded-2xl p-3.5 transition-colors hover:border-gold-400/25 sm:w-[17rem]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-white/80">{contest.title}</p>
                <Badge tone={movement >= 0 ? "win" : "ember"}>
                  {movement >= 0 ? "▲" : "▼"} {Math.abs(movement)}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[0.625rem] text-white/40">{contest.matchLabel}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] uppercase tracking-wider text-white/35">Rank</p>
                  <p className="font-display text-lg font-semibold text-white tnum">
                    #{rank.toLocaleString("en-AE")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.625rem] uppercase tracking-wider text-white/35">Points</p>
                  <p className="font-display text-lg font-semibold text-gilt tnum">{points}</p>
                </div>
              </div>
              <FillBar contest={contest} className="mt-3" />
            </Link>
          ))}
        </Rail>
      </Section>

      {/* Featured mega contest */}
      {featured && !loading && (
        <Section>
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-ember-600/20 blur-3xl"
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="ember">Featured</Badge>
                  {featured.guaranteed && <Badge tone="gold">✦ Guaranteed</Badge>}
                  <span className="text-[0.6875rem] text-white/40">{featured.matchLabel}</span>
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">
                  {featured.title}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Locks</p>
                <p className="font-display text-base font-semibold text-white/90 tnum">
                  {now === null ? "—" : formatKickoff(featured.startsAt, now)}
                </p>
              </div>
            </div>

            <div className="relative mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Total prize pool</p>
                <p className="font-display text-4xl font-semibold leading-none text-gilt tnum sm:text-5xl">
                  {CURRENCY}
                  {formatCompact(featured.prizePool)}
                </p>
              </div>
              <LinkButton href={`/fantasy/${featured.id}`} variant="gold" size="lg">
                Enter for{" "}
                {featured.entryFee === 0 ? "free" : formatMoney(featured.entryFee, { decimals: false })}
              </LinkButton>
            </div>

            {/* Prize breakdown preview */}
            <dl className="relative mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
              {[
                { label: "1st place", value: featured.firstPrize },
                { label: "2nd place", value: Math.round(featured.firstPrize * 0.4) },
                { label: "3rd place", value: Math.round(featured.firstPrize * 0.2) },
              ].map((band) => (
                <div key={band.label} className="glass-soft rounded-xl px-3 py-2">
                  <dt className="text-[0.625rem] uppercase tracking-wider text-white/40">
                    {band.label}
                  </dt>
                  <dd className="mt-0.5 font-display text-sm font-semibold text-gold-200 tnum">
                    {CURRENCY}
                    {formatCompact(band.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="relative mt-4 space-y-1.5">
              <FillBar contest={featured} />
              <div className="flex items-center justify-between text-[0.6875rem] text-white/45">
                <span className="tnum">
                  {formatCompact(spotsLeft(featured))} of {formatCompact(featured.totalSpots)} spots left
                </span>
                <span className="tnum">{featured.winnersPct}% of entrants win</span>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {/* Grouped contest list */}
      <Section>
        <SectionHeading
          title="All contests"
          subtitle={loading ? "Loading…" : `${contests.length} open across ${groups.length} fixtures`}
        />

        {loading ? (
          <ContestListSkeleton count={4} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No contests for this filter"
            message="Nothing is open for that sport right now. Try another sport or check back closer to kick-off."
            action={
              <LinkButton href="/fantasy" variant="subtle" size="sm" onClick={() => setSport("all")}>
                Show all sports
              </LinkButton>
            }
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const isCollapsed = collapsed.includes(group.matchLabel);
              const panelId = `group-${hashCode(group.matchLabel)}`;
              return (
                <div key={group.matchLabel} className="glass-soft overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.matchLabel)}
                    aria-expanded={!isCollapsed}
                    aria-controls={panelId}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/4"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-5 shrink-0 place-items-center text-white/40 transition-transform duration-200",
                        isCollapsed ? "-rotate-90" : "rotate-0",
                      )}
                    >
                      <svg viewBox="0 0 12 12" className="size-3" fill="none">
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white/90">
                        {group.matchLabel}
                      </span>
                      <span className="mt-0.5 block text-[0.6875rem] text-white/40 tnum">
                        {group.contests.length} contest{group.contests.length === 1 ? "" : "s"} ·
                        starts {now === null ? "soon" : formatKickoff(group.startsAt, now)}
                      </span>
                    </span>
                    <Badge tone="neutral">{group.sport}</Badge>
                  </button>

                  {!isCollapsed && (
                    <div
                      id={panelId}
                      className="grid gap-3 border-t border-white/6 p-3 sm:grid-cols-2 2xl:grid-cols-3"
                    >
                      {group.contests.map((contest) => (
                        <ContestCard key={contest.id} contest={contest} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </Shell>
  );
}
