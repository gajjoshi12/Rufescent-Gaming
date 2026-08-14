"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CasinoGame } from "@/lib/types";
import { CURRENCY, cn, formatCompact, hashCode, hueGradient, seeded } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Rail, Section } from "@/components/layout/Shell";
import { Badge, LivePip, SectionHeading } from "@/components/ui/primitives";

/* ============================================================
   Generated cover art

   There is no game artwork in this build: every cover is built
   from the game's `hue` — a gradient ground, a deterministic
   geometric motif seeded from the slug, an embossed monogram and
   a noise/vignette pass. Seeded (never Math.random) so the server
   and client render byte-identical markup.
   ============================================================ */

/** Tiling fractal-noise tile, inlined so the art needs no network request. */
const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** ASCII-safe: every title in the catalogue is Latin. */
function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function CoverMotif({ slug }: { slug: string }) {
  const rng = seeded(hashCode(slug));
  const variant = Math.floor(rng() * 5);
  const cx = 24 + Math.round(rng() * 52);
  const cy = 20 + Math.round(rng() * 54);
  const tilt = Math.round(rng() * 50 - 25);

  let shapes: React.ReactNode = null;

  if (variant === 0) {
    // Sunburst
    shapes = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={Number((cx + Math.cos(a) * 120).toFixed(2))}
          y2={Number((cy + Math.sin(a) * 120).toFixed(2))}
        />
      );
    });
  } else if (variant === 1) {
    // Concentric orbits
    shapes = Array.from({ length: 9 }, (_, i) => (
      <circle key={i} cx={cx} cy={cy} r={5 + i * 10.5} />
    ));
  } else if (variant === 2) {
    // Diamond lattice
    shapes = (
      <g transform={`rotate(${tilt} 50 50)`}>
        {Array.from({ length: 36 }, (_, i) => {
          const x = -8 + (i % 6) * 23;
          const y = -8 + Math.floor(i / 6) * 23;
          return <path key={i} d={`M${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}L${x - 9} ${y}Z`} />;
        })}
      </g>
    );
  } else if (variant === 3) {
    // Stacked chevrons
    shapes = Array.from({ length: 9 }, (_, i) => (
      <path key={i} d={`M-14 ${6 + i * 15}L50 ${-16 + i * 15}L114 ${6 + i * 15}`} />
    ));
  } else {
    // Standing waves
    shapes = Array.from({ length: 9 }, (_, i) => {
      const y = 4 + i * 13;
      return <path key={i} d={`M-12 ${y} Q 19 ${y - 12} 50 ${y} T 112 ${y}`} />;
    });
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 size-full text-white mix-blend-soft-light"
    >
      <circle cx={cx} cy={cy} r="32" fill="currentColor" opacity="0.09" />
      <g fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.55">
        {shapes}
      </g>
    </svg>
  );
}

const MONOGRAM_SIZE = {
  none: "",
  sm: "text-2xl",
  md: "text-[2.75rem] sm:text-5xl",
  lg: "text-6xl sm:text-7xl lg:text-8xl",
} as const;

/**
 * The generated cover. Give it an aspect ratio + radius through
 * `className`; overlays (badges, scrims, CTAs) go in as children.
 */
export function GameArt({
  game,
  className,
  monogram = "md",
  children,
}: {
  game: CasinoGame;
  className?: string;
  monogram?: keyof typeof MONOGRAM_SIZE;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ background: hueGradient(game.hue) }}
    >
      <CoverMotif slug={game.slug} />

      {/* Diagonal sheen */}
      <div
        aria-hidden="true"
        className="absolute -inset-1/4 rotate-[24deg] bg-linear-to-r from-transparent via-white/22 to-transparent mix-blend-overlay"
      />

      {/* Noise + vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: NOISE_URL }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 -28px 46px -18px rgba(0,0,0,0.85), inset 0 22px 40px -26px rgba(255,255,255,0.35)",
        }}
      />

      {monogram !== "none" && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 text-center font-display font-bold tracking-tight",
            MONOGRAM_SIZE[monogram],
          )}
          style={{
            color: "rgba(255,255,255,0.09)",
            WebkitTextStrokeWidth: "1px",
            WebkitTextStrokeColor: "rgba(255,255,255,0.30)",
            textShadow: "0 2px 0 rgba(0,0,0,0.38), 0 -1px 0 rgba(255,255,255,0.16)",
          }}
        >
          {initials(game.name)}
        </span>
      )}

      {children}
    </div>
  );
}

/* ============================================================
   Progressive jackpot drift

   Starts at the seeded base value so hydration matches, then
   climbs on rAF. State only updates when the whole-rupee figure
   actually changes, which keeps a grid of tickers cheap.
   ============================================================ */

export function useJackpotDrift(base: number, perSecond = 11): number {
  const reduced = usePrefersReducedMotion();
  // Tracking the offset rather than the absolute figure keeps `base` a pure
  // input: no effect has to reset state when the prop changes.
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    if (reduced || base <= 0) return;
    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (start === 0) start = t;
      const next = ((t - start) / 1000) * perSecond;
      setDrift((prev) => (Math.floor(base + next) !== Math.floor(base + prev) ? next : prev));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [base, perSecond, reduced]);

  return base + drift;
}

/* ============================================================
   Cards
   ============================================================ */

function ProviderChip({ provider }: { provider: string }) {
  return (
    <span
      title={provider}
      className="glass-soft rounded-md px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.14em] text-white/80"
    >
      {initials(provider)}
    </span>
  );
}

