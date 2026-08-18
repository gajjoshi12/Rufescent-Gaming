"use client";

import { useMemo } from "react";
import type { Card, Seat, TableState } from "@/lib/poker/types";
import { cn, formatCompact, hueGradient } from "@/lib/format";
import { evaluate } from "@/lib/poker/engine";
import { CommunityCards, HoleCards } from "./PlayingCard";
import { ChipStack, StackBadge } from "./Chips";

/* ============================================================
   Seat geometry

   Seats ride an ellipse with the hero pinned to bottom-centre and
   the rest walking clockwise, so seat 1 is always to the hero's
   immediate left exactly as it would be at a live table.
   ============================================================ */

/**
 * Positions are emitted as calc() against `--seat-rx` / `--seat-ry`, which
 * the table narrows at mobile widths. A fixed percentage would push the
 * outermost pods past the container edge on a phone.
 */
function seatOffsets(index: number, total: number): { cos: number; sin: number } {
  const angle = Math.PI / 2 + (index / total) * Math.PI * 2;
  return { cos: Math.cos(angle), sin: Math.sin(angle) };
}

function ellipseStyle(
  index: number,
  total: number,
  rx: string,
  ry: string,
): React.CSSProperties {
  const { cos, sin } = seatOffsets(index, total);
  return {
    left: `calc(50% + (${rx} * ${cos.toFixed(4)}))`,
    top: `calc(50% + (${ry} * ${sin.toFixed(4)}))`,
  };
}

/* ============================================================
   Table
   ============================================================ */

