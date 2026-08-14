"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Promotion } from "@/lib/types";
import { cn } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Badge } from "@/components/ui/primitives";

const AUTO_ADVANCE_MS = 6_000;
/** Below this horizontal travel a pointer gesture is treated as a tap, not a swipe. */
const SWIPE_THRESHOLD_PX = 44;

/* ============================================================
   Generated artwork

   There is no promo imagery in this build, so each banner's art is
   composed from the promotion's `hues` pair: a layered gradient
   ground, two blurred orbs, a diagonal light sweep and a geometric
   SVG motif. Deriving it from the data keeps every banner distinct
   and stable across renders.
   ============================================================ */

function PromoArt({ hues }: { hues: [number, number] }) {
  const [from, to] = hues;
  // Shortest arc between the two hues, so the mid-tone never detours
  // through the opposite side of the wheel.
  const mid = (from + Math.round((((to - from + 540) % 360) - 180) / 2) + 360) % 360;
  const uid = useId().replace(/:/g, "");

  const ground = [
    `radial-gradient(78% 120% at 84% 6%, hsl(${to} 92% 56% / 0.55), transparent 62%)`,
    `radial-gradient(70% 110% at 4% 96%, hsl(${from} 94% 48% / 0.5), transparent 64%)`,
    `linear-gradient(128deg, hsl(${from} 74% 26%) 0%, hsl(${mid} 62% 17%) 48%, hsl(${to} 58% 10%) 100%)`,
  ].join(", ");

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ backgroundImage: ground }} />

      {/* Soft blur orbs — depth without imagery */}
      <div
        className="absolute -right-16 -top-20 size-64 rounded-full opacity-45 blur-3xl sm:size-80"
        style={{ background: `hsl(${to} 95% 60%)` }}
      />
      <div
        className="absolute -bottom-24 left-1/4 size-56 rounded-full opacity-30 blur-3xl sm:size-72"
        style={{ background: `hsl(${from} 92% 52%)` }}
      />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${uid}-sweep`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <pattern
            id={`${uid}-hatch`}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(38)"
          >
            <line x1="0" y1="0" x2="0" y2="28" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="1200" height="400" fill={`url(#${uid}-hatch)`} />

        {/* Diagonal light sweep */}
        <path d="M-260 460 L 380 -80 L 610 -80 L -30 460 Z" fill={`url(#${uid}-sweep)`} />

        {/* Concentric rings anchored off the top-right corner */}
        <g fill="none" stroke="#ffffff" strokeOpacity="0.11" strokeWidth="1.5">
          <circle cx="1030" cy="70" r="110" />
          <circle cx="1030" cy="70" r="180" />
          <circle cx="1030" cy="70" r="255" />
          <circle cx="1030" cy="70" r="335" />
        </g>
        <circle
          cx="1030"
          cy="70"
          r="215"
          fill="none"
          stroke="#f5b418"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="3 12"
        />
        <path
          d="M0 400 L 260 168 L 430 400 Z"
          fill="#ffffff"
          fillOpacity="0.04"
        />
      </svg>

      {/* Legibility scrim: heavier at the bottom on mobile, from the left on wide screens */}
      <div className="absolute inset-0 bg-linear-to-t from-obsidian-950/92 via-obsidian-950/45 to-obsidian-950/10" />
      <div className="absolute inset-0 bg-linear-to-r from-obsidian-950/85 via-obsidian-950/25 to-transparent" />
    </div>
  );
}

/* ============================================================
   Carousel
   ============================================================ */

export function PromoCarousel({ promotions }: { promotions: Promotion[] }) {
  const count = promotions.length;
  const [rawIndex, setIndex] = useState(0);
  // Clamped on read rather than corrected in an effect, so the list shrinking
  // underneath us can never render an out-of-range slide.
  const index = count > 0 ? rawIndex % count : 0;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const gestureStart = useRef<{ x: number; y: number } | null>(null);

  const paused = hovered || focused || reduced;
  const autoPlaying = count > 1 && !paused;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!autoPlaying) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [autoPlaying, count]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gestureStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = gestureStart.current;
    gestureStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Ignore mostly-vertical drags so page scrolling still works.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    go(index + (dx < 0 ? 1 : -1));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  if (count === 0) return null;

  const current = promotions[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      className="-mx-3 sm:mx-0"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        gestureStart.current = null;
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => {
          gestureStart.current = null;
        }}
        className={cn(
          "relative aspect-16/9 w-full touch-pan-y overflow-hidden sm:aspect-21/7",
          "sm:rounded-3xl sm:ring-1 sm:ring-inset sm:ring-gold-400/25",
          "shadow-[0_30px_60px_-40px_var(--color-ember-900)]",
        )}
      >
        <div
          className={cn(
            "flex h-full w-full",
            !reduced && "transition-transform duration-700 ease-out-expo",
          )}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {promotions.map((promo, i) => {
            const active = i === index;
            return (
              <div
                key={promo.id}
                // `inert` keeps off-screen CTAs out of the tab order without
                // the aria-hidden-on-focusable-content violation.
                inert={!active}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                className="relative h-full w-full shrink-0"
              >
                <PromoArt hues={promo.hues} />

                <div className="relative flex h-full flex-col justify-end gap-2 p-4 sm:justify-center sm:p-8 lg:p-10">
                  <div className="max-w-xl">
                    <Badge tone="gold">{promo.badge}</Badge>

                    <h3 className="mt-2 text-lg font-semibold leading-tight text-white sm:text-2xl lg:text-3xl">
                      {promo.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:mt-2 sm:line-clamp-none sm:text-sm">
                      {promo.subtitle}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-4">
                      <Link
                        href={promo.href}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold sm:h-11 sm:px-5 sm:text-sm",
                          "bg-linear-to-br from-gold-200 to-gold-500 text-obsidian-950",
                          "shadow-[0_8px_24px_-10px_var(--color-gold-400)] transition-all duration-200",
                          "hover:from-gold-100 hover:to-gold-400 active:scale-[0.975]",
                        )}
                      >
                        {promo.cta}
                      </Link>
                    </div>

                    <p className="mt-2.5 max-w-lg text-[0.625rem] leading-relaxed text-white/40 sm:mt-3 sm:text-[0.6875rem]">
                      {promo.terms}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots sit above the slide track and stay reachable by keyboard. */}
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5 sm:bottom-4">
            {promotions.map((promo, i) => {
              const active = i === index;
              return (
                <button
                  key={promo.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show promotion ${i + 1} of ${count}: ${promo.title}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    active
                      ? "w-7 bg-linear-to-r from-gold-200 to-gold-400"
                      : "w-1.5 bg-white/35 hover:bg-white/60",
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      {/*
        Announcing every auto-advance would talk over the user, so the live
        region only speaks while rotation is paused — which includes any
        keyboard, pointer or reduced-motion interaction.
      */}
      <div className="sr-only" aria-live={autoPlaying ? "off" : "polite"} aria-atomic="true">
        {`Promotion ${index + 1} of ${count}: ${current.title}`}
      </div>
    </section>
  );
}
