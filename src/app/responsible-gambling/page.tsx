"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ResponsibleLimits } from "@/lib/types";
import { CURRENCY, cn, formatMoney } from "@/lib/format";
import { Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Input,
  SectionHeading,
} from "@/components/ui/primitives";
import { Sheet, Toast } from "@/components/ui/Sheet";
import { useSession } from "@/store/session";

const SECTIONS = [
  { id: "limits", label: "Deposit & loss limits" },
  { id: "reality-check", label: "Reality checks" },
  { id: "self-exclusion", label: "Take a break" },
  { id: "assessment", label: "Self-assessment" },
  { id: "support", label: "Independent support" },
  { id: "terms", label: "Terms & conditions" },
  { id: "privacy", label: "Privacy" },
  { id: "rules", label: "Betting rules" },
] as const;

export default function ResponsibleGamblingPage() {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <Shell slip={false} width="narrow">
      <header className="mb-7">
        <Badge tone="gold" className="mb-3">
          Safer gambling
        </Badge>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Staying in control
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-white/55">
          Gambling is a form of entertainment with a cost, not a way to earn money. Over enough bets
          the maths favours the house or the exchange commission, so the reasonable expectation is to
          lose the amount you stake over time. Most people play without harm. Some do not — and the
          difference is rarely obvious from the inside.
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-white/55">
          The tools on this page are here to be used before you need them. Setting a limit while
          you&rsquo;re calm is far easier than stopping while you&rsquo;re chasing a loss.
        </p>
      </header>

      <TableOfContents />

      <LimitsSection onSaved={() => setToast("Limits updated.")} />
      <RealityCheckSection />
      <SelfExclusionSection onApplied={(label) => setToast(`Break set: ${label}.`)} />
      <AssessmentSection />
      <SupportSection />

      <Divider className="my-8" />

      <PolicySection />

      <Toast open={toast !== null} tone="win" onDismiss={() => setToast(null)}>
        {toast}
      </Toast>
    </Shell>
  );
}

/* ============================================================
   Navigation
   ============================================================ */

