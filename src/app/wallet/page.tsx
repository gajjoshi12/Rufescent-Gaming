"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  KycStatus,
  OpenBet,
  PaymentMethod,
  Transaction,
  TxKind,
  TxStatus,
} from "@/lib/types";
import { KYC_DOCUMENTS, transactionsInRange } from "@/lib/mock/wallet";
import { clamp, cn, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/store/session";
import { Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  Input,
  SectionHeading,
  Segmented,
  StatTile,
} from "@/components/ui/primitives";
import { LoadingRegion, Skeleton, TransactionSkeleton } from "@/components/ui/Skeletons";
import { Sheet, Toast } from "@/components/ui/Sheet";

/* ============================================================
   Constants
   ============================================================ */

const TAB_KEYS = ["deposit", "withdraw", "history", "kyc"] as const;
type Tab = (typeof TAB_KEYS)[number];

const TAB_OPTIONS: { key: Tab; label: string }[] = [
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
  { key: "history", label: "History" },
  { key: "kyc", label: "Verify" },
];

const QUICK_AMOUNTS = [500, 1_000, 2_500, 5_000, 10_000];

/** Payout rails only — a prepaid voucher cannot receive money back. */
const WITHDRAW_EXCLUDED = new Set(["pm-voucher"]);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const KIND_META: Record<TxKind, { label: string; icon: string; tint: string }> = {
  deposit: { label: "Deposit", icon: "↓", tint: "bg-win/12 text-win" },
  withdrawal: { label: "Withdrawal", icon: "↑", tint: "bg-ember-500/15 text-ember-300" },
  bet: { label: "Bet", icon: "◆", tint: "bg-back-500/15 text-back-300" },
  payout: { label: "Payout", icon: "★", tint: "bg-gold-400/14 text-gold-200" },
  bonus: { label: "Bonus", icon: "✦", tint: "bg-lay-500/15 text-lay-300" },
  refund: { label: "Refund", icon: "↺", tint: "bg-info/12 text-info" },
};

const STATUS_TONE: Record<TxStatus, "win" | "gold" | "ember"> = {
  completed: "win",
  pending: "gold",
  failed: "ember",
};

const KIND_FILTERS: { key: TxKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "bet", label: "Bets" },
  { key: "payout", label: "Payouts" },
  { key: "bonus", label: "Bonuses" },
];

const RANGE_FILTERS: { key: "7" | "30" | "90"; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];

const NEXT_TIER: Record<string, string> = {
  Bronze: "Silver",
  Silver: "Gold",
  Gold: "Obsidian",
  Obsidian: "Obsidian",
};

/* ============================================================
   Helpers
   ============================================================ */

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function amountError(
  raw: string,
  method: PaymentMethod | undefined,
  cap?: { value: number; label: string },
): string | null {
  if (raw.trim() === "") return null;
  const amount = parseAmount(raw);
  if (amount <= 0) return "Enter an amount greater than zero.";
  if (!method) return "Choose a payment method first.";
  if (amount < method.minAmount) {
    return `${method.label} accepts a minimum of ${formatMoney(method.minAmount, { decimals: false })}.`;
  }
  if (amount > method.maxAmount) {
    return `${method.label} accepts a maximum of ${formatMoney(method.maxAmount, { decimals: false })}.`;
  }
  if (cap && amount > cap.value) {
    return `Amount exceeds your ${cap.label} of ${formatMoney(cap.value)}.`;
  }
  return null;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Transaction[]): string {
  const header = [
    "Date",
    "Type",
    "Status",
    "Method",
    "Reference",
    "Amount",
    "Balance after",
    "Note",
  ];
  const body = rows.map((tx) =>
    [
      tx.createdAt,
      tx.kind,
      tx.status,
      tx.method,
      tx.reference,
      tx.amount.toFixed(2),
      tx.balanceAfter.toFixed(2),
      tx.note ?? "",
    ]
      .map((cell) => csvCell(String(cell)))
      .join(","),
  );
  return [header.map(csvCell).join(","), ...body].join("\r\n");
}

