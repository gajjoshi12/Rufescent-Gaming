"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OriginalConfig, RoundResult } from "@/lib/originals/types";
import { DICE_MAX_CHANCE, DICE_MIN_CHANCE, diceMultiplier, diceRoll } from "@/lib/originals/math";
import { useBankroll } from "@/lib/originals/useBankroll";
import { useFairness } from "@/lib/originals/useFairness";
import { cn, formatMoney } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Segmented } from "@/components/ui/primitives";
import {
  Cabinet,
  HowTo,
  Panel,
  PanelLabel,
  PlayButton,
  Readout,
  StakeField,
} from "./Cabinet";

const HISTORY = 14;
const ROLL_MS = 620;

type Direction = "under" | "over";

export function DiceGame({ config }: { config: OriginalConfig }) {
  const reduced = usePrefersReducedMotion();
  const bankroll = useBankroll();
  const fairness = useFairness(config.slug);

  const [stake, setStake] = useState(50);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<Direction>("under");
  const [rolling, setRolling] = useState(false);
  /** The figure on the dial — animates toward `settled` while rolling. */
  const [shown, setShown] = useState(50);
  const [settled, setSettled] = useState<{ roll: number; won: boolean } | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const chance = direction === "under" ? target : 100 - target;
  const multiplier = diceMultiplier(chance, config.edge);
  const payout = Math.round(stake * multiplier * 100) / 100;

  const roll = useCallback(() => {
    if (rolling || !bankroll.stake(stake)) return;

    const [u] = fairness.draw(1);
    const result = diceRoll(u);
    // `under` wins strictly below the target and `over` from the target up,
    // so the two directions partition the 10,000 outcomes exactly — no
    // sliver of probability goes missing at the boundary.
    const won = direction === "under" ? result < target : result >= target;

    setRolling(true);
    setSettled(null);

    const from = shown;
    const started = performance.now();
    const duration = reduced ? 90 : ROLL_MS;

    const step = () => {
      const p = Math.min(1, (performance.now() - started) / duration);
      // Ease out, with a shrinking wobble so the dial visibly hunts.
      const eased = 1 - (1 - p) ** 3;
      const wobble = (1 - p) ** 2 * Math.sin(p * 34) * 26;
      setShown(Math.max(0, Math.min(99.99, from + (result - from) * eased + wobble)));

      if (p < 1) {
        frame.current = requestAnimationFrame(step);
        return;
      }

      setShown(result);
      setRolling(false);
      setSettled({ roll: result, won });
      if (won) bankroll.credit(payout);
      setHistory((prev) =>
        [
          {
            id: prev.length + 1,
            label: result.toFixed(2),
            multiplier: won ? multiplier : 0,
            stake,
            payout: won ? payout : 0,
          },
          ...prev,
        ].slice(0, HISTORY),
      );
    };

    frame.current = requestAnimationFrame(step);
  }, [
    rolling,
    bankroll,
    stake,
    fairness,
    direction,
    target,
    shown,
    reduced,
    payout,
    multiplier,
  ]);

  const winZone = useMemo(
    () =>
      direction === "under"
        ? { left: 0, width: target }
        : { left: target, width: 100 - target },
    [direction, target],
  );

  const controls = (
    <Panel>
      <StakeField
        value={stake}
        onChange={setStake}
        config={config}
        balance={bankroll.balance}
        disabled={rolling}
      />

      <div>
        <PanelLabel>Direction</PanelLabel>
        <Segmented<Direction>
          label="Roll direction"
          stretch
          value={direction}
          onChange={setDirection}
          options={[
            { key: "under", label: "Roll under" },
            { key: "over", label: "Roll over" },
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <Readout label="Multiplier" value={multiplier.toFixed(4) + "x"} tone="gold" />
        <Readout label="Win chance" value={chance.toFixed(2) + "%"} />
        {/* Above ~97% win chance the fair price of a win drops below evens,
            so a "win" returns less than the stake. The tone follows the sign
            rather than the word, which is the only honest way to show it. */}
        <Readout
          label="Profit on win"
          value={formatMoney(payout - stake, { sign: true })}
          tone={payout >= stake ? "win" : "loss"}
          hint={"Returns " + formatMoney(payout)}
        />
      </div>

      <PlayButton
        accent={config.theme.accent}
        onClick={roll}
        loading={rolling}
        disabled={bankroll.balance < stake}
      >
        {bankroll.balance < stake ? "Balance too low" : "Roll"}
      </PlayButton>

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
      <div className="mx-auto w-full max-w-2xl">
        {/* ---------- Dial ---------- */}
        <div className="mb-7 text-center">
          <p
            className={cn(
              "font-display text-5xl font-bold tabular-nums drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] sm:text-7xl",
              settled === null
                ? "text-white/85"
                : settled.won
                  ? "text-win"
                  : "text-loss",
              settled !== null && !reduced && "animate-big-win",
            )}
          >
            {shown.toFixed(2)}
          </p>
          <p
            aria-live="polite"
            className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/40"
          >
            {rolling
              ? "Rolling"
              : settled === null
                ? "Set your odds and roll"
                : settled.won
                  ? "Win — " + multiplier.toFixed(4) + "x"
                  : "No win"}
          </p>
        </div>

        {/* ---------- Track ---------- */}
        <div className="relative px-1 pb-8 pt-6">
          {/* Rail */}
          <div className="relative h-3 rounded-full bg-obsidian-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
            <div
              className="absolute inset-y-0 rounded-full transition-[left,width] duration-200"
              style={{
                left: winZone.left + "%",
                width: winZone.width + "%",
                background:
                  "linear-gradient(90deg, " +
                  config.theme.accent +
                  ", " +
                  config.theme.accent2 +
                  ")",
                boxShadow: "0 0 18px -2px " + config.theme.accent,
              }}
            />

            {/* Result marker */}
            <span
              className={cn(
                "absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-0.5",
                "font-display text-[0.6875rem] font-bold tnum shadow-lg",
                settled === null
                  ? "border-white/20 bg-obsidian-800 text-white/70"
                  : settled.won
                    ? "border-win/60 bg-win text-obsidian-950"
                    : "border-loss/60 bg-loss text-obsidian-950",
              )}
              style={{ left: shown + "%" }}
            >
              {shown.toFixed(2)}
            </span>

            {/* Target handle */}
            <input
              type="range"
              min={DICE_MIN_CHANCE}
              max={DICE_MAX_CHANCE}
              step={1}
              value={target}
              disabled={rolling}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Target number"
              className="absolute -inset-x-1 -top-4 h-11 w-[calc(100%+0.5rem)] cursor-grab appearance-none bg-transparent disabled:cursor-default [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/40 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_4px_12px_rgba(0,0,0,0.6)] [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-md [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
            />
          </div>

          {/* Scale */}
          <div className="mt-2 flex justify-between text-[0.625rem] text-white/25 tnum">
            {[0, 25, 50, 75, 100].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-white/45">
            {direction === "under" ? "Wins below" : "Wins from"}{" "}
            <span className="font-semibold text-white/85 tnum">{target.toFixed(2)}</span> —{" "}
            <span className="tnum">{chance.toFixed(2)}%</span> of rolls at{" "}
            <span className="tnum text-gold-300">{multiplier.toFixed(4)}x</span>
          </p>
        </div>
      </div>
    </Cabinet>
  );
}
