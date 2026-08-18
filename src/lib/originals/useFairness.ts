"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { fairFloats, seedHash } from "./fair";

export interface Fairness {
  serverSeed: string;
  /** Commitment published before play; the seed itself is revealed on rotate. */
  commitment: string;
  clientSeed: string;
  setClientSeed: (seed: string) => void;
  /** Rounds played on the current seed pair. */
  nonce: number;
  /** Draw the floats for the next round and advance the nonce. */
  draw: (count?: number) => number[];
  /** Burn the current seed pair and start a fresh one. */
  rotate: () => void;
  /** The seed revealed by the last rotate, if any. */
  revealed: string | null;
}

/**
 * Seeds are derived from the slug and a cycle counter rather than
 * `Math.random`, so nothing random is evaluated while rendering — the
 * server and client agree on the first frame.
 */
export function useFairness(slug: string): Fairness {
  const [cycle, setCycle] = useState(0);
  const [clientSeed, setClientSeed] = useState(`${slug}-player`);
  const [nonce, setNonce] = useState(0);
  const [revealed, setRevealed] = useState<string | null>(null);
  const cursor = useRef(0);

  const serverSeed = `rufescent:${slug}:${cycle}`;
  const commitment = useMemo(() => seedHash(serverSeed), [serverSeed]);

  const draw = useCallback(
    (count = 1) => {
      const n = cursor.current;
      cursor.current += 1;
      setNonce(n + 1);
      return fairFloats(serverSeed, clientSeed, n, count);
    },
    [serverSeed, clientSeed],
  );

  const rotate = useCallback(() => {
    setRevealed(serverSeed);
    cursor.current = 0;
    setNonce(0);
    setCycle((c) => c + 1);
  }, [serverSeed]);

  return { serverSeed, commitment, clientSeed, setClientSeed, nonce, draw, rotate, revealed };
}
