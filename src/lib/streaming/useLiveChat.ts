"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";
import { nextChatMessage, seedChat } from "./mock";
import { usePrefersReducedMotion } from "@/lib/hooks";

/** Keep the transcript bounded — a long session would otherwise grow forever. */
const MAX_MESSAGES = 120;

/**
 * A rolling chat for a stream.
 *
 * Messages arrive on a timer rather than a socket. Swapping this for a real
 * feed means replacing the interval with a subscription and keeping `send`
 * as the outbound call — nothing downstream would change.
 */
export function useLiveChat(streamId: string, viewers: number) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedChat(streamId));
  const [paused, setPaused] = useState(false);
  const sequence = useRef(0);
  const reduced = usePrefersReducedMotion();

  // Busier streams talk faster, within reason.
  const intervalMs = Math.max(900, 5200 - Math.min(viewers, 6000) * 0.6);

  useEffect(() => {
    if (paused) return;

    const id = setInterval(
      () => {
        sequence.current += 1;
        const message = nextChatMessage(streamId, sequence.current);
        setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
      },
      reduced ? intervalMs * 2 : intervalMs,
    );

    return () => clearInterval(id);
  }, [streamId, intervalMs, paused, reduced]);

  const send = useCallback((body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    sequence.current += 1;
    setMessages((current) =>
      [
        ...current,
        {
          id: `${streamId}-you-${sequence.current}`,
          kind: "message" as const,
          author: "You",
          authorHue: 18,
          body: trimmed.slice(0, 200),
          at: 1000 + sequence.current,
          isYou: true,
        },
      ].slice(-MAX_MESSAGES),
    );
  }, [streamId]);

  const tip = useCallback((amount: number) => {
    sequence.current += 1;
    setMessages((current) =>
      [
        ...current,
        {
          id: `${streamId}-tip-${sequence.current}`,
          kind: "tip" as const,
          author: "You",
          authorHue: 18,
          body: "sent a tip",
          amount,
          at: 1000 + sequence.current,
          isYou: true,
        },
      ].slice(-MAX_MESSAGES),
    );
  }, [streamId]);

  return { messages, send, tip, paused, setPaused };
}

/**
 * Viewer count that drifts while you watch. Starts at the seeded value so
 * the server-rendered number matches, then wanders on the client.
 */
export function useViewerCount(base: number): number {
  const [drift, setDrift] = useState(0);
  const cursor = useRef(1);

  useEffect(() => {
    const id = setInterval(() => {
      // xorshift rather than Math.random, to stay consistent with the rest
      // of the app's deterministic-by-default approach.
      cursor.current ^= cursor.current << 13;
      cursor.current ^= cursor.current >>> 17;
      cursor.current ^= cursor.current << 5;
      const step = (Math.abs(cursor.current) % 21) - 10;
      setDrift((d) => Math.max(-base * 0.15, Math.min(base * 0.2, d + step)));
    }, 4000);
    return () => clearInterval(id);
  }, [base]);

  return Math.max(1, Math.round(base + drift));
}
