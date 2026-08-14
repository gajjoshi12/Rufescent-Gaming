"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { SPORTS } from "@/lib/mock/sports";
import { cn, formatCompact } from "@/lib/format";
import type { Match, SportKey } from "@/lib/types";
import { Rail, Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  EmptyState,
  LinkButton,
  LivePip,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import { LoadingRegion, MatchListSkeleton, Skeleton } from "@/components/ui/Skeletons";
import { FeaturedMatchCard, MatchRow } from "@/components/betting/MatchRow";
import type { BoardMode } from "@/components/betting/MarketBoard";

type SportFilter = SportKey | "all";

const SPORT_OPTIONS: { key: SportFilter; label: string; icon?: React.ReactNode; badge?: number }[] = [
  { key: "all", label: "All" },
  ...SPORTS.map((sport) => ({
    key: sport.key as SportFilter,
    label: sport.name,
    icon: <span aria-hidden="true">{sport.icon}</span>,
    badge: sport.liveCount,
  })),
];

const MODE_OPTIONS: { key: BoardMode; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "fixed", label: "Fixed odds" },
];

export default function SportsHubPage() {
  const [sport, setSport] = useState<SportFilter>("all");
  const [mode, setMode] = useState<BoardMode>("exchange");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const featured = useAsync(() => api.sports.featured(), []);
  const live = useAsync(() => api.sports.live(), []);
  const upcoming = useAsync(() => api.sports.upcoming(), []);

  const matchesSport = useMemo(
    () => (match: Match) => sport === "all" || match.sport === sport,
    [sport],
  );

  const featuredList = useMemo(
    () => (featured.data ?? []).filter(matchesSport),
    [featured.data, matchesSport],
  );
  const liveList = useMemo(
    () => (live.data ?? []).filter(matchesSport),
    [live.data, matchesSport],
  );
  const upcomingList = useMemo(
    () => (upcoming.data ?? []).filter(matchesSport),
    [upcoming.data, matchesSport],
  );

  /** Competition order follows first appearance in the fixture list. */
  const competitionGroups = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of upcomingList) {
      const bucket = groups.get(match.competition);
      if (bucket) bucket.push(match);
      else groups.set(match.competition, [match]);
    }
    return [...groups.entries()];
  }, [upcomingList]);

  const anyLoading = featured.loading || live.loading || upcoming.loading;
  const nothingToShow =
    !anyLoading && featuredList.length === 0 && liveList.length === 0 && upcomingList.length === 0;

  const totalUpcoming = upcomingList.length;

  return (
    <Shell>
      <header className="mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gilt">Sports</span> betting
        </h1>
        <p className="mt-1 text-sm text-white/45">
          Back and lay on the exchange, or take the house price. Five sports, prices moving live.
        </p>
      </header>

      <div className="sticky top-14 z-60 mb-5 rounded-2xl border border-white/8 bg-obsidian-950/88 p-2 backdrop-blur-xl lg:top-16">
        <div className="flex items-center gap-2">
          <div className="scroll-x min-w-0 flex-1">
            <Segmented
              className="w-max"
              label="Filter by sport"
              options={SPORT_OPTIONS}
              value={sport}
              onChange={setSport}
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

      {nothingToShow ? (
        <EmptyState
          icon="◇"
          title="No fixtures for this filter"
          message="Nothing is scheduled in this sport right now. Try another sport or check the in-play board."
          action={
            <LinkButton href="/sports/live" variant="outline" size="sm">
              Go to in-play
            </LinkButton>
          }
        />
      ) : (
        <>
          <Section>
            <SectionHeading
              title="Featured"
              subtitle="Hand-picked fixtures with the deepest books"
              icon="★"
            />
            {featured.loading ? (
              <LoadingRegion label="Loading featured matches">
                <Rail label="Featured matches">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-52 w-[19rem] shrink-0 rounded-2xl sm:w-[22rem]" />
                  ))}
                </Rail>
              </LoadingRegion>
            ) : featuredList.length > 0 ? (
              <Rail label="Featured matches">
                {featuredList.map((match) => (
                  <FeaturedMatchCard key={match.id} match={match} mode={mode} />
                ))}
              </Rail>
            ) : (
              <p className="text-sm text-white/35">No featured fixtures in this sport.</p>
            )}
          </Section>

          <Section>
            <SectionHeading
              title="In-play now"
              subtitle={
                live.loading ? undefined : `${liveList.length} match${liveList.length === 1 ? "" : "es"} running`
              }
              icon={<LivePip />}
              action={
                <LinkButton href="/sports/live" variant="outline" size="sm">
                  Full board
                </LinkButton>
              }
            />
            {live.loading ? (
              <MatchListSkeleton count={3} />
            ) : liveList.length > 0 ? (
              <div className="space-y-2.5" aria-live="polite">
                {liveList.map((match) => (
                  <MatchRow key={match.id} match={match} mode={mode} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="◉"
                title="Nothing in play"
                message="No live fixtures in this sport at the moment."
              />
            )}
          </Section>

          <Section>
            <SectionHeading
              title="Upcoming"
              subtitle={
                upcoming.loading ? undefined : `${totalUpcoming} fixture${totalUpcoming === 1 ? "" : "s"} across ${competitionGroups.length} competition${competitionGroups.length === 1 ? "" : "s"}`
              }
              icon="▦"
            />
            {upcoming.loading ? (
              <MatchListSkeleton count={4} />
            ) : competitionGroups.length > 0 ? (
              <div className="space-y-3">
                {competitionGroups.map(([competition, fixtures]) => {
                  const isCollapsed = collapsed[competition] ?? false;
                  return (
                    <div key={competition} className="glass overflow-hidden rounded-2xl">
                      <h3>
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          onClick={() =>
                            setCollapsed((current) => ({
                              ...current,
                              [competition]: !isCollapsed,
                            }))
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold">{competition}</span>
                            <Badge tone="neutral">{fixtures.length}</Badge>
                          </span>
                          <svg
                            viewBox="0 0 16 16"
                            className={cn(
                              "size-3.5 shrink-0 text-white/40 transition-transform duration-250",
                              !isCollapsed && "rotate-180",
                            )}
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 6.5L8 10.5L12 6.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </h3>

                      {!isCollapsed && (
                        <div className="space-y-2 border-t border-white/6 p-2">
                          {fixtures.map((match) => (
                            <MatchRow key={match.id} match={match} mode={mode} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="◇"
                title="No upcoming fixtures"
                message="Nothing scheduled in this sport. Switch the filter to see the full card."
              />
            )}
          </Section>

          <p className="text-[0.6875rem] text-white/25">
            <span className="tnum">
              {formatCompact(
                [...liveList, ...upcomingList].reduce((total, m) => total + m.marketCount, 0),
              )}
            </span>{" "}
            markets priced across{" "}
            {sport === "all" ? "all sports" : SPORTS.find((s) => s.key === sport)?.name}. 18+ only.
          </p>
        </>
      )}
    </Shell>
  );
}
