"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OriginalConfig, RiskLevel, RoundResult } from "@/lib/originals/types";
import { PLINKO_ROWS, plinkoPayouts, plinkoProbabilities, plinkoRtp } from "@/lib/originals/math";
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
/** Milliseconds per pin row. */
const ROW_MS = 105;
const AUTO_INTERVAL_MS = 420;

interface Bead {
  id: number;
  /** Right-turn flags, one per row. */
  turns: number[];
  bin: number;
  stake: number;
  payout: number;
  startedAt: number;
}

export function PlinkoGame({ config }: { config: OriginalConfig }) {
  const reduced = usePrefersReducedMotion();
  const bankroll = useBankroll();
  const fairness = useFairness(config.slug);

  const [stake, setStake] = useState(50);
  const [rows, setRows] = useState<number>(12);
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [auto, setAuto] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [beads, setBeads] = useState<Bead[]>([]);
  /** Bin lit by the most recent landing; cleared on a timer of its own so it
      still fades once the last bead is off the board and the frame loop stops. */
  const [flash, setFlash] = useState<{ bin: number; seq: number } | null>(null);
  /** Frame clock: beads are positioned from this rather than reading the
      timer during render, which would make the render impure. */
  const [now, setNow] = useState(0);

  const beadId = useRef(0);
  const flashSeq = useRef(0);
  const payouts = useMemo(() => plinkoPayouts(rows, risk, config.edge), [rows, risk, config.edge]);
  const probabilities = useMemo(() => plinkoProbabilities(rows), [rows]);
  const rtp = useMemo(() => plinkoRtp(rows, risk, config.edge), [rows, risk, config.edge]);
  const flightMs = (reduced ? 30 : ROW_MS) * rows + 220;

  /* ---------- Dropping ---------- */

  const drop = useCallback(() => {
    if (!bankroll.stake(stake)) {
      setAuto(false);
      return;
    }

    const floats = fairness.draw(rows);
    const turns: number[] = floats.map((f) => (f < 0.5 ? 0 : 1));
    const bin = turns.reduce((a, b) => a + b, 0);
    const payout = Math.round(stake * payouts[bin] * 100) / 100;

    beadId.current += 1;
    setBeads((prev) => [
      ...prev,
      { id: beadId.current, turns, bin, stake, payout, startedAt: performance.now() },
    ]);
  }, [bankroll, stake, fairness, rows, payouts]);

  /* Land beads whose flight has finished. */
  useEffect(() => {
    if (beads.length === 0) return;
    let frame = 0;

    const step = () => {
      const now = performance.now();
      const landed = beads.filter((b) => now - b.startedAt >= flightMs);

      if (landed.length > 0) {
        setBeads((prev) => prev.filter((b) => now - b.startedAt < flightMs));
        for (const bead of landed) {
          if (bead.payout > 0) bankroll.credit(bead.payout);
          flashSeq.current += 1;
          setFlash({ bin: bead.bin, seq: flashSeq.current });
          setHistory((prev) =>
            [
              {
                id: prev.length + 1,
                label: payouts[bead.bin].toFixed(2) + "x",
                multiplier: payouts[bead.bin],
                stake: bead.stake,
                payout: bead.payout,
              },
              ...prev,
            ].slice(0, HISTORY),
          );
        }
      }

      setNow(now);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [beads, flightMs, bankroll, payouts]);

  /* Auto-drop keeps feeding the board until it is switched off or funds run out. */
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(drop, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [auto, drop]);

  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), 520);
    return () => clearTimeout(timer);
  }, [flash]);

  const controls = (
    <Panel>
      <StakeField value={stake} onChange={setStake} config={config} balance={bankroll.balance} />

      <div>
        <PanelLabel>Risk</PanelLabel>
        <Segmented<RiskLevel>
          label="Risk profile"
          stretch
          value={risk}
          onChange={setRisk}
          options={[
            { key: "low", label: "Low" },
            { key: "medium", label: "Medium" },
            { key: "high", label: "High" },
          ]}
        />
      </div>

      <div>
        <PanelLabel hint={rows + 1 + " slots"}>Rows</PanelLabel>
        <Segmented<string>
          label="Row count"
          stretch
          value={String(rows)}
          onChange={(next) => setRows(Number(next))}
          options={PLINKO_ROWS.map((r) => ({ key: String(r), label: String(r) }))}
        />
      </div>

      <PlayButton
        accent={config.theme.accent}
        onClick={drop}
        disabled={bankroll.balance < stake}
      >
        {bankroll.balance < stake ? "Balance too low" : "Drop bead"}
      </PlayButton>

      <button
        type="button"
        onClick={() => setAuto((a) => !a)}
        aria-pressed={auto}
        className={cn(
          "h-10 w-full rounded-xl border text-xs font-semibold transition-colors",
          auto
            ? "border-loss/45 bg-loss/12 text-loss"
            : "border-white/12 bg-white/5 text-white/60 hover:border-white/25",
        )}
      >
        {auto ? "Stop auto drop" : "Auto drop"}
      </button>

      <div className="space-y-1.5">
        <Readout
          label="Best slot"
          value={Math.max(...payouts).toFixed(2) + "x"}
          tone="gold"
          hint={"1 in " + Math.round(1 / probabilities[0]).toLocaleString("en-AE") + " drops"}
        />
        <Readout
          label="Centre slot"
          value={payouts[Math.floor(rows / 2)].toFixed(2) + "x"}
          hint={(probabilities[Math.floor(rows / 2)] * 100).toFixed(1) + "% of drops"}
        />
      </div>

      <HowTo config={config} />
    </Panel>
  );

  return (
    <Cabinet
      config={config}
      bankroll={bankroll}
      fairness={fairness}
      rtp={rtp}
      controls={controls}
      history={history}
    >
      <Board
        rows={rows}
        payouts={payouts}
        beads={beads}
        now={now}
        flightMs={flightMs}
        flash={flash}
        accent={config.theme.accent}
        reduced={reduced}
      />
      <p aria-live="polite" className="mt-3 min-h-4 text-center text-xs font-medium text-white/40">
        {history[0]
          ? history[0].payout > 0
            ? "Landed on " + history[0].label + " — " + formatMoney(history[0].payout)
            : "Landed on " + history[0].label + " — stake lost"
          : "Drop a bead to start"}
      </p>
    </Cabinet>
  );
}

