"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card, Seat, Street, TableState } from "./types";
import {
  actionableSeats,
  activeSeats,
  buildPots,
  decideBotAction,
  evaluate,
  freshDeck,
  liveSeats,
  nextSeatIndex,
  shuffle,
} from "./engine";
import { HERO, buildPlayers } from "./mock";
import { hashCode, seeded } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * Drives a single Hold'em table.
 *
 * This is the seam where a real product would swap in a socket: replace the
 * internal `advance` loop with messages from a dealer authority and keep
 * `TableState` as the wire format. Everything downstream renders from state
 * alone, so no component would change.
 */

export interface HeroActions {
  canAct: boolean;
  toCall: number;
  canCheck: boolean;
  minRaise: number;
  maxRaise: number;
  fold: () => void;
  check: () => void;
  call: () => void;
  raiseTo: (total: number) => void;
}

const BOT_DELAY = { min: 700, max: 1900 };
const STREET_PAUSE = 1100;
const SHOWDOWN_PAUSE = 3600;

interface Config {
  tableId: string;
  seatCount: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
}

export function useTable(config: Config) {
  // seatCount and startingStack are consumed by initialState(config) below.
  const { tableId, smallBlind, bigBlind, ante } = config;
  const reduced = usePrefersReducedMotion();

  const [state, setState] = useState<TableState>(() => initialState(config));
  const deckRef = useRef<Card[]>([]);
  const handSeed = useRef(hashCode(tableId));

  /**
   * The deal animation gate is derived, not a timer-owned boolean: under
   * StrictMode the mount/cleanup/remount cycle would clear a scheduled
   * `setDealing(false)` while a ref guard stopped it being rescheduled,
   * leaving every downstream effect blocked forever.
   */
  const [dealtHand, setDealtHand] = useState(0);
  const dealing = state.handNumber > dealtHand;

  useEffect(() => {
    if (!dealing) return;
    const timer = setTimeout(
      () => setDealtHand(state.handNumber),
      reduced ? 0 : 900,
    );
    return () => clearTimeout(timer);
  }, [dealing, state.handNumber, reduced]);

  /* ---------- Hand lifecycle ---------- */

  const startHand = useCallback(() => {
    handSeed.current += 1;
    const seed = handSeed.current;

    setState((previous) => {
      const deck = shuffle(freshDeck(), seed);
      deckRef.current = deck;

      // Rotate the button, then post blinds from the seats after it.
      const seats = previous.seats.map<Seat>((seat) => ({
        ...seat,
        holeCards: [],
        committed: 0,
        totalCommitted: 0,
        lastAction: null,
        lastActionAmount: 0,
        handLabel: undefined,
        isWinner: false,
        status: seat.player
          ? seat.player.stack > 0
            ? "active"
            : "busted"
          : "sitting-out",
      }));

      const live = seats.filter((s) => s.status === "active");
      if (live.length < 2) return previous;

      const buttonIndex = nextSeatIndex(seats, previous.buttonIndex);
      let cursor = buttonIndex;
      let cardIndex = 0;

      // Two cards to each live seat, clockwise from the button.
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < live.length; i++) {
          cursor = nextSeatIndex(seats, cursor);
          const seat = seats.find((s) => s.index === cursor)!;
          seat.holeCards = [...seat.holeCards, deck[cardIndex++]];
        }
      }

      // Antes.
      if (ante > 0) {
        for (const seat of live) {
          const paid = Math.min(ante, seat.player!.stack);
          seat.player = { ...seat.player!, stack: seat.player!.stack - paid };
          seat.totalCommitted += paid;
        }
      }

      const sbIndex = nextSeatIndex(seats, buttonIndex);
      const bbIndex = nextSeatIndex(seats, sbIndex);
      post(seats, sbIndex, smallBlind);
      post(seats, bbIndex, bigBlind);

      const toAct = nextSeatIndex(seats, bbIndex);

      return {
        ...previous,
        handNumber: previous.handNumber + 1,
        street: "preflop",
        seats,
        board: [],
        pots: buildPots(seats),
        buttonIndex,
        toActSeatId: seats.find((s) => s.index === toAct)?.id ?? null,
        currentBet: bigBlind,
        minRaise: bigBlind,
        smallBlind,
        bigBlind,
        ante,
        log: [
          `Hand #${previous.handNumber + 1} — blinds ${smallBlind}/${bigBlind}${ante ? ` ante ${ante}` : ""}`,
        ],
      };
    });
  }, [smallBlind, bigBlind, ante]);

  // Deal the first hand once on mount.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startHand();
  }, [startHand]);

  /* ---------- Applying an action ---------- */

  const applyAction = useCallback(
    (seatId: string, decision: { kind: "fold" | "check" | "call" | "raise"; to?: number }) => {
      setState((previous) => {
        const seats = previous.seats.map((s) => ({ ...s, player: s.player ? { ...s.player } : null }));
        const seat = seats.find((s) => s.id === seatId);
        if (!seat?.player || previous.toActSeatId !== seatId) return previous;

        const log = [...previous.log];
        let { currentBet, minRaise } = previous;
        const name = seat.player.isHero ? "You" : seat.player.name.split(" ")[0];

        if (decision.kind === "fold") {
          seat.status = "folded";
          seat.lastAction = "fold";
          log.push(`${name} folds`);
        } else if (decision.kind === "check") {
          seat.lastAction = "check";
          log.push(`${name} checks`);
        } else if (decision.kind === "call") {
          const owed = Math.min(currentBet - seat.committed, seat.player.stack);
          seat.player.stack -= owed;
          seat.committed += owed;
          seat.totalCommitted += owed;
          seat.lastAction = seat.player.stack === 0 ? "all-in" : "call";
          seat.lastActionAmount = owed;
          if (seat.player.stack === 0) seat.status = "all-in";
          log.push(`${name} calls ${owed.toLocaleString("en-IN")}`);
        } else {
          const target = Math.min(decision.to ?? 0, seat.committed + seat.player.stack);
          const delta = target - seat.committed;
          seat.player.stack -= delta;
          seat.committed = target;
          seat.totalCommitted += delta;
          const isAllIn = seat.player.stack === 0;
          seat.status = isAllIn ? "all-in" : "active";
          seat.lastAction = isAllIn ? "all-in" : currentBet === 0 ? "bet" : "raise";
          seat.lastActionAmount = target;
          minRaise = Math.max(minRaise, target - currentBet);
          currentBet = Math.max(currentBet, target);
          log.push(
            isAllIn
              ? `${name} is all in for ${target.toLocaleString("en-IN")}`
              : `${name} raises to ${target.toLocaleString("en-IN")}`,
          );
        }

        const pots = buildPots(seats);

        // Hand ends immediately if everyone else folded.
        if (liveSeats(seats).length === 1) {
          return award(
            { ...previous, seats, pots, currentBet, minRaise, log, toActSeatId: null },
            true,
          );
        }

        // Street complete when everyone still able to act has matched the bet
        // and has had a turn.
        const pending = actionableSeats(seats).filter(
          (s) => s.committed < currentBet || s.lastAction === null,
        );

        if (pending.length === 0) {
          return { ...previous, seats, pots, currentBet, minRaise, log, toActSeatId: null };
        }

        let nextIndex = seat.index;
        let guard = 0;
        do {
          nextIndex = nextSeatIndex(seats, nextIndex);
          guard++;
        } while (
          guard <= seats.length &&
          !actionableSeats(seats).some((s) => s.index === nextIndex)
        );

        return {
          ...previous,
          seats,
          pots,
          currentBet,
          minRaise,
          log,
          toActSeatId: seats.find((s) => s.index === nextIndex)?.id ?? null,
        };
      });
    },
    [],
  );

  /* ---------- Street progression ---------- */

  useEffect(() => {
    // handNumber 0 is the pre-deal state, which also has no seat to act.
    // Without this guard the first render would schedule a street advance
    // and skip the entire preflop betting round.
    if (state.handNumber === 0) return;
    if (state.toActSeatId !== null || dealing) return;
    if (state.street === "showdown") return;

    const live = liveSeats(state.seats);
    if (live.length <= 1) return;

    const next: Record<Street, Street> = {
      preflop: "flop",
      flop: "turn",
      turn: "river",
      river: "showdown",
      showdown: "showdown",
    };

    // Owns its timer so a state change cancels a transition that is no
    // longer correct, rather than letting a stale one fire.
    const timer = setTimeout(() => {
      setState((previous) => {
        const street = next[previous.street];
        const deck = deckRef.current;
        // Burn one, then peel: 17 leaves room for 9 seats × 2 hole cards.
        const dealt = previous.board.length;
        const start = 18 + dealt;
        const board =
          street === "flop"
            ? deck.slice(start, start + 3)
            : street === "showdown"
              ? previous.board
              : [...previous.board, deck[start]];

        const seats = previous.seats.map((s) => ({
          ...s,
          committed: 0,
          lastAction: null,
          lastActionAmount: 0,
        }));

        if (street === "showdown") {
          return award({ ...previous, street, seats, toActSeatId: null }, false);
        }

        const label = street === "flop" ? "Flop" : street === "turn" ? "Turn" : "River";
        const shown = street === "flop" ? board : board.slice(-1);

        // Everyone all-in: run it out with no more betting.
        const canBet = actionableSeats(seats).length > 1;
        const firstToAct = canBet
          ? seats.find((s) => actionableSeats(seats).some((a) => a.id === s.id))?.id ?? null
          : null;

        return {
          ...previous,
          street,
          board,
          seats,
          currentBet: 0,
          minRaise: previous.bigBlind,
          toActSeatId: firstToAct,
          log: [...previous.log, `${label}: ${shown.map(cardText).join(" ")}`],
        };
      });
    }, reduced ? 200 : STREET_PAUSE);

    return () => clearTimeout(timer);
  }, [
    state.handNumber, state.toActSeatId, state.street, state.seats,
    dealing, reduced,
  ]);

  /* ---------- Bot turns ---------- */

  useEffect(() => {
    if (!state.toActSeatId || dealing) return;
    const seat = state.seats.find((s) => s.id === state.toActSeatId);
    if (!seat?.player || seat.player.isHero) return;

    const rng = seeded(hashCode(`${state.handNumber}:${seat.id}:${state.street}:${state.currentBet}`));
    const potTotal = state.pots.reduce((sum, p) => sum + p.amount, 0);
    const decision = decideBotAction(
      seat,
      state.board,
      state.currentBet,
      state.minRaise,
      potTotal,
      rng,
      state.bigBlind,
    );

    const delay = reduced
      ? 220
      : BOT_DELAY.min + rng() * (BOT_DELAY.max - BOT_DELAY.min);

    const timer = setTimeout(() => applyAction(seat.id, decision), delay);
    return () => clearTimeout(timer);
  }, [
    state.toActSeatId, state.handNumber, state.street, state.currentBet,
    state.seats, state.board, state.pots, state.minRaise, state.bigBlind,
    dealing, applyAction, reduced,
  ]);

  /* ---------- Auto-deal the next hand ---------- */

  useEffect(() => {
    if (state.street !== "showdown") return;
    const timer = setTimeout(startHand, reduced ? 900 : SHOWDOWN_PAUSE);
    return () => clearTimeout(timer);
  }, [state.street, state.handNumber, startHand, reduced]);

  /* ---------- Hero controls ---------- */

  const heroSeat = state.seats.find((s) => s.player?.isHero) ?? null;

  const hero = useMemo<HeroActions>(() => {
    const canAct = Boolean(heroSeat && state.toActSeatId === heroSeat.id && !dealing);
    const toCall = heroSeat ? Math.max(0, state.currentBet - heroSeat.committed) : 0;
    const stack = heroSeat?.player?.stack ?? 0;
    const maxRaise = (heroSeat?.committed ?? 0) + stack;

    return {
      canAct,
      toCall: Math.min(toCall, stack),
      canCheck: toCall === 0,
      minRaise: Math.min(maxRaise, state.currentBet + state.minRaise),
      maxRaise,
      fold: () => heroSeat && applyAction(heroSeat.id, { kind: "fold" }),
      check: () => heroSeat && applyAction(heroSeat.id, { kind: "check" }),
      call: () => heroSeat && applyAction(heroSeat.id, { kind: "call" }),
      raiseTo: (total: number) => heroSeat && applyAction(heroSeat.id, { kind: "raise", to: total }),
    };
  }, [heroSeat, state.toActSeatId, state.currentBet, state.minRaise, dealing, applyAction]);

  const potTotal = state.pots.reduce((sum, p) => sum + p.amount, 0);

  return { state, hero, heroSeat, potTotal, dealing, startHand };
}

