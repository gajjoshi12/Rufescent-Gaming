"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OriginalConfig, RoundResult } from "@/lib/originals/types";
import { crashCurve, crashCurveTime, crashPoint } from "@/lib/originals/math";
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
} from "./Cabinet";

/* ============================================================
   Timing
   ============================================================ */

const BOARDING_MS = 5_000;
const SETTLED_MS = 3_400;
const HISTORY = 14;

type Phase = "boarding" | "flying" | "settled";

interface Bot {
  name: string;
  stake: number;
  /** The multiplier this player has set as their auto cash-out. */
  target: number;
  /** Resolved at round start: whether the flight lasts long enough for them. */
  survives: boolean;
}

const BOT_NAMES = [
  "Rashid_A", "dune_rider", "Mariam", "K. Haddad", "nightowl", "AjmanAce",
  "Zayed99", "silkroute", "Fatima_R", "PearlDiver", "khaleej_x", "Noor.",
];

/**
 * The round machine runs on one animation frame loop rather than a chain of
 * effects: boarding, flight and settle are all "how long has this phase been
 * running", and a single loop reading a phase ref keeps the timeline honest
 * even when React re-renders sixty times a second.
 */
export function AviatorGame({ config }: { config: OriginalConfig }) {
  const reduced = usePrefersReducedMotion();
  const bankroll = useBankroll();
  const fairness = useFairness(config.slug);
  const { stake: debit, credit } = bankroll;
  const { draw } = fairness;

  const [phase, setPhase] = useState<Phase>("boarding");
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(BOARDING_MS);
  const [multiplier, setMultiplier] = useState(1);
  const [bots, setBots] = useState<Bot[]>([]);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const [stake, setStake] = useState(50);
  /** A bet queued for the next boarding window. */
  const [pending, setPending] = useState(false);
  /** The stake riding this round, once it has been debited. */
  const [riding, setRiding] = useState<number | null>(null);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [autoCashOut, setAutoCashOut] = useState<number | null>(2);

  const phaseRef = useRef<Phase>("boarding");
  const phaseStart = useRef(0);
  const crashAt = useRef(1);
  const multiplierRef = useRef(1);
  const ridingRef = useRef<number | null>(null);
  const started = useRef(false);

  const record = useCallback((entry: Omit<RoundResult, "id">) => {
    setHistory((prev) => [{ id: prev.length + 1, ...entry }, ...prev].slice(0, HISTORY));
  }, []);

  /**
   * During boarding the stake is taken straight away and rides the flight
   * that is about to leave; at any other time it is queued and debited when
   * the next boarding window opens.
   */
  const placeBet = useCallback(() => {
    if (riding !== null || pending) return;
    if (phaseRef.current === "boarding") {
      if (debit(stake)) {
        ridingRef.current = stake;
        setRiding(stake);
      }
      return;
    }
    setPending(true);
  }, [riding, pending, debit, stake]);

  const cashOut = useCallback(() => {
    const amount = ridingRef.current;
    if (amount === null) return;
    // Floor rather than round: the board must never pay above the figure
    // the player saw when they hit the button.
    const at = Math.floor(multiplierRef.current * 100) / 100;
    const payout = Math.round(amount * at * 100) / 100;

    ridingRef.current = null;
    setRiding(null);
    setCashedAt(at);
    credit(payout);
    record({ label: at.toFixed(2) + "x", multiplier: at, stake: amount, payout });
  }, [credit, record]);

  /* ---------- The loop ---------- */

  useEffect(() => {
    let frame = 0;

    const beginRound = (now: number) => {
      // Drawn now and kept in a ref: the crash point is never rendered, so
      // nothing on screen can leak it before the flight ends.
      const [u] = draw(1);
      crashAt.current = crashPoint(u, config.edge, config.maxWin);

      // Names are taken as six consecutive entries from a seeded offset
      // rather than six independent draws, which would seat the same player
      // twice in one cabin.
      const floats = draw(13);
      const offset = Math.floor(floats[0] * BOT_NAMES.length);
      setBots(
        Array.from({ length: 6 }, (_, i) => {
          const target = Math.round((1.15 + floats[i * 2 + 2] ** 2 * 9) * 100) / 100;
          return {
            name: BOT_NAMES[(offset + i) % BOT_NAMES.length],
            stake: Math.round((10 + floats[i * 2 + 1] ** 3 * 1_400) / 5) * 5,
            target,
            survives: target <= crashAt.current,
          };
        }),
      );

      multiplierRef.current = 1;
      setMultiplier(1);
      setCashedAt(null);
      setRemaining(BOARDING_MS);
      setRound((r) => r + 1);

      // A queued bet is taken the moment boarding opens.
      if (pending) {
        if (debit(stake)) {
          ridingRef.current = stake;
          setRiding(stake);
        }
        setPending(false);
      }

      phaseRef.current = "boarding";
      phaseStart.current = now;
      setPhase("boarding");
    };

    const step = () => {
      const now = performance.now();

      if (!started.current) {
        started.current = true;
        beginRound(now);
      }

      const elapsed = now - phaseStart.current;

      if (phaseRef.current === "boarding") {
        const left = BOARDING_MS - elapsed;
        if (left <= 0) {
          setRemaining(0);
          phaseRef.current = "flying";
          phaseStart.current = now;
          setPhase("flying");
        } else {
          setRemaining(left);
        }
      } else if (phaseRef.current === "flying") {
        const value = crashCurve(reduced ? elapsed * 2.2 : elapsed);

        if (value >= crashAt.current) {
          multiplierRef.current = crashAt.current;
          setMultiplier(crashAt.current);

          const lost = ridingRef.current;
          if (lost !== null) {
            ridingRef.current = null;
            setRiding(null);
            record({ label: "Burned", multiplier: 0, stake: lost, payout: 0 });
          }

          phaseRef.current = "settled";
          phaseStart.current = now;
          setPhase("settled");
        } else {
          multiplierRef.current = value;
          setMultiplier(value);
          if (autoCashOut !== null && ridingRef.current !== null && value >= autoCashOut) {
            cashOut();
          }
        }
      } else if (elapsed >= (reduced ? 900 : SETTLED_MS)) {
        beginRound(now);
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced, autoCashOut, pending, stake, cashOut, record, debit, draw, config.edge, config.maxWin]);

  /* ---------- Derived ---------- */

  const flying = phase === "flying";
  const busted = phase === "settled";
  const elapsedMs = crashCurveTime(multiplier);
  const canBet = riding === null && !pending && bankroll.balance >= stake;

  const curve = useMemo(() => {
    const xMax = Math.max(elapsedMs, 4_200);
    const yMax = Math.max(2, multiplier * 1.1);
    const points: string[] = [];
    for (let i = 0; i <= 44; i++) {
      const t = (elapsedMs * i) / 44;
      const m = crashCurve(t);
      const x = (t / xMax) * 100;
      const y = 56 - ((m - 1) / (yMax - 1)) * 56;
      points.push(x.toFixed(3) + " " + y.toFixed(3));
    }
    const headX = (elapsedMs / xMax) * 100;
    const headY = ((multiplier - 1) / (yMax - 1)) * 100;
    return {
      d: "M" + points.join("L"),
      /** Where the filled area drops back to the baseline — the true tip. */
      tipX: headX,
      // The plane is held just inside the plot so it never straddles the
      // border during the first tenth of a second of a flight.
      head: { x: Math.min(96, headX), y: Math.max(4, Math.min(94, headY)) },
      yMax,
    };
  }, [elapsedMs, multiplier]);

  const controls = (
    <Panel>
      <StakeField
        value={stake}
        onChange={setStake}
        config={config}
        balance={bankroll.balance}
        disabled={riding !== null}
      />

      <div>
        <PanelLabel hint={autoCashOut ? autoCashOut.toFixed(2) + "x" : "off"}>
          Auto cash out
        </PanelLabel>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setAutoCashOut((v) => (v === null ? 2 : null))}
            aria-pressed={autoCashOut !== null}
            className={cn(
              "h-10 shrink-0 rounded-xl border px-3 text-[0.6875rem] font-semibold transition-colors",
              autoCashOut !== null
                ? "border-win/45 bg-win/12 text-win"
                : "border-white/10 bg-white/5 text-white/45",
            )}
          >
            {autoCashOut !== null ? "On" : "Off"}
          </button>
          {[1.5, 2, 5, 10].map((value) => (
            <button
              key={value}
              type="button"
              disabled={autoCashOut === null}
              onClick={() => setAutoCashOut(value)}
              className={cn(
                "h-10 flex-1 rounded-xl border text-[0.6875rem] font-semibold tnum transition-colors disabled:opacity-35",
                autoCashOut === value
                  ? "border-gold-400/55 bg-gold-400/15 text-gold-200"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-gold-400/30",
              )}
            >
              {value.toFixed(1)}x
            </button>
          ))}
        </div>
      </div>

      {riding !== null && flying ? (
        <PlayButton accent={config.theme.accent2} onClick={cashOut}>
          Cash out {formatMoney(riding * multiplier, { decimals: false })}
        </PlayButton>
      ) : pending ? (
        <PlayButton accent="#8a8496" onClick={() => setPending(false)}>
          Cancel — waiting for next flight
        </PlayButton>
      ) : riding !== null ? (
        <PlayButton accent={config.theme.accent} disabled>
          On board — flight starts shortly
        </PlayButton>
      ) : (
        <PlayButton accent={config.theme.accent} disabled={!canBet} onClick={placeBet}>
          {bankroll.balance < stake
            ? "Balance too low"
            : phase === "boarding"
              ? "Board this flight"
              : "Bet on next flight"}
        </PlayButton>
      )}

      <div className="space-y-1.5">
        <Readout
          label="Profit on cash out"
          value={
            riding !== null
              ? formatMoney(riding * multiplier - riding, { sign: true })
              : formatMoney(stake * (autoCashOut ?? 2) - stake, { sign: true })
          }
          tone="win"
          hint={riding !== null ? "At the live multiplier" : "At your auto cash out"}
        />
        <Readout label="Round" value={"#" + round} hint="Seeded before boarding opens" />
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
      <div className="relative">
        {/* ---------- Chart ---------- */}
        <div className="relative h-56 overflow-hidden rounded-2xl border border-white/8 bg-obsidian-950/45 sm:h-72">
          <Gridlines yMax={curve.yMax} />

          <svg
            viewBox="0 0 100 56"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 size-full"
          >
            <defs>
              <linearGradient id="aviator-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.theme.accent} stopOpacity="0.45" />
                <stop offset="100%" stopColor={config.theme.accent} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="aviator-stroke" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor={config.theme.accent2} />
                <stop offset="100%" stopColor={config.theme.accent} />
              </linearGradient>
            </defs>

            <path
              d={curve.d + "L" + curve.tipX.toFixed(3) + " 56L0 56Z"}
              fill="url(#aviator-fill)"
            />
            <path
              d={curve.d}
              fill="none"
              stroke={busted ? "var(--color-loss)" : "url(#aviator-stroke)"}
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* The plane rides the head of the curve. */}
          {phase !== "boarding" && (
            <span
              className={cn(
                "pointer-events-none absolute z-10 -translate-x-1/2 translate-y-1/2 transition-opacity duration-500",
                busted && "opacity-0",
              )}
              style={{
                left: curve.head.x.toFixed(2) + "%",
                bottom: curve.head.y.toFixed(2) + "%",
              }}
            >
              <Plane accent={config.theme.accent2} bobbing={!reduced && flying} />
            </span>
          )}

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            {phase === "boarding" ? (
              <Boarding remaining={remaining} accent={config.theme.accent} />
            ) : (
              <div className="text-center">
                <p
                  className={cn(
                    "font-display text-5xl font-bold tabular-nums drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:text-7xl",
                    busted && "animate-big-win text-loss",
                  )}
                  style={busted ? undefined : { color: multiplierColour(multiplier, config) }}
                >
                  {multiplier.toFixed(2)}x
                </p>
                <p
                  aria-live="polite"
                  className={cn(
                    "mt-1 text-xs font-semibold uppercase tracking-widest",
                    busted ? "text-loss" : cashedAt !== null ? "text-win" : "text-white/45",
                  )}
                >
                  {busted
                    ? "Burned out"
                    : cashedAt !== null
                      ? "Cashed out at " + cashedAt.toFixed(2) + "x"
                      : riding !== null
                        ? "In flight"
                        : "Watching"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Live player feed ---------- */}
        <div className="mt-3">
          <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-widest text-white/30">
            In this round
          </p>
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {riding !== null && (
              <BotRow
                name="You"
                stake={riding}
                accent={config.theme.accent2}
                highlight
                status={busted ? { kind: "burned" } : { kind: "flying" }}
              />
            )}
            {cashedAt !== null && (
              <BotRow
                name="You"
                stake={stake}
                accent={config.theme.accent2}
                highlight
                status={{ kind: "out", at: cashedAt }}
              />
            )}
            {bots.map((bot, i) => (
              <BotRow
                key={bot.name + i}
                name={bot.name}
                stake={bot.stake}
                accent={config.theme.accent2}
                status={
                  phase === "boarding"
                    ? { kind: "waiting" }
                    : bot.survives && multiplier >= bot.target
                      ? { kind: "out", at: bot.target }
                      : busted
                        ? { kind: "burned" }
                        : { kind: "flying" }
                }
              />
            ))}
          </ul>
        </div>
      </div>
    </Cabinet>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

function multiplierColour(multiplier: number, config: OriginalConfig): string {
  if (multiplier >= 10) return config.theme.accent2;
  if (multiplier >= 3) return "#ffd76a";
  return "#ffffff";
}

function Gridlines({ yMax }: { yMax: number }) {
  const steps = useMemo(() => {
    const stride = yMax <= 3 ? 0.5 : yMax <= 8 ? 1 : yMax <= 25 ? 5 : 25;
    const out: number[] = [];
    for (let m = 1 + stride; m < yMax; m += stride) out.push(Math.round(m * 100) / 100);
    return out.slice(0, 9);
  }, [yMax]);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      {steps.map((m) => (
        <div
          key={m}
          className="absolute inset-x-0 border-t border-dashed border-white/6"
          style={{ bottom: (((m - 1) / (yMax - 1)) * 100).toFixed(2) + "%" }}
        >
          <span className="absolute -top-2 left-1.5 text-[0.5625rem] text-white/20 tnum">{m}x</span>
        </div>
      ))}
    </div>
  );
}

function Boarding({ remaining, accent }: { remaining: number; accent: string }) {
  const progress = Math.max(0, Math.min(1, remaining / BOARDING_MS));
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="text-center">
      <div className="relative mx-auto size-16">
        <svg viewBox="0 0 60 60" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke={accent}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-white tnum">
          {(remaining / 1000).toFixed(1)}
        </span>
      </div>
      <p className="mt-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-white/45">
        Boarding — place your stake
      </p>
    </div>
  );
}

function Plane({ accent, bobbing }: { accent: string; bobbing: boolean }) {
  return (
    <span
      className={cn("block", bobbing && "animate-win-pulse")}
      style={{ filter: "drop-shadow(0 0 10px " + accent + ")" }}
    >
      <svg viewBox="0 0 32 32" className="size-7 -rotate-[18deg] sm:size-9" aria-hidden="true">
        <path d="M2 17.5 30 4 20 29l-5.5-8.5L2 17.5Z" fill={accent} />
        <path d="M14.5 20.5 30 4l-9 18.5-6.5-2Z" fill="#ffffff" fillOpacity="0.35" />
      </svg>
    </span>
  );
}

type BotStatus =
  | { kind: "waiting" }
  | { kind: "flying" }
  | { kind: "out"; at: number }
  | { kind: "burned" };

function BotRow({
  name,
  stake,
  status,
  accent,
  highlight,
}: {
  name: string;
  stake: number;
  status: BotStatus;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-300",
        status.kind === "out"
          ? "border-win/35 bg-win/10"
          : status.kind === "burned"
            ? "border-white/6 bg-white/2 opacity-45"
            : "border-white/8 bg-white/4",
      )}
      style={highlight ? { boxShadow: "inset 0 0 0 1px " + accent + "66" } : undefined}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.625rem] font-medium text-white/70">{name}</span>
        <span className="block text-[0.5625rem] text-white/35 tnum">
          {formatMoney(stake, { decimals: false })}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[0.625rem] font-bold tnum",
          status.kind === "out" ? "text-win" : "text-white/25",
        )}
      >
        {status.kind === "out"
          ? status.at.toFixed(2) + "x"
          : status.kind === "burned"
            ? "—"
            : status.kind === "flying"
              ? "···"
              : "in"}
      </span>
    </li>
  );
}