function TableOfContents() {
  return (
    <nav
      aria-label="On this page"
      className="glass-soft sticky top-28 z-40 mb-7 rounded-2xl p-2.5 lg:top-30"
    >
      <ul className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className="block rounded-lg px-2.5 py-1.5 text-[0.6875rem] font-medium text-white/55 transition-colors hover:bg-white/8 hover:text-gold-200"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Anchor({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-32">
      <h2 id={`${id}-heading`} className="mb-1.5 font-display text-lg font-semibold">
        {title}
      </h2>
      {intro && <p className="mb-4 text-sm leading-relaxed text-white/55">{intro}</p>}
      {children}
    </Section>
  );
}

/* ============================================================
   Limits
   ============================================================ */

const LIMIT_FIELDS: {
  key: keyof Pick<
    ResponsibleLimits,
    "dailyDeposit" | "weeklyDeposit" | "monthlyDeposit" | "lossLimitWeekly" | "sessionMinutes"
  >;
  label: string;
  hint: string;
  unit: "money" | "minutes";
  presets: number[];
}[] = [
  {
    key: "dailyDeposit",
    label: "Daily deposit limit",
    hint: "Most you can add to your wallet in any 24 hours.",
    unit: "money",
    presets: [1000, 2500, 5000, 10000],
  },
  {
    key: "weeklyDeposit",
    label: "Weekly deposit limit",
    hint: "Rolling seven-day cap across all payment methods.",
    unit: "money",
    presets: [5000, 10000, 25000, 50000],
  },
  {
    key: "monthlyDeposit",
    label: "Monthly deposit limit",
    hint: "Rolling thirty-day cap.",
    unit: "money",
    presets: [20000, 50000, 100000, 200000],
  },
  {
    key: "lossLimitWeekly",
    label: "Weekly loss limit",
    hint: "Net losses. Play is blocked for the rest of the week once reached.",
    unit: "money",
    presets: [2500, 5000, 15000, 30000],
  },
  {
    key: "sessionMinutes",
    label: "Session length limit",
    hint: "You will be signed out when a single session reaches this length.",
    unit: "minutes",
    presets: [30, 60, 120, 240],
  },
];

function LimitsSection({ onSaved }: { onSaved: () => void }) {
  const { limits, updateLimits } = useSession();
  const [draft, setDraft] = useState<Record<string, number>>(() =>
    Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, limits[f.key]])),
  );

  const changed = LIMIT_FIELDS.some((f) => draft[f.key] !== limits[f.key]);
  const anyIncrease = LIMIT_FIELDS.some((f) => draft[f.key] > limits[f.key]);

  return (
    <Anchor
      id="limits"
      title="Deposit and loss limits"
      intro="Caps apply across the whole account — sports, casino and fantasy together. Reductions take effect immediately. Increases are held for 24 hours before they apply, so a limit can never be raised in the heat of the moment."
    >
      <Card className="p-4 sm:p-5">
        <div className="space-y-5">
          {LIMIT_FIELDS.map((field) => {
            const value = draft[field.key];
            const current = limits[field.key];
            const isIncrease = value > current;

            return (
              <div key={field.key}>
                <Field
                  label={field.label}
                  hint={field.hint}
                  htmlFor={`limit-${field.key}`}
                >
                  <Input
                    id={`limit-${field.key}`}
                    type="number"
                    min={0}
                    step={field.unit === "money" ? 500 : 15}
                    inputMode="numeric"
                    prefix={field.unit === "money" ? CURRENCY : undefined}
                    value={Number.isFinite(value) ? value : ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [field.key]: Number(e.target.value) || 0 }))
                    }
                    className={field.unit === "minutes" ? "" : undefined}
                  />
                </Field>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {field.presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, [field.key]: preset }))}
                      aria-pressed={value === preset}
                      className={cn(
                        "h-7 rounded-lg border px-2.5 text-[0.6875rem] font-medium tnum transition-all",
                        value === preset
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
                          : "border-white/10 bg-white/4 text-white/55 hover:border-gold-400/30",
                      )}
                    >
                      {field.unit === "money"
                        ? formatMoney(preset, { decimals: false })
                        : `${preset} min`}
                    </button>
                  ))}

                  {isIncrease && (
                    <span className="ml-auto text-[0.625rem] text-gold-300/80">
                      Applies after 24h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
          <Button
            variant="gold"
            disabled={!changed}
            onClick={() => {
              updateLimits(draft as Partial<ResponsibleLimits>);
              onSaved();
            }}
          >
            Save limits
          </Button>
          {changed && (
            <Button
              variant="ghost"
              onClick={() =>
                setDraft(Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, limits[f.key]])))
              }
            >
              Discard
            </Button>
          )}
          <p aria-live="polite" className="ml-auto text-[0.6875rem] text-white/35">
            {!changed
              ? "No pending changes"
              : anyIncrease
                ? "Reductions apply now; increases in 24 hours"
                : "Changes apply immediately"}
          </p>
        </div>
      </Card>
    </Anchor>
  );
}

/* ============================================================
   Reality check
   ============================================================ */

const REALITY_OPTIONS = [0, 15, 30, 60, 120];

function RealityCheckSection() {
  const { limits, updateLimits, sessionMinutes } = useSession();

  return (
    <Anchor
      id="reality-check"
      title="Reality checks"
      intro="A reality check pauses play and tells you how long you have been on the platform. It is the simplest way to notice that an hour became three."
    >
      <Card className="p-4 sm:p-5">
        <Field
          label="Remind me every"
          hint="Set to “Off” only if you have another way of tracking your time."
          htmlFor="reality-interval"
        >
          <select
            id="reality-interval"
            value={limits.realityCheckMinutes}
            onChange={(e) => updateLimits({ realityCheckMinutes: Number(e.target.value) })}
            className="h-11 w-full rounded-xl border border-white/10 bg-obsidian-900/70 px-3.5 text-sm text-white outline-none transition-colors hover:border-white/18 focus:border-gold-400/50"
          >
            {REALITY_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? "Off" : `${minutes} minutes`}
              </option>
            ))}
          </select>
        </Field>

        <div
          aria-live="polite"
          className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3.5 py-3"
        >
          <span className="text-xs text-white/50">Current session</span>
          <span className="font-display text-base font-semibold text-gold-300 tnum">
            {sessionMinutes} min
          </span>
        </div>
      </Card>
    </Anchor>
  );
}

/* ============================================================
   Self-exclusion
   ============================================================ */

const EXCLUSION_OPTIONS: {
  key: ResponsibleLimits["selfExclusion"];
  label: string;
  detail: string;
}[] = [
  { key: "none", label: "No break", detail: "Account fully active." },
  { key: "24h", label: "24 hours", detail: "A short cool-off to step away." },
  { key: "7d", label: "7 days", detail: "A week with no access to play." },
  { key: "30d", label: "30 days", detail: "A month away. Withdrawals stay available." },
  { key: "6m", label: "6 months", detail: "A long break. Cannot be reversed early." },
  { key: "permanent", label: "Permanent", detail: "Account closed for good. Irreversible." },
];