/* ============================================================
   Helpers
   ============================================================ */

function post(seats: Seat[], index: number, amount: number): void {
  const seat = seats.find((s) => s.index === index);
  if (!seat?.player) return;
  const paid = Math.min(amount, seat.player.stack);
  seat.player = { ...seat.player, stack: seat.player.stack - paid };
  seat.committed = paid;
  seat.totalCommitted += paid;
  seat.lastAction = "post";
  seat.lastActionAmount = paid;
  if (seat.player.stack === 0) seat.status = "all-in";
}

/** Settle every pot and mark winners. */
function award(previous: TableState, uncontested: boolean): TableState {
  const seats = previous.seats.map((s) => ({ ...s, player: s.player ? { ...s.player } : null }));
  const pots = previous.pots.length ? previous.pots : buildPots(seats);
  const log = [...previous.log];

  for (const pot of pots) {
    const contenders = seats.filter((s) => pot.eligible.includes(s.id) && s.status !== "folded");
    if (contenders.length === 0) continue;

    let winners = contenders;
    if (!uncontested && contenders.length > 1) {
      const scored = contenders.map((seat) => ({
        seat,
        result: evaluate([...seat.holeCards, ...previous.board]),
      }));
      const best = Math.max(...scored.map((s) => s.result.score));
      for (const entry of scored) entry.seat.handLabel = entry.result.label;
      winners = scored.filter((s) => s.result.score === best).map((s) => s.seat);
    }

    const share = Math.floor(pot.amount / winners.length);
    for (const winner of winners) {
      if (winner.player) winner.player.stack += share;
      winner.isWinner = true;
    }

    const names = winners.map((w) => (w.player?.isHero ? "You" : w.player!.name.split(" ")[0]));
    log.push(
      uncontested
        ? `${names[0]} wins ${pot.amount.toLocaleString("en-IN")} uncontested`
        : `${names.join(" and ")} ${winners.length > 1 ? "split" : "wins"} ${pot.label.toLowerCase()} — ${pot.amount.toLocaleString("en-IN")}${winners[0].handLabel ? ` with ${winners[0].handLabel.toLowerCase()}` : ""}`,
    );
  }

  return { ...previous, seats, pots, street: "showdown", toActSeatId: null, log };
}

function cardText(card: Card): string {
  const ranks: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const suits: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
  return `${ranks[card.rank] ?? card.rank}${suits[card.suit]}`;
}

function initialState(config: Config): TableState {
  const { tableId, seatCount, startingStack, smallBlind, bigBlind, ante } = config;
  const opponents = buildPlayers(tableId, seatCount - 1, startingStack);

  const seats: Seat[] = Array.from({ length: seatCount }, (_, index) => ({
    id: `${tableId}-s${index}`,
    index,
    player:
      index === 0
        ? { ...HERO, id: `${tableId}-hero`, stack: startingStack }
        : opponents[index - 1] ?? null,
    status: "active",
    holeCards: [],
    committed: 0,
    totalCommitted: 0,
    lastAction: null,
    lastActionAmount: 0,
  }));

  return {
    handNumber: 0,
    street: "preflop",
    seats,
    board: [],
    pots: [],
    buttonIndex: seatCount - 1,
    toActSeatId: null,
    currentBet: 0,
    minRaise: bigBlind,
    smallBlind,
    bigBlind,
    ante,
    log: [],
  };
}

export { activeSeats, liveSeats };
