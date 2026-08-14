"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, formatCompact, formatMoney, hueGradient } from "@/lib/format";
import type { CasinoGame, FantasyContest, Match, Promotion } from "@/lib/types";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { QUICK_STATS } from "@/lib/mock/promotions";
import { SPORTS } from "@/lib/mock/sports";

import { Rail, Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Divider,
  LinkButton,
  LivePip,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import {
  BannerSkeleton,
  ContestListSkeleton,
  GameGridSkeleton,
  MatchListSkeleton,
} from "@/components/ui/Skeletons";
import { FeaturedMatchCard, MatchRow } from "@/components/betting/MatchRow";
import { PromoCarousel } from "@/components/promo/PromoCarousel";
import type { BoardMode } from "@/components/betting/MarketBoard";
import { useSession } from "@/store/session";

export default function LandingPage() {
  const [mode, setMode] = useState<BoardMode>("exchange");
  const { signedIn } = useSession();

  const promos = useAsync<Promotion[]>(() => api.promotions.list());
  const featured = useAsync<Match[]>(() => api.sports.featured());
  const live = useAsync<Match[]>(() => api.sports.live());
  const hotGames = useAsync<CasinoGame[]>(() => api.casino.hot());
  const contests = useAsync<FantasyContest[]>(() => api.fantasy.contests());

  return (
    <Shell>
      {!signedIn && <Hero />}

      {/* ---------- Promotions ---------- */}
      <Section aria-label="Promotions">
        {promos.loading || !promos.data ? (
          <BannerSkeleton />
        ) : (
          <PromoCarousel promotions={promos.data} />
        )}
      </Section>

      {/* ---------- Sport quick-jump ---------- */}
      <Section aria-label="Browse sports">
        <Rail label="Sports">
          {SPORTS.map((sport) => (
            <Link
              key={sport.key}
              href={`/sports/${sport.key}`}
              className="glass group flex w-[6.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl px-3 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/25 sm:w-28"
            >
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                {sport.icon}
              </span>
              <span className="text-xs font-medium text-white/85">{sport.name}</span>
              <span className="flex items-center gap-1 text-[0.5625rem] text-white/35 tnum">
                <LivePip />
                {sport.liveCount} live
              </span>
            </Link>
          ))}
        </Rail>
      </Section>

      {/* ---------- Featured ---------- */}
      <Section aria-label="Featured matches">
        <SectionHeading
          title="Featured today"
          subtitle="Hand-picked fixtures with the deepest liquidity"
          icon="★"
          action={
            <Segmented
              label="Odds view"
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { key: "exchange", label: "Exchange" },
                { key: "fixed", label: "Fixed" },
              ]}
            />
          }
        />
        {featured.loading || !featured.data ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-44 w-[19rem] shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : (
          <Rail label="Featured matches">
            {featured.data.map((match) => (
              <FeaturedMatchCard key={match.id} match={match} mode={mode} />
            ))}
          </Rail>
        )}
      </Section>

      {/* ---------- In-play ---------- */}
      <Section aria-label="Live matches">
        <SectionHeading
          title="In-play now"
          subtitle="Prices move with the game — cash out any time"
          icon={<LivePip />}
          action={
            <Link
              href="/sports/live"
              className="text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
            >
              See all
            </Link>
          }
        />
        {live.loading || !live.data ? (
          <MatchListSkeleton count={4} />
        ) : (
          <div className="space-y-2.5">
            {live.data.slice(0, 5).map((match) => (
              <MatchRow key={match.id} match={match} mode={mode} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------- Casino ---------- */}
      <Section aria-label="Casino">
        <SectionHeading
          title="Casino floor"
          subtitle="Slots, live dealer and table classics"
          icon="♠"
          action={
            <Link
              href="/casino"
              className="text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
            >
              Enter lobby
            </Link>
          }
        />
        {hotGames.loading || !hotGames.data ? (
          <GameGridSkeleton count={6} />
        ) : (
          <Rail label="Popular casino games">
            {hotGames.data.slice(0, 10).map((game) => (
              <Link
                key={game.id}
                href={`/casino/${game.slug}`}
                className="group w-32 shrink-0 snap-start sm:w-36"
              >
                <div
                  className="relative mb-2 aspect-4/5 overflow-hidden rounded-2xl border border-white/8 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold-400/35"
                  style={{ background: hueGradient(game.hue) }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-obsidian-950/85 via-transparent to-white/10"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -right-6 -top-6 size-20 rounded-full bg-white/15 blur-2xl"
                  />
                  <span className="absolute inset-x-0 bottom-0 p-2.5">
                    <span className="block truncate text-[0.6875rem] font-semibold text-white">
                      {game.name}
                    </span>
                    <span className="block truncate text-[0.5625rem] text-white/50">
                      {game.provider}
                    </span>
                  </span>
                  {game.isHot && (
                    <span className="absolute left-2 top-2">
                      <Badge tone="ember">Hot</Badge>
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </Rail>
        )}
      </Section>

      {/* ---------- Fantasy ---------- */}
      <Section aria-label="Fantasy contests">
        <SectionHeading
          title="Fantasy contests"
          subtitle="Build a team, climb the leaderboard"
          icon="🏆"
          action={
            <Link
              href="/fantasy"
              className="text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
            >
              All contests
            </Link>
          }
        />
        {contests.loading || !contests.data ? (
          <ContestListSkeleton count={3} />
        ) : (
          <Rail label="Fantasy contests">
            {contests.data.slice(0, 6).map((contest) => (
              <Link
                key={contest.id}
                href={`/fantasy/${contest.id}`}
                className="glass w-64 shrink-0 snap-start rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/25"
              >
                <p className="mb-1 truncate text-[0.625rem] uppercase tracking-wider text-white/35">
                  {contest.matchLabel}
                </p>
                <p className="font-display text-xl font-semibold text-gilt tnum">
                  ₹{formatCompact(contest.prizePool)}
                </p>
                <p className="mb-3 text-[0.6875rem] text-white/40">Prize pool</p>

                <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-ember-400 to-gold-400"
                    style={{ width: `${(contest.filledSpots / contest.totalSpots) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[0.625rem]">
                  <span className="text-white/35 tnum">
                    {(contest.totalSpots - contest.filledSpots).toLocaleString("en-IN")} spots left
                  </span>
                  <span className="font-semibold text-gold-300 tnum">
                    {contest.entryFee === 0 ? "Free" : formatMoney(contest.entryFee, { decimals: false })}
                  </span>
                </div>
              </Link>
            ))}
          </Rail>
        )}
      </Section>

      {/* ---------- Trust strip ---------- */}
      <Section aria-label="Platform statistics">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK_STATS.map((stat) => (
            <div key={stat.label} className="glass-soft rounded-xl px-3.5 py-3 text-center">
              <p className="font-display text-lg font-semibold text-gilt tnum">{stat.value}</p>
              <p className="mt-0.5 text-[0.6875rem] font-medium text-white/60">{stat.label}</p>
              <p className="text-[0.5625rem] text-white/30">{stat.hint}</p>
            </div>
          ))}
        </div>
      </Section>

      <Divider className="my-8" />

      <ExchangeExplainer />
    </Shell>
  );
}

/* ============================================================
   Hero — shown to signed-out visitors only
   ============================================================ */

function Hero() {
  return (
    <section className="relative mb-7 overflow-hidden rounded-3xl border border-gold-400/15">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-br from-ember-800/60 via-obsidian-900 to-obsidian-950"
      />
      <span
        aria-hidden="true"
        className="absolute -left-16 -top-20 size-72 rounded-full bg-ember-500/25 blur-[80px]"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-24 right-0 size-72 rounded-full bg-gold-500/15 blur-[90px]"
      />

      <div className="relative px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <Badge tone="gold" className="mb-4">
          Exchange + Sportsbook + Casino
        </Badge>

        <h1 className="max-w-2xl font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
          Better prices.{" "}
          <span className="text-ember">Back or lay</span>{" "}
          on your terms.
        </h1>

        <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
          Trade odds against other players on the exchange, or take fixed prices from the book —
          across soccer, cricket, basketball, tennis and esports. Plus a full casino floor and daily
          fantasy contests.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <LinkButton href="/signup" variant="gold" size="lg">
            Create an account
          </LinkButton>
          <LinkButton href="/sports" variant="outline" size="lg">
            Browse odds
          </LinkButton>
        </div>

        <p className="mt-5 text-[0.6875rem] text-white/35">
          18+ only. Gambling involves risk — never stake more than you can afford to lose.{" "}
          <Link
            href="/responsible-gambling"
            className="text-gold-300/70 underline-offset-2 hover:underline"
          >
            Safer gambling tools
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   Explainer — makes the exchange model legible to newcomers
   ============================================================ */

function ExchangeExplainer() {
  const cards = [
    {
      side: "back" as const,
      title: "Backing",
      body: "You're betting something will happen. Stake ₹100 at 2.50 and you win ₹150 profit if it does.",
      tone: "border-back-500/25 bg-back-900/25 text-back-100",
      chip: "bg-back-700 text-back-100",
    },
    {
      side: "lay" as const,
      title: "Laying",
      body: "You're betting it won't. You take someone else's bet, winning their stake — but risking the liability if you're wrong.",
      tone: "border-lay-500/25 bg-lay-900/25 text-lay-100",
      chip: "bg-lay-700 text-lay-100",
    },
    {
      side: "fixed" as const,
      title: "Fixed odds",
      body: "Prefer the traditional way? Toggle to fixed odds and take the book's price, in decimal, fractional or American.",
      tone: "border-gold-400/25 bg-gold-700/15 text-gold-100",
      chip: "bg-gold-500 text-obsidian-950",
    },
  ];

  return (
    <Section aria-labelledby="explainer-heading">
      <h2 id="explainer-heading" className="mb-1 text-base font-semibold sm:text-lg">
        New to the exchange?
      </h2>
      <p className="mb-4 text-xs text-white/45">
        Two ways to take a position on the same market.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.side}
            className={cn("rounded-2xl border p-4", card.tone)}
          >
            <span
              className={cn(
                "mb-2.5 inline-flex rounded-md px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider",
                card.chip,
              )}
            >
              {card.side}
            </span>
            <h3 className="mb-1.5 text-sm font-semibold text-white">{card.title}</h3>
            <p className="text-xs leading-relaxed opacity-70">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/40">
          Every market shows the best three prices on each side, with the money available at each.
        </p>
        <LinkButton href="/sports" variant="subtle" size="sm">
          Try it on a live market
        </LinkButton>
      </div>
    </Section>
  );
}
