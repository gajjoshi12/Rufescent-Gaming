"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/format";
import { liveMatches, primaryMarket } from "@/lib/mock/sports";
import { useLiveOdds } from "@/store/live-odds";
import { useOddsFormat } from "@/store/odds-format";
import { LivePip } from "@/components/ui/primitives";

interface TickerItem {
  matchId: string;
  sport: string;
  label: string;
  runner: string;
  runnerId: string;
  basePrice: number;
}

/**
 * Scrolling strip of live prices along the top of the app.
 * The marquee duplicates its content so the loop is seamless; the copy is
 * hidden from assistive tech and the whole strip pauses on hover/focus.
 */
export function LiveTicker({ className }: { className?: string }) {
  const { applyDrift, getDrift, watch, unwatch, streaming } = useLiveOdds();
  const { render } = useOddsFormat();

  const items = useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = [];
    for (const match of liveMatches()) {
      const market = primaryMarket(match.id);
      if (!market) continue;
      for (const runner of market.runners.slice(0, 2)) {
        out.push({
          matchId: match.id,
          sport: match.sport,
          label: `${match.home.short}–${match.away.short}`,
          runner: runner.name,
          runnerId: runner.id,
          basePrice: runner.back[0].price,
        });
      }
    }
    return out;
  }, []);

  // Registering in an effect rather than during render keeps the watch
  // counts accurate under StrictMode's double-invocation.
  useEffect(() => {
    for (const item of items) watch(item.runnerId);
    return () => {
      for (const item of items) unwatch(item.runnerId);
    };
  }, [items, watch, unwatch]);

  if (items.length === 0) return null;

  const row = (ariaHidden: boolean) => (
    <div
      className="flex shrink-0 items-center gap-5 pr-5"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item, i) => {
        const price = applyDrift(item.runnerId, item.basePrice);
        const { dir } = getDrift(item.runnerId);
        return (
          <Link
            key={`${item.runnerId}-${i}`}
            href={`/sports/${item.sport}/${item.matchId}`}
            className="flex shrink-0 items-center gap-1.5 text-[0.6875rem] transition-opacity hover:opacity-100"
            tabIndex={ariaHidden ? -1 : undefined}
          >
            <span className="font-medium text-white/40">{item.label}</span>
            <span className="max-w-24 truncate text-white/70">{item.runner}</span>
            <span
              className={cn(
                "font-semibold tnum",
                dir === "up" ? "text-win" : dir === "down" ? "text-loss" : "text-gold-300",
              )}
            >
              {render(price)}
              {dir && (
                <span className="ml-0.5 text-[0.5rem]" aria-hidden="true">
                  {dir === "up" ? "▲" : "▼"}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden border-y border-white/6 bg-obsidian-900/60 py-1.5 backdrop-blur",
        className,
      )}
      aria-label="Live odds ticker"
    >
      <span className="z-10 flex shrink-0 items-center gap-1.5 border-r border-white/8 bg-obsidian-900/90 pl-3 pr-3 text-[0.625rem] font-semibold uppercase tracking-wider text-[#ff8a84]">
        <LivePip />
        Live
      </span>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex animate-marquee",
            "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            !streaming && "[animation-play-state:paused]",
          )}
        >
          {row(false)}
          {row(true)}
        </div>
      </div>

      {/* Edge fades so items dissolve rather than clip */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-obsidian-900 to-transparent"
      />
    </div>
  );
}
