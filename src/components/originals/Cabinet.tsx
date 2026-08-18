"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OriginalConfig, RoundResult } from "@/lib/originals/types";
import type { Fairness } from "@/lib/originals/useFairness";
import type { Bankroll } from "@/lib/originals/useBankroll";
import { CURRENCY, cn, formatMoney } from "@/lib/format";
import { Button, Input } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

/* ============================================================
   Cabinet shell

   Every Original sits in the same frame: a themed play surface on
   the left (top, on a phone) and a fixed-width bet column beside it.
   Sharing the chrome is what makes five very different games read as
   one product line.
   ============================================================ */

export function Cabinet({
  config,
  bankroll,
  fairness,
  rtp,
  controls,
  history,
  children,
}: {
  config: OriginalConfig;
  bankroll: Bankroll;
  fairness: Fairness;
  /** Live RTP of the current settings, for the games whose options move it. */
  rtp: number;
  controls: React.ReactNode;
  history: RoundResult[];
  children: React.ReactNode;
}) {
  const [fairOpen, setFairOpen] = useState(false);

  return (
    <div className="glass overflow-hidden rounded-3xl">
      {/* ---------- Header ---------- */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/8 px-3.5 py-3 sm:px-5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl border text-base"
          style={{
            borderColor: config.theme.accent + "55",
            background: "linear-gradient(150deg, " + config.theme.accent + "33, transparent)",
            color: config.theme.accent,
          }}
        >
          {config.glyph}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold text-white sm:text-base">
            {config.name}
          </h2>
          <p className="truncate text-[0.6875rem] text-white/40">{config.subtitle}</p>
        </div>

        {/* On a phone the chips take their own row: squeezed onto one line
            with the title they left it about sixty pixels wide. */}
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <button
          type="button"
          onClick={() => setFairOpen(true)}
          className="hidden items-center gap-1.5 rounded-full border border-win/30 bg-win/10 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-win transition-colors hover:bg-win/20 sm:inline-flex"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
            <path
              d="M6 1l4 1.6v3.2C10 8.4 8.3 10.4 6 11 3.7 10.4 2 8.4 2 5.8V2.6z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          Provably fair
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wider text-white/55 tnum">
          RTP {rtp.toFixed(2)}%
        </span>

        <BalanceChip bankroll={bankroll} />
        </div>
      </header>

      {/* ---------- Body ---------- */}
      {/* Both columns need `min-w-0`: a grid item defaults to `min-width:auto`,
          so one horizontally scrolling strip inside the bet column (the mines
          ladder) was otherwise able to push the whole cabinet past the
          viewport on a phone. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
        <div className="relative isolate flex min-w-0 flex-col">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: config.theme.backdrop }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[130%] -translate-x-1/2 -translate-y-1/3 rounded-full blur-[80px]"
            style={{ background: config.theme.glow }}
          />
          <div className="flex flex-1 flex-col justify-center px-3 py-4 sm:px-5 sm:py-6">
            {children}
          </div>

          <HistoryStrip history={history} accent={config.theme.accent} />
        </div>

        <aside className="min-w-0 border-t border-white/8 bg-obsidian-950/45 lg:border-l lg:border-t-0">
          {controls}
        </aside>
      </div>

      {/* ---------- Foot ---------- */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-3.5 py-2.5 sm:px-5">
        <p className="text-[0.625rem] text-white/30">
          Demo credits only — no real funds are staked or won.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFairOpen(true)}
            className="text-[0.625rem] font-medium text-win/80 underline-offset-2 hover:underline sm:hidden"
          >
            Provably fair
          </button>
          <button
            type="button"
            onClick={bankroll.reset}
            className="text-[0.625rem] font-medium text-white/35 underline-offset-2 transition-colors hover:text-white/70 hover:underline"
          >
            Reset demo balance
          </button>
        </div>
      </footer>

      <FairnessSheet
        open={fairOpen}
        onClose={() => setFairOpen(false)}
        config={config}
        fairness={fairness}
      />
    </div>
  );
}

/* ============================================================
   Header pieces
   ============================================================ */

function BalanceChip({ bankroll }: { bankroll: Bankroll }) {
  const previous = useRef(bankroll.balance);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (bankroll.balance === previous.current) return;
    setFlash(bankroll.balance > previous.current ? "up" : "down");
    previous.current = bankroll.balance;
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [bankroll.balance]);

  return (
    <span
      className={cn(
        "rounded-lg border px-2.5 py-1 text-right transition-colors duration-300",
        flash === "up"
          ? "border-win/50 bg-win/12"
          : flash === "down"
            ? "border-loss/40 bg-loss/10"
            : "border-gold-400/25 bg-obsidian-950/60",
      )}
    >
      <span className="block text-[0.5rem] font-semibold uppercase tracking-widest text-white/40">
        Demo balance
      </span>
      <span aria-live="polite" className="block font-display text-sm font-semibold text-gilt tnum">
        {formatMoney(bankroll.balance)}
      </span>
    </span>
  );
}