function PlayOverlay({ label = "Play" }: { label?: string }) {
  return (
    // pointer-events-none: on touch the tap must reach the card link underneath.
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center bg-obsidian-950/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-300",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
      )}
    >
      <span className="flex items-center gap-1.5 rounded-full bg-linear-to-br from-ember-400 to-ember-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_-8px_var(--color-ember-500)]">
        <svg viewBox="0 0 12 12" className="size-2.5" fill="currentColor">
          <path d="M3 1.6v8.8l7-4.4z" />
        </svg>
        {label}
      </span>
    </span>
  );
}

const CARD_TITLE = {
  sm: "text-[0.6875rem]",
  md: "text-xs sm:text-[0.8125rem]",
  lg: "text-sm sm:text-base",
} as const;

/**
 * Standard 4:5 lobby tile. Width comes from the parent (grid column or
 * rail item) so the same card works in every layout.
 */
export function GameCard({ game, size = "md" }: { game: CasinoGame; size?: "sm" | "md" | "lg" }) {
  const jackpot = useJackpotDrift(game.jackpot ?? 0);

  return (
    <Link
      href={`/casino/${game.slug}`}
      className="group block rounded-2xl focus-visible:outline-offset-4"
    >
      <GameArt
        game={game}
        monogram={size === "sm" ? "sm" : "md"}
        className={cn(
          "aspect-4/5 rounded-2xl border border-white/10 transition-all duration-300 ease-out",
          "group-hover:-translate-y-1 group-hover:border-gold-400/50",
          "group-hover:shadow-[0_22px_44px_-20px_var(--color-ember-700)]",
        )}
      >
        {/* Bottom scrim keeps the chips legible over any hue */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-obsidian-950/85 to-transparent"
        />

        <span className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1">
          <span className="flex flex-wrap gap-1">
            {game.isNew && <Badge tone="gold">New</Badge>}
            {game.isHot && <Badge tone="ember">Hot</Badge>}
          </span>
          <ProviderChip provider={game.provider} />
        </span>

        <span className="absolute inset-x-1.5 bottom-1.5 flex items-end justify-between gap-1">
          {size !== "sm" && (
            <span className="glass-soft rounded-md px-1.5 py-0.5 text-[0.5625rem] font-medium text-white/70">
              RTP <span className="tnum text-white/90">{game.rtp.toFixed(1)}%</span>
            </span>
          )}
          {game.jackpot !== undefined && (
            <span className="ml-auto rounded-md border border-gold-400/35 bg-obsidian-950/70 px-1.5 py-0.5 text-[0.5625rem] font-bold text-gold-200 tnum">
              {CURRENCY}
              {formatCompact(jackpot)}
            </span>
          )}
        </span>

        <PlayOverlay />
      </GameArt>

      <div className="mt-2 px-0.5">
        <p className={cn("truncate font-medium text-white/90", CARD_TITLE[size])}>{game.name}</p>
        <p className="truncate text-[0.625rem] text-white/40">{game.provider}</p>
      </div>
    </Link>
  );
}

/**
 * Wide 16:9 variant for live-dealer tables — the extra width is where
 * the dealer name and seat count live.
 */
export function LiveTableCard({ game }: { game: CasinoGame }) {
  return (
    <Link
      href={`/casino/${game.slug}`}
      className="group block rounded-2xl focus-visible:outline-offset-4"
    >
      <GameArt
        game={game}
        monogram="md"
        className={cn(
          "aspect-video rounded-2xl border border-white/10 transition-all duration-300 ease-out",
          "group-hover:-translate-y-1 group-hover:border-gold-400/50",
          "group-hover:shadow-[0_22px_44px_-20px_var(--color-ember-700)]",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-obsidian-950/92 via-obsidian-950/25 to-transparent"
        />

        <span className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-live/35 bg-obsidian-950/70 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-[#ff8a84]">
            <LivePip />
            Live now
          </span>
          <ProviderChip provider={game.provider} />
        </span>

        <span className="absolute inset-x-2.5 bottom-2.5 block">
          <span className="block truncate font-display text-sm font-semibold text-white sm:text-base">
            {game.name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.625rem] text-white/55">
            {game.dealer && (
              <span className="truncate">
                Dealer <span className="text-white/85">{game.dealer}</span>
              </span>
            )}
            {game.tableSeats !== undefined && (
              <span>
                <span className="tnum text-white/85">{game.tableSeats}</span> seats
              </span>
            )}
            <span>
              RTP <span className="tnum text-white/85">{game.rtp.toFixed(1)}%</span>
            </span>
            <span>
              Min <span className="tnum text-white/85">
                {CURRENCY}
                {formatCompact(game.minBet)}
              </span>
            </span>
          </span>
        </span>

        <PlayOverlay label="Join table" />
      </GameArt>
    </Link>
  );
}

/* ============================================================
   Rail
   ============================================================ */

/** Horizontally scrolling row of tiles. Renders nothing when empty. */
export function GameRail({
  title,
  games,
  href,
  size = "md",
  subtitle,
  icon,
}: {
  title: string;
  games: CasinoGame[];
  href?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  if (games.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={
          href ? (
            <Link
              href={href}
              className="rounded-lg px-1 text-xs font-medium text-gold-300 transition-colors hover:text-gold-100"
            >
              See all
              <span className="sr-only"> {title}</span>
            </Link>
          ) : undefined
        }
      />
      <Rail label={title}>
        {games.map((game) => (
          <div
            key={game.id}
            className="w-[8.5rem] shrink-0 snap-start sm:w-[9.5rem] lg:w-[10.5rem]"
          >
            <GameCard game={game} size={size} />
          </div>
        ))}
      </Rail>
    </Section>
  );
}
