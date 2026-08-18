"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { ResponsibleLimits } from "@/lib/types";
import { clamp, cn, formatDate, formatMoney, hueGradient } from "@/lib/format";
import { usePersistentState } from "@/lib/hooks";
import { ODDS_FORMATS, useOddsFormat } from "@/store/odds-format";
import { useSession } from "@/store/session";
import { Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Input,
  LinkButton,
  SectionHeading,
  Segmented,
  StatTile,
  Toggle,
} from "@/components/ui/primitives";
import { Sheet, Toast } from "@/components/ui/Sheet";

/* ============================================================
   Static content
   ============================================================ */

interface DeviceSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current?: boolean;
}

const DEVICE_SESSIONS: DeviceSession[] = [
  {
    id: "sess-1",
    device: "iPhone 15 Pro",
    browser: "Safari 18",
    location: "Mumbai, IN",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "sess-2",
    device: "MacBook Air",
    browser: "Chrome 131",
    location: "Mumbai, IN",
    lastActive: "2 hours ago",
  },
  {
    id: "sess-3",
    device: "Pixel 8",
    browser: "Chrome Mobile",
    location: "Pune, IN",
    lastActive: "Yesterday",
  },
];

const NEXT_TIER: Record<string, string> = {
  Bronze: "Silver",
  Silver: "Gold",
  Gold: "Obsidian",
  Obsidian: "Obsidian",
};

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Strong", "Excellent"] as const;
const STRENGTH_COLORS = [
  "bg-loss",
  "bg-loss",
  "bg-gold-400",
  "bg-win/80",
  "bg-win",
] as const;

/** Deterministic score 0–4 from length and character variety. */
function passwordScore(value: string): number {
  if (value.length === 0) return 0;
  if (value.length < 8) return 1;
  let variety = 0;
  if (/[a-z]/.test(value)) variety++;
  if (/[A-Z]/.test(value)) variety++;
  if (/[0-9]/.test(value)) variety++;
  if (/[^A-Za-z0-9]/.test(value)) variety++;
  const lengthBonus = value.length >= 14 ? 1 : 0;
  return clamp(variety + lengthBonus - 1, 1, 4);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

interface Preferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  showBalanceInHeader: boolean;
  twoFactor: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  showBalanceInHeader: true,
  twoFactor: false,
};

/* ============================================================
   Page
   ============================================================ */

export default function ProfilePage() {
  const { user, limits, sessionMinutes, signOut } = useSession();
  const [toast, setToast] = useState<string | null>(null);

  // Preferences live here rather than in each section: two hooks sharing one
  // storage key would each persist a stale copy of the other's fields.
  const [prefs, setPrefs] = usePersistentState<Preferences>("ruf.preferences", DEFAULT_PREFERENCES);
  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPrefs((prev) => ({ ...prev, [key]: value })),
    [setPrefs],
  );

  const tierProgress = clamp((user.loyaltyPoints / user.nextTierAt) * 100, 0, 100);

  return (
    <Shell slip={false} width="narrow">
      {/* ---------- Header ---------- */}
      <Card className="relative overflow-hidden p-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold-300/50 to-transparent"
        />
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full border border-white/12 font-display text-xl font-semibold text-white shadow-[0_12px_30px_-16px_#000]"
            style={{ background: hueGradient(user.avatarHue) }}
          >
            {user.displayName.charAt(0)}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {user.displayName}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
              <span className="truncate">{user.handle}</span>
              <Badge tone="gold">{user.tier}</Badge>
            </p>
            <p className="mt-1.5 text-[0.6875rem] text-white/35">
              Member since <span className="tnum">{formatDate(user.memberSince)}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gold-400/20 bg-gold-400/6 px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-medium uppercase tracking-widest text-white/40">
                Loyalty points
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold text-gilt tnum">
                {user.loyaltyPoints.toLocaleString("en-AE")}
              </p>
            </div>
            <p className="text-right text-[0.6875rem] text-white/40">
              <span className="tnum">
                {Math.max(0, user.nextTierAt - user.loyaltyPoints).toLocaleString("en-AE")}
              </span>{" "}
              to {NEXT_TIER[user.tier]}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`Loyalty progress toward ${NEXT_TIER[user.tier]}`}
            aria-valuenow={Math.round(tierProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-ember-400 to-gold-300"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>
      </Card>

      <Divider className="my-6" />

      <AccountDetails
        initialName={user.displayName}
        initialEmail={user.email}
        onSaved={() => setToast("Account details saved.")}
      />

      <PreferencesSection prefs={prefs} setPref={setPref} />

      <SecuritySection prefs={prefs} setPref={setPref} onToast={setToast} />

      <ResponsibleSection limits={limits} sessionMinutes={sessionMinutes} />

      <DangerZone onToast={setToast} />

      <div className="mt-2 mb-4">
        <Button variant="subtle" size="lg" fullWidth onClick={signOut}>
          Sign out
        </Button>
      </div>

      <Toast open={toast !== null} tone="win" onDismiss={() => setToast(null)}>
        {toast}
      </Toast>
    </Shell>
  );
}

/* ============================================================
   Account details
   ============================================================ */

function AccountDetails({
  initialName,
  initialEmail,
  onSaved,
}: {
  initialName: string;
  initialEmail: string;
  onSaved: () => void;
}) {
  const nameId = useId();
  const emailId = useId();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);

  const nameError = name.trim().length < 2 ? "Display name needs at least 2 characters." : null;
  const emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address.";
  const dirty = name !== initialName || email !== initialEmail;
  const valid = !nameError && !emailError;

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSaved();
  }

  return (
    <Section>
      <SectionHeading title="Account details" subtitle="How you appear across Rufescent" />
      <Card className="p-4">
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field
            label="Display name"
            htmlFor={nameId}
            error={touched && nameError ? nameError : undefined}
          >
            <Input
              id={nameId}
              value={name}
              autoComplete="name"
              invalid={touched && !!nameError}
              onBlur={() => setTouched(true)}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field
            label="Email address"
            htmlFor={emailId}
            hint="Used for payout confirmations and security alerts."
            error={touched && emailError ? emailError : undefined}
          >
            <Input
              id={emailId}
              type="email"
              value={email}
              autoComplete="email"
              invalid={touched && !!emailError}
              onBlur={() => setTouched(true)}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Button type="submit" variant="gold" disabled={!dirty || (touched && !valid)}>
            Save changes
          </Button>
        </form>
      </Card>
    </Section>
  );
}