function HistoryStrip({ history, accent }: { history: RoundResult[]; accent: string }) {
  if (history.length === 0) return null;

  return (
    <div className="scroll-x flex gap-1.5 border-t border-white/8 bg-obsidian-950/55 px-3 py-2 sm:px-5">
      <span className="shrink-0 self-center pr-1 text-[0.5625rem] font-semibold uppercase tracking-widest text-white/25">
        Last
      </span>
      {history.map((round) => {
        const won = round.payout > 0;
        return (
          <span
            key={round.id}
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tnum",
              won
                ? "border-transparent text-obsidian-950"
                : "border-white/10 bg-white/4 text-white/35",
            )}
            style={won ? { background: accent } : undefined}
            title={
              won
                ? "Won " + formatMoney(round.payout)
                : "Lost " + formatMoney(round.stake)
            }
          >
            {round.label}
          </span>
        );
      })}
    </div>
  );
}

/* ============================================================
   Fairness
   ============================================================ */

function FairnessSheet({
  open,
  onClose,
  config,
  fairness,
}: {
  open: boolean;
  onClose: () => void;
  config: OriginalConfig;
  fairness: Fairness;
}) {
  const seedId = useId();

  return (
    <Sheet open={open} onClose={onClose} title="Provably fair" description={config.name} size="md">
      <div className="space-y-4 py-1 text-sm">
        <p className="leading-relaxed text-white/55">
          Each round is derived from a server seed, your client seed and a round counter. The server
          seed is committed to before you play and revealed when you rotate it, so any past round can
          be recomputed and checked.
        </p>

        <SeedRow label="Server seed (hashed)" value={fairness.commitment} mono />

        <div className="space-y-1.5">
          <label htmlFor={seedId} className="block text-xs font-medium text-white/65">
            Your client seed
          </label>
          <Input
            id={seedId}
            value={fairness.clientSeed}
            onChange={(e) => fairness.setClientSeed(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <SeedRow label="Round counter (nonce)" value={String(fairness.nonce)} />
        {fairness.revealed && (
          <SeedRow label="Previous server seed (revealed)" value={fairness.revealed} mono />
        )}

        <div className="rounded-xl border border-white/8 bg-white/4 p-3">
          <p className="text-xs font-medium text-white/75">House edge</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            {config.name} is built to a {(config.edge * 100).toFixed(1)}% edge. Every payout table in
            the game is derived from that one figure rather than typed in, so no setting on the
            cabinet — risk, mine count, win chance — changes the long-run return.
          </p>
        </div>

        <Button variant="subtle" fullWidth onClick={fairness.rotate}>
          Rotate seed pair
        </Button>
      </div>
    </Sheet>
  );
}

function SeedRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-obsidian-950/50 px-3 py-2">
      <p className="text-[0.625rem] font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p className={cn("mt-0.5 break-all text-xs text-white/80", mono && "font-mono")}>{value}</p>
    </div>
  );
}

/* ============================================================
   Bet-column primitives
   ============================================================ */

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3.5 p-3.5 sm:p-4">{children}</div>;
}

