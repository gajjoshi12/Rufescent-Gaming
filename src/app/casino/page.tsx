"use client";

import Link from "next/link";
import { Suspense, useCallback, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CasinoCategory, CasinoGame } from "@/lib/types";
import { CURRENCY, cn, formatCompact, formatMoney } from "@/lib/format";
import { api } from "@/lib/api";
import { CASINO_CATEGORIES } from "@/lib/mock/casino";
import { useAsync } from "@/lib/hooks";
import { Rail, Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  LivePip,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import { GameGridSkeleton, LoadingRegion, Skeleton } from "@/components/ui/Skeletons";
import { GameCard, GameRail, LiveTableCard, useJackpotDrift } from "@/components/casino/GameCard";

type CategoryFilter = "all" | CasinoCategory;

const CATEGORY_KEYS = CASINO_CATEGORIES.map((c) => c.key);

function isCategory(value: string | null): value is CasinoCategory {
  return value !== null && (CATEGORY_KEYS as string[]).includes(value);
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

/* ============================================================
   Jackpot ticker
   ============================================================ */

function JackpotPill({ game }: { game: CasinoGame }) {
  const value = useJackpotDrift(game.jackpot ?? 0, 23);

  return (
    <Link
      href={`/casino/${game.slug}`}
      className="glass-soft flex min-w-[9.5rem] flex-1 shrink-0 snap-start items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:border-gold-400/35"
    >
      <span
        aria-hidden="true"
        className="size-7 shrink-0 rounded-lg"
        style={{ background: `linear-gradient(140deg, hsl(${game.hue} 82% 52%), hsl(${(game.hue + 40) % 360} 70% 26%))` }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[0.5625rem] font-medium uppercase tracking-wider text-white/40">
          {game.name}
        </span>
        <span aria-hidden="true" className="block font-display text-sm font-semibold text-gilt tnum">
          {formatMoney(Math.floor(value), { decimals: false })}
        </span>
        <span className="sr-only">
          jackpot about {CURRENCY}
          {formatCompact(value)}
        </span>
      </span>
    </Link>
  );
}

function JackpotTicker({ games }: { games: CasinoGame[] }) {
  const top = games.slice(0, 3);
  const leader = top[0];
  const leadValue = useJackpotDrift(leader?.jackpot ?? 0, 23);

  if (top.length === 0) return null;

  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white/35">
        <span aria-hidden="true" className="text-gold-300">
          ◆
        </span>
        Progressive jackpots
      </p>

      {/*
        The visible digits tick many times a second, so they are hidden from
        assistive tech and this coarse line — rounded to the nearest thousand,
        i.e. roughly one change a minute — is what the live region announces.
      */}
      <p aria-live="polite" className="sr-only">
        Top jackpot: {leader?.name} at{" "}
        {formatMoney(Math.round(leadValue / 1000) * 1000, { decimals: false })}
      </p>

      <div className="scroll-x flex gap-2">
        {top.map((game) => (
          <JackpotPill key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Filters
   ============================================================ */

function ProviderFilter({
  providers,
  selected,
  onToggle,
  onClear,
  loading,
}: {
  providers: { id: string; name: string; hue: number; gameCount: number }[];
  selected: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <Rail label="Filter by provider" className="mt-2.5">
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ember-400/40 bg-ember-500/12 px-3 text-xs font-medium text-ember-200 transition-colors hover:bg-ember-500/20"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Clear <span className="tnum">{selected.length}</span>
        </button>
      )}

      {loading
        ? Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))
        : providers.map((provider) => {
            const active = selected.includes(provider.name);
            return (
              <button
                key={provider.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(provider.name)}
                className={cn(
                  "flex h-9 shrink-0 snap-start items-center gap-2 rounded-full border px-3 text-xs font-medium transition-all duration-200",
                  active
                    ? "border-gold-400/55 bg-gold-400/12 text-gold-100"
                    : "border-white/10 bg-white/4 text-white/55 hover:border-white/25 hover:text-white/85",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `hsl(${provider.hue} 78% 56%)` }}
                />
                {provider.name}
                <span className={cn("tnum", active ? "text-gold-300/70" : "text-white/30")}>
                  {provider.gameCount}
                </span>
              </button>
            );
          })}
    </Rail>
  );
}

/* ============================================================
   Sections
   ============================================================ */

function LiveDealerSection({
  games,
  href,
  loading,
}: {
  games: CasinoGame[];
  href?: string;
  loading?: boolean;
}) {
  if (!loading && games.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        title="Live dealer"
        icon="🎥"
        subtitle="Real dealers, streamed from the studio floor"
        action={
          href ? (
            <Link
              href={href}
              className="rounded-lg px-1 text-xs font-medium text-gold-300 transition-colors hover:text-gold-100"
            >
              See all
              <span className="sr-only"> live dealer tables</span>
            </Link>
          ) : undefined
        }
      />
      {loading ? (
        <LoadingRegion label="Loading live tables">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <LiveTableCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </Section>
  );
}

/* ============================================================
   Lobby

   Split out so the `useSearchParams` call sits inside a Suspense
   boundary, which Next requires for prerendering.
   ============================================================ */

function CasinoLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [category, setCategory] = useState<CategoryFilter>(() => {
    const initial = searchParams.get("category");
    return isCategory(initial) ? initial : "all";
  });

  const { data: providers, loading: providersLoading } = useAsync(() => api.casino.providers(), []);
  const { data: hot } = useAsync(() => api.casino.hot(), []);
  const { data: fresh } = useAsync(() => api.casino.fresh(), []);
  const { data: jackpots } = useAsync(() => api.casino.jackpots(), []);
  const { data: results, loading } = useAsync(() => api.casino.search(deferredQuery), [deferredQuery]);

  const changeCategory = useCallback(
    (next: CategoryFilter) => {
      setCategory(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("category");
      else params.set("category", next);
      const qs = params.toString();
      router.replace(qs ? `/casino?${qs}` : "/casino", { scroll: false });
    },
    [router, searchParams],
  );

  const toggleProvider = useCallback((name: string) => {
    setSelectedProviders((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const game of results ?? []) map.set(game.category, (map.get(game.category) ?? 0) + 1);
    return map;
  }, [results]);

  const filtered = useMemo(
    () =>
      (results ?? []).filter(
        (game) =>
          (category === "all" || game.category === category) &&
          (selectedProviders.length === 0 || selectedProviders.includes(game.provider)),
      ),
    [results, category, selectedProviders],
  );

  const liveGames = useMemo(() => filtered.filter((g) => g.category === "live"), [filtered]);
  const tableGames = useMemo(() => filtered.filter((g) => g.category === "table"), [filtered]);

  const searching = query.trim().length > 0;
  const filtersActive = searching || selectedProviders.length > 0 || category !== "all";
  const discovery = !filtersActive;

  const resetAll = useCallback(() => {
    setQuery("");
    setSelectedProviders([]);
    changeCategory("all");
  }, [changeCategory]);

  const gridHeading = searching
    ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for “${query.trim()}”`
    : filtersActive
      ? `${filtered.length} game${filtered.length === 1 ? "" : "s"}`
      : "All games";

  const emptyState = (
    <EmptyState
      icon="🎲"
      title="Nothing matches those filters"
      message="Try a different studio, category or search term — the catalogue has 49 titles waiting."
      action={
        <Button variant="subtle" size="sm" onClick={resetAll}>
          Clear all filters
        </Button>
      }
    />
  );

  return (
    <>
      {/* ---------- Hero ---------- */}
      <Section>
        <div className="glass relative isolate overflow-hidden rounded-3xl px-4 py-5 sm:px-6 sm:py-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-ember-600/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full bg-gold-600/18 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 lg:max-w-lg">
              <Badge tone="gold">Casino</Badge>
              <h1 className="mt-2.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                The <span className="text-ember">molten</span> floor
              </h1>
              <p className="mt-1.5 max-w-md text-sm text-white/45">
                Slots, live dealer tables, crash and instant wins from ten studios. Every game is
                playable in demo mode before you stake a rupee.
              </p>

              <div className="mt-4 max-w-sm">
                <label htmlFor="casino-search" className="sr-only">
                  Search games, studios or features
                </label>
                <Input
                  id="casino-search"
                  type="search"
                  prefix="⌕"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search games, studios or features"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="min-w-0 lg:w-[26rem]">
              <JackpotTicker games={jackpots ?? []} />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- Poker room ----------
          The sidebar entry for poker is xl-only, so this banner is the
          sole route into the poker room on a phone. Keep it above the
          category filters, where it can't be scrolled past. */}
      <Section aria-label="Poker room">
        <Link
          href="/casino/poker"
          className="group relative block overflow-hidden rounded-2xl border border-gold-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/50"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 75% 90% at 22% 25%, #6d1f24 0%, #3a1014 48%, #1a0609 100%)",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute -right-10 -top-14 size-52 rounded-full bg-gold-500/18 blur-[70px]"
          />

          <span className="relative flex items-center gap-3.5 p-4 sm:gap-5 sm:p-5">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold-400/35 bg-obsidian-950/60 text-2xl sm:size-14 sm:text-3xl"
            >
              ♠
            </span>

            <span className="min-w-0 flex-1">
              <span className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="gold">Poker room</Badge>
                <Badge tone="live">
                  <LivePip />
                  Tables running
                </Badge>
              </span>
              <span className="block font-display text-base font-semibold text-white sm:text-lg">
                Tournaments &amp; cash games
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-white/50">
                Texas Hold&rsquo;em against other players — AED 10M guaranteed on the Ember Millions.
              </span>
            </span>

            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-gold-400/30 text-gold-200 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                <path
                  d="M6 3.5L10.5 8L6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </Link>
      </Section>

      {/* ---------- Filters ---------- */}
      <Section aria-label="Filters">
        <div className="scroll-x -mx-3 px-3 sm:-mx-5 sm:px-5">
          <Segmented<CategoryFilter>
            label="Game category"
            value={category}
            onChange={changeCategory}
            options={[
              { key: "all", label: "All", badge: results?.length ?? 0 },
              ...CASINO_CATEGORIES.map((meta) => ({
                key: meta.key as CategoryFilter,
                label: meta.label,
                icon: <span aria-hidden="true">{meta.icon}</span>,
                badge: counts.get(meta.key) ?? 0,
              })),
            ]}
          />
        </div>

        <ProviderFilter
          providers={providers ?? []}
          selected={selectedProviders}
          onToggle={toggleProvider}
          onClear={() => setSelectedProviders([])}
          loading={providersLoading}
        />
      </Section>

      {/* ---------- Discovery rails ---------- */}
      {discovery && (
        <>
          <GameRail title="Hot right now" icon="🔥" games={hot ?? []} />
          <GameRail title="New releases" icon="✨" games={fresh ?? []} />
          <GameRail
            title="Jackpots"
            icon="💰"
            subtitle="Network progressives, richest pot first"
            games={jackpots ?? []}
          />
        </>
      )}

      {/* ---------- Main content ---------- */}
      {category === "live" ? (
        loading || liveGames.length > 0 ? (
          <LiveDealerSection games={liveGames} loading={loading} />
        ) : (
          <Section>{emptyState}</Section>
        )
      ) : category === "table" ? (
        <Section>
          <SectionHeading
            title="Table games"
            icon="🃏"
            subtitle="Roulette, blackjack, baccarat and poker with classic house rules"
          />
          {loading ? (
            <GameGridSkeleton count={6} />
          ) : tableGames.length === 0 ? (
            emptyState
          ) : (
            <div className={GRID}>
              {tableGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </Section>
      ) : (
        <>
          {discovery && (
            <>
              <LiveDealerSection games={liveGames.slice(0, 6)} href="/casino?category=live" />
              <GameRail
                title="Table games"
                icon="🃏"
                games={tableGames}
                href="/casino?category=table"
              />
            </>
          )}

          <Section>
            <SectionHeading
              title={gridHeading}
              subtitle={discovery ? "The full catalogue, newest studios first" : undefined}
              action={
                filtersActive ? (
                  <Button variant="ghost" size="sm" onClick={resetAll}>
                    Reset
                  </Button>
                ) : undefined
              }
            />
            {loading ? (
              <GameGridSkeleton />
            ) : filtered.length === 0 ? (
              emptyState
            ) : (
              <div className={GRID}>
                {filtered.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <p className="mt-2 text-[0.6875rem] leading-relaxed text-white/30">
        Casino games are games of chance. Outcomes are independent and the published RTP is a
        long-run average, not a promise about any session.{" "}
        <Link href="/responsible-gambling" className="text-white/50 underline underline-offset-2 hover:text-gold-300">
          Set a deposit or loss limit
        </Link>
        .
      </p>
    </>
  );
}

function LobbyFallback() {
  return (
    <>
      <Section>
        <Skeleton className="h-52 w-full rounded-3xl sm:h-44" />
      </Section>
      <Section>
        <Skeleton className="h-10 w-72 rounded-xl" />
      </Section>
      <GameGridSkeleton />
    </>
  );
}

export default function CasinoPage() {
  return (
    <Shell slip={false}>
      <Suspense fallback={<LobbyFallback />}>
        <CasinoLobby />
      </Suspense>
    </Shell>
  );
}
