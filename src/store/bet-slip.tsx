"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BetSide, Selection, SlipMode } from "@/lib/types";
import { backProfit, layLiability, parlayOdds } from "@/lib/format";
import { usePersistentState } from "@/lib/hooks";

export interface PlacedReceipt {
  id: string;
  mode: SlipMode;
  legs: number;
  stake: number;
  potentialReturn: number;
  placedAt: number;
}

interface BetSlipValue {
  selections: Selection[];
  mode: SlipMode;
  open: boolean;
  placing: boolean;
  receipt: PlacedReceipt | null;
  acceptAnyPrice: boolean;

  add: (selection: Omit<Selection, "id" | "stake">) => void;
  remove: (id: string) => void;
  toggle: (selection: Omit<Selection, "id" | "stake">) => void;
  clear: () => void;
  has: (marketId: string, runnerId: string, side: BetSide) => boolean;

  setStake: (id: string, stake: number | undefined) => void;
  setAllStakes: (stake: number) => void;
  setMode: (mode: SlipMode) => void;
  setOpen: (open: boolean) => void;
  setAcceptAnyPrice: (accept: boolean) => void;
  dismissReceipt: () => void;
  place: () => Promise<void>;

  /** Derived totals for the footer. */
  totals: {
    count: number;
    totalStake: number;
    potentialReturn: number;
    /** Exposure from lay legs, which is what the account is actually risking. */
    liability: number;
    combinedOdds: number;
    /** True when the slip cannot be submitted. */
    blocked: boolean;
    blockReason: string | null;
  };
}

const BetSlipContext = createContext<BetSlipValue | null>(null);

/** Stakes below this are rejected, matching a typical platform minimum. */
export const MIN_STAKE = 10;
export const QUICK_STAKES = [50, 100, 500, 1000, 2500];
/** A parlay needs at least two legs, and no book takes more than this many. */
export const MAX_LEGS = 12;

function selectionKey(s: Pick<Selection, "marketId" | "runnerId" | "side">): string {
  return `${s.marketId}::${s.runnerId}::${s.side}`;
}

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = usePersistentState<Selection[]>("ruf.betslip", []);
  const [mode, setModeRaw] = useState<SlipMode>("single");
  const [open, setOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<PlacedReceipt | null>(null);
  const [acceptAnyPrice, setAcceptAnyPrice] = useState(true);

  const add = useCallback(
    (incoming: Omit<Selection, "id" | "stake">) => {
      setSelections((current) => {
        const key = selectionKey(incoming);
        if (current.some((s) => s.id === key)) return current;
        if (current.length >= MAX_LEGS) return current;

        // A market can only appear once in a parlay, so adding a second
        // runner from the same market replaces the first.
        const withoutSameMarket = current.filter((s) => s.marketId !== incoming.marketId);
        return [...withoutSameMarket, { ...incoming, id: key }];
      });
      setOpen(true);
      setReceipt(null);
    },
    [setSelections],
  );

  const remove = useCallback(
    (id: string) => setSelections((current) => current.filter((s) => s.id !== id)),
    [setSelections],
  );

  const toggle = useCallback(
    (incoming: Omit<Selection, "id" | "stake">) => {
      const key = selectionKey(incoming);
      setSelections((current) => {
        if (current.some((s) => s.id === key)) return current.filter((s) => s.id !== key);
        if (current.length >= MAX_LEGS) return current;
        const withoutSameMarket = current.filter((s) => s.marketId !== incoming.marketId);
        setOpen(true);
        return [...withoutSameMarket, { ...incoming, id: key }];
      });
      setReceipt(null);
    },
    [setSelections],
  );

  const clear = useCallback(() => {
    setSelections([]);
    setReceipt(null);
  }, [setSelections]);

  const has = useCallback(
    (marketId: string, runnerId: string, side: BetSide) =>
      selections.some((s) => s.id === `${marketId}::${runnerId}::${side}`),
    [selections],
  );

  const setStake = useCallback(
    (id: string, stake: number | undefined) =>
      setSelections((current) => current.map((s) => (s.id === id ? { ...s, stake } : s))),
    [setSelections],
  );

  const setAllStakes = useCallback(
    (stake: number) => setSelections((current) => current.map((s) => ({ ...s, stake }))),
    [setSelections],
  );

  const setMode = useCallback((next: SlipMode) => {
    setModeRaw(next);
    setReceipt(null);
  }, []);

  const totals = useMemo(() => {
    const count = selections.length;
    const combinedOdds = parlayOdds(selections.map((s) => s.odds));

    if (mode === "single") {
      let totalStake = 0;
      let potentialReturn = 0;
      let liability = 0;
      for (const s of selections) {
        const stake = s.stake ?? 0;
        totalStake += stake;
        if (s.side === "back") {
          potentialReturn += stake + backProfit(stake, s.odds);
        } else {
          // Laying wins the backer's stake and risks the liability.
          potentialReturn += stake;
          liability += layLiability(stake, s.odds);
        }
      }
      const staked = selections.filter((s) => (s.stake ?? 0) > 0);
      const anyBelowMin = staked.some((s) => (s.stake ?? 0) < MIN_STAKE);
      return {
        count,
        totalStake,
        potentialReturn,
        liability,
        combinedOdds,
        blocked: count === 0 || staked.length === 0 || anyBelowMin,
        blockReason:
          count === 0
            ? "Add a selection to get started"
            : staked.length === 0
              ? "Enter a stake"
              : anyBelowMin
                ? `Minimum stake is AED ${MIN_STAKE} per bet`
                : null,
      };
    }

    // Multi / system: one stake drives the whole slip.
    const stake = selections[0]?.stake ?? 0;
    const hasLayLeg = selections.some((s) => s.side === "lay");
    return {
      count,
      totalStake: stake,
      potentialReturn: stake * combinedOdds,
      liability: hasLayLeg ? stake * (combinedOdds - 1) : 0,
      combinedOdds,
      blocked: count < 2 || stake < MIN_STAKE,
      blockReason:
        count < 2
          ? "A multi needs at least 2 selections"
          : stake < MIN_STAKE
            ? `Minimum stake is AED ${MIN_STAKE}`
            : null,
    };
  }, [selections, mode]);

  const place = useCallback(async () => {
    if (totals.blocked) return;
    setPlacing(true);
    // Stands in for the POST /bets round-trip.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    setReceipt({
      id: `BET-${selections.length}${Math.round(totals.totalStake)}${totals.count}`.toUpperCase(),
      mode,
      legs: selections.length,
      stake: totals.totalStake,
      potentialReturn: totals.potentialReturn,
      placedAt: Date.now(),
    });
    setSelections([]);
    setPlacing(false);
  }, [totals, mode, selections.length, setSelections]);

  const dismissReceipt = useCallback(() => setReceipt(null), []);

  const value = useMemo<BetSlipValue>(
    () => ({
      selections,
      mode,
      open,
      placing,
      receipt,
      acceptAnyPrice,
      add,
      remove,
      toggle,
      clear,
      has,
      setStake,
      setAllStakes,
      setMode,
      setOpen,
      setAcceptAnyPrice,
      dismissReceipt,
      place,
      totals,
    }),
    [
      selections, mode, open, placing, receipt, acceptAnyPrice,
      add, remove, toggle, clear, has, setStake, setAllStakes,
      setMode, dismissReceipt, place, totals,
    ],
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside <BetSlipProvider>");
  return ctx;
}
