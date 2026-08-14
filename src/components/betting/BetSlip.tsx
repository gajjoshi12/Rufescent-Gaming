"use client";

import { useState } from "react";
import { cn, formatMoney, layLiability } from "@/lib/format";
import type { Selection } from "@/lib/types";
import { MIN_STAKE, QUICK_STAKES, useBetSlip } from "@/store/bet-slip";
import { useSession } from "@/store/session";
import { useOddsFormat } from "@/store/odds-format";
import { Badge, Button, Divider, EmptyState, Segmented, Toggle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

/* ============================================================
   Shared slip body — used by both the mobile sheet and desktop rail
   ============================================================ */

function SlipBody() {
  const {
    selections, mode, setMode, setStake, setAllStakes, remove, clear,
    totals, acceptAnyPrice, setAcceptAnyPrice,
  } = useBetSlip();
  const { render } = useOddsFormat();

  if (selections.length === 0) {
    return (
      <EmptyState
        icon="🎟"
        title="Your bet slip is empty"
        message="Tap any price across sports or in-play to add a selection."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Segmented
        label="Bet type"
        value={mode}
        onChange={setMode}
        size="sm"
        stretch
        options={[
          { key: "single", label: "Singles", badge: selections.length },
          { key: "multi", label: "Multi", badge: selections.length >= 2 ? render(totals.combinedOdds) : undefined },
          { key: "system", label: "System" },
        ]}
      />

      <ul className="space-y-2">
        {selections.map((selection) => (
          <SlipLeg
            key={selection.id}
            selection={selection}
            showStake={mode === "single"}
            onStake={(value) => setStake(selection.id, value)}
            onRemove={() => remove(selection.id)}
          />
        ))}
      </ul>

      {mode !== "single" && (
        <div className="glass-soft rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-white/55">
              {mode === "multi" ? `${selections.length}-fold multi` : "System bet"}
            </span>
            <span className="font-semibold text-gold-300 tnum">{render(totals.combinedOdds)}</span>
          </div>
          <StakeInput
            value={selections[0]?.stake}
            onChange={(value) => setAllStakes(value ?? 0)}
            ariaLabel="Multi stake"
          />
        </div>
      )}

      <QuickStakes onPick={(amount) => setAllStakes(amount)} />

      <Divider />

      <Toggle
        checked={acceptAnyPrice}
        onChange={setAcceptAnyPrice}
        label="Accept any price change"
        description="Keeps your bet live if the market moves before it's matched."
      />

      <button
        type="button"
        onClick={clear}
        className="w-full rounded-lg py-2 text-xs text-white/35 transition-colors hover:text-loss"
      >
        Clear all selections
      </button>
    </div>
  );
}

function SlipLeg({
  selection,
  showStake,
  onStake,
  onRemove,
}: {
  selection: Selection;
  showStake: boolean;
  onStake: (value: number | undefined) => void;
  onRemove: () => void;
}) {
  const { render } = useOddsFormat();
  const stake = selection.stake ?? 0;
  const isLay = selection.side === "lay";
  const potential = isLay ? stake : stake * selection.odds;
  const risk = isLay ? layLiability(stake, selection.odds) : stake;

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-xl border p-3",
        isLay ? "border-lay-500/25 bg-lay-900/25" : "border-back-500/25 bg-back-900/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Badge tone={isLay ? "lay" : "back"}>{isLay ? "Lay" : "Back"}</Badge>
            {selection.inPlay && <Badge tone="live">In-play</Badge>}
          </div>
          <p className="truncate text-sm font-medium text-white">{selection.runnerLabel}</p>
          <p className="truncate text-[0.6875rem] text-white/40">
            {selection.marketLabel} · {selection.matchLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg bg-black/25 px-2 py-1 text-sm font-semibold tnum">
            {render(selection.odds)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${selection.runnerLabel}`}
            className="grid size-6 place-items-center rounded-md text-white/35 transition-colors hover:bg-white/10 hover:text-loss"
          >
            <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {showStake && (
        <div className="mt-2.5 space-y-1.5">
          <StakeInput
            value={selection.stake}
            onChange={onStake}
            ariaLabel={`Stake for ${selection.runnerLabel}`}
          />
          {stake > 0 && (
            <div className="flex items-center justify-between text-[0.6875rem]">
              <span className="text-white/40">
                {isLay ? "Liability" : "Stake"} {formatMoney(risk, { decimals: false })}
              </span>
              <span className="font-medium text-win tnum">
                Returns {formatMoney(potential, { decimals: false })}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function StakeInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  ariaLabel: string;
}) {
  const below = value !== undefined && value > 0 && value < MIN_STAKE;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
        ₹
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={MIN_STAKE}
        step={10}
        value={value ?? ""}
        placeholder="0"
        aria-label={ariaLabel}
        aria-invalid={below || undefined}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          onChange(e.target.value === "" || Number.isNaN(parsed) ? undefined : parsed);
        }}
        className={cn(
          "h-10 w-full rounded-lg border bg-obsidian-950/60 pl-7 pr-3 text-sm font-semibold text-white tnum",
          "outline-none transition-colors placeholder:font-normal placeholder:text-white/25",
          below ? "border-loss/60" : "border-white/12 focus:border-gold-400/50",
        )}
      />
    </div>
  );
}

function QuickStakes({ onPick }: { onPick: (amount: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {QUICK_STAKES.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => onPick(amount)}
          className="h-8 rounded-lg border border-white/8 bg-white/4 text-[0.6875rem] font-medium text-white/70 transition-all hover:border-gold-400/35 hover:bg-gold-400/10 hover:text-gold-200 active:scale-95 tnum"
        >
          +{amount}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Footer — totals and the place-bet action
   ============================================================ */

function SlipFooter({ compact }: { compact?: boolean }) {
  const { totals, place, placing, selections } = useBetSlip();
  const { user } = useSession();
  const insufficient = totals.totalStake + totals.liability > user.balance + user.bonusBalance;

  if (selections.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <dl className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Total stake</dt>
          <dd className="font-medium tnum">{formatMoney(totals.totalStake)}</dd>
        </div>
        {totals.liability > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-white/45">Liability</dt>
            <dd className="font-medium text-loss tnum">{formatMoney(totals.liability)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="font-medium text-white/70">Potential return</dt>
          <dd className="font-display text-base font-semibold text-gilt tnum">
            {formatMoney(totals.potentialReturn)}
          </dd>
        </div>
      </dl>

      {(totals.blockReason || insufficient) && (
        <p className="rounded-lg bg-loss/10 px-2.5 py-1.5 text-[0.6875rem] text-loss" role="alert">
          {insufficient && !totals.blocked
            ? "Insufficient balance — top up your wallet to place this bet."
            : totals.blockReason}
        </p>
      )}

      <Button
        variant="gold"
        size={compact ? "md" : "lg"}
        fullWidth
        loading={placing}
        disabled={totals.blocked || insufficient}
        onClick={place}
      >
        {placing ? "Placing…" : `Place bet · ${formatMoney(totals.totalStake, { decimals: false })}`}
      </Button>

      <p className="text-center text-[0.625rem] text-white/25">
        18+ only · Bets are final once matched · Gamble responsibly
      </p>
    </div>
  );
}

/* ============================================================
   Mobile: sticky trigger bar + bottom sheet
   ============================================================ */

export function BetSlipDock() {
  const { selections, open, setOpen, totals, receipt, dismissReceipt } = useBetSlip();
  const hasSelections = selections.length > 0;

  return (
    <>
      {/* Sticky summary bar, parked above the bottom nav */}
      {hasSelections && !open && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-70 px-3 pb-1 xl:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open bet slip with ${selections.length} selections`}
            className={cn(
              "flex w-full animate-rise items-center justify-between gap-3 rounded-2xl px-4 py-3",
              "bg-linear-to-r from-ember-600 to-ember-800 text-white",
              "border border-gold-400/25 shadow-[0_16px_40px_-16px_var(--color-ember-600)]",
              "transition-transform active:scale-[0.985]",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-gold-300 text-sm font-bold text-obsidian-950 tnum">
                {selections.length}
              </span>
              <span className="text-sm font-semibold">Bet slip</span>
            </span>
            <span className="flex items-center gap-2">
              {totals.potentialReturn > 0 && (
                <span className="text-sm font-semibold text-gold-200 tnum">
                  {formatMoney(totals.potentialReturn, { decimals: false })}
                </span>
              )}
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                <path d="M4 10L8 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Bet slip"
        description={hasSelections ? `${selections.length} selection${selections.length === 1 ? "" : "s"}` : undefined}
        footer={<SlipFooter compact />}
        className="xl:hidden"
      >
        <SlipBody />
      </Sheet>

      <ReceiptSheet receipt={receipt} onClose={dismissReceipt} />
    </>
  );
}

/* ============================================================
   Desktop: permanently docked rail
   ============================================================ */

export function BetSlipRail() {
  const { selections } = useBetSlip();

  return (
    <aside
      aria-label="Bet slip"
      className="sticky top-24 hidden h-[calc(100dvh-8rem)] w-80 shrink-0 flex-col xl:flex"
    >
      <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3.5">
          <h2 className="text-sm font-semibold">Bet slip</h2>
          {selections.length > 0 && (
            <Badge tone="gold">{selections.length} selection{selections.length === 1 ? "" : "s"}</Badge>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <SlipBody />
        </div>

        {selections.length > 0 && (
          <footer className="border-t border-white/8 bg-obsidian-900/60 p-4">
            <SlipFooter compact />
          </footer>
        )}
      </div>
    </aside>
  );
}

/* ============================================================
   Placement confirmation
   ============================================================ */

function ReceiptSheet({
  receipt,
  onClose,
}: {
  receipt: ReturnType<typeof useBetSlip>["receipt"];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Bet placed"
      description={`Reference ${receipt.id}`}
      size="sm"
      footer={
        <Button variant="gold" fullWidth onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-win/30 bg-win/12">
          <svg viewBox="0 0 24 24" className="size-7 text-win" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div>
          <p className="font-display text-2xl font-semibold text-gilt tnum">
            {formatMoney(receipt.potentialReturn)}
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            Potential return on {formatMoney(receipt.stake, { decimals: false })} across {receipt.legs} leg
            {receipt.legs === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(receipt.id).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
          className="mx-auto block rounded-lg border border-white/10 px-3 py-1.5 text-[0.6875rem] text-white/50 transition-colors hover:border-gold-400/30 hover:text-gold-200"
        >
          {copied ? "Reference copied" : `Copy reference · ${receipt.id}`}
        </button>
      </div>
    </Sheet>
  );
}
