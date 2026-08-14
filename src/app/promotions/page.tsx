"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Promotion, User } from "@/lib/types";
import { cn } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/store/session";
import { Shell, Section } from "@/components/layout/Shell";
import { PromoCarousel } from "@/components/promo/PromoCarousel";
import { Sheet } from "@/components/ui/Sheet";
import { BannerSkeleton, LoadingRegion, Skeleton } from "@/components/ui/Skeletons";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  LinkButton,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";

/* ============================================================
   Categories — derived from the promo's destination, so adding a
   promotion to the mock automatically files it correctly.
   ============================================================ */

type Category = "all" | "sports" | "casino" | "fantasy" | "loyalty";

const CATEGORY_OPTIONS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sports", label: "Sports" },
  { key: "casino", label: "Casino" },
  { key: "fantasy", label: "Fantasy" },
  { key: "loyalty", label: "Loyalty" },
];

function categoryOf(promo: Promotion): Exclude<Category, "all"> {
  if (promo.href.startsWith("/sports")) return "sports";
  if (promo.href.startsWith("/casino")) return "casino";
  if (promo.href.startsWith("/fantasy")) return "fantasy";
  return "loyalty";
}

const CATEGORY_LABEL: Record<Exclude<Category, "all">, string> = {
  sports: "Sports",
  casino: "Casino",
  fantasy: "Fantasy",
  loyalty: "Loyalty & wallet",
};

/* ============================================================
   Loyalty ladder
   ============================================================ */

type Tier = User["tier"];

const TIERS: {
  tier: Tier;
  points: string;
  accent: string;
  perks: string[];
}[] = [
  {
    tier: "Bronze",
    points: "0 – 4,999 pts",
    accent: "from-[#a1785a] to-[#5e4132]",
    perks: [
      "5% weekly cashback on net losses",
      "Standard withdrawal queue",
      "Access to all public promotions",
    ],
  },
  {
    tier: "Silver",
    points: "5,000 – 14,999 pts",
    accent: "from-[#d5d9e2] to-[#767d8c]",
    perks: [
      "7% weekly cashback",
      "Priority withdrawals — typically under 30 minutes",
      "Monthly reload bonus up to ₹2,500",
    ],
  },
  {
    tier: "Gold",
    points: "15,000 – 24,999 pts",
    accent: "from-gold-200 to-gold-600",
    perks: [
      "10% weekly cashback",
      "Higher accumulator boost ceiling (₹50,000)",
      "Named account manager and faster complaint handling",
      "Two free fantasy mega entries a month",
    ],
  },
  {
    tier: "Obsidian",
    points: "25,000 pts and above",
    accent: "from-obsidian-500 to-obsidian-900",
    perks: [
      "12% weekly cashback, paid daily",
      "Bespoke limits and negotiated exchange commission",
      "Event invitations and hospitality",
      "Direct line to the trading desk for large stakes",
    ],
  },
];

/* ============================================================
   Promotion card
   ============================================================ */