function SelfExclusionSection({ onApplied }: { onApplied: (label: string) => void }) {
  const { limits, updateLimits } = useSession();
  const [pending, setPending] = useState<(typeof EXCLUSION_OPTIONS)[number] | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const isPermanent = pending?.key === "permanent";
  const canConfirm = !isPermanent || confirmText.trim().toUpperCase() === "EXCLUDE";

  const close = useCallback(() => {
    setPending(null);
    setConfirmText("");
  }, []);

  return (
    <Anchor
      id="self-exclusion"
      title="Take a break"
      intro="Self-exclusion blocks betting, casino play and contest entry for the period you choose. You keep access to your wallet so you can withdraw any remaining balance. A break cannot be shortened once it starts — that is the point of it."
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {EXCLUSION_OPTIONS.map((option) => {
          const active = limits.selfExclusion === option.key;
          return (
            <li key={option.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (option.key === limits.selfExclusion) return;
                  if (option.key === "none") {
                    updateLimits({ selfExclusion: "none" });
                    return;
                  }
                  setPending(option);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-xl border p-3.5 text-left transition-all",
                  active
                    ? "border-gold-400/55 bg-gold-400/12"
                    : "border-white/10 bg-white/4 hover:border-gold-400/30 hover:bg-white/7",
                  option.key === "permanent" && !active && "hover:border-loss/40",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{option.label}</span>
                  {active && <Badge tone="gold">Active</Badge>}
                </span>
                <span className="text-[0.6875rem] leading-relaxed text-white/45">
                  {option.detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={pending !== null}
        onClose={close}
        title={`Confirm a ${pending?.label.toLowerCase() ?? ""} break`}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="subtle" fullWidth onClick={close}>
              Cancel
            </Button>
            <Button
              variant={isPermanent ? "danger" : "gold"}
              fullWidth
              disabled={!canConfirm}
              onClick={() => {
                if (!pending) return;
                updateLimits({ selfExclusion: pending.key });
                onApplied(pending.label);
                close();
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-1 text-sm leading-relaxed text-white/60">
          <p>
            During this break you will not be able to place bets, play casino games or enter fantasy
            contests. Any open bets stay live and will settle normally.
          </p>
          <p>
            You will be signed out immediately and marketing emails will stop.{" "}
            <strong className="text-white/85">
              This cannot be undone before the period ends.
            </strong>
          </p>

          {isPermanent && (
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-3.5">
              <p className="mb-2.5 text-xs text-loss">
                Permanent exclusion closes this account for good. You will not be able to open a new
                one.
              </p>
              <Field label="Type EXCLUDE to confirm" htmlFor="exclude-confirm">
                <Input
                  id="exclude-confirm"
                  value={confirmText}
                  autoComplete="off"
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUDE"
                />
              </Field>
            </div>
          )}

          <p className="text-xs text-white/40">
            If you want to be blocked across other operators too, consider a national scheme or a
            bank-level gambling block — see the support section below.
          </p>
        </div>
      </Sheet>
    </Anchor>
  );
}

/* ============================================================
   Self-assessment
   ============================================================ */

const QUESTIONS = [
  "Have you bet more than you could really afford to lose?",
  "Have you needed to gamble with larger amounts to get the same excitement?",
  "When you gambled, did you go back another day to win back what you lost?",
  "Have you borrowed money or sold anything to get money to gamble?",
  "Have you felt that you might have a problem with gambling?",
  "Has gambling caused you any health problems, including stress or anxiety?",
  "Have people criticised your betting or told you that you had a problem?",
  "Has your gambling caused financial problems for you or your household?",
  "Have you felt guilty about the way you gamble or what happens when you gamble?",
];

const ANSWERS = [
  { label: "Never", score: 0 },
  { label: "Sometimes", score: 1 },
  { label: "Most of the time", score: 2 },
  { label: "Almost always", score: 3 },
];

function band(score: number): { title: string; tone: string; body: string } {
  if (score === 0)
    return {
      title: "No indication of risk",
      tone: "border-win/30 bg-win/10 text-win",
      body: "Your answers don't suggest gambling is causing problems. Keeping a deposit limit in place is still a sensible habit.",
    };
  if (score <= 2)
    return {
      title: "Low level of risk",
      tone: "border-info/30 bg-info/10 text-info",
      body: "Your answers suggest few negative consequences so far. It's worth setting a deposit limit and reality check now, while it's an easy decision.",
    };
  if (score <= 7)
    return {
      title: "Moderate level of risk",
      tone: "border-gold-400/35 bg-gold-400/10 text-gold-200",
      body: "Your answers point to some negative consequences. Consider tightening your limits or taking a short break, and have a look at the support organisations below — talking to someone early makes a real difference.",
    };
  return {
    title: "High level of risk",
    tone: "border-loss/35 bg-loss/10 text-loss",
    body: "Your answers suggest gambling is likely causing significant problems. Please consider taking a break from this account and contacting one of the independent, free and confidential services listed below.",
  };
}

function AssessmentSection() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const answered = answers.filter((a) => a !== null).length;
  const complete = answered === QUESTIONS.length;
  const score = useMemo(() => answers.reduce<number>((sum, a) => sum + (a ?? 0), 0), [answers]);
  const result = band(score);

  return (
    <Anchor
      id="assessment"
      title="Self-assessment"
      intro="Nine questions adapted from the Problem Gambling Severity Index. It is a prompt for reflection, not a diagnosis — only a qualified professional can give you that. Nothing you enter here leaves your device."
    >
      {submitted ? (
        <Card className="p-4 sm:p-5">
          <div className={cn("rounded-xl border p-4", result.tone)}>
            <p className="text-[0.625rem] font-semibold uppercase tracking-widest opacity-70">
              Score {score} of 27
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">{result.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{result.body}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#support"
              className="inline-flex h-11 items-center rounded-xl border border-gold-400/35 px-4 text-sm font-medium text-gold-200 transition-colors hover:bg-gold-400/10"
            >
              See support options
            </a>
            <a
              href="#limits"
              className="inline-flex h-11 items-center rounded-xl border border-white/10 px-4 text-sm text-white/70 transition-colors hover:border-white/25"
            >
              Adjust my limits
            </a>
            <Button
              variant="ghost"
              onClick={() => {
                setAnswers(QUESTIONS.map(() => null));
                setSubmitted(false);
              }}
            >
              Retake
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          <ol className="space-y-5">
            {QUESTIONS.map((question, qi) => (
              <li key={question}>
                <fieldset>
                  <legend className="mb-2 text-sm leading-relaxed text-white/80">
                    <span className="mr-1.5 text-white/30 tnum">{qi + 1}.</span>
                    {question}
                  </legend>
                  <div
                    role="radiogroup"
                    aria-label={question}
                    className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
                  >
                    {ANSWERS.map((answer) => {
                      const selected = answers[qi] === answer.score;
                      return (
                        <button
                          key={answer.label}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setAnswers((current) => {
                              const next = [...current];
                              next[qi] = answer.score;
                              return next;
                            })
                          }
                          className={cn(
                            "h-9 rounded-lg border text-[0.6875rem] font-medium transition-all",
                            selected
                              ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
                              : "border-white/10 bg-white/4 text-white/55 hover:border-gold-400/30",
                          )}
                        >
                          {answer.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
            <Button variant="gold" disabled={!complete} onClick={() => setSubmitted(true)}>
              See my result
            </Button>
            <p aria-live="polite" className="text-[0.6875rem] text-white/40 tnum">
              {answered} of {QUESTIONS.length} answered
            </p>
          </div>
        </Card>
      )}
    </Anchor>
  );
}

/* ============================================================
   Support
   ============================================================ */

const SUPPORT = [
  {
    name: "Tele-MANAS (India)",
    contact: "14416 · 1800-891-4416",
    detail:
      "India's national mental-health helpline, run by the Ministry of Health. Free, confidential, 24×7, and available in multiple languages.",
    href: "https://telemanas.mohfw.gov.in",
  },
  {
    name: "GamCare",
    contact: "0808 8020 133",
    detail:
      "Operates the UK National Gambling Helpline with free 24×7 support, live chat and structured treatment for anyone affected by gambling harm.",
    href: "https://www.gamcare.org.uk",
  },
  {
    name: "GambleAware",
    contact: "begambleaware.org",
    detail:
      "Independent charity commissioning prevention and treatment services, plus practical self-help tools and a treatment directory.",
    href: "https://www.begambleaware.org",
  },
  {
    name: "Gamblers Anonymous",
    contact: "gamblersanonymous.org",
    detail:
      "A worldwide fellowship of people who share their experience to help each other recover. Meetings run in person and online, including across India.",
    href: "https://www.gamblersanonymous.org",
  },
];

function SupportSection() {
  return (
    <Anchor
      id="support"
      title="Independent support"
      intro="These organisations are independent of Rufescent Gaming. They are free, confidential, and you do not need to be in crisis to contact them."
    >
      <ul className="space-y-2.5">
        {SUPPORT.map((org) => (
          <li key={org.name}>
            <Card className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{org.name}</h3>
                <span className="text-xs font-medium text-gold-300 tnum">{org.contact}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">{org.detail}</p>
              <a
                href={org.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-white/45 underline-offset-2 transition-colors hover:text-gold-200 hover:underline"
              >
                {org.href.replace("https://", "")}
                <span aria-hidden="true">↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-xs leading-relaxed text-white/45">
        If someone is in immediate danger, contact your local emergency services. Many banks also
        offer a gambling block that stops card payments to betting companies — it is worth asking
        yours.
      </p>
    </Anchor>
  );
}

/* ============================================================
   Policies
   ============================================================ */

const POLICIES: { id: string; title: string; points: string[] }[] = [
  {
    id: "terms",
    title: "Terms & conditions",
    points: [
      "Accounts are for personal use by one individual aged 18 or over. Duplicate accounts are closed and any bonus balance forfeited.",
      "Bonuses carry wagering requirements stated on the offer. Bonus funds are used before cash funds, and cannot be withdrawn until the requirement is met.",
      "We may request identity, address and source-of-funds documents at any point, and withdrawals are held until verification is complete.",
      "Bets are final once matched. Where an obvious pricing error occurred (a palpable error), the bet is void and stakes are returned.",
      "This is a demonstration build. No real money, wagering or payment processing takes place.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    points: [
      "We collect what is needed to run the account: identity and contact details, transactions, betting history and device data.",
      "Verification documents are retained for the period required by anti-money-laundering rules, then deleted.",
      "Play data is used to spot markers of harm — sharp increases in deposits, chasing losses, overnight sessions — and to prompt an intervention.",
      "You can request a copy of your data or its deletion, subject to the retention obligations above.",
      "In this demonstration build all data stays in your browser's local storage and is never transmitted.",
    ],
  },
  {
    id: "rules",
    title: "Betting rules",
    points: [
      "Markets settle on the official result from the governing body. Later corrections do not reopen a settled market.",
      "If a fixture is abandoned or postponed beyond 48 hours, unresolved markets are void and stakes returned. Markets already unconditionally determined stand.",
      "Exchange bets match against other users. Only the matched portion of a bet stands; unmatched amounts are returned when the market turns in-play or closes.",
      "Cash-out offers are indicative and depend on available liquidity. An offer can be withdrawn between the moment it is shown and the moment you accept it.",
      "Dead heats reduce the stake proportionally to the number of runners tying, settled at full odds on the reduced stake.",
      "Multi bets void a leg at odds of 1.00, and the remaining legs stand.",
    ],
  },
];

function PolicySection() {
  const [open, setOpen] = useState<string | null>("terms");

  return (
    <>
      <SectionHeading
        title="Policies"
        subtitle="Summaries for this demonstration build"
        icon="§"
      />
      <div className="space-y-2">
        {POLICIES.map((policy) => {
          const expanded = open === policy.id;
          return (
            <section
              key={policy.id}
              id={policy.id}
              className="glass scroll-mt-32 overflow-hidden rounded-2xl"
            >
              <h2>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${policy.id}-panel`}
                  onClick={() => setOpen(expanded ? null : policy.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/3"
                >
                  <span className="text-sm font-semibold">{policy.title}</span>
                  <svg
                    viewBox="0 0 16 16"
                    className={cn(
                      "size-3.5 shrink-0 text-white/40 transition-transform duration-250",
                      expanded && "rotate-180",
                    )}
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6.5L8 10.5L12 6.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </h2>

              {expanded && (
                <div id={`${policy.id}-panel`} className="border-t border-white/6 px-4 py-3.5">
                  <ul className="space-y-2.5">
                    {policy.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-xs leading-relaxed text-white/55">
                        <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-gold-400/60" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-white/30">
        Rufescent Gaming is a portfolio demonstration. It processes no payments and accepts no
        wagers.{" "}
        <Link href="/" className="text-gold-300/60 underline-offset-2 hover:underline">
          Back to the lobby
        </Link>
      </p>
    </>
  );
}