/* ============================================================
   Board

   Pin row r holds r+1 pins on a unit lattice, so a bead always
   lands on a pin and leaves it half a space to one side. After the
   last row it falls into one of rows+1 slots.
   ============================================================ */

const VIEW_W = 100;
const VIEW_H = 74;
const SLOT_H = 9;

function pinX(row: number, index: number, rows: number): number {
  const spacing = VIEW_W / (rows + 2);
  return VIEW_W / 2 + (index - row / 2) * spacing;
}

function pinY(row: number, rows: number): number {
  const usable = VIEW_H - SLOT_H - 6;
  return 4 + (row / Math.max(1, rows)) * usable;
}

/** Exactly the figure that will be paid — never a prettier approximation. */
function formatMultiplier(multiplier: number): string {
  return multiplier >= 100 ? String(Math.round(multiplier)) : multiplier.toFixed(2);
}

function slotColour(index: number, rows: number): string {
  const t = Math.abs(index - rows / 2) / (rows / 2 || 1);
  return "hsl(" + (272 - t * 258).toFixed(0) + " 82% " + (46 + t * 8).toFixed(0) + "%)";
}

function Board({
  rows,
  payouts,
  beads,
  now,
  flightMs,
  flash,
  accent,
  reduced,
}: {
  rows: number;
  payouts: number[];
  beads: Bead[];
  now: number;
  flightMs: number;
  flash: { bin: number; seq: number } | null;
  accent: string;
  reduced: boolean;
}) {
  const pins = useMemo(() => {
    const out: { x: number; y: number; key: string }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i <= r; i++) {
        out.push({ x: pinX(r, i, rows), y: pinY(r, rows), key: r + ":" + i });
      }
    }
    return out;
  }, [rows]);

  const pinRadius = rows >= 16 ? 0.72 : rows >= 12 ? 0.9 : 1.15;
  const beadRadius = pinRadius * 1.7;

  return (
    <div className="mx-auto w-full max-w-xl">
      <svg
        viewBox={"0 0 " + VIEW_W + " " + VIEW_H}
        className="w-full"
        role="img"
        aria-label={rows + "-row plinko board with " + (rows + 1) + " payout slots"}
      >
        <defs>
          <radialGradient id="plinko-bead">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor={accent} />
            <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {pins.map((pin) => (
          <circle key={pin.key} cx={pin.x} cy={pin.y} r={pinRadius} fill="rgba(255,255,255,0.42)" />
        ))}

        {/* Slots */}
        {payouts.map((multiplier, i) => {
          const spacing = VIEW_W / (rows + 2);
          const x = VIEW_W / 2 + (i - rows / 2 - 0.5) * spacing;
          const lit = flash?.bin === i;
          return (
            <g key={i}>
              <rect
                x={x + 0.35}
                y={VIEW_H - SLOT_H}
                width={spacing - 0.7}
                height={SLOT_H - 1}
                rx={1.6}
                fill={slotColour(i, rows)}
                opacity={lit ? 1 : 0.82}
                style={
                  lit && !reduced
                    ? { filter: "brightness(1.6) drop-shadow(0 0 3px #fff)" }
                    : undefined
                }
              />
              {/* Past eight rows the slots are too narrow for a suffix —
                  the row is unambiguously multipliers, so it is dropped
                  rather than letting adjacent labels collide. */}
              <text
                x={x + spacing / 2}
                y={VIEW_H - SLOT_H / 2 + 0.4}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0b0810"
                fontSize={rows >= 16 ? 1.55 : rows >= 12 ? 2 : 2.6}
                fontWeight="700"
              >
                {formatMultiplier(multiplier)}
                {rows <= 8 ? "x" : ""}
              </text>
            </g>
          );
        })}

        {/* Beads in flight */}
        {beads.map((bead) => {
          const progress = Math.min(1, (now - bead.startedAt) / flightMs);
          const { x, y } = beadPosition(bead.turns, progress, rows);
          return (
            <circle
              key={bead.id}
              cx={x}
              cy={y}
              r={beadRadius}
              fill="url(#plinko-bead)"
              style={{ filter: "drop-shadow(0 0 2.5px " + accent + ")" }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Position of a bead `progress` of the way through its drop. */
function beadPosition(turns: number[], progress: number, rows: number): { x: number; y: number } {
  const total = rows + 1;
  const step = progress * total;
  const leg = Math.min(rows, Math.floor(step));
  const u = step - leg;

  // Pin index the bead is sitting on at each row.
  const indexAt = (row: number) => turns.slice(0, row).reduce((a, b) => a + b, 0);

  if (leg >= rows) {
    // Final fall from the last pin into the slot.
    const from = { x: pinX(rows - 1, indexAt(rows - 1), rows), y: pinY(rows - 1, rows) };
    const spacing = VIEW_W / (rows + 2);
    const bin = indexAt(rows);
    const to = {
      x: VIEW_W / 2 + (bin - rows / 2) * spacing,
      y: VIEW_H - SLOT_H - 1.5,
    };
    return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u };
  }

  const from =
    leg === 0
      ? { x: VIEW_W / 2, y: 0 }
      : { x: pinX(leg - 1, indexAt(leg - 1), rows), y: pinY(leg - 1, rows) };
  const to = { x: pinX(leg, indexAt(leg), rows), y: pinY(leg, rows) };

  // A shallow hop between pins reads as a bounce without any physics.
  const hop = Math.sin(Math.PI * u) * 1.1;
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u - hop,
  };
}
