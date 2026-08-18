"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One demo bankroll shared by every Original.
 *
 * Module-level rather than context: the games live on separate routes, and
 * a player who wins on Mines expects that balance when they open Aviator.
 * The server snapshot is the constant opening balance, so hydration matches
 * on a fresh load.
 */

export const OPENING_BALANCE = 10_000;

let balance = OPENING_BALANCE;
let wagered = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fils precision — floating-point dust would show up in the balance chip. */
function fils(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface Bankroll {
  balance: number;
  wagered: number;
  /** Debit a stake. Returns false (and does nothing) if funds are short. */
  stake: (amount: number) => boolean;
  /** Credit a payout. */
  credit: (amount: number) => void;
  reset: () => void;
}

export function useBankroll(): Bankroll {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => balance,
    () => OPENING_BALANCE,
  );
  const turnover = useSyncExternalStore(
    subscribe,
    () => wagered,
    () => 0,
  );

  const stake = useCallback((amount: number) => {
    if (!(amount > 0) || amount > balance + 1e-9) return false;
    balance = fils(balance - amount);
    wagered = fils(wagered + amount);
    emit();
    return true;
  }, []);

  const credit = useCallback((amount: number) => {
    if (!(amount > 0)) return;
    balance = fils(balance + amount);
    emit();
  }, []);

  const reset = useCallback(() => {
    balance = OPENING_BALANCE;
    wagered = 0;
    emit();
  }, []);

  return { balance: snapshot, wagered: turnover, stake, credit, reset };
}
