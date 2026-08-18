"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlotConfig, SpinOutcome, SymbolId } from "@/lib/slots/types";
import { evaluate, windowFor } from "@/lib/slots/engine";
import { cn, formatCompact } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Badge, Button } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { SymbolArt, SymbolTile } from "./SlotSymbol";

/* ============================================================
   Timing
   ============================================================ */

const SPIN_BASE_MS = 900;
/** Each reel stops this much later than the one before it. */
const REEL_STAGGER_MS = 190;
/** Filler symbols scrolled past before the result lands. */
const RUN_LENGTH = 14;

const STARTING_CREDITS = 10_000;

interface ReelRun {
  /** Filler symbols followed by the three that stop in view. */
  symbols: SymbolId[];
  /** True while the reel sits at its start position, before it launches. */
  armed: boolean;
  /** How long this reel takes to travel the run — later reels take longer. */
  durationMs: number;
}

export function SlotMachine({ config }: { config: SlotConfig }) {
  const reduced = usePrefersReducedMotion();

  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [coinIndex, setCoinIndex] = useState(2);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);
  const [runs, setRuns] = useState<ReelRun[]>(() => idleRuns(config));
  const [showWins, setShowWins] = useState(false);
  /** Cycles through winning lines; the shown line is derived from it. */
  const [lineCursor, setLineCursor] = useState(0);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [autoSpins, setAutoSpins] = useState(0);

  /* Free-spin round state */
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinTotal, setFreeSpinTotal] = useState(0);
  const [roundWin, setRoundWin] = useState(0);

  const spinCounter = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const coin = config.coinValues[coinIndex];
  const lineBet = coin;
  const totalBet = lineBet * config.paylines.length;
  const inFreeSpins = freeSpins > 0;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /* ============================================================
     Spin
     ============================================================ */

  const doSpin = useCallback(() => {
    if (spinning) return;
    if (!inFreeSpins && credits < totalBet) return;

    clearTimers();
    setShowWins(false);
    setLineCursor(0);
    setOutcome(null);
    setSpinning(true);

    if (inFreeSpins) {
      setFreeSpins((n) => n - 1);
    } else {
      setCredits((c) => c - totalBet);
      setRoundWin(0);
    }

    // Seeded per spin so a session is reproducible; a certified cabinet
    // would draw from a hardware RNG here instead.
    spinCounter.current += 1;
    const rng = makeRng(spinCounter.current * 2654435761);

    const stops = config.strips.map((strip) => Math.floor(rng() * strip.length));
    const grid = config.strips.map((strip, r) => windowFor(strip, stops[r], config.rows));
    const result = evaluate(
      config,
      grid,
      stops,
      lineBet,
      inFreeSpins ? config.freeSpinMultiplier : 1,
    );

    // Build each reel's scroll run: filler, then the three real symbols.
    // Each reel travels the whole run in one decelerating sweep, with later
    // reels taking longer — that stagger is what makes a cabinet feel alive.
    setRuns(
      config.strips.map((strip, reel) => ({
        symbols: [
          ...Array.from(
            { length: RUN_LENGTH },
            () => strip[Math.floor(rng() * strip.length)],
          ),
          ...grid[reel],
        ],
        armed: true,
        durationMs: reduced ? 90 : SPIN_BASE_MS + REEL_STAGGER_MS * reel,
      })),
    );

    const lastStopAt = reduced
      ? 120
      : SPIN_BASE_MS + REEL_STAGGER_MS * (config.reels - 1);

    timers.current.push(
      setTimeout(() => {
        setSpinning(false);
        setOutcome(result);

        if (result.totalWin > 0) {
          setCredits((c) => c + result.totalWin);
          setRoundWin((w) => w + result.totalWin);
          setShowWins(true);
        }

        if (result.freeSpinsAwarded > 0) {
          setFreeSpins((n) => n + result.freeSpinsAwarded);
          setFreeSpinTotal((n) => n + result.freeSpinsAwarded);
        }
      }, lastStopAt + 90),
    );
  }, [spinning, credits, totalBet, inFreeSpins, config, lineBet, reduced, clearTimers]);

  /* Release the reels one frame after they are armed, so the browser has a
     start position to animate away from. */
  useEffect(() => {
    if (!runs.some((r) => r.armed)) return;
    const frame = requestAnimationFrame(() => {
      setRuns((current) => current.map((run) => ({ ...run, armed: false })));
    });
    return () => cancelAnimationFrame(frame);
  }, [runs]);

  /* Cycle through winning lines so the player can see each one. */
  const activeLine =
    showWins && outcome && outcome.lines.length > 0
      ? outcome.lines[lineCursor % outcome.lines.length].lineIndex
      : null;

  useEffect(() => {
    if (!showWins || !outcome || outcome.lines.length < 2 || reduced) return;
    const id = setInterval(() => setLineCursor((c) => c + 1), 1300);
    return () => clearInterval(id);
  }, [showWins, outcome, reduced]);

  /* Auto-play and free spins both drive the reels on their own. */
  useEffect(() => {
    if (spinning) return;
    const wantsSpin = autoSpins > 0 || freeSpins > 0;
    if (!wantsSpin) return;

    const id = setTimeout(() => {
      // Autoplay stops itself when the credits run out.
      if (freeSpins === 0 && credits < totalBet) {
        setAutoSpins(0);
        return;
      }
      if (autoSpins > 0 && freeSpins === 0) setAutoSpins((n) => n - 1);
      doSpin();
    }, reduced ? 260 : 1500);
    return () => clearTimeout(id);
  }, [spinning, autoSpins, freeSpins, credits, totalBet, doSpin, reduced]);

  /* End of the free-spin round. */
  useEffect(() => {
    if (freeSpins !== 0 || freeSpinTotal === 0 || spinning) return;
    const id = setTimeout(() => setFreeSpinTotal(0), 3200);
    return () => clearTimeout(id);
  }, [freeSpins, freeSpinTotal, spinning]);

  const winningCells = useMemo(() => {
    if (!showWins || !outcome) return new Set<string>();
    const cells = new Set<string>();
    const lines =
      activeLine === null
        ? outcome.lines
        : outcome.lines.filter((l) => l.lineIndex === activeLine);
    for (const line of lines) {
      for (const p of line.positions) cells.add(`${p.reel}-${p.row}`);
    }
    return cells;
  }, [showWins, outcome, activeLine]);

  const canSpin = !spinning && (inFreeSpins || credits >= totalBet);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10"
      style={{ background: config.theme.backdrop }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full blur-[80px]"
        style={{ background: config.theme.glow }}
      />

      {/* ---------- Header ---------- */}
      <header className="relative flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
            {config.name}
          </h2>
          <p className="text-[0.6875rem] text-white/45">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone="ember">Demo · no real money</Badge>
          <button
            type="button"
            onClick={() => setPaytableOpen(true)}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-[0.6875rem] font-medium text-white/70 transition-colors hover:border-gold-400/40 hover:text-gold-200"
          >
            Paytable
          </button>
        </div>
      </header>

      {/* ---------- Free-spin banner ---------- */}
      {(inFreeSpins || freeSpinTotal > 0) && (
        <div className="relative mx-4 mt-3 rounded-xl border border-gold-400/40 bg-gold-500/12 px-3 py-2 text-center sm:mx-5">
          <p className="text-xs font-semibold text-gold-200">
            {inFreeSpins
              ? `Free spins — ${freeSpins} left · every win ×${config.freeSpinMultiplier}`
              : `Free spins complete — won ${formatCompact(roundWin)} credits`}
          </p>
        </div>
      )}

      {/* ---------- Reels ---------- */}
      <div className="relative px-3 py-4 sm:px-5">
        <div
          className={cn(
            "relative rounded-2xl border p-2 sm:p-3",
            "[--slot-cell:3.6rem] sm:[--slot-cell:4.6rem] lg:[--slot-cell:5.4rem]",
          )}
          style={{
            background: config.theme.rail,
            borderColor: "rgba(255,255,255,0.12)",
            boxShadow:
              "inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -14px 26px -14px rgba(0,0,0,0.9)",
          }}
        >
          <div className="flex gap-1.5 sm:gap-2">
            {runs.map((run, reel) => (
              <Reel
                key={reel}
                config={config}
                run={run}
                reelIndex={reel}
                reduced={reduced}
                winningCells={winningCells}
                showWins={showWins}
              />
            ))}
          </div>

          {/* Win overlay */}
          {showWins && outcome && outcome.totalWin > 0 && (
            <WinBanner outcome={outcome} totalBet={totalBet} accent={config.theme.accent} />
          )}
        </div>

        {/* Active payline caption */}
        <div className="mt-2 h-4 text-center">
          {showWins && outcome && activeLine !== null && (
            <ActiveLineCaption config={config} outcome={outcome} lineIndex={activeLine} />
          )}
        </div>
      </div>

      {/* ---------- Controls ---------- */}
      <div className="relative border-t border-white/10 bg-obsidian-950/55 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mb-2.5 grid grid-cols-3 gap-2 text-center">
          <Meter label="Credits" value={credits.toLocaleString("en-IN")} tone="gold" />
          <Meter label="Total bet" value={totalBet.toLocaleString("en-IN")} />
          <Meter
            label="Last win"
            value={outcome ? Math.round(outcome.totalWin).toLocaleString("en-IN") : "0"}
            tone={outcome && outcome.totalWin > 0 ? "win" : "neutral"}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Coin value */}
          <div className="flex items-center gap-1">
            <StepButton
              label="Decrease bet"
              disabled={coinIndex === 0 || spinning || inFreeSpins}
              onClick={() => setCoinIndex((i) => Math.max(0, i - 1))}
            >
              −
            </StepButton>
            <span className="w-12 text-center">
              <span className="block text-[0.5625rem] uppercase tracking-wider text-white/35">
                Coin
              </span>
              <span className="block text-sm font-semibold text-white tnum">{coin}</span>
            </span>
            <StepButton
              label="Increase bet"
              disabled={coinIndex === config.coinValues.length - 1 || spinning || inFreeSpins}
              onClick={() =>
                setCoinIndex((i) => Math.min(config.coinValues.length - 1, i + 1))
              }
            >
              +
            </StepButton>
          </div>

          {/* Spin */}
          <button
            type="button"
            onClick={doSpin}
            disabled={!canSpin}
            aria-label={inFreeSpins ? "Free spin" : `Spin for ${totalBet} credits`}
            className={cn(
              "relative grid h-14 flex-1 place-items-center rounded-xl font-display text-base font-bold uppercase tracking-widest",
              "transition-all duration-200 active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-40",
              "text-obsidian-950 shadow-[0_10px_28px_-12px_var(--tw-shadow-color)]",
            )}
            style={{
              background: `linear-gradient(160deg, ${config.theme.accent}, hsl(from ${config.theme.accent} h s calc(l * 0.6)))`,
            }}
          >
            {spinning ? "Spinning" : inFreeSpins ? `Free ${freeSpins}` : "Spin"}
          </button>

          {/* Auto */}
          <button
            type="button"
            onClick={() => setAutoSpins((n) => (n > 0 ? 0 : 10))}
            disabled={inFreeSpins}
            className={cn(
              "grid h-14 w-16 place-items-center rounded-xl border text-[0.6875rem] font-semibold transition-all",
              "disabled:pointer-events-none disabled:opacity-40",
              autoSpins > 0
                ? "border-ember-400 bg-ember-500/25 text-white"
                : "border-white/15 bg-white/6 text-white/70 hover:border-gold-400/35",
            )}
          >
            {autoSpins > 0 ? `Stop ${autoSpins}` : "Auto 10"}
          </button>
        </div>

        {credits < totalBet && !inFreeSpins && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-loss/10 px-3 py-2">
            <span className="text-[0.6875rem] text-loss">Out of demo credits.</span>
            <Button size="sm" variant="subtle" onClick={() => setCredits(STARTING_CREDITS)}>
              Reset to {formatCompact(STARTING_CREDITS)}
            </Button>
          </div>
        )}

        <p className="mt-2 text-center text-[0.625rem] text-white/25 tnum">
          RTP {config.rtp}% · {config.paylines.length} lines · {config.volatility} volatility ·
          demo credits only
        </p>
      </div>

      <PaytableSheet
        config={config}
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        lineBet={lineBet}
      />
    </div>
  );
}

