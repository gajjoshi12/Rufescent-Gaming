"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { SPORTS } from "@/lib/mock/sports";
import { cn } from "@/lib/format";
import type { Sport } from "@/lib/types";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import {
  Badge,
  EmptyState,
  LinkButton,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import { MatchListSkeleton, Skeleton } from "@/components/ui/Skeletons";
import { MatchRow } from "@/components/betting/MatchRow";
import type { BoardMode } from "@/components/betting/MarketBoard";

type StatusFilter = "all" | "live" | "upcoming";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "In-play" },
  { key: "upcoming", label: "Upcoming" },
];

const MODE_OPTIONS: { key: BoardMode; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "fixed", label: "Fixed odds" },
];

export default function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = use(params);
  const meta = SPORTS.find((entry) => entry.key === sport);
  if (!meta) notFound();
  return <SportView sport={meta} />;
}

function SportView({ sport }: { sport: Sport }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [competition, setCompetition] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardMode>("exchange");

  const { data: matches, loading } = useAsync(() => api.sports.bySport(sport.key), [sport.key]);
  const { data: competitions, loading: competitionsLoading } = useAsync(
    () => api.sports.competitions(sport.key),
    [sport.key],
  );

  const visible = useMemo(() => {
    return (matches ?? []).filter((match) => {
      if (competition && match.competition !== competition) return false;
      if (status === "all") return true;
      return match.status === status;
    });
  }, [matches, competition, status]);

  const liveCount = (matches ?? []).filter((m) => m.status === "live").length;

  return (
    <>
      <SubBar
        title={`${sport.icon} ${sport.name}`}
        subtitle={loading ? "Loading fixtures…" : `${matches?.length ?? 0} fixtures · ${liveCount} in-play`}
        backHref="/sports"
        action={
          <LinkButton href="/sports/live" variant="outline" size="sm">
            In-play
          </LinkButton>
        }
      />

      <Shell>
        {/* Sibling sports read as navigation, so they are links with aria-current. */}
        <nav aria-label="Sports" className="scroll-x -mx-3 mb-4 px-3 sm:-mx-5 sm:px-5">
          <ul className="flex w-max gap-2">
            {SPORTS.map((entry) => {
              const active = entry.key === sport.key;
              return (
                <li key={entry.key}>
                  <Link
                    href={`/sports/${entry.key}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors",
                      active
                        ? "border-gold-400/45 bg-gold-400/12 text-gold-200"
                        : "border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white/85",
                    )}
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    {entry.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sticky top-26 z-60 mb-5 rounded-2xl border border-white/8 bg-obsidian-950/88 p-2 backdrop-blur-xl lg:top-28">
          <div className="flex items-center gap-2">
            <div className="scroll-x min-w-0 flex-1">
              <Segmented
                className="w-max"
                label="Filter by status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
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

        <Section>
          <SectionHeading title="Competitions" subtitle="Narrow the coupon to one league" />
          {competitionsLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="scroll-x -mx-3 px-3 sm:-mx-5 sm:px-5">
              <ul className="flex w-max gap-2">
                <li>
                  <Chip
                    active={competition === null}
                    onClick={() => setCompetition(null)}
                    label="All competitions"
                    count={matches?.length ?? 0}
                  />
                </li>
                {(competitions ?? []).map((entry) => (
                  <li key={entry.name}>
                    <Chip
                      active={competition === entry.name}
                      onClick={() =>
                        setCompetition((current) => (current === entry.name ? null : entry.name))
                      }
                      label={entry.name}
                      count={entry.count}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section>
          <SectionHeading
            title={competition ?? "All fixtures"}
            subtitle={
              loading
                ? undefined
                : `${visible.length} match${visible.length === 1 ? "" : "es"} shown`
            }
            action={
              competition && (
                <button
                  type="button"
                  onClick={() => setCompetition(null)}
                  className="text-[0.6875rem] font-medium text-gold-300 transition-colors hover:text-gold-100"
                >
                  Clear
                </button>
              )
            }
          />

          {loading ? (
            <MatchListSkeleton count={5} />
          ) : visible.length > 0 ? (
            <div className="space-y-2.5" aria-live="polite">
              {visible.map((match) => (
                <MatchRow key={match.id} match={match} mode={mode} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="◇"
              title="No fixtures match these filters"
              message="Clear the competition or status filter to see the full card."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setCompetition(null);
                    setStatus("all");
                  }}
                  className="rounded-xl border border-gold-400/35 px-4 py-2 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-400/10"
                >
                  Reset filters
                </button>
              }
            />
          )}
        </Section>
      </Shell>
    </>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[0.6875rem] font-medium transition-colors",
        active
          ? "border-ember-400/50 bg-ember-500/18 text-ember-100"
          : "border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white/85",
      )}
    >
      {label}
      <Badge tone={active ? "ember" : "neutral"} className="border-0 bg-transparent px-0">
        {count}
      </Badge>
    </button>
  );
}
