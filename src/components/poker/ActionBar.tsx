"use client";

import { useEffect, useState } from "react";
import type { Seat } from "@/lib/poker/types";
import type { HeroActions } from "@/lib/poker/useTable";
import { potSizedBets } from "@/lib/poker/engine";
import { cn, formatCompact } from "@/lib/format";
import { Chip } from "./Chips";

/**
 * The hero's controls. Mirrors a real client: fold / check-call / raise
 * with a slider, pot-relative shortcuts, and pre-action checkboxes that
 * fire the moment the turn arrives.
 */
export function ActionBar({
  hero,
  heroSeat,
  potTotal,
  currentBet,
  bigBlind,
}: {
  hero: HeroActions;
  heroSeat: Seat | null;
  potTotal: number;
  currentBet: number;
  bigBlind: number;
}) {
  const [desiredRaise, setRaiseTo] = useState(hero.minRaise);
  const [preAction, setPreAction] = useState<"fold" | "call" | "check" | null>(null);

  // Clamped on read: the legal range moves as the betting does, and deriving
  // it here avoids an effect that would re-anchor the slider a frame late.
  const raiseTo = Math.min(Math.max(desiredRaise, hero.minRaise), hero.maxRaise);

  // Fire any queued pre-action the moment the turn arrives. This effect
  // drives an external system (the table) off a state transition, and the
  // setState is only clearing the queue it just consumed.
  useEffect(() => {
    if (!hero.canAct || !preAction) return;
    const queued = preAction;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreAction(null);
    if (queued === "fold") hero.fold();
    else if (queued === "check" && hero.canCheck) hero.check();
    else if (queued === "call") hero.call();
  }, [hero, preAction]);

  const folded = heroSeat?.status === "folded";
  const busted = heroSeat?.status === "busted" || (heroSeat?.player?.stack ?? 0) === 0;
  const shortcuts = heroSeat ? potSizedBets(potTotal, currentBet, heroSeat) : [];
  const canRaise = hero.maxRaise > hero.minRaise - 1 && !busted;

  /* ---------- Waiting state: offer pre-actions ---------- */
  if (!hero.canAct) {
    if (folded || busted) {
      return (
        <div className="glass rounded-2xl px-4 py-3 text-center text-xs text-white/40">
          {folded ? "You folded — sitting out this hand" : "You're all in"}
        </div>
      );
    }

    return (
      <div className="glass rounded-2xl p-3">
        <p className="mb-2 text-center text-[0.625rem] uppercase tracking-widest text-white/30">
          Waiting for your turn
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <PreActionToggle
            label="Fold"
            active={preAction === "fold"}
            onToggle={() => setPreAction((p) => (p === "fold" ? null : "fold"))}
          />
          <PreActionToggle
            label={hero.toCall > 0 ? `Call ${formatCompact(hero.toCall)}` : "Check"}
            active={preAction === (hero.toCall > 0 ? "call" : "check")}
            onToggle={() =>
              setPreAction((p) => {
                const want = hero.toCall > 0 ? "call" : "check";
                return p === want ? null : want;
              })
            }
          />
          <PreActionToggle
            label="Check / Fold"
            active={preAction === "check"}
            onToggle={() => setPreAction((p) => (p === "check" ? null : "check"))}
          />
        </div>
      </div>
    );
  }

  /* ---------- Active turn ---------- */
  return (
    <div className="glass rounded-2xl p-3">
      {canRaise && (
        <div className="mb-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[0.625rem] uppercase tracking-widest text-white/35">
              Raise to
            </span>
            <span className="flex items-center gap-1.5">
              <Chip value={raiseTo} size="xs" />
              <span className="font-display text-sm font-semibold text-gold-200 tnum">
                {raiseTo.toLocaleString("en-IN")}
              </span>
              <span className="text-[0.625rem] text-white/35 tnum">
                {bigBlind > 0 ? `${(raiseTo / bigBlind).toFixed(1)}bb` : ""}
              </span>
            </span>
          </div>

          <input
            type="range"
            min={hero.minRaise}
            max={hero.maxRaise}
            step={Math.max(1, Math.round(bigBlind / 2))}
            value={raiseTo}
            aria-label="Raise amount"
            onChange={(e) => setRaiseTo(Number(e.target.value))}
            className={cn(
              "h-2 w-full cursor-pointer appearance-none rounded-full bg-obsidian-700 outline-none",
              "[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
              "[&::-webkit-slider-thumb]:border-obsidian-950 [&::-webkit-slider-thumb]:bg-linear-to-br",
              "[&::-webkit-slider-thumb]:from-gold-200 [&::-webkit-slider-thumb]:to-gold-500",
              "[&::-webkit-slider-thumb]:shadow-[0_2px_8px_-2px_var(--color-gold-400)]",
              "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-obsidian-950",
              "[&::-moz-range-thumb]:bg-gold-300",
            )}
          />

          <div className="mt-1.5 flex flex-wrap gap-1">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setRaiseTo(shortcut.amount)}
                className={cn(
                  "h-6 rounded-md border px-2 text-[0.625rem] font-medium transition-all",
                  raiseTo === shortcut.amount
                    ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
                    : "border-white/10 bg-white/4 text-white/55 hover:border-gold-400/30",
                )}
              >
                {shortcut.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRaiseTo(hero.maxRaise)}
              className={cn(
                "h-6 rounded-md border px-2 text-[0.625rem] font-semibold transition-all",
                raiseTo === hero.maxRaise
                  ? "border-ember-400 bg-ember-500/25 text-white"
                  : "border-ember-500/35 bg-ember-500/10 text-ember-200 hover:bg-ember-500/20",
              )}
            >
              All in
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <ActionButton tone="fold" onClick={hero.fold}>
          Fold
        </ActionButton>

        {hero.canCheck ? (
          <ActionButton tone="check" onClick={hero.check}>
            Check
          </ActionButton>
        ) : (
          <ActionButton tone="call" onClick={hero.call}>
            <span className="flex flex-col leading-tight">
              <span>Call</span>
              <span className="text-[0.625rem] opacity-80 tnum">
                {formatCompact(hero.toCall)}
              </span>
            </span>
          </ActionButton>
        )}

        <ActionButton
          tone="raise"
          disabled={!canRaise}
          onClick={() => hero.raiseTo(raiseTo)}
        >
          <span className="flex flex-col leading-tight">
            <span>{currentBet > 0 ? "Raise" : "Bet"}</span>
            <span className="text-[0.625rem] opacity-80 tnum">{formatCompact(raiseTo)}</span>
          </span>
        </ActionButton>
      </div>
    </div>
  );
}

/* ---------- Buttons ---------- */

const TONES = {
  fold: "border-white/12 bg-white/6 text-white/70 hover:bg-white/12",
  check: "border-back-500/35 bg-back-900/50 text-back-100 hover:bg-back-700/60",
  call: "border-back-500/45 bg-back-700/70 text-white hover:bg-back-700",
  raise:
    "border-gold-400/40 bg-linear-to-br from-ember-500 to-ember-700 text-white hover:from-ember-400 hover:to-ember-600",
} as const;

function ActionButton({
  tone,
  children,
  onClick,
  disabled,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-13 place-items-center rounded-xl border text-sm font-semibold",
        "transition-all duration-150 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-35",
        TONES[tone],
      )}
    >
      {children}
    </button>
  );
}

function PreActionToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={cn(
        "flex h-10 items-center justify-center gap-1.5 rounded-lg border text-[0.6875rem] font-medium transition-all",
        active
          ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
          : "border-white/10 bg-white/4 text-white/50 hover:border-white/20",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 rounded-[3px] border transition-colors",
          active ? "border-gold-300 bg-gold-300" : "border-white/25",
        )}
      />
      {label}
    </button>
  );
}