export function PanelLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-white/40">
        {children}
      </span>
      {hint && <span className="text-[0.625rem] text-white/30 tnum">{hint}</span>}
    </div>
  );
}

/**
 * Stake entry with the halve / double / max ladder every original uses.
 * The value is held as a draft string while focused so the field can be
 * emptied mid-edit without snapping back to the minimum.
 */
export function StakeField({
  value,
  onChange,
  config,
  balance,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  config: OriginalConfig;
  balance: number;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const ceiling = Math.min(config.maxBet, Math.max(config.minBet, balance));

  const clamp = (n: number) =>
    Math.min(config.maxBet, Math.max(config.minBet, Math.round(n * 100) / 100));

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    onChange(Number.isFinite(parsed) ? clamp(parsed) : config.minBet);
    setDraft(null);
  };

  const steps: [string, () => void][] = [
    ["½", () => onChange(clamp(value / 2))],
    ["2×", () => onChange(clamp(value * 2))],
    ["Max", () => onChange(clamp(ceiling))],
  ];

  return (
    <div>
      <PanelLabel hint={CURRENCY + config.minBet + " – " + config.maxBet.toLocaleString("en-AE")}>
        <label htmlFor={id}>Stake</label>
      </PanelLabel>

      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/35">
            AED
          </span>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={config.minBet}
            max={config.maxBet}
            step="1"
            disabled={disabled}
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            className={cn(
              "h-11 w-full rounded-xl border border-white/10 bg-obsidian-900/80 pl-11 pr-3 text-right text-sm font-semibold text-white tnum",
              "outline-none transition-colors focus:border-gold-400/50 disabled:opacity-45",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            )}
          />
        </div>

        {steps.map(([label, action]) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={action}
            className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/5 text-[0.6875rem] font-semibold text-white/60 transition-colors hover:border-gold-400/35 hover:text-gold-200 disabled:opacity-45"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Label / figure row used for "profit on win", "next tile" and friends. */
export function Readout({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "win" | "gold" | "loss";
  hint?: string;
}) {
  const toneClass = {
    neutral: "text-white/85",
    win: "text-win",
    gold: "text-gilt",
    loss: "text-loss",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-obsidian-950/50 px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[0.625rem] font-medium uppercase tracking-wider text-white/35">
          {label}
        </span>
        {hint && <span className="block text-[0.625rem] text-white/25">{hint}</span>}
      </span>
      <span className={cn("shrink-0 font-display text-sm font-semibold tnum", toneClass)}>
        {value}
      </span>
    </div>
  );
}

/** Full-width primary action. Colour follows the game's accent. */
export function PlayButton({
  children,
  accent,
  className,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent: string; loading?: boolean }) {
  return (
    <Button
      {...rest}
      loading={loading}
      size="lg"
      fullWidth
      className={cn("font-display text-base font-semibold text-obsidian-950", className)}
      style={{
        background: "linear-gradient(140deg, " + accent + ", " + accent + "bb)",
        boxShadow: "0 12px 30px -14px " + accent,
      }}
    >
      {children}
    </Button>
  );
}

/** Status line under the play surface. */
export function Verdict({
  tone,
  children,
}: {
  tone: "win" | "loss" | "idle";
  children: React.ReactNode;
}) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "min-h-5 text-center text-xs font-semibold",
        tone === "win" ? "text-win" : tone === "loss" ? "text-loss" : "text-white/35",
      )}
    >
      {children}
    </p>
  );
}

export function HowTo({ config }: { config: OriginalConfig }) {
  return (
    <ol className="space-y-1.5">
      {config.howTo.map((line, i) => (
        <li key={line} className="flex gap-2 text-[0.6875rem] leading-relaxed text-white/40">
          <span
            aria-hidden="true"
            className="mt-px grid size-4 shrink-0 place-items-center rounded-full border border-white/12 text-[0.5rem] font-bold text-white/50"
          >
            {i + 1}
          </span>
          {line}
        </li>
      ))}
    </ol>
  );
}