function StatusBadge({ status }: { status: TxStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

/* ============================================================
   Page
   ============================================================ */

export default function WalletPage() {
  const { user, limits, adjust, setKycStatus } = useSession();
  const [tab, setTab] = useState<Tab>("deposit");
  const [toast, setToast] = useState<string | null>(null);

  // Hash is a browser-only value: reading it during render would desync
  // the server HTML from the first client paint.
  useEffect(() => {
    const apply = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if ((TAB_KEYS as readonly string[]).includes(raw)) setTab(raw as Tab);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const selectTab = useCallback((next: Tab) => {
    setTab(next);
    // replaceState keeps /wallet#deposit shareable without stacking history entries.
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  const { data: methods, loading: methodsLoading } = useAsync(() => api.wallet.methods(), []);

  const tierProgress = clamp((user.loyaltyPoints / user.nextTierAt) * 100, 0, 100);
  const pointsToGo = Math.max(0, user.nextTierAt - user.loyaltyPoints);

  return (
    <Shell slip={false} width="narrow">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Wallet</h1>
      <p className="mb-5 text-sm text-white/45">
        Cashier, statement and identity verification for {user.handle}.
      </p>

      {/* ---------- Balance hero ---------- */}
      <Section>
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold-300/55 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-ember-600/25 blur-3xl"
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-white/40">
                  Total balance
                </p>
                <p
                  aria-live="polite"
                  className="mt-1 font-display text-3xl font-semibold text-gilt tnum sm:text-4xl"
                >
                  {formatMoney(user.balance)}
                </p>
              </div>
              <Badge tone="gold">{user.tier}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatTile
                label="Withdrawable"
                value={<span className="tnum">{formatMoney(user.withdrawable, { decimals: false })}</span>}
                tone="win"
              />
              <StatTile
                label="Bonus"
                value={<span className="tnum">{formatMoney(user.bonusBalance, { decimals: false })}</span>}
                tone="gold"
              />
              <StatTile
                label="Total"
                value={<span className="tnum">{formatMoney(user.balance, { decimals: false })}</span>}
              />
            </div>

            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3 text-[0.6875rem]">
                <span className="text-white/45">
                  Loyalty ·{" "}
                  <span className="tnum text-white/70">{user.loyaltyPoints.toLocaleString("en-IN")}</span> pts
                </span>
                <span className="text-white/35">
                  <span className="tnum">{pointsToGo.toLocaleString("en-IN")}</span> to {NEXT_TIER[user.tier]}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Loyalty progress toward ${NEXT_TIER[user.tier]}`}
                aria-valuenow={Math.round(tierProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8"
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-ember-400 to-gold-300"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* ---------- Tabs ---------- */}
      <div className="scroll-x -mx-3 mb-5 px-3 sm:-mx-5 sm:px-5">
        <Segmented
          label="Wallet sections"
          options={TAB_OPTIONS}
          value={tab}
          onChange={selectTab}
          className="w-max"
        />
      </div>

      {tab === "deposit" && (
        <DepositPanel
          methods={methods}
          loading={methodsLoading}
          onCredit={adjust}
          onToast={setToast}
        />
      )}

      {tab === "withdraw" && (
        <WithdrawPanel
          methods={methods}
          loading={methodsLoading}
          kycStatus={user.kycStatus}
          withdrawable={user.withdrawable}
          total={user.balance}
          onDebit={adjust}
          onVerify={() => selectTab("kyc")}
        />
      )}

      {tab === "history" && <HistoryPanel />}

      {tab === "kyc" && (
        <KycPanel
          kycStatus={user.kycStatus}
          onStatusChange={setKycStatus}
          onToast={setToast}
        />
      )}

      <Divider className="my-7" />

      <OpenBetsStrip />

      <p className="mt-6 text-[0.6875rem] leading-relaxed text-white/30">
        Daily deposit limit{" "}
        <span className="tnum">{formatMoney(limits.dailyDeposit, { decimals: false })}</span> · weekly{" "}
        <span className="tnum">{formatMoney(limits.weeklyDeposit, { decimals: false })}</span>. Adjust these
        under Responsible Gambling.
      </p>

      <Toast open={toast !== null} tone="win" onDismiss={() => setToast(null)}>
        {toast}
      </Toast>
    </Shell>
  );
}

/* ============================================================
   Method picker
   ============================================================ */

function MethodPicker({
  methods,
  loading,
  value,
  onChange,
  disabled,
  legend,
}: {
  methods: PaymentMethod[] | undefined;
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  legend: string;
}) {
  if (loading || !methods) {
    return (
      <LoadingRegion label="Loading payment methods">
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
          ))}
        </div>
      </LoadingRegion>
    );
  }

  return (
    <div role="radiogroup" aria-label={legend} className="grid gap-2 sm:grid-cols-2">
      {methods.map((method) => {
        const active = method.id === value;
        return (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(method.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
              "disabled:pointer-events-none disabled:opacity-45",
              active
                ? "border-gold-400/45 bg-gold-400/8 shadow-[0_10px_28px_-20px_var(--color-gold-400)]"
                : "border-white/8 bg-obsidian-900/50 hover:border-white/18 hover:bg-white/4",
            )}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {method.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-white/90">{method.label}</span>
                <span
                  className={cn(
                    "shrink-0 text-[0.625rem] font-semibold",
                    method.feePct > 0 ? "text-white/45" : "text-win",
                  )}
                >
                  {method.feePct > 0 ? `${method.feePct}% fee` : "No fee"}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[0.6875rem] text-white/40">
                {method.detail}
              </span>
              <span className="mt-1 block text-[0.625rem] text-white/35">
                <span className="tnum">
                  {formatMoney(method.minAmount, { decimals: false })}–
                  {formatMoney(method.maxAmount, { decimals: false })}
                </span>{" "}
                · {method.eta}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Fee / net breakdown shared by the deposit and withdrawal forms. */
function AmountSummary({
  amount,
  method,
  netLabel,
}: {
  amount: number;
  method: PaymentMethod | undefined;
  netLabel: string;
}) {
  if (!method || amount <= 0) return null;
  const fee = Number(((amount * method.feePct) / 100).toFixed(2));
  const net = Number((amount - fee).toFixed(2));

  return (
    <dl className="glass-soft space-y-1.5 rounded-xl px-3.5 py-3 text-xs" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-white/45">Amount</dt>
        <dd className="font-medium text-white/85 tnum">{formatMoney(amount)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-white/45">Processing fee ({method.feePct}%)</dt>
        <dd className={cn("tnum", fee > 0 ? "text-loss" : "text-win")}>
          {fee > 0 ? `−${formatMoney(fee)}` : formatMoney(0)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-1.5">
        <dt className="font-medium text-white/70">{netLabel}</dt>
        <dd className="font-semibold text-gold-200 tnum">{formatMoney(net)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-white/40">Expected in</dt>
        <dd className="text-white/60">{method.eta}</dd>
      </div>
    </dl>
  );
}

/* ============================================================
   Deposit
   ============================================================ */

function DepositPanel({
  methods,
  loading,
  onCredit,
  onToast,
}: {
  methods: PaymentMethod[] | undefined;
  loading: boolean;
  onCredit: (delta: number) => void;
  onToast: (message: string) => void;
}) {
  const amountId = useId();
  const bonusId = useId();

  const [raw, setRaw] = useState("");
  const [methodId, setMethodId] = useState("pm-upi");
  const [bonusCode, setBonusCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; method: string } | null>(
    null,
  );

  const method = useMemo(
    () => methods?.find((m) => m.id === methodId) ?? methods?.[0],
    [methods, methodId],
  );

  const amount = parseAmount(raw);
  const error = amountError(raw, method);
  const canSubmit = !error && amount > 0 && !!method && !submitting;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit || !method) return;

    setSubmitting(true);
    try {
      const result = await api.wallet.deposit(amount, method.label);
      if (!result.ok) {
        onToast("Deposit could not be processed. Try another method.");
        return;
      }
      // Credit what actually lands in the account — the summary shows the same figure.
      const fee = Number(((amount * method.feePct) / 100).toFixed(2));
      onCredit(Number((amount - fee).toFixed(2)));
      setReceipt({ reference: result.reference, amount: result.amount, method: result.method });
      setRaw("");
      setBonusCode("");
      setTouched(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section>
      <SectionHeading title="Add funds" subtitle="Instant on most rails. 18+ only." />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card className="space-y-4 p-4">
          <Field
            label="Deposit amount"
            htmlFor={amountId}
            error={touched && error ? error : undefined}
            hint={
              method
                ? `${method.label} accepts ${formatMoney(method.minAmount, { decimals: false })} to ${formatMoney(method.maxAmount, { decimals: false })}.`
                : undefined
            }
          >
            <Input
              id={amountId}
              prefix="₹"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={raw}
              invalid={touched && !!error}
              onBlur={() => setTouched(true)}
              onChange={(e) => setRaw(e.target.value)}
              className="tnum"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRaw(String(value));
                  setTouched(true);
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors tnum",
                  amount === value
                    ? "border-gold-400/50 bg-gold-400/12 text-gold-200"
                    : "border-white/10 bg-white/4 text-white/60 hover:border-white/20 hover:text-white",
                )}
              >
                {formatMoney(value, { decimals: false })}
              </button>
            ))}
          </div>
        </Card>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/85">Payment method</h3>
          <MethodPicker
            methods={methods}
            loading={loading}
            value={method?.id ?? methodId}
            onChange={setMethodId}
            legend="Deposit method"
          />
        </div>

        <AmountSummary amount={amount} method={method} netLabel="Credited to wallet" />

        <Card className="p-4">
          <Field
            label="Bonus code (optional)"
            htmlFor={bonusId}
            hint="Enter a promo code to attach an offer to this deposit."
          >
            <Input
              id={bonusId}
              value={bonusCode}
              autoComplete="off"
              placeholder="e.g. RELOAD25"
              onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
            />
          </Field>
        </Card>

        <Button type="submit" variant="gold" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
          {submitting ? "Processing…" : `Deposit ${amount > 0 ? formatMoney(amount, { decimals: false }) : ""}`}
        </Button>
      </form>

      <Sheet
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="Deposit confirmed"
        description="Funds are on their way to your wallet."
        footer={
          <Button variant="primary" fullWidth onClick={() => setReceipt(null)}>
            Done
          </Button>
        }
      >
        {receipt && (
          <div className="space-y-3">
            <div className="glass-soft rounded-xl px-4 py-5 text-center">
              <p className="text-[0.625rem] uppercase tracking-widest text-white/40">Amount</p>
              <p className="mt-1 font-display text-3xl font-semibold text-win tnum">
                {formatMoney(receipt.amount, { sign: true })}
              </p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Reference</dt>
                <dd className="font-mono text-xs text-gold-200">{receipt.reference}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Method</dt>
                <dd className="text-white/85">{receipt.method}</dd>
              </div>
            </dl>
          </div>
        )}
      </Sheet>
    </Section>
  );
}

/* ============================================================
   Withdraw
   ============================================================ */

function WithdrawPanel({
  methods,
  loading,
  kycStatus,
  withdrawable,
  total,
  onDebit,
  onVerify,
}: {
  methods: PaymentMethod[] | undefined;
  loading: boolean;
  kycStatus: KycStatus;
  withdrawable: number;
  total: number;
  onDebit: (delta: number) => void;
  onVerify: () => void;
}) {
  const amountId = useId();

  const [raw, setRaw] = useState("");
  const [methodId, setMethodId] = useState("pm-bank");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; method: string } | null>(
    null,
  );

  const payoutMethods = useMemo(
    () => methods?.filter((m) => !WITHDRAW_EXCLUDED.has(m.id)),
    [methods],
  );
  const method = useMemo(
    () => payoutMethods?.find((m) => m.id === methodId) ?? payoutMethods?.[0],
    [payoutMethods, methodId],
  );

  const blocked = kycStatus !== "verified";
  const amount = parseAmount(raw);
  const error = amountError(raw, method, { value: withdrawable, label: "withdrawable balance" });
  const canSubmit = !blocked && !error && amount > 0 && !!method && !submitting;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setFailure(null);
    if (!canSubmit || !method) return;

    setSubmitting(true);
    try {
      const result = await api.wallet.withdraw(amount, method.label);
      if (!result.ok) {
        setFailure(result.reason ?? "The withdrawal was declined. Contact support.");
        return;
      }
      onDebit(-amount);
      setReceipt({ reference: result.reference, amount: result.amount, method: result.method });
      setRaw("");
      setTouched(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section>
      <SectionHeading title="Withdraw" subtitle="Payouts go back to a verified account in your name." />

      {blocked && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-xl border border-gold-400/30 bg-gold-400/8 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gold-100">Verification required</p>
            <p className="mt-0.5 text-xs text-white/55">
              {kycStatus === "pending"
                ? "Your documents are under review. Withdrawals unlock once they clear."
                : "Complete identity verification before you can withdraw funds."}
            </p>
          </div>
          <Button variant="gold" size="sm" onClick={onVerify} className="shrink-0 self-start sm:self-auto">
            Verify now
          </Button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <StatTile
          label="Withdrawable now"
          value={<span className="tnum">{formatMoney(withdrawable, { decimals: false })}</span>}
          tone="win"
          hint="Cleared for payout"
        />
        <StatTile
          label="Total balance"
          value={<span className="tnum">{formatMoney(total, { decimals: false })}</span>}
          hint="Includes unsettled funds"
        />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card className="space-y-3 p-4">
          <Field
            label="Withdrawal amount"
            htmlFor={amountId}
            error={touched && error ? error : undefined}
            hint={`You can withdraw up to ${formatMoney(withdrawable)} right now.`}
          >
            <Input
              id={amountId}
              prefix="₹"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={raw}
              disabled={blocked}
              invalid={touched && !!error}
              onBlur={() => setTouched(true)}
              onChange={(e) => setRaw(e.target.value)}
              className="tnum"
            />
          </Field>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              setRaw(String(withdrawable));
              setTouched(true);
            }}
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            Withdraw everything
          </button>
        </Card>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/85">Payout destination</h3>
          <MethodPicker
            methods={payoutMethods}
            loading={loading}
            value={method?.id ?? methodId}
            onChange={setMethodId}
            disabled={blocked}
            legend="Withdrawal method"
          />
        </div>

        <AmountSummary amount={amount} method={method} netLabel="You receive" />

        {failure && (
          <p
            role="alert"
            className="rounded-xl border border-loss/30 bg-loss/10 px-3.5 py-3 text-xs text-loss"
          >
            {failure}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
          {submitting ? "Requesting…" : "Request withdrawal"}
        </Button>
      </form>

      <Sheet
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="Withdrawal requested"
        description="We'll email you when the payout settles."
        footer={
          <Button variant="primary" fullWidth onClick={() => setReceipt(null)}>
            Done
          </Button>
        }
      >
        {receipt && (
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/45">Amount</dt>
              <dd className="font-semibold text-white tnum">{formatMoney(receipt.amount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/45">Reference</dt>
              <dd className="font-mono text-xs text-gold-200">{receipt.reference}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/45">Destination</dt>
              <dd className="text-white/85">{receipt.method}</dd>
            </div>
          </dl>
        )}
      </Sheet>
    </Section>
  );
}

/* ============================================================
   History
   ============================================================ */

function HistoryPanel() {
  const { data, loading } = useAsync(() => api.wallet.transactions(), []);
  const [kind, setKind] = useState<TxKind | "all">("all");
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [detail, setDetail] = useState<Transaction | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const inRange = new Set(transactionsInRange(Number(range)).map((t) => t.id));
    return data.filter((tx) => inRange.has(tx.id) && (kind === "all" || tx.kind === kind));
  }, [data, kind, range]);

  const downloadCsv = useCallback(() => {
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rufescent-statement-${range}d.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [rows, range]);

  return (
    <Section>
      <SectionHeading
        title="Statement"
        subtitle={`${rows.length} ${rows.length === 1 ? "entry" : "entries"} in the last ${range} days`}
        action={
          <Button variant="subtle" size="sm" onClick={downloadCsv} disabled={rows.length === 0}>
            Download CSV
          </Button>
        }
      />

      <div className="space-y-2">
        <div className="scroll-x -mx-3 px-3 sm:-mx-5 sm:px-5">
          <Segmented
            label="Filter by transaction type"
            size="sm"
            options={KIND_FILTERS}
            value={kind}
            onChange={setKind}
            className="w-max"
          />
        </div>
        <div className="scroll-x -mx-3 px-3 sm:-mx-5 sm:px-5">
          <Segmented
            label="Date range"
            size="sm"
            options={RANGE_FILTERS}
            value={range}
            onChange={setRange}
            className="w-max"
          />
        </div>
      </div>

      <Card className="mt-3 p-1.5 sm:p-2">
        {loading ? (
          <TransactionSkeleton count={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="◎"
            title="Nothing here yet"
            message="No transactions match this filter in the selected period."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((tx) => {
              const meta = KIND_META[tx.kind];
              const credit = tx.amount >= 0;
              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(tx)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-white/4"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-sm",
                        meta.tint,
                      )}
                    >
                      {meta.icon}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white/90">
                        {tx.note ?? meta.label}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.625rem] text-white/40">
                        <span className="truncate">{tx.method}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tnum">{formatDateTime(tx.createdAt)}</span>
                        <StatusBadge status={tx.status} />
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "block text-sm font-semibold tnum",
                          credit ? "text-win" : "text-loss",
                        )}
                      >
                        {formatMoney(tx.amount, { sign: true, decimals: false })}
                      </span>
                      <span className="mt-0.5 block text-[0.625rem] text-white/35 tnum">
                        {formatMoney(tx.balanceAfter, { decimals: false })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Sheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? KIND_META[detail.kind].label : "Transaction"}
        description={detail ? formatDateTime(detail.createdAt) : undefined}
        footer={
          <Button variant="subtle" fullWidth onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="glass-soft rounded-xl px-4 py-5 text-center">
              <p
                className={cn(
                  "font-display text-3xl font-semibold tnum",
                  detail.amount >= 0 ? "text-win" : "text-loss",
                )}
              >
                {formatMoney(detail.amount, { sign: true })}
              </p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              {[
                ["Reference", <span key="r" className="font-mono text-xs text-gold-200">{detail.reference}</span>],
                ["Method", detail.method],
                ["Balance after", <span key="b" className="tnum">{formatMoney(detail.balanceAfter)}</span>],
                ["Date", <span key="d" className="tnum">{formatDateTime(detail.createdAt)}</span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-white/45">{label}</dt>
                  <dd className="min-w-0 text-right text-white/85">{value}</dd>
                </div>
              ))}
            </dl>

            {detail.note && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3.5 py-3">
                <p className="text-[0.625rem] uppercase tracking-widest text-white/35">Note</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{detail.note}</p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </Section>
  );
}

/* ============================================================
   KYC
   ============================================================ */

interface DocState {
  status: KycStatus;
  fileName?: string;
  progress: number;
  error?: string;
}

const KYC_STEPS: { label: string; hint: string }[] = [
  { label: "Upload", hint: "Provide your documents" },
  { label: "Review", hint: "Usually within 24 hours" },
  { label: "Verified", hint: "Withdrawals unlocked" },
];

function stepIndex(status: KycStatus): number {
  if (status === "verified") return 2;
  if (status === "pending") return 1;
  return 0;
}

function KycPanel({
  kycStatus,
  onStatusChange,
  onToast,
}: {
  kycStatus: KycStatus;
  onStatusChange: (status: KycStatus) => void;
  onToast: (message: string) => void;
}) {
  const [docs, setDocs] = useState<Record<string, DocState>>(() =>
    Object.fromEntries(
      KYC_DOCUMENTS.map((doc) => [
        doc.id,
        { status: doc.status, fileName: doc.fileName, progress: doc.fileName ? 100 : 0 },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const uploadTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timers = uploadTimers.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
      if (reviewTimer.current) clearTimeout(reviewTimer.current);
    };
  }, []);

  const acceptFile = useCallback((docId: string, file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setDocs((prev) => ({
        ...prev,
        [docId]: { ...prev[docId], error: `${file.name} is larger than 8MB. Compress it and try again.` },
      }));
      return;
    }

    clearInterval(uploadTimers.current[docId]);
    setDocs((prev) => ({
      ...prev,
      [docId]: { status: "not_started", fileName: file.name, progress: 0, error: undefined },
    }));

    // Progress is tracked in the closure rather than in state so the interval
    // never has to read state it might be stale about.
    let progress = 0;
    const id = setInterval(() => {
      progress = Math.min(100, progress + 14);
      const done = progress >= 100;
      if (done) clearInterval(id);
      setDocs((prev) => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          progress,
          status: done ? "pending" : prev[docId].status,
        },
      }));
    }, 130);
    uploadTimers.current[docId] = id;
  }, []);

  const requiredDocs = KYC_DOCUMENTS.filter((doc) => doc.required);
  const allRequiredUploaded = requiredDocs.every((doc) => {
    const state = docs[doc.id];
    return state && state.progress >= 100 && state.status !== "not_started";
  });

  function submitForReview() {
    setSubmitting(true);
    onStatusChange("pending");
    reviewTimer.current = setTimeout(() => {
      onStatusChange("verified");
      setSubmitting(false);
      onToast("Identity verified — withdrawals are now unlocked.");
    }, 2_200);
  }

  const current = stepIndex(kycStatus);

  return (
    <Section>
      <SectionHeading title="Identity verification" subtitle="Required by our licence before payouts." />

      {/* Stepper */}
      <Card className="mb-4 p-4">
        <ol className="flex items-start gap-2">
          {KYC_STEPS.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={step.label} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[0.625rem] font-semibold",
                      done && "border-win/40 bg-win/15 text-win",
                      active && "border-gold-400/50 bg-gold-400/15 text-gold-200",
                      !done && !active && "border-white/12 bg-white/5 text-white/35",
                    )}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px flex-1 rounded-full",
                      done ? "bg-win/40" : "bg-white/10",
                      index === KYC_STEPS.length - 1 && "hidden",
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "mt-1.5 truncate text-[0.6875rem] font-medium",
                    active ? "text-white/90" : "text-white/45",
                  )}
                >
                  {step.label}
                </p>
                <p className="truncate text-[0.625rem] text-white/30">{step.hint}</p>
              </li>
            );
          })}
        </ol>

        <p className="mt-3 text-xs text-white/50" aria-live="polite">
          {kycStatus === "verified"
            ? "Your account is fully verified."
            : kycStatus === "pending"
              ? "Documents submitted. We're reviewing them now."
              : kycStatus === "rejected"
                ? "One or more documents were rejected. Please re-upload."
                : "Upload the required documents to get started."}
        </p>
      </Card>

      <div className="space-y-3">
        {KYC_DOCUMENTS.map((doc) => (
          <DropZoneCard key={doc.id} doc={doc} state={docs[doc.id]} onFile={acceptFile} />
        ))}
      </div>

      {kycStatus !== "verified" && (
        <div className="mt-4">
          <Button
            variant="gold"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!allRequiredUploaded || submitting}
            onClick={submitForReview}
          >
            {submitting ? "Submitting for review…" : "Submit for review"}
          </Button>
          {!allRequiredUploaded && (
            <p className="mt-2 text-center text-[0.6875rem] text-white/35">
              Upload every required document to enable submission.
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function DropZoneCard({
  doc,
  state,
  onFile,
}: {
  doc: (typeof KYC_DOCUMENTS)[number];
  state: DocState | undefined;
  onFile: (docId: string, file: File | undefined) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const status = state?.status ?? doc.status;
  const uploading = !!state && state.progress > 0 && state.progress < 100;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <span className="truncate">{doc.label}</span>
            {doc.required ? (
              <Badge tone="ember">Required</Badge>
            ) : (
              <Badge tone="neutral">Optional</Badge>
            )}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{doc.description}</p>
        </div>
        <Badge
          tone={status === "verified" ? "win" : status === "pending" ? "gold" : "neutral"}
          className="shrink-0"
        >
          {status.replace("_", " ")}
        </Badge>
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(doc.id, e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
          dragging
            ? "border-gold-400/60 bg-gold-400/8"
            : "border-white/12 bg-white/2 hover:border-white/25 hover:bg-white/5",
        )}
      >
        <span aria-hidden="true" className="text-lg opacity-50">
          ⬆
        </span>
        <span className="text-xs font-medium text-white/75">
          {state?.fileName ? state.fileName : "Drop a file or tap to browse"}
        </span>
        <span className="text-[0.625rem] text-white/35">{doc.accepts}</span>
      </label>

      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,application/pdf"
        aria-label={`Upload ${doc.label}`}
        onChange={(e) => {
          onFile(doc.id, e.target.files?.[0]);
          // Reset so re-picking the same file still fires a change event.
          e.target.value = "";
        }}
      />

      {state && state.progress > 0 && state.progress < 100 && (
        <div className="mt-2.5" aria-live="polite">
          <div className="flex items-center justify-between text-[0.625rem] text-white/45">
            <span>Uploading…</span>
            <span className="tnum">{state.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${doc.label} upload progress`}
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/8"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-ember-400 to-gold-300 transition-[width] duration-150"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {!uploading && state?.progress === 100 && state.fileName && (
        <p className="mt-2.5 text-[0.6875rem] text-win" aria-live="polite">
          {state.fileName} uploaded.
        </p>
      )}

      {state?.error && (
        <p role="alert" className="mt-2.5 text-[0.6875rem] text-loss">
          {state.error}
        </p>
      )}
    </Card>
  );
}

/* ============================================================
   Open bets
   ============================================================ */

function betStatus(bet: OpenBet): { label: string; tone: "live" | "win" | "neutral" } {
  if (bet.inPlay) return { label: "In play", tone: "live" };
  const settled = bet.legs.filter((leg) => leg.status === "won").length;
  if (settled > 0) return { label: `${settled}/${bet.legs.length} won`, tone: "win" };
  return { label: "Open", tone: "neutral" };
}

function OpenBetsStrip() {
  const { data, loading } = useAsync(() => api.wallet.openBets(), []);

  return (
    <Section>
      <SectionHeading title="Open bets" subtitle="Stakes still riding on the board" />

      {loading || !data ? (
        <LoadingRegion label="Loading open bets">
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : data.length === 0 ? (
        <EmptyState icon="◇" title="No open bets" message="Bets you place will appear here until they settle." />
      ) : (
        <ul className="space-y-2">
          {data.map((bet) => {
            const status = betStatus(bet);
            return (
              <li key={bet.id}>
                <div className="glass-soft flex items-center gap-3 rounded-xl px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">{bet.matchLabel}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.625rem] text-white/40">
                      <span>
                        {bet.legs.length} {bet.legs.length === 1 ? "leg" : "legs"} · {bet.mode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tnum">{formatDate(bet.placedAt)}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[0.625rem] text-white/40">
                      Stake <span className="tnum text-white/70">{formatMoney(bet.stake, { decimals: false })}</span>
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-gold-200 tnum">
                      {formatMoney(bet.potentialReturn, { decimals: false })}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
