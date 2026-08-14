"use client";

import { notFound } from "next/navigation";
import { use, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync, useNow } from "@/lib/hooks";
import {
  backProfit,
  cn,
  formatClockTime,
  formatCompact,
  formatDateTime,
  formatKickoff,
  formatMoney,
  impliedProbability,
  layLiability,
} from "@/lib/format";
import type { Market, MarketType, Match, SportKey } from "@/lib/types";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  LiveBadge,
  LinkButton,
  SectionHeading,
  Segmented,
  StatTile,
} from "@/components/ui/primitives";
import { LoadingRegion, MarketListSkeleton, Skeleton } from "@/components/ui/Skeletons";
import { MarketBoard, type BoardMode } from "@/components/betting/MarketBoard";

type GroupKey = "all" | "main" | "totals" | "handicap" | "props";

const GROUP_OF: Record<MarketType, Exclude<GroupKey, "all">> = {
  match_odds: "main",
  both_teams_score: "main",
  correct_score: "main",
  over_under: "totals",
  handicap: "handicap",
  player_props: "props",
  outright: "props",
};

const MODE_OPTIONS: { key: BoardMode; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "fixed", label: "Fixed odds" },
];

export default function MatchPage({
  params,
}: {
  params: Promise<{ sport: string; matchId: string }>;
}) {
  const { sport, matchId } = use(params);
  return <MatchView sport={sport} matchId={matchId} />;
}

