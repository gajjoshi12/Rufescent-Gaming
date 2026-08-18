"use client";

import { useState } from "react";
import { cn, formatCompact, impliedProbability } from "@/lib/format";
import type { Market, Match, Runner } from "@/lib/types";
import { useBetSlip } from "@/store/bet-slip";
import { useOddsFormat } from "@/store/odds-format";
import { Badge } from "@/components/ui/primitives";
import { BackLayHeader, OddsButton, SuspendedOverlay } from "./OddsButton";

export type BoardMode = "exchange" | "fixed";

/**
 * Renders one market as either an exchange ladder (back/lay, with depth
 * on wider screens) or a fixed-odds row. The mode is lifted to the page
 * so a single toggle switches every market at once.
 */
export function MarketBoard({
  market,
  match,
  mode,
  defaultOpen = true,
}: {
  market: Market;
  match: Match;
  mode: BoardMode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { toggle, has } = useBetSlip();
  const matchLabel = `${match.home.short} v ${match.away.short}`;

  function select(runner: Runner, side: "back" | "lay", price: number) {
    toggle({
      matchId: match.id,
      marketId: market.id,
      runnerId: runner.id,
      matchLabel,
      marketLabel: market.name,
      runnerLabel: runner.name,
      side,
      odds: price,
      inPlay: market.inPlay,
    });
  }

  return (
    <section
      className="glass overflow-hidden rounded-2xl"
      aria-label={`${market.name} market`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/3"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{market.name}</span>
          {market.inPlay && <Badge tone="live">In-play</Badge>}
          {market.cashOutEligible && <Badge tone="gold">Cash out</Badge>}
        </span>
        <span className="flex shrink-0 items-center gap-2.5 text-[0.6875rem] text-white/35">
          <span className="hidden tnum sm:inline">
            Matched AED {formatCompact(market.matched)}
          </span>
          <span className="tnum">{market.margin}%</span>
          <svg
            viewBox="0 0 16 16"
            className={cn("size-3.5 transition-transform duration-250", open && "rotate-180")}
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="relative border-t border-white/6 px-3 pb-3 pt-2.5">
          {market.suspended && <SuspendedOverlay />}

          {mode === "exchange" ? (
            <ExchangeGrid market={market} onSelect={select} isSelected={has} />
          ) : (
            <FixedGrid market={market} onSelect={select} isSelected={has} />
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   Exchange layout
   ============================================================ */

function ExchangeGrid({
  market,
  onSelect,
  isSelected,
}: {
  market: Market;
  onSelect: (runner: Runner, side: "back" | "lay", price: number) => void;
  isSelected: (marketId: string, runnerId: string, side: "back" | "lay") => boolean;
}) {
  return (
    <div>
      {/* Column captions: one rung on mobile, three from sm up */}
      <div className="mb-1.5 flex items-center gap-2 pl-1">
        <span className="flex-1" />
        <div className="w-[8.5rem] sm:hidden">
          <BackLayHeader depth={1} />
        </div>
        <div className="hidden w-[23rem] sm:block">
          <BackLayHeader depth={3} />
        </div>
      </div>

      <ul className="space-y-1.5">
        {market.runners.map((runner) => (
          <li key={runner.id} className="flex items-center gap-2">
            <RunnerLabel runner={runner} />

            {/* Mobile: best back + best lay only */}
            <div className="grid w-[8.5rem] shrink-0 grid-cols-2 gap-1 sm:hidden">
              <OddsButton
                runnerId={runner.id}
                basePrice={runner.back[0].price}
                size={runner.back[0].size}
                side="back"
                live={market.inPlay}
                selected={isSelected(market.id, runner.id, "back")}
                disabled={market.suspended}
                onSelect={(price) => onSelect(runner, "back", price)}
                srLabel={`Back ${runner.name} at ${runner.back[0].price}`}
                className="h-11"
              />
              <OddsButton
                runnerId={runner.id}
                basePrice={runner.lay[0].price}
                size={runner.lay[0].size}
                side="lay"
                live={market.inPlay}
                selected={isSelected(market.id, runner.id, "lay")}
                disabled={market.suspended}
                onSelect={(price) => onSelect(runner, "lay", price)}
                srLabel={`Lay ${runner.name} at ${runner.lay[0].price}`}
                className="h-11"
              />
            </div>

            {/* sm+: three rungs of depth each side, best price innermost */}
            <div className="hidden w-[23rem] shrink-0 grid-cols-6 gap-1 sm:grid">
              {[2, 1, 0].map((depth) => (
                <OddsButton
                  key={`back-${depth}`}
                  runnerId={runner.id}
                  basePrice={runner.back[depth].price}
                  size={runner.back[depth].size}
                  side="back"
                  depth={depth}
                  live={market.inPlay}
                  selected={depth === 0 && isSelected(market.id, runner.id, "back")}
                  disabled={market.suspended}
                  onSelect={(price) => onSelect(runner, "back", price)}
                  srLabel={`Back ${runner.name} at ${runner.back[depth].price}`}
                  className="h-11"
                />
              ))}
              {[0, 1, 2].map((depth) => (
                <OddsButton
                  key={`lay-${depth}`}
                  runnerId={runner.id}
                  basePrice={runner.lay[depth].price}
                  size={runner.lay[depth].size}
                  side="lay"
                  depth={depth}
                  live={market.inPlay}
                  selected={depth === 0 && isSelected(market.id, runner.id, "lay")}
                  disabled={market.suspended}
                  onSelect={(price) => onSelect(runner, "lay", price)}
                  srLabel={`Lay ${runner.name} at ${runner.lay[depth].price}`}
                  className="h-11"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Fixed-odds layout
   ============================================================ */

function FixedGrid({
  market,
  onSelect,
  isSelected,
}: {
  market: Market;
  onSelect: (runner: Runner, side: "back" | "lay", price: number) => void;
  isSelected: (marketId: string, runnerId: string, side: "back" | "lay") => boolean;
}) {
  const compact = market.runners.length > 4;

  return (
    <ul className={cn(compact ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3" : "space-y-1.5")}>
      {market.runners.map((runner) => (
        <li
          key={runner.id}
          className={cn(compact ? "" : "flex items-center gap-2")}
        >
          {!compact && <RunnerLabel runner={runner} />}
          <OddsButton
            runnerId={runner.id}
            basePrice={runner.fixed}
            side="fixed"
            live={market.inPlay}
            showSize={false}
            selected={isSelected(market.id, runner.id, "back")}
            disabled={market.suspended}
            onSelect={(price) => onSelect(runner, "back", price)}
            srLabel={`Back ${runner.name} at ${runner.fixed}`}
            className={cn(
              compact
                ? "h-14 w-full flex-row justify-between gap-2 px-3"
                : "h-11 w-20 shrink-0",
            )}
          >
            {compact && (
              <span className="truncate text-left text-[0.6875rem] font-medium opacity-70">
                {runner.name}
              </span>
            )}
          </OddsButton>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   Shared
   ============================================================ */

function RunnerLabel({ runner }: { runner: Runner }) {
  const { format } = useOddsFormat();
  const probability = impliedProbability(runner.fixed);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-medium text-white/90">{runner.name}</p>
        {format === "decimal" && (
          <p className="text-[0.625rem] text-white/30 tnum">{probability.toFixed(1)}% implied</p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact three-way price strip used on match list rows and coupon cards,
 * where there is no room for a full board.
 */
export function CouponPrices({
  market,
  match,
  mode,
  fill,
}: {
  market: Market;
  match: Match;
  mode: BoardMode;
  /** Stretch the cells to the container instead of using a fixed tap width. */
  fill?: boolean;
}) {
  const { toggle, has } = useBetSlip();
  const matchLabel = `${match.home.short} v ${match.away.short}`;
  const runners = market.runners.slice(0, 3);

  return (
    <div
      className={cn(
        "grid gap-1",
        fill ? "w-full" : "shrink-0",
        runners.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {runners.map((runner) => {
        const price = mode === "exchange" ? runner.back[0].price : runner.fixed;
        return (
          <OddsButton
            key={runner.id}
            runnerId={runner.id}
            basePrice={price}
            size={mode === "exchange" ? runner.back[0].size : undefined}
            showSize={mode === "exchange"}
            side={mode === "exchange" ? "back" : "fixed"}
            live={market.inPlay}
            selected={has(market.id, runner.id, "back")}
            disabled={market.suspended}
            onSelect={(selectedPrice) =>
              toggle({
                matchId: match.id,
                marketId: market.id,
                runnerId: runner.id,
                matchLabel,
                marketLabel: market.name,
                runnerLabel: runner.name,
                side: "back",
                odds: selectedPrice,
                inPlay: market.inPlay,
              })
            }
            srLabel={`Back ${runner.name} at ${price} in ${market.name}`}
            className={cn("h-12", fill ? "w-full" : "w-14 sm:w-16")}
          />
        );
      })}
    </div>
  );
}
