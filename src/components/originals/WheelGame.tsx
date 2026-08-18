"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OriginalConfig, RiskLevel, RoundResult } from "@/lib/originals/types";
import { WHEEL_SEGMENTS, wheelLegend, wheelPayouts, wheelRtp } from "@/lib/originals/math";
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
const SPIN_MS = 3_600;
const SEGMENT_DEG = 360 / WHEEL_SEGMENTS;

export function WheelGame({ config }: { config: OriginalConfig }) {
  const reduced = usePrefersReducedMotion();
  const bankroll = useBankroll();
  const fairness = useFairness(config.slug);

  const [stake, setStake] = useState(50);
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const payouts = useMemo(() => wheelPayouts(risk, config.edge), [risk, config.edge]);
  const legend = useMemo(() => wheelLegend(risk, config.edge), [risk, config.edge]);
  const rtp = useMemo(() => wheelRtp(risk, config.edge), [risk, config.edge]);
  const best = Math.max(...payouts);

  const spin = useCallback(() => {
    if (spinning || !bankroll.stake(stake)) return;

    const [u] = fairness.draw(1);
    const index = Math.min(WHEEL_SEGMENTS - 1, Math.floor(u * WHEEL_SEGMENTS));

    // Bring the centre of `index` under the fixed pointer at twelve o'clock,
    // after five full turns so the landing is never visible in advance.
    const targetMod = (360 - (index * SEGMENT_DEG + SEGMENT_DEG / 2)) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;

    setSpinning(true);
    setLanded(null);
    setRotation((r) => r + 360 * (reduced ? 0 : 5) + delta);

    timer.current = setTimeout(
      () => {
        const multiplier = payouts[index];
        const payout = Math.round(stake * multiplier * 100) / 100;
        if (payout > 0) bankroll.credit(payout);
        setLanded(index);
        setSpinning(false);
        setHistory((prev) =>
          [
            {
              id: prev.length + 1,
              label: multiplier > 0 ? multiplier.toFixed(2) + "x" : "0x",
              multiplier,
              stake,
              payout,
            },
            ...prev,
          ].slice(0, HISTORY),
        );
      },
      reduced ? 120 : SPIN_MS,
    );
  }, [spinning, bankroll, stake, fairness, rotation, reduced, payouts]);

  const controls = (
    <Panel>
      <StakeField
        value={stake}
        onChange={setStake}
        config={config}
        balance={bankroll.balance}
        disabled={spinning}
      />

      <div>
        <PanelLabel hint={WHEEL_SEGMENTS + " segments"}>Risk</PanelLabel>
        <Segmented<RiskLevel>
          label="Risk profile"
          stretch
          value={risk}
          onChange={(next) => !spinning && setRisk(next)}
          options={[
            { key: "low", label: "Low" },
            { key: "medium", label: "Medium" },
            { key: "high", label: "High" },
          ]}
        />
      </div>

      <PlayButton
        accent={config.theme.accent}
        onClick={spin}
        disabled={spinning || bankroll.balance < stake}
      >
        {bankroll.balance < stake ? "Balance too low" : spinning ? "Spinning…" : "Spin the wheel"}
      </PlayButton>

      <div className="space-y-1.5">
        <Readout
          label="Top segment"
          value={best.toFixed(2) + "x"}
          tone="gold"
          hint={payouts.filter((p) => p === best).length + " of " + WHEEL_SEGMENTS + " segments"}
        />
        <Readout
          label="Live segments"
          value={payouts.filter((p) => p > 0).length + " / " + WHEEL_SEGMENTS}
          hint={
            ((payouts.filter((p) => p > 0).length / WHEEL_SEGMENTS) * 100).toFixed(0) +
            "% of spins pay"
          }
        />
      </div>

      <div>
        <PanelLabel>Segments</PanelLabel>
        <ul className="space-y-1">
          {legend.map((entry) => (
            <li
              key={entry.multiplier}
              className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-2 py-1"
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm"
                style={{ background: segmentColour(entry.multiplier, best) }}
              />
              <span className="flex-1 text-[0.6875rem] font-semibold text-white/75 tnum">
                {entry.multiplier > 0 ? entry.multiplier.toFixed(2) + "x" : "No win"}
              </span>
              <span className="text-[0.625rem] text-white/35 tnum">×{entry.count}</span>
            </li>
          ))}
        </ul>
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
      <div className="mx-auto w-full max-w-sm">
        <div className="relative aspect-square">
          {/* Pointer */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
          >
            <svg viewBox="0 0 20 22" className="h-6 w-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              <path d="M10 21 2 4a9 9 0 0 1 16 0z" fill={config.theme.accent2} />
              <path d="M10 21 5 10h10z" fill="#ffffff" fillOpacity="0.35" />
            </svg>
          </span>

          <div
            className="size-full"
            style={{
              transform: "rotate(" + rotation + "deg)",
              transition: reduced
                ? "none"
                : "transform " + SPIN_MS + "ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              className="size-full"
              role="img"
              aria-label={"Prize wheel with " + WHEEL_SEGMENTS + " segments"}
            >
              <circle cx="50" cy="50" r="49" fill="rgba(0,0,0,0.45)" />
              {payouts.map((multiplier, i) => {
                const a0 = i * SEGMENT_DEG;
                const a1 = a0 + SEGMENT_DEG;
                const mid = a0 + SEGMENT_DEG / 2;
                const label = polar(50, 50, 39, mid);
                return (
                  <g key={i}>
                    <path
                      d={arc(50, 50, 47, 27, a0, a1)}
                      fill={segmentColour(multiplier, best)}
                      stroke="rgba(0,0,0,0.45)"
                      strokeWidth="0.5"
                      opacity={landed === null || landed === i ? 1 : 0.72}
                    />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={"rotate(" + mid + " " + label.x + " " + label.y + ")"}
                      fill={multiplier > 0 ? "#0b0810" : "rgba(255,255,255,0.4)"}
                      fontSize="4.2"
                      fontWeight="700"
                    >
                      {multiplier > 0 ? multiplier.toFixed(multiplier < 10 ? 2 : 1) : "—"}
                    </text>
                  </g>
                );
              })}
              <circle cx="50" cy="50" r="26" fill="rgba(8,7,10,0.92)" stroke="rgba(255,255,255,0.12)" />
            </svg>
          </div>

          {/* Hub readout — counter-rotates by staying outside the spun element. */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p
                className={cn(
                  "font-display text-2xl font-bold tnum sm:text-3xl",
                  landed === null
                    ? "text-white/45"
                    : payouts[landed] > 0
                      ? "text-win"
                      : "text-white/30",
                  landed !== null && payouts[landed] > 0 && !reduced && "animate-big-win",
                )}
              >
                {spinning
                  ? "…"
                  : landed === null
                    ? "Spin"
                    : payouts[landed] > 0
                      ? payouts[landed].toFixed(2) + "x"
                      : "0x"}
              </p>
              {landed !== null && !spinning && (
                <p className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-widest text-white/35">
                  {payouts[landed] > 0
                    ? formatMoney(stake * payouts[landed])
                    : "No win"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Cabinet>
  );
}

/* ============================================================
   Geometry
   ============================================================ */

/** Point on a circle, with 0 degrees at twelve o'clock and angles clockwise. */
function polar(cx: number, cy: number, radius: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Donut-segment path between two angles. */
function arc(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  a0: number,
  a1: number,
): string {
  const o0 = polar(cx, cy, outer, a0);
  const o1 = polar(cx, cy, outer, a1);
  const i1 = polar(cx, cy, inner, a1);
  const i0 = polar(cx, cy, inner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    "M" + o0.x.toFixed(3) + " " + o0.y.toFixed(3),
    "A" + outer + " " + outer + " 0 " + large + " 1 " + o1.x.toFixed(3) + " " + o1.y.toFixed(3),
    "L" + i1.x.toFixed(3) + " " + i1.y.toFixed(3),
    "A" + inner + " " + inner + " 0 " + large + " 0 " + i0.x.toFixed(3) + " " + i0.y.toFixed(3),
    "Z",
  ].join("");
}

/** Losing segments read as slate; winners warm up towards the top prize. */
function segmentColour(multiplier: number, best: number): string {
  if (multiplier <= 0) return "#221d2b";
  const t = best <= 1 ? 1 : Math.min(1, Math.log(multiplier) / Math.log(best));
  const hue = 188 - t * 148;
  return "hsl(" + hue.toFixed(0) + " 84% " + (56 - t * 6).toFixed(0) + "%)";
}