function MatchView({ sport, matchId }: { sport: string; matchId: string }) {
  const [mode, setMode] = useState<BoardMode>("exchange");
  const [group, setGroup] = useState<GroupKey>("all");

  const { data: match, loading } = useAsync(() => api.sports.match(matchId), [matchId]);
  const { data: markets, loading: marketsLoading } = useAsync(
    () => api.sports.markets(matchId),
    [matchId],
  );
  const now = useNow();

  const groupOptions = useMemo(() => {
    const present = new Set((markets ?? []).map((m) => GROUP_OF[m.type]));
    const labels: { key: Exclude<GroupKey, "all">; label: string }[] = [
      { key: "main", label: "Main" },
      { key: "totals", label: sport === "soccer" ? "Goals" : "Totals" },
      { key: "handicap", label: "Handicaps" },
      { key: "props", label: "Props" },
    ];
    return [
      { key: "all" as GroupKey, label: "All", badge: (markets ?? []).length },
      ...labels
        .filter((entry) => present.has(entry.key))
        .map((entry) => ({
          key: entry.key as GroupKey,
          label: entry.label,
          badge: (markets ?? []).filter((m) => GROUP_OF[m.type] === entry.key).length,
        })),
    ];
  }, [markets, sport]);

  const visibleMarkets = useMemo(
    () => (markets ?? []).filter((m) => group === "all" || GROUP_OF[m.type] === group),
    [markets, group],
  );

  const totalMatched = useMemo(
    () => (markets ?? []).reduce((sum, m) => sum + m.matched, 0),
    [markets],
  );

  // `match` is undefined while the request is in flight; only a resolved
  // miss is a genuine 404.
  if (!loading && !match) notFound();

  const live = match?.status === "live";
  const title = match ? `${match.home.short} v ${match.away.short}` : "Match";
  const primary = markets?.[0];

  return (
    <>
      <SubBar
        title={title}
        subtitle={match?.competition}
        backHref={`/sports/${sport}`}
        action={live ? <LiveBadge label={match?.clock ?? "Live"} /> : undefined}
      />

      <Shell>
        {loading || !match ? (
          <LoadingRegion label="Loading match">
            <Skeleton className="mb-5 h-44 w-full rounded-2xl" />
          </LoadingRegion>
        ) : (
          <MatchHeader match={match} now={now} />
        )}

        <div className="sticky top-26 z-60 mb-5 rounded-2xl border border-white/8 bg-obsidian-950/88 p-2 backdrop-blur-xl lg:top-28">
          <div className="flex items-center gap-2">
            <div className="scroll-x min-w-0 flex-1">
              <Segmented
                className="w-max"
                size="sm"
                label="Filter markets by group"
                options={groupOptions}
                value={group}
                onChange={setGroup}
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

        {/* The base track must be minmax(0,1fr): an implicit `auto` column
            refuses to shrink below its content's min-content width, which
            pushes long market names past the viewport on narrow screens. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:items-start">
          <Section className="mb-0">
            <SectionHeading
              title={mode === "exchange" ? "Exchange markets" : "Fixed-odds markets"}
              subtitle={
                marketsLoading
                  ? undefined
                  : `${visibleMarkets.length} of ${markets?.length ?? 0} markets shown`
              }
            />

            {marketsLoading ? (
              <MarketListSkeleton count={4} />
            ) : visibleMarkets.length > 0 && match ? (
              <div className="space-y-3">
                {visibleMarkets.map((market, index) => (
                  <MarketBoard
                    key={market.id}
                    market={market}
                    match={match}
                    mode={mode}
                    defaultOpen={index < 3}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="◇"
                title="No markets in this group"
                message="Switch back to All to see every market on this fixture."
              />
            )}
          </Section>

          <Section className="mb-0 2xl:sticky 2xl:top-32">
            <InfoPanel
              market={primary}
              marketCount={markets?.length ?? 0}
              totalMatched={totalMatched}
              loading={marketsLoading}
              mode={mode}
              sport={match?.sport}
            />
          </Section>
        </div>
      </Shell>
    </>
  );
}

/* ============================================================
   Header
   ============================================================ */

function MatchHeader({ match, now }: { match: Match; now: number | null }) {
  const live = match.status === "live";

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="relative p-4 sm:p-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-ember-700/22 blur-3xl"
        />

        <div className="relative mb-4 flex items-center justify-between gap-2">
          <span className="truncate text-[0.625rem] font-medium uppercase tracking-wider text-white/40">
            {match.competition}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {match.streaming && <Badge tone="gold">Stream</Badge>}
            {live ? (
              <LiveBadge label={match.clock ?? "Live"} />
            ) : (
              <Badge tone="neutral">
                <span className="tnum">
                  {now === null
                    ? formatClockTime(match.startsAt)
                    : formatKickoff(match.startsAt, now)}
                </span>
              </Badge>
            )}
          </span>
        </div>

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <Competitor competitor={match.home} score={match.score?.home} live={live} />

          <div className="shrink-0 text-center">
            {live && match.score ? (
              <span className="font-display text-xl font-semibold text-white/25">—</span>
            ) : (
              <span className="text-[0.5625rem] font-semibold uppercase tracking-widest text-white/25">
                vs
              </span>
            )}
          </div>

          <Competitor
            competitor={match.away}
            score={match.score?.away}
            live={live}
            align="right"
          />
        </div>

        {match.detail && (
          <p className="relative mt-3 text-center text-xs text-white/45">{match.detail}</p>
        )}

        <Divider className="my-4" />

        <dl className="relative grid grid-cols-2 gap-3 text-[0.6875rem] sm:grid-cols-4">
          <div>
            <dt className="text-white/35">Start</dt>
            <dd className="mt-0.5 font-medium text-white/75 tnum">
              {formatDateTime(match.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Markets</dt>
            <dd className="mt-0.5 font-medium text-white/75 tnum">{match.marketCount}</dd>
          </div>
          <div>
            <dt className="text-white/35">Status</dt>
            <dd className="mt-0.5 font-medium capitalize text-white/75">{match.status}</dd>
          </div>
          <div>
            <dt className="text-white/35">Stream</dt>
            <dd className="mt-0.5 font-medium text-white/75">
              {match.streaming ? "Available" : "Not available"}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function Competitor({
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
    <div className={cn("flex min-w-0 items-center gap-3", align === "right" && "flex-row-reverse")}>
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-obsidian-800/80 text-xl"
      >
        {competitor.crest}
      </span>
      <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
        <p className="truncate text-sm font-semibold sm:text-base">{competitor.name}</p>
        <p className="truncate text-[0.625rem] uppercase tracking-wider text-white/30">
          {competitor.short}
        </p>
      </div>
      {live && score !== undefined && (
        <span className="shrink-0 font-display text-3xl font-semibold text-gold-300 tnum sm:text-4xl">
          {score}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Info panel
   ============================================================ */

function InfoPanel({
  market,
  marketCount,
  totalMatched,
  loading,
  mode,
  sport,
}: {
  market: Market | undefined;
  marketCount: number;
  totalMatched: number;
  loading: boolean;
  mode: BoardMode;
  sport: SportKey | undefined;
}) {
  const favourite = market?.runners[0];
  const exampleStake = 1000;
  const backPrice = favourite?.back[0].price ?? 2;
  const layPrice = favourite?.lay[0].price ?? 2.02;

  return (
    <>
      <SectionHeading title="Market info" subtitle="How this book is priced" icon="◈" />

      {loading ? (
        <div className="grid grid-cols-3 gap-2 2xl:grid-cols-1">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 2xl:grid-cols-1">
          <StatTile
            label="Total matched"
            value={<span className="tnum">₹{formatCompact(totalMatched)}</span>}
            hint="Across every market"
            tone="gold"
          />
          <StatTile
            label="Markets"
            value={<span className="tnum">{marketCount}</span>}
            hint="Open for betting"
          />
          <StatTile
            label="Over-round"
            value={<span className="tnum">{market ? `${market.margin}%` : "—"}</span>}
            hint={market ? `${(market.margin - 100).toFixed(1)}% book margin` : undefined}
            tone={market && market.margin > 108 ? "ember" : "neutral"}
          />
        </div>
      )}

      {favourite && (
        <Card className="mt-3 p-4">
          <h3 className="text-sm font-semibold">How back and lay work</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            On the exchange you bet against other customers, not the house. Two people take opposite
            sides of the same outcome and the platform only takes commission on winnings.
          </p>

          <div className="mt-3 space-y-2">
            <ExplainerRow
              side="back"
              title="Back"
              body={`You bet ${favourite.name} will happen. Stake ${formatMoney(exampleStake, { decimals: false })} at ${backPrice.toFixed(2)} and you win ${formatMoney(backProfit(exampleStake, backPrice), { decimals: false })} profit if it does — or lose the stake if it does not.`}
            />
            <ExplainerRow
              side="lay"
              title="Lay"
              body={`You bet ${favourite.name} will not happen — you become the bookmaker. Accept ${formatMoney(exampleStake, { decimals: false })} at ${layPrice.toFixed(2)} and you keep it if the outcome fails, but you owe ${formatMoney(layLiability(exampleStake, layPrice), { decimals: false })} if it lands.`}
            />
          </div>

          <Divider className="my-3" />

          <p className="text-[0.6875rem] leading-relaxed text-white/40">
            The number under each price is the money already waiting at it. The gap between the best
            back and best lay price is the spread — a tight spread means a liquid market. Best back{" "}
            <span className="tnum">{backPrice.toFixed(2)}</span> implies{" "}
            <span className="tnum">{impliedProbability(backPrice).toFixed(1)}%</span> chance.
          </p>

          {mode === "fixed" && (
            <p className="mt-2 rounded-lg border border-gold-400/20 bg-gold-400/8 px-3 py-2 text-[0.6875rem] text-gold-200/80">
              You are viewing fixed odds — one price, taken from the house, no lay side.
            </p>
          )}
        </Card>
      )}

      <Card className="mt-3 p-4">
        <h3 className="text-sm font-semibold">Stay in control</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          In-play prices move quickly. Set a deposit or loss limit before you bet, and never chase a
          losing position.
        </p>
        <LinkButton
          href="/responsible-gambling"
          variant="outline"
          size="sm"
          fullWidth
          className="mt-3"
        >
          Set your limits
        </LinkButton>
      </Card>

      {sport && (
        <LinkButton href={`/sports/${sport}`} variant="ghost" size="sm" fullWidth className="mt-2">
          More {sport} fixtures
        </LinkButton>
      )}
    </>
  );
}

function ExplainerRow({
  side,
  title,
  body,
}: {
  side: "back" | "lay";
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        side === "back"
          ? "border-back-500/25 bg-back-900/35"
          : "border-lay-500/25 bg-lay-900/35",
      )}
    >
      <p
        className={cn(
          "text-[0.6875rem] font-semibold uppercase tracking-wider",
          side === "back" ? "text-back-300" : "text-lay-300",
        )}
      >
        {title}
      </p>
      <p className="mt-1 text-[0.6875rem] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}