export function PokerTable({
  state,
  potTotal,
  dealing,
  showdownVisible,
}: {
  state: TableState;
  potTotal: number;
  dealing: boolean;
  /** Reveal every live seat's cards, as at a real showdown. */
  showdownVisible: boolean;
}) {
  const seatCount = state.seats.length;

  // Chips still in front of players belong to the current street, not the
  // pot — showing both would count the same money twice. They sweep in when
  // the street closes and `committed` resets.
  const onStreet = state.seats.reduce((sum, s) => sum + s.committed, 0);
  const collectedPot = Math.max(0, potTotal - onStreet);
  const hasAllIn = state.seats.some((s) => s.status === "all-in");

  // The exact five cards making the winning hand, for the gold ring.
  const winningCards = useMemo(() => {
    if (state.street !== "showdown") return undefined;
    const winner = state.seats.find((s) => s.isWinner && s.holeCards.length === 2);
    if (!winner || state.board.length < 5) return undefined;
    const best = evaluate([...winner.holeCards, ...state.board]);
    return new Set(best.best.map((c) => `${c.rank}${c.suit}`));
  }, [state.street, state.seats, state.board]);

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Aspect box keeps the oval proportional at every width. The seat
          radii tighten on small screens so no pod clips the viewport. */}
      <div
        className={cn(
          "relative aspect-[10/13] sm:aspect-[16/11]",
          "[--seat-rx:34%] [--seat-ry:41%]",
          "sm:[--seat-rx:45%] sm:[--seat-ry:43%]",
        )}
      >
        <TableFelt />

        {/* ---- Centre: pot, board, stage ---- */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 sm:gap-3">
          {collectedPot > 0 && (
            <div className="flex flex-col items-center gap-1">
              <ChipStack amount={collectedPot} size="sm" showAmount={false} />
              <span className="rounded-full border border-gold-400/30 bg-obsidian-950/75 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-gold-200 tnum backdrop-blur">
                Pot {collectedPot.toLocaleString("en-AE")}
              </span>
            </div>
          )}

          <CommunityCards board={state.board} winningCards={winningCards} />

          {/* Side pots only mean anything once someone is all-in for less. */}
          {hasAllIn && state.pots.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1">
              {state.pots.slice(1).map((pot, i) => (
                <span
                  key={i}
                  className="rounded-full bg-black/45 px-2 py-0.5 text-[0.5625rem] text-white/60 tnum"
                >
                  {pot.label} {formatCompact(pot.amount)}
                </span>
              ))}
            </div>
          )}

          <p
            aria-live="polite"
            className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-white/30"
          >
            {dealing
              ? "Dealing"
              : state.street === "showdown"
                ? "Showdown"
                : state.street}
          </p>
        </div>

        {/* ---- Seats ---- */}
        {state.seats.map((seat) => {
          return (
            <div
              key={seat.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={ellipseStyle(seat.index, seatCount, "var(--seat-rx)", "var(--seat-ry)")}
            >
              <SeatPod
                seat={seat}
                isToAct={state.toActSeatId === seat.id}
                isButton={state.buttonIndex === seat.index}
                bigBlind={state.bigBlind}
                dealt={!dealing}
                revealed={showdownVisible && state.street === "showdown"}
                winningCards={winningCards}
              />
            </div>
          );
        })}

        {/* ---- Bets on the felt ---- */}
        {state.seats.map((seat) => {
          if (seat.committed <= 0) return null;
          return (
            <div
              key={`bet-${seat.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 animate-chip-in transition-all duration-500 ease-out"
              // Bets sit between the seat and the pot.
              style={ellipseStyle(
                seat.index,
                seatCount,
                "calc(var(--seat-rx) * 0.58)",
                "calc(var(--seat-ry) * 0.55)",
              )}
            >
              <ChipStack amount={seat.committed} size="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Felt and rail
   ============================================================ */

function TableFelt() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {/* Outer rail — padded leather over a dark timber edge */}
      <div
        className="absolute inset-0 rounded-[50%] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)]"
        style={{
          background:
            "linear-gradient(170deg, #4a2b1c 0%, #2d1810 42%, #170c08 100%)",
        }}
      />
      <div
        className="absolute inset-0 rounded-[50%]"
        style={{
          boxShadow:
            "inset 0 2px 3px rgba(255,214,150,0.28), inset 0 -10px 22px rgba(0,0,0,0.75)",
        }}
      />

      {/* Gold trim between rail and felt */}
      <div
        className="absolute inset-[5.5%] rounded-[50%]"
        style={{
          background: "linear-gradient(150deg, #ffe08a, #ad7003 45%, #7d4f06)",
          boxShadow: "0 0 14px rgba(245,180,24,0.28)",
        }}
      />

      {/* Playing surface */}
      <div
        className="absolute inset-[6.5%] overflow-hidden rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 62% at 50% 38%, #6d1f24 0%, #4a1317 38%, #2c0b0e 72%, #1a0609 100%)",
        }}
      >
        {/* Cloth weave */}
        <div
          className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='90' height='90' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Overhead pot light */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 46% 40% at 50% 40%, rgba(255,225,180,0.16) 0%, transparent 68%)",
          }}
        />

        {/* Betting line */}
        <div className="absolute inset-[13%] rounded-[50%] border border-gold-400/12" />

        {/* House watermark */}
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-display text-5xl font-bold tracking-[0.3em] sm:text-7xl"
            style={{
              color: "rgba(255,224,138,0.045)",
              WebkitTextStrokeWidth: "1px",
              WebkitTextStrokeColor: "rgba(255,224,138,0.055)",
            }}
          >
            RG
          </span>
        </div>

        {/* Inner shadow so the felt sits below the rail */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{ boxShadow: "inset 0 6px 26px rgba(0,0,0,0.65)" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Seat
   ============================================================ */

const ACTION_TONE: Record<string, string> = {
  fold: "bg-obsidian-700 text-white/45",
  check: "bg-obsidian-600 text-white/80",
  call: "bg-back-700 text-back-100",
  bet: "bg-ember-600 text-white",
  raise: "bg-ember-600 text-white",
  "all-in": "bg-linear-to-r from-gold-500 to-ember-500 text-white",
  post: "bg-obsidian-700 text-white/55",
};

function SeatPod({
  seat,
  isToAct,
  isButton,
  bigBlind,
  dealt,
  revealed,
  winningCards,
}: {
  seat: Seat;
  isToAct: boolean;
  isButton: boolean;
  bigBlind: number;
  dealt: boolean;
  revealed: boolean;
  winningCards?: Set<string>;
}) {
  const player = seat.player;

  if (!player) {
    return (
      <div className="grid h-14 w-24 place-items-center rounded-xl border border-dashed border-white/10 bg-black/25 text-[0.5625rem] uppercase tracking-widest text-white/25">
        Empty
      </div>
    );
  }

  const folded = seat.status === "folded";
  const hero = Boolean(player.isHero);
  const showCards = hero || revealed;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Cards sit above the plate for opponents, below for the hero.
          A folded hand is mucked outright, as it would be at a live table. */}
      {!hero && seat.holeCards.length > 0 && !folded && (
        <HoleCards
          cards={seat.holeCards}
          size="xs"
          faceDown={!showCards}
          dealt={dealt}
          winningCards={winningCards}
          className="mb-0.5"
        />
      )}

      <div
        className={cn(
          "relative flex items-center rounded-xl border backdrop-blur-sm transition-all duration-300",
          // Compact avatar-and-stack on a phone; full name plate from sm up.
          "w-14 flex-col gap-0.5 px-1 py-1",
          "sm:w-32 sm:flex-row sm:gap-2 sm:px-2 sm:py-1.5",
          folded
            ? "border-white/6 bg-obsidian-950/60 opacity-50"
            : "border-white/12 bg-obsidian-900/85",
          isToAct && "border-gold-300/70 shadow-[0_0_0_1px_var(--color-gold-400),0_0_24px_-6px_var(--color-gold-400)]",
          seat.isWinner && "border-win/60 shadow-[0_0_26px_-6px_var(--color-win)]",
        )}
      >
        {/* Avatar with the act-timer ring */}
        <div className="relative shrink-0">
          <div
            className="grid size-8 place-items-center rounded-full text-[0.625rem] font-bold text-white ring-1 ring-black/40"
            style={{ background: hueGradient(player.avatarHue) }}
          >
            {player.name.charAt(0)}
          </div>

          {isToAct && (
            <svg
              viewBox="0 0 36 36"
              className="absolute -inset-1 size-10 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="var(--color-gold-300)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="100.5"
                className="animate-act-timer"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0 text-center leading-tight sm:flex-1 sm:text-left">
          <p className="hidden truncate text-[0.625rem] font-medium text-white/85 sm:block">
            {hero ? "You" : player.name.split(" ")[0]}
          </p>
          <span className="text-[0.5625rem] font-semibold text-white tnum sm:hidden">
            {formatCompact(player.stack)}
          </span>
          <span className="hidden sm:inline">
            <StackBadge amount={player.stack} bigBlind={bigBlind} />
          </span>
        </div>

        {isButton && (
          <span
            className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-linear-to-br from-white to-[#cfc9bd] text-[0.5rem] font-bold text-obsidian-950 shadow-md ring-1 ring-black/40"
            title="Dealer button"
          >
            D
          </span>
        )}

        {/* Last action label */}
        {seat.lastAction && !folded && (
          <span
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-wider shadow",
              ACTION_TONE[seat.lastAction] ?? "bg-obsidian-700 text-white/70",
            )}
          >
            {seat.lastAction === "all-in" ? "All in" : seat.lastAction}
          </span>
        )}

        {folded && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-obsidian-700 px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-wider text-white/40">
            Fold
          </span>
        )}
      </div>

      {/* Hero cards read larger, below the plate. Kept visible when folded
          so you can still see what you let go. */}
      {hero && seat.holeCards.length > 0 && (
        <HoleCards
          cards={seat.holeCards}
          size="sm"
          dealt={dealt}
          winningCards={winningCards}
          className={cn("mt-0.5", folded && "opacity-35 saturate-0")}
        />
      )}

      {seat.handLabel && revealed && (
        <span className="rounded-full bg-obsidian-950/85 px-2 py-0.5 text-[0.5rem] font-semibold text-gold-200">
          {seat.handLabel}
        </span>
      )}
    </div>
  );
}

export { seatOffsets };
export type { Card };