function PromoCard({ promo, onTerms }: { promo: Promotion; onTerms: () => void }) {
  const [from, to] = promo.hues;
  const art = [
    `radial-gradient(90% 140% at 82% 0%, hsl(${to} 92% 56% / 0.6), transparent 62%)`,
    `linear-gradient(120deg, hsl(${from} 78% 30%), hsl(${to} 60% 14%))`,
  ].join(", ");

  return (
    <Card interactive className="flex flex-col overflow-hidden">
      <div className="relative h-24 shrink-0 sm:h-28" style={{ backgroundImage: art }} aria-hidden="true">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M0 120 L 150 18 L 220 120 Z" fill="#fff" fillOpacity="0.05" />
          <circle cx="340" cy="16" r="72" fill="none" stroke="#fff" strokeOpacity="0.12" />
          <circle cx="340" cy="16" r="106" fill="none" stroke="#f5b418" strokeOpacity="0.28" strokeDasharray="2 9" />
        </svg>
        <div className="absolute inset-0 bg-linear-to-t from-obsidian-900/85 to-transparent" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="gold">{promo.badge}</Badge>
          <Badge>{CATEGORY_LABEL[categoryOf(promo)]}</Badge>
        </div>

        <h3 className="text-sm font-semibold leading-snug text-white sm:text-base">{promo.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-white/45">{promo.subtitle}</p>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <LinkButton href={promo.href} size="sm" className="flex-1">
            {promo.cta}
          </LinkButton>
          <Button
            variant="subtle"
            size="sm"
            onClick={onTerms}
            aria-label={`Full terms for ${promo.title}`}
          >
            Terms
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function PromotionsPage() {
  const { user } = useSession();
  const { data: promotions, loading } = useAsync(() => api.promotions.list(), []);
  const { data: stats } = useAsync(() => api.promotions.stats(), []);

  const [category, setCategory] = useState<Category>("all");
  const [termsFor, setTermsFor] = useState<Promotion | null>(null);

  const all = useMemo(() => promotions ?? [], [promotions]);

  const counts = useMemo(() => {
    const tally: Record<Category, number> = { all: all.length, sports: 0, casino: 0, fantasy: 0, loyalty: 0 };
    for (const promo of all) tally[categoryOf(promo)] += 1;
    return tally;
  }, [all]);

  const filtered = useMemo(
    () => (category === "all" ? all : all.filter((p) => categoryOf(p) === category)),
    [all, category],
  );

  return (
    <Shell>
      <h1 className="sr-only">Promotions</h1>

      <Section>
        {loading ? (
          <BannerSkeleton />
        ) : (
          <PromoCarousel promotions={all} />
        )}
      </Section>

      {stats && (
        <Section>
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-soft rounded-xl px-3.5 py-3">
                <dt className="text-[0.625rem] font-medium uppercase tracking-wider text-white/40">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold tnum text-gilt">{stat.value}</dd>
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-white/30">{stat.hint}</p>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* ---- Grid ---- */}
      <Section>
        <SectionHeading
          title="All offers"
          subtitle="Every live promotion. Terms apply to each — read them before opting in."
        />

        <div className="mb-4 scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
          <Segmented
            label="Filter promotions by category"
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS.map((option) => ({
              key: option.key,
              label: option.label,
              badge: counts[option.key],
            }))}
          />
        </div>

        {loading ? (
          <LoadingRegion label="Loading promotions">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="glass overflow-hidden rounded-2xl">
                  <Skeleton className="h-24 w-full rounded-none sm:h-28" />
                  <div className="space-y-2.5 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </LoadingRegion>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nothing running in this category"
            message="Offers rotate weekly. Try another category, or check back on Monday."
            action={
              <Button variant="subtle" size="sm" onClick={() => setCategory("all")}>
                Show all offers
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((promo) => (
              <PromoCard key={promo.id} promo={promo} onTerms={() => setTermsFor(promo)} />
            ))}
          </div>
        )}
      </Section>

      <Divider className="mb-7" />

      {/* ---- Loyalty ladder ---- */}
      <Section aria-labelledby="loyalty-heading">
        <div className="mb-3">
          <h2 id="loyalty-heading" className="text-base font-semibold tracking-tight sm:text-lg">
            Loyalty tiers
          </h2>
          <p className="mt-0.5 text-xs text-white/45">
            You earn one point per ₹100 staked, across every product. Tiers are reviewed monthly and
            never drop by more than one level at a time.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((entry) => {
            const current = entry.tier === user.tier;
            return (
              <li key={entry.tier}>
                <div
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex h-full flex-col rounded-2xl border p-4 transition-colors duration-300",
                    current
                      ? "border-gold-400/45 bg-gold-400/6 shadow-[0_20px_44px_-30px_var(--color-gold-500)]"
                      : "border-white/8 bg-white/2",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn("size-7 shrink-0 rounded-lg bg-linear-to-br", entry.accent)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{entry.tier}</p>
                      <p className="text-[0.6875rem] tnum text-white/40">{entry.points}</p>
                    </div>
                  </div>

                  {current && (
                    <p className="mt-3 text-[0.6875rem] text-gold-200">
                      Your tier · {user.loyaltyPoints.toLocaleString("en-IN")} pts ·{" "}
                      {Math.max(0, user.nextTierAt - user.loyaltyPoints).toLocaleString("en-IN")} to
                      the next level
                    </p>
                  )}

                  <ul className="mt-3 space-y-1.5">
                    {entry.perks.map((perk) => (
                      <li key={perk} className="flex gap-2 text-[0.6875rem] leading-relaxed text-white/55">
                        <span aria-hidden="true" className={current ? "text-gold-300" : "text-white/25"}>
                          ·
                        </span>
                        <span className="min-w-0">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-[0.6875rem] leading-relaxed text-white/30">
          Bonuses are optional. Accepting one restricts withdrawal of the bonus portion until the
          stated wagering is met — you can decline any offer and play with cash only. See{" "}
          <Link href="/responsible-gambling#limits" className="text-gold-300 underline-offset-2 hover:underline">
            deposit limits
          </Link>{" "}
          if you would rather cap what you can put in.
        </p>
      </Section>

      {/* ---- Full terms ---- */}
      <Sheet
        open={termsFor !== null}
        onClose={() => setTermsFor(null)}
        title={termsFor?.title ?? "Promotion terms"}
        description="Key terms for this offer"
        size="md"
        footer={
          termsFor ? (
            <div className="flex gap-2.5">
              <Button variant="subtle" fullWidth onClick={() => setTermsFor(null)}>
                Close
              </Button>
              <LinkButton href={termsFor.href} fullWidth onClick={() => setTermsFor(null)}>
                {termsFor.cta}
              </LinkButton>
            </div>
          ) : undefined
        }
      >
        {termsFor && (
          <div className="space-y-4 pb-2">
            <p className="text-sm leading-relaxed text-white/70">{termsFor.subtitle}</p>

            <div className="rounded-xl border border-gold-400/20 bg-gold-400/6 p-3.5">
              <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wider text-gold-200">
                Headline terms
              </p>
              <p className="text-xs leading-relaxed text-white/70">{termsFor.terms}</p>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                General conditions
              </h3>
              <ul className="space-y-2 text-xs leading-relaxed text-white/55">
                <li>One claim per person, household, IP address and payment method.</li>
                <li>
                  Bonus funds are ring-fenced and cannot be withdrawn until the wagering requirement
                  is met in full. Cash balance is always used first.
                </li>
                <li>
                  Bets that are voided, cashed out early, or placed on both sides of the same market
                  do not count toward wagering.
                </li>
                <li>
                  We may withdraw or amend an offer at any time. Where that happens, claims already
                  in progress are honoured on the terms that applied when they were made.
                </li>
                <li>
                  Abuse — including coordinated multi-accounting or arbitrage against the offer —
                  results in forfeiture of the bonus and any winnings derived from it.
                </li>
                <li>
                  Open to customers aged 18 or over in permitted jurisdictions. Please gamble
                  responsibly.
                </li>
              </ul>
            </div>

            <p className="text-[0.6875rem] leading-relaxed text-white/30">
              Demonstration build — this offer is illustrative and is not available for real money.
              Full terms would normally be versioned and dated here.
            </p>
          </div>
        )}
      </Sheet>
    </Shell>
  );
}
