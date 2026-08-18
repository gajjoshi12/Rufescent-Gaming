"use client";

import { useCallback, useMemo, useState } from "react";
import type { OriginalConfig, RoundResult } from "@/lib/originals/types";
import { MINES_TILES, minesLadder, minesMultiplier } from "@/lib/originals/math";
import { fairShuffle } from "@/lib/originals/fair";
import { useBankroll } from "@/lib/originals/useBankroll";
import { useFairness } from "@/lib/originals/useFairness";
import { cn, formatMoney } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import {
  Cabinet,
  HowTo,
  Panel,
  PanelLabel,
  PlayButton,
  Readout,
  StakeField,
  Verdict,
} from "./Cabinet";

const MINE_PRESETS = [1, 3, 5, 10, 24];
const HISTORY = 14;

type TileState = "hidden" | "gem" | "mine" | "ghost-gem" | "ghost-mine";

export function MinesGame({ config }: { config: OriginalConfig }) {
  const reduced = usePrefersReducedMotion();
  const bankroll = useBankroll();
  const fairness = useFairness(config.slug);

  const [stake, setStake] = useState(50);
  const [mines, setMines] = useState(3);
  const [board, setBoard] = useState<number[] | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [busted, setBusted] = useState<number | null>(null);
  const [cashed, setCashed] = useState<number | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const live = board !== null && busted === null && cashed === null;
  const picks = revealed.length;
  const current = picks > 0 ? minesMultiplier(mines, picks, config.edge) : 0;
  const next = minesMultiplier(mines, picks + 1, config.edge);
  const ladder = useMemo(() => minesLadder(mines, config.edge), [mines, config.edge]);
  /** Odds that the very next tile is safe, given what is already open. */
  const safeChance = ((MINES_TILES - mines - picks) / (MINES_TILES - picks)) * 100;

  const record = useCallback((entry: Omit<RoundResult, "id">) => {
    setHistory((prev) => [{ id: prev.length + 1, ...entry }, ...prev].slice(0, HISTORY));
  }, []);

  /* ---------- Round control ---------- */

  const start = useCallback(() => {
    if (live || !bankroll.stake(stake)) return;
    // The shuffle consumes one float per tile; the first `mines` entries of
    // the permutation are where the mines sit.
    const floats = fairness.draw(MINES_TILES);
    const order = fairShuffle(floats, MINES_TILES);
    setBoard(order.slice(0, mines));
    setRevealed([]);
    setBusted(null);
    setCashed(null);
  }, [live, bankroll, stake, fairness, mines]);

  const cashOut = useCallback(() => {
    if (!live || picks === 0) return;
    const payout = Math.round(stake * current * 100) / 100;
    bankroll.credit(payout);
    setCashed(current);
    record({ label: current.toFixed(2) + "x", multiplier: current, stake, payout });
  }, [live, picks, stake, current, bankroll, record]);

  const reveal = useCallback(
    (index: number) => {
      if (!live || !board || revealed.includes(index)) return;

      if (board.includes(index)) {
        setBusted(index);
        record({ label: "Mine", multiplier: 0, stake, payout: 0 });
        return;
      }

      const nextRevealed = [...revealed, index];
      setRevealed(nextRevealed);

      // Clearing every safe tile is an automatic cash-out — there is
      // nothing left to gamble on.
      if (nextRevealed.length === MINES_TILES - mines) {
        const top = minesMultiplier(mines, nextRevealed.length, config.edge);
        const payout = Math.round(stake * top * 100) / 100;
        bankroll.credit(payout);
        setCashed(top);
        record({ label: top.toFixed(2) + "x", multiplier: top, stake, payout });
      }
    },
    [live, board, revealed, mines, stake, config.edge, bankroll, record],
  );

  /* ---------- Tiles ---------- */

  const tileState = useCallback(
    (index: number): TileState => {
      if (revealed.includes(index)) return "gem";
      if (busted !== null || cashed !== null) {
        if (!board) return "hidden";
        return board.includes(index) ? (busted === index ? "mine" : "ghost-mine") : "ghost-gem";
      }
      return "hidden";
    },
    [revealed, busted, cashed, board],
  );

  const controls = (
    <Panel>
      <StakeField
        value={stake}
        onChange={setStake}
        config={config}
        balance={bankroll.balance}
        disabled={live}
      />

      <div>
        <PanelLabel hint={(MINES_TILES - mines) + " safe tiles"}>Mines</PanelLabel>
        <div className="flex gap-1.5">
          {MINE_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              disabled={live}
              onClick={() => setMines(count)}
              aria-pressed={mines === count}
              className={cn(
                "h-10 flex-1 rounded-xl border text-xs font-semibold tnum transition-colors disabled:opacity-40",
                mines === count
                  ? "border-gold-400/55 bg-gold-400/15 text-gold-200"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-gold-400/30",
              )}
            >
              {count}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={24}
          step={1}
          value={mines}
          disabled={live}
          onChange={(e) => setMines(Number(e.target.value))}
          aria-label="Number of mines"
          className="mt-2.5 w-full accent-[var(--color-gold-400)] disabled:opacity-40"
        />
      </div>

      {live ? (
        <PlayButton accent={config.theme.accent} onClick={cashOut} disabled={picks === 0}>
          {picks === 0
            ? "Pick a tile to begin"
            : "Cash out " + formatMoney(stake * current, { decimals: false })}
        </PlayButton>
      ) : (
        <PlayButton
          accent={config.theme.accent}
          onClick={start}
          disabled={bankroll.balance < stake}
        >
          {bankroll.balance < stake ? "Balance too low" : "Bury the mines"}
        </PlayButton>
      )}

      <div className="space-y-1.5">
        <Readout
          label="Current"
          value={picks > 0 ? current.toFixed(2) + "x" : "—"}
          tone="gold"
          hint={picks + " of " + (MINES_TILES - mines) + " safe tiles found"}
        />
        <Readout
          label="Next tile pays"
          value={next > 0 ? next.toFixed(2) + "x" : "—"}
          tone="win"
          hint={safeChance.toFixed(1) + "% chance of surviving it"}
        />
      </div>

      <div>
        <PanelLabel hint={mines + " mines"}>Ladder</PanelLabel>
        <div className="scroll-x flex gap-1">
          {ladder.slice(0, 12).map((value, i) => (
            <span
              key={i}
              className={cn(
                "shrink-0 rounded-md border px-1.5 py-1 text-[0.5625rem] font-semibold tnum",
                i + 1 === picks
                  ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
                  : "border-white/8 bg-white/4 text-white/40",
              )}
            >
              {value < 100 ? value.toFixed(2) : Math.round(value)}x
            </span>
          ))}
        </div>
      </div>

      <HowTo config={config} />
    </Panel>
  );

  return (
    <Cabinet
      config={config}
      bankroll={bankroll}
      fairness={fairness}
      rtp={(1 - config.edge) * 100}
      controls={controls}
      history={history}
    >
      <div className="mx-auto w-full max-w-md">
        <div
          className="grid grid-cols-5 gap-1.5 sm:gap-2.5"
          role="grid"
          aria-label="Mines board, five by five"
        >
          {Array.from({ length: MINES_TILES }, (_, index) => (
            <Tile
              key={index}
              index={index}
              state={tileState(index)}
              accent={config.theme.accent}
              interactive={live}
              reduced={reduced}
              onSelect={() => reveal(index)}
            />
          ))}
        </div>

        <div className="mt-3.5">
          <Verdict
            tone={busted !== null ? "loss" : cashed !== null ? "win" : "idle"}
          >
            {busted !== null
              ? "Mine at tile " + (busted + 1) + " — stake lost"
              : cashed !== null
                ? "Cashed out at " +
                  cashed.toFixed(2) +
                  "x for " +
                  formatMoney(stake * cashed)
                : live
                  ? picks === 0
                    ? "Board armed — reveal a tile"
                    : picks + " safe · " + current.toFixed(2) + "x banked if you stop now"
                  : "Set your stake and bury the mines"}
          </Verdict>
        </div>
      </div>
    </Cabinet>
  );
}

/* ============================================================
   Tile

   Two faces on a preserve-3d card: the lid, and the gem or mine
   underneath. Revealing flips it rather than swapping the content,
   which is what makes a 25-tile board feel physical.
   ============================================================ */

function Tile({
  index,
  state,
  accent,
  interactive,
  reduced,
  onSelect,
}: {
  index: number;
  state: TileState;
  accent: string;
  interactive: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const flipped = state !== "hidden";
  const ghost = state === "ghost-gem" || state === "ghost-mine";
  const isMine = state === "mine" || state === "ghost-mine";

  return (
    <button
      type="button"
      role="gridcell"
      disabled={!interactive || flipped}
      onClick={onSelect}
      aria-label={
        flipped
          ? "Tile " + (index + 1) + ", " + (isMine ? "mine" : "gem")
          : "Tile " + (index + 1) + ", hidden"
      }
      className={cn(
        "group relative aspect-square w-full rounded-xl",
        "[perspective:600px] focus-visible:outline-offset-2",
        interactive && !flipped && "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "relative block size-full rounded-xl [transform-style:preserve-3d]",
          !reduced && "transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        )}
        style={flipped ? { transform: "rotateY(180deg)" } : undefined}
      >
        {/* Lid */}
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl border border-white/10 [backface-visibility:hidden]",
            "bg-linear-to-br from-obsidian-700/90 to-obsidian-900/95",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_6px_14px_-8px_rgba(0,0,0,0.9)]",
            interactive &&
              "transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/25 group-hover:from-obsidian-600/90",
          )}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-white/15 transition-colors group-hover:bg-white/40"
          />
        </span>

        {/* Face */}
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl border [transform:rotateY(180deg)] [backface-visibility:hidden]",
            isMine
              ? "border-loss/45 bg-linear-to-br from-loss/25 to-obsidian-950"
              : "border-white/12 bg-linear-to-br from-white/12 to-obsidian-950",
            ghost && "opacity-35",
          )}
          style={
            !isMine && !ghost
              ? {
                  borderColor: accent + "77",
                  boxShadow: "0 0 22px -6px " + accent,
                }
              : undefined
          }
        >
          {isMine ? (
            <MineGlyph />
          ) : (
            <GemGlyph accent={accent} sparkle={!reduced && state === "gem"} />
          )}
        </span>
      </span>
    </button>
  );
}

function GemGlyph({ accent, sparkle }: { accent: string; sparkle: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-1/2", sparkle && "animate-count-up")}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gem-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor={accent} />
          <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M16 2 30 12l-14 18L2 12 16 2Z" fill="url(#gem-face)" />
      <path d="M16 2 30 12H2L16 2Z" fill="#ffffff" fillOpacity="0.28" />
      <path d="M16 2v28" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.8" />
      <path d="M2 12h28" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.8" />
    </svg>
  );
}

function MineGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="size-1/2" aria-hidden="true">
      <circle cx="16" cy="17" r="9" fill="#2a1013" stroke="var(--color-loss)" strokeWidth="1.6" />
      <path
        d="M16 4v4M16 26v4M4 17h4M24 17h4M8 9l3 3M24 9l-3 3M8 25l3-3M24 25l-3-3"
        stroke="var(--color-loss)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="13" cy="14" r="2" fill="#ffffff" fillOpacity="0.35" />
    </svg>
  );
}