/* ============================================================
   Reel
   ============================================================ */

function Reel({
  config,
  run,
  reelIndex,
  reduced,
  winningCells,
  showWins,
}: {
  config: SlotConfig;
  run: ReelRun;
  reelIndex: number;
  reduced: boolean;
  winningCells: Set<string>;
  showWins: boolean;
}) {
  const offset = run.symbols.length - config.rows;

  return (
    <div
      className="relative flex-1 overflow-hidden rounded-xl bg-black/35"
      style={{ height: `calc(var(--slot-cell) * ${config.rows})` }}
    >
      <div
        className="absolute inset-x-0 top-0 will-change-transform"
        style={{
          transform: run.armed
            ? "translateY(0)"
            : `translateY(calc(var(--slot-cell) * -${offset}))`,
          // Fast off the mark, long decelerate, tiny overshoot at the stop.
          transition: run.armed
            ? "none"
            : `transform ${run.durationMs}ms cubic-bezier(0.12, 0.58, 0.16, 1.02)`,
        }}
      >
        {run.symbols.map((id, i) => {
          const row = i - offset;
          const inWindow = row >= 0;
          const key = `${reelIndex}-${row}`;
          const isWinner = inWindow && winningCells.has(key);

          return (
            <div
              key={i}
              className="p-[3px]"
              style={{ height: "var(--slot-cell)" }}
            >
              <SymbolTile
                symbol={config.symbols[id]}
                highlighted={isWinner}
                dimmed={showWins && inWindow && winningCells.size > 0 && !isWinner}
              />
            </div>
          );
        })}
      </div>

      {/* Motion blur while the reel is running */}
      {!run.armed && run.durationMs > 0 && !reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 backdrop-blur-[2px]"
        />
      )}

      {/* Depth shading top and bottom, as on a physical reel */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

/* ============================================================
   Win presentation
   ============================================================ */

function WinBanner({
  outcome,
  totalBet,
  accent,
}: {
  outcome: SpinOutcome;
  totalBet: number;
  accent: string;
}) {
  const multiple = outcome.totalWin / totalBet;
  const big = multiple >= 15;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className={cn(
          "rounded-2xl border px-5 py-2.5 text-center backdrop-blur-sm",
          big ? "animate-big-win" : "animate-count-up",
        )}
        style={{
          borderColor: accent,
          background: "rgba(8,7,10,0.82)",
          boxShadow: `0 0 34px -6px ${accent}`,
        }}
      >
        {big && (
          <p className="font-display text-[0.625rem] font-bold uppercase tracking-[0.3em] text-gold-300">
            {multiple >= 50 ? "Mega win" : "Big win"}
          </p>
        )}
        <p
          className="font-display text-2xl font-bold tabular-nums sm:text-3xl"
          style={{ color: accent }}
        >
          +{Math.round(outcome.totalWin).toLocaleString("en-IN")}
        </p>
        <p className="text-[0.625rem] text-white/50 tnum">
          {multiple.toFixed(2)}× bet
          {outcome.freeSpinsAwarded > 0 && ` · ${outcome.freeSpinsAwarded} free spins`}
        </p>
      </div>
    </div>
  );
}

function ActiveLineCaption({
  config,
  outcome,
  lineIndex,
}: {
  config: SlotConfig;
  outcome: SpinOutcome;
  lineIndex: number;
}) {
  const line = outcome.lines.find((l) => l.lineIndex === lineIndex);
  if (!line) return null;
  const symbol = config.symbols[line.symbolId];

  return (
    <p className="text-[0.6875rem] text-white/55 tnum">
      {lineIndex === -1 ? "Scatter" : `Line ${lineIndex + 1}`} · {line.count}× {symbol.name} ·{" "}
      <span className="font-semibold text-gold-200">
        +{Math.round(line.amount).toLocaleString("en-IN")}
      </span>
    </p>
  );
}

/* ============================================================
   Chrome
   ============================================================ */

function Meter({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "gold" | "win";
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5">
      <p className="text-[0.5625rem] uppercase tracking-wider text-white/35">{label}</p>
      <p
        className={cn(
          "font-display text-sm font-semibold tnum",
          tone === "gold" ? "text-gold-200" : tone === "win" ? "text-win" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-white/15 bg-white/6 text-lg font-semibold text-white/80 transition-colors hover:border-gold-400/35 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/* ============================================================
   Paytable
   ============================================================ */

function PaytableSheet({
  config,
  open,
  onClose,
  lineBet,
}: {
  config: SlotConfig;
  open: boolean;
  onClose: () => void;
  lineBet: number;
}) {
  const ordered: SymbolId[] = [
    "wild", "scatter", "h1", "h2", "h3", "h4", "ace", "king", "queen", "jack", "ten",
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${config.name} paytable`}
      description={`Wins shown for a ${lineBet}-credit line bet`}
      size="lg"
    >
      <div className="space-y-4">
        <ul className="space-y-1.5">
          {ordered.map((id) => {
            const symbol = config.symbols[id];
            if (!symbol) return null;
            const isScatter = Boolean(symbol.isScatter);

            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-2.5"
              >
                <div className="size-11 shrink-0">
                  <SymbolTile symbol={symbol} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/90">{symbol.name}</p>
                  <p className="text-[0.625rem] text-white/40">
                    {symbol.isWild
                      ? "Substitutes for all symbols except the scatter"
                      : isScatter
                        ? "Pays anywhere on the reels"
                        : "Pays left to right on a line"}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5 text-right">
                  {([3, 4, 5] as const).map((count) => {
                    const value = isScatter
                      ? (config.scatterPays[count] ?? 0) * lineBet * config.paylines.length
                      : symbol.pays[count] * lineBet;
                    if (value <= 0) return null;
                    return (
                      <span key={count} className="w-14">
                        <span className="block text-[0.5625rem] text-white/35">{count}×</span>
                        <span className="block text-[0.6875rem] font-semibold text-gold-200 tnum">
                          {formatCompact(value)}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="rounded-xl border border-gold-400/25 bg-gold-700/10 p-3.5">
          <h3 className="mb-1.5 text-xs font-semibold text-gold-200">Free spins</h3>
          <p className="text-[0.6875rem] leading-relaxed text-white/55">
            Land 3, 4 or 5 {config.symbols.scatter.name.toLowerCase()} symbols anywhere to win{" "}
            {config.freeSpins[3]}, {config.freeSpins[4]} or {config.freeSpins[5]} free spins. Every
            win during the round is multiplied by {config.freeSpinMultiplier}, and scatters retrigger.
          </p>
        </div>

        <PaylineMap config={config} />

        <p className="text-[0.625rem] leading-relaxed text-white/30">
          Return to player {config.rtp}%, measured over two million simulated spins. Wins pay left to
          right from reel one, on the highest combination per line only. This is a demonstration
          build with no real money involved.
        </p>
      </div>
    </Sheet>
  );
}

function PaylineMap({ config }: { config: SlotConfig }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-white/80">
        {config.paylines.length} paylines
      </h3>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {config.paylines.map((line, i) => (
          <div key={i} className="rounded-lg border border-white/8 bg-black/25 p-1">
            <p className="mb-0.5 text-center text-[0.5rem] text-white/30 tnum">{i + 1}</p>
            <svg viewBox="0 0 50 30" className="w-full" aria-hidden="true">
              {[0, 1, 2].map((row) =>
                [0, 1, 2, 3, 4].map((reel) => (
                  <rect
                    key={`${reel}-${row}`}
                    x={reel * 10 + 1}
                    y={row * 10 + 1}
                    width="8"
                    height="8"
                    rx="1.5"
                    fill={line[reel] === row ? "var(--color-gold-400)" : "rgba(255,255,255,0.08)"}
                  />
                )),
              )}
              <polyline
                points={line.map((row, reel) => `${reel * 10 + 5},${row * 10 + 5}`).join(" ")}
                fill="none"
                stroke="var(--color-ember-400)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */

function idleRuns(config: SlotConfig): ReelRun[] {
  // A fixed opening board, so the server and first client render agree.
  return config.strips.map((strip, reel) => ({
    symbols: windowFor(strip, reel * 7, config.rows),
    armed: false,
    durationMs: 0,
  }));
}

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { SymbolArt };
