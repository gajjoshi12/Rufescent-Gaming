"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { stepTick } from "@/lib/mock/sports";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * Simulated exchange feed.
 *
 * Rather than mutating the mock market data, this holds a *drift overlay*:
 * a signed number of price ticks per runner. Any component rendering a
 * runner applies the overlay to every price on that runner's ladder, so
 * back, lay and fixed prices all stay coherent with one another.
 *
 * Replacing this with a real WebSocket means keeping `drift` shaped the
 * same and pushing server messages into it.
 */

interface Drift {
  /** Signed tick offset from the seeded base price. */
  steps: number;
  /** Direction of the most recent move, for the flash animation. */
  dir: "up" | "down" | null;
  /** Increments on every change so consumers can key their animation. */
  seq: number;
}

interface LiveOddsValue {
  /** Register a runner as on-screen so the feed knows to move it. */
  watch: (runnerId: string) => void;
  unwatch: (runnerId: string) => void;
  getDrift: (runnerId: string) => Drift;
  /** Apply this runner's drift to a base decimal price. */
  applyDrift: (runnerId: string, basePrice: number) => number;
  /** Global feed toggle, surfaced in the header as a "Live" pill. */
  streaming: boolean;
  setStreaming: (on: boolean) => void;
  /** Bumps once per feed tick — cheap way for consumers to re-render. */
  tick: number;
}

const NO_DRIFT: Drift = { steps: 0, dir: null, seq: 0 };
const LiveOddsContext = createContext<LiveOddsValue | null>(null);

/** How often the mock feed pushes a batch of price moves. */
const TICK_MS = 2600;
/** Fraction of watched runners that move on any given tick. */
const MOVE_RATE = 0.22;
/** Prices are pulled back toward their seed so they don't wander off. */
const MEAN_REVERSION = 3;

export function LiveOddsProvider({ children }: { children: React.ReactNode }) {
  const [drift, setDrift] = useState<Record<string, Drift>>({});
  const [tick, setTick] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  /** Ref-counted so two components watching the same runner behave. */
  const watched = useRef<Map<string, number>>(new Map());
  /** Deterministic-ish cursor; seeded from the tick count, not Math.random. */
  const cursor = useRef(1);

  const watch = useCallback((runnerId: string) => {
    watched.current.set(runnerId, (watched.current.get(runnerId) ?? 0) + 1);
  }, []);

  const unwatch = useCallback((runnerId: string) => {
    const count = (watched.current.get(runnerId) ?? 0) - 1;
    if (count <= 0) watched.current.delete(runnerId);
    else watched.current.set(runnerId, count);
  }, []);

  useEffect(() => {
    if (!streaming) return;

    const id = setInterval(() => {
      const ids = [...watched.current.keys()];
      if (ids.length === 0) return;

      setDrift((previous) => {
        const next = { ...previous };
        const moveCount = Math.max(1, Math.round(ids.length * MOVE_RATE));

        for (let i = 0; i < moveCount; i++) {
          // xorshift cursor — avoids Math.random so behaviour is reproducible.
          cursor.current ^= cursor.current << 13;
          cursor.current ^= cursor.current >>> 17;
          cursor.current ^= cursor.current << 5;
          const roll = Math.abs(cursor.current);

          const runnerId = ids[roll % ids.length];
          const current = next[runnerId] ?? NO_DRIFT;

          // Bias the direction back toward zero once the price has strayed.
          const pull = current.steps / MEAN_REVERSION;
          const up = (roll >>> 8) % 100 < 50 - pull * 12;
          const delta = up ? 1 : -1;
          const steps = Math.max(-6, Math.min(6, current.steps + delta));
          if (steps === current.steps) continue;

          next[runnerId] = {
            steps,
            dir: delta > 0 ? "up" : "down",
            seq: current.seq + 1,
          };
        }
        return next;
      });

      setTick((t) => t + 1);
    }, reducedMotion ? TICK_MS * 2 : TICK_MS);

    return () => clearInterval(id);
  }, [streaming, reducedMotion]);

  const getDrift = useCallback((runnerId: string) => drift[runnerId] ?? NO_DRIFT, [drift]);

  const applyDrift = useCallback(
    (runnerId: string, basePrice: number) => {
      const steps = drift[runnerId]?.steps ?? 0;
      return steps === 0 ? basePrice : stepTick(basePrice, steps);
    },
    [drift],
  );

  const value = useMemo(
    () => ({ watch, unwatch, getDrift, applyDrift, streaming, setStreaming, tick }),
    [watch, unwatch, getDrift, applyDrift, streaming, tick],
  );

  return <LiveOddsContext.Provider value={value}>{children}</LiveOddsContext.Provider>;
}

export function useLiveOdds(): LiveOddsValue {
  const ctx = useContext(LiveOddsContext);
  if (!ctx) throw new Error("useLiveOdds must be used inside <LiveOddsProvider>");
  return ctx;
}

/**
 * Subscribe a single runner to the feed for as long as it is mounted,
 * and get back its live price plus the direction of the last move.
 */
export function useRunnerPrice(
  runnerId: string,
  basePrice: number,
  active = true,
): { price: number; dir: "up" | "down" | null; seq: number } {
  const { watch, unwatch, getDrift, applyDrift } = useLiveOdds();

  useEffect(() => {
    if (!active) return;
    watch(runnerId);
    return () => unwatch(runnerId);
  }, [runnerId, active, watch, unwatch]);

  if (!active) return { price: basePrice, dir: null, seq: 0 };
  const { dir, seq } = getDrift(runnerId);
  return { price: applyDrift(runnerId, basePrice), dir, seq };
}