/* ============================================================
   Preferences
   ============================================================ */

interface PrefsProps {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

function PreferencesSection({ prefs, setPref }: PrefsProps) {
  const { format, setFormat } = useOddsFormat();

  const oddsOptions = useMemo(
    () => ODDS_FORMATS.map((option) => ({ key: option.key, label: option.label })),
    [],
  );

  return (
    <Section>
      <SectionHeading title="Preferences" subtitle="Notifications and display" />
      <Card className="divide-y divide-white/6 p-4">
        <div className="pb-1">
          <Toggle
            label="Email notifications"
            description="Settlement receipts, promotions and account updates."
            checked={prefs.emailNotifications}
            onChange={(next) => setPref("emailNotifications", next)}
          />
          <Toggle
            label="SMS notifications"
            description="Withdrawal confirmations and security codes."
            checked={prefs.smsNotifications}
            onChange={(next) => setPref("smsNotifications", next)}
          />
          <Toggle
            label="Push notifications"
            description="Live score alerts and cash-out offers."
            checked={prefs.pushNotifications}
            onChange={(next) => setPref("pushNotifications", next)}
          />
        </div>

        <div className="py-3">
          <p className="text-sm font-medium text-white/90">Odds format</p>
          <p className="mt-0.5 mb-2 text-xs text-white/45">
            Applies everywhere prices are shown.
          </p>
          <div className="scroll-x -mx-1 px-1">
            <Segmented
              label="Odds format"
              size="sm"
              options={oddsOptions}
              value={format}
              onChange={setFormat}
              className="w-max"
            />
          </div>
        </div>

        <div className="pt-1">
          <Toggle
            label="Show balance in header"
            description="Hide it if you share your screen."
            checked={prefs.showBalanceInHeader}
            onChange={(next) => setPref("showBalanceInHeader", next)}
          />
        </div>
      </Card>
    </Section>
  );
}

/* ============================================================
   Security
   ============================================================ */

function SecuritySection({
  prefs,
  setPref,
  onToast,
}: PrefsProps & { onToast: (message: string) => void }) {
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [revoked, setRevoked] = useState<string[]>([]);

  const score = passwordScore(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && score >= 2 && !mismatch && confirm.length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setTouched(false);
    onToast("Password updated.");
  }

  return (
    <Section>
      <SectionHeading title="Security" subtitle="Password, two-factor and devices" />

      <Card className="p-4">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Current password" htmlFor={currentId}>
            <Input
              id={currentId}
              type="password"
              value={current}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>

          <Field
            label="New password"
            htmlFor={nextId}
            hint="At least 8 characters with a mix of cases, digits and symbols."
          >
            <Input
              id={nextId}
              type="password"
              value={next}
              autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>

          {next.length > 0 && (
            <div aria-live="polite">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      step <= score ? STRENGTH_COLORS[score] : "bg-white/10",
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[0.6875rem] text-white/45">
                Password strength: {STRENGTH_LABELS[score]}
              </p>
            </div>
          )}

          <Field
            label="Confirm new password"
            htmlFor={confirmId}
            error={mismatch ? "Passwords do not match." : undefined}
          >
            <Input
              id={confirmId}
              type="password"
              value={confirm}
              autoComplete="new-password"
              invalid={mismatch}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          {touched && !canSubmit && (
            <p role="alert" className="text-[0.6875rem] text-loss">
              Fill in every field and choose a password of at least fair strength.
            </p>
          )}

          <Button type="submit" variant="gold" disabled={!canSubmit}>
            Update password
          </Button>
        </form>

        <div className="mt-4 border-t border-white/8 pt-2">
          <Toggle
            label="Two-factor authentication"
            description="Require a one-time code from your authenticator app at sign-in."
            checked={prefs.twoFactor}
            onChange={(value) => setPref("twoFactor", value)}
          />
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white/90">Active sessions</h3>
        <ul className="divide-y divide-white/6">
          {DEVICE_SESSIONS.filter((device) => !revoked.includes(device.id)).map((device) => (
            <li key={device.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-white/85">
                  <span className="truncate">{device.device}</span>
                  {device.current && <Badge tone="win">This device</Badge>}
                </p>
                <p className="mt-0.5 truncate text-[0.6875rem] text-white/40">
                  {device.browser} · {device.location} · {device.lastActive}
                </p>
              </div>
              {!device.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Sign out ${device.device}`}
                  onClick={() => setRevoked((prev) => [...prev, device.id])}
                  className="shrink-0"
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

/* ============================================================
   Responsible gambling
   ============================================================ */

function ResponsibleSection({
  limits,
  sessionMinutes,
}: {
  limits: ResponsibleLimits;
  sessionMinutes: number;
}) {
  return (
    <Section>
      <SectionHeading
        title="Responsible gambling"
        subtitle="Your current limits"
        action={
          <LinkButton href="/responsible-gambling#limits" variant="outline" size="sm">
            Adjust limits
          </LinkButton>
        }
      />
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Daily deposit"
            value={<span className="tnum">{formatMoney(limits.dailyDeposit, { decimals: false })}</span>}
          />
          <StatTile
            label="Weekly deposit"
            value={<span className="tnum">{formatMoney(limits.weeklyDeposit, { decimals: false })}</span>}
          />
          <StatTile
            label="Monthly deposit"
            value={<span className="tnum">{formatMoney(limits.monthlyDeposit, { decimals: false })}</span>}
          />
          <StatTile
            label="Weekly loss limit"
            value={<span className="tnum">{formatMoney(limits.lossLimitWeekly, { decimals: false })}</span>}
            tone="ember"
          />
        </div>

        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/45">Session length cap</dt>
            <dd className="text-white/80 tnum">{formatDuration(limits.sessionMinutes)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/45">Reality check every</dt>
            <dd className="text-white/80 tnum">{formatDuration(limits.realityCheckMinutes)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/45">Self-exclusion</dt>
            <dd className="text-white/80 capitalize">{limits.selfExclusion}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-2">
            <dt className="text-white/60">This session</dt>
            <dd className="font-medium text-gold-200 tnum" aria-live="polite">
              {formatDuration(sessionMinutes)}
            </dd>
          </div>
        </dl>
      </Card>
    </Section>
  );
}

/* ============================================================
   Danger zone
   ============================================================ */

function DangerZone({ onToast }: { onToast: (message: string) => void }) {
  const confirmId = useId();
  const [breakOpen, setBreakOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");

  const closeEnabled = confirmWord.trim().toUpperCase() === "CLOSE";

  return (
    <Section>
      <SectionHeading title="Danger zone" subtitle="These actions restrict your account" />
      <Card className="space-y-3 border-loss/15 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">Take a break</p>
            <p className="mt-0.5 text-xs text-white/45">
              Pause betting for 24 hours to 6 months. Balances stay withdrawable.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBreakOpen(true)} className="shrink-0">
            Take a break
          </Button>
        </div>

        <Divider />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">Close account</p>
            <p className="mt-0.5 text-xs text-white/45">
              Permanently closes your account. This cannot be undone.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setCloseOpen(true)} className="shrink-0">
            Close account
          </Button>
        </div>
      </Card>

      <Sheet
        open={breakOpen}
        onClose={() => setBreakOpen(false)}
        title="Take a break"
        description="You will not be able to bet or deposit until the break ends."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="subtle" fullWidth onClick={() => setBreakOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setBreakOpen(false);
                onToast("Break scheduled. You can still withdraw your balance.");
              }}
            >
              Confirm break
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-white/60">
          A break locks betting, casino and fantasy entries immediately. Withdrawals stay open, and you
          can extend the break at any time from Responsible Gambling.
        </p>
      </Sheet>

      <Sheet
        open={closeOpen}
        onClose={() => {
          setCloseOpen(false);
          setConfirmWord("");
        }}
        title="Close account"
        description="This is permanent and cannot be reversed."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="subtle"
              fullWidth
              onClick={() => {
                setCloseOpen(false);
                setConfirmWord("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={!closeEnabled}
              onClick={() => {
                setCloseOpen(false);
                setConfirmWord("");
                onToast("Account closure requested. Support will be in touch.");
              }}
            >
              Close account
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-white/60">
            Any remaining balance is returned to your verified payment method. Open bets are settled as
            normal before closure completes.
          </p>
          <Field
            label="Type CLOSE to confirm"
            htmlFor={confirmId}
            hint="The confirm button unlocks once the word matches."
          >
            <Input
              id={confirmId}
              value={confirmWord}
              autoComplete="off"
              placeholder="CLOSE"
              onChange={(e) => setConfirmWord(e.target.value)}
            />
          </Field>
        </div>
      </Sheet>
    </Section>
  );
}
