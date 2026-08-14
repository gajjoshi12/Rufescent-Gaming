"use client";

import { cn, formatCompact } from "@/lib/format";
import { useOddsFormat } from "@/store/odds-format";
import { useRunnerPrice } from "@/store/live-odds";
import type { BetSide } from "@/lib/types";

/**
 * A single price cell.
 *
 * Back cells are blue and Lay cells are pink — the convention every
 * exchange punter already reads without a legend. Fixed-odds cells use
 * the house ember instead, so the two products stay visually distinct.
 */
export function OddsButton({
  runnerId,
  basePrice,
  size,
  side,
  selected,
  disabled,
  live,
  depth = 0,
  onSelect,
  className,
  showSize = true,
  srLabel,
  children,
}: {
  runnerId: string;
  basePrice: number;
  /** Liquidity available at this price. Omitted for fixed odds. */
  size?: number;
  side: BetSide | "fixed";
  selected?: boolean;
  disabled?: boolean;
  /** Live markets tick; pre-match prices sit still. */
  live?: boolean;
  /** 0 is the best price; 1 and 2 are the second and third rungs. */
  depth?: number;
  onSelect?: (price: number) => void;
  className?: string;
  showSize?: boolean;
  srLabel: string;
  /** Optional leading content, e.g. the runner name inside a wide cell. */
  children?: React.ReactNode;
}) {
  const { render } = useOddsFormat();
  const { price, dir, seq } = useRunnerPrice(runnerId, basePrice, Boolean(live));

  const tone =
    side === "back"
      ? "bg-back-900/55 border-back-500/25 text-back-100 hover:bg-back-700/55 hover:border-back-300/45"
      : side === "lay"
        ? "bg-lay-900/55 border-lay-500/25 text-lay-100 hover:bg-lay-700/55 hover:border-lay-300/45"
        : "bg-obsidian-800/80 border-white/10 text-white hover:border-gold-400/40 hover:bg-obsidian-700/80";

  const selectedTone =
    side === "back"
      ? "border-back-300 bg-back-700 text-white shadow-[0_0_0_1px_var(--color-back-300),0_8px_20px_-10px_var(--color-back-500)]"
      : side === "lay"
        ? "border-lay-300 bg-lay-700 text-white shadow-[0_0_0_1px_var(--color-lay-300),0_8px_20px_-10px_var(--color-lay-500)]"
        : "border-gold-300 bg-linear-to-br from-ember-500 to-ember-700 text-white shadow-[0_0_0_1px_var(--color-gold-300)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(price)}
      aria-pressed={selected}
      aria-label={srLabel}
      className={cn(
        "group relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border",
        "px-1.5 py-1.5 transition-all duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-35",
        "active:scale-[0.96]",
        depth > 0 && "opacity-55 hover:opacity-90",
        selected ? selectedTone : tone,
        className,
      )}
    >
      {/* Price-move flash. Keyed on `seq` so each move replays the animation. */}
      {dir && (
        <span
          key={seq}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0",
            dir === "up" ? "animate-odds-up" : "animate-odds-down",
          )}
        />
      )}

      {children}

      <span className="relative flex items-center gap-0.5 text-[0.8125rem] font-semibold leading-none tnum">
        {render(price)}
        {dir && (
          <span
            key={`arrow-${seq}`}
            aria-hidden="true"
            className={cn(
              "text-[0.5rem] leading-none",
              dir === "up" ? "text-win" : "text-loss",
            )}
          >
            {dir === "up" ? "▲" : "▼"}
          </span>
        )}
      </span>

      {showSize && size !== undefined && (
        <span className="relative mt-0.5 text-[0.5625rem] leading-none opacity-55 tnum">
          {formatCompact(size)}
        </span>
      )}
    </button>
  );
}

/** Column captions above a back/lay grid. */
export function BackLayHeader({ depth }: { depth: 1 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-1 text-[0.5625rem] font-semibold uppercase tracking-wider",
        depth === 1 ? "grid-cols-2" : "grid-cols-6",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "rounded py-0.5 text-center text-back-300",
          depth === 1 ? "" : "col-span-3 bg-back-900/40",
        )}
      >
        Back
      </span>
      <span
        className={cn(
          "rounded py-0.5 text-center text-lay-300",
          depth === 1 ? "" : "col-span-3 bg-lay-900/40",
        )}
      >
        Lay
      </span>
    </div>
  );
}

/** Suspended overlay drawn across a market that is temporarily closed. */
export function SuspendedOverlay({ label = "Suspended" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-obsidian-950/72 backdrop-blur-[2px]">
      <span className="flex items-center gap-1.5 rounded-full border border-loss/35 bg-loss/12 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-loss">
        <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4.2 4.2l7.6 7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {label}
      </span>
    </div>
  );
}
