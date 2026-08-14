"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AuthLayout, OrRule, SocialButtons } from "@/components/auth/AuthLayout";
import { Badge, Button, Field, Input } from "@/components/ui/primitives";
import { useSession } from "@/store/session";
import { useMounted } from "@/lib/hooks";
import { clamp, cn } from "@/lib/format";

/* ============================================================
   Static reference data
   ============================================================ */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^[0-9]{7,15}$/;
const LEGAL_AGE = 18;

interface Country {
  code: string;
  name: string;
  dialCode: string;
  /** What the second-level division is called locally. */
  regionLabel: string;
  regions: string[];
}

const COUNTRIES: Country[] = [
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    regionLabel: "State / union territory",
    regions: [
      "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
      "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
      "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
      "Uttar Pradesh", "Uttarakhand", "West Bengal",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    regionLabel: "Nation",
    regions: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    regionLabel: "State / territory",
    regions: [
      "Australian Capital Territory", "New South Wales", "Northern Territory",
      "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    regionLabel: "Province / territory",
    regions: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
      "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    ],
  },
];

const STEPS = [
  { n: 1, label: "Account", hint: "Email and password" },
  { n: 2, label: "Details", hint: "Name, age and location" },
  { n: 3, label: "Verify", hint: "Declarations and ID" },
] as const;

/* ============================================================
   Helpers
   ============================================================ */

/** Whole years between an ISO `yyyy-mm-dd` string and `today`. */
function ageOn(isoDate: string, today: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const dob = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  let years = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years;
}

interface Strength {
  score: number;
  label: string;
  advice: string;
}

function passwordStrength(value: string): Strength {
  if (!value) return { score: 0, label: "Empty", advice: "At least 8 characters." };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;
  if (/^(.)\1+$/.test(value) || /^(?:123|abc|password|qwerty)/i.test(value)) score = 0;

  const bounded = clamp(score, 0, 4);
  const label = ["Very weak", "Weak", "Fair", "Strong", "Very strong"][bounded];
  const advice =
    value.length < 8
      ? "Use at least 8 characters."
      : bounded < 2
        ? "Mix upper and lower case, and add a number."
        : bounded < 3
          ? "Add a symbol or a few more characters."
          : "Good — this would resist a common-password attack.";
  return { score: bounded, label, advice };
}

/* ============================================================
   Local field primitives
   ============================================================ */

function Select({
  invalid,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border bg-obsidian-900/70 pl-3.5 pr-9 text-sm text-white",
          "transition-colors duration-200 outline-none focus:border-gold-400/50 focus:bg-obsidian-850",
          invalid ? "border-loss/60" : "border-white/10 hover:border-white/18",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-white/35"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  id,
  invalid,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          "mt-0.5 size-4.5 shrink-0 cursor-pointer appearance-none rounded-md border bg-obsidian-900/70",
          "transition-colors duration-200 checked:border-gold-400 checked:bg-gold-400",
          "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22M3.5 8.5l3 3 6-6%22 fill=%22none%22 stroke=%22%2308070a%22 stroke-width=%222.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] checked:bg-center checked:bg-no-repeat",
          invalid ? "border-loss/60" : "border-white/18",
        )}
      />
      <label htmlFor={id} className="min-w-0 cursor-pointer text-xs leading-relaxed text-white/60">
        {children}
      </label>
    </div>
  );
}

/** One shared error renderer so every message is announced identically. */
function ErrorLine({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-[0.6875rem] text-loss">
      {children}
    </p>
  );
}

/* ============================================================
   Page
   ============================================================ */

type Errors = Record<string, string>;

export default function SignupPage() {
  const router = useRouter();
  const { signIn, confirmAge } = useSession();
  const uid = useId().replace(/:/g, "");

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code);
  const [region, setRegion] = useState("");

  // Step 3
  const [kycChoice, setKycChoice] = useState<"now" | "later">("now");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const strength = useMemo(() => passwordStrength(password), [password]);
  const underage = age !== null && age < LEGAL_AGE;

  // `max` on the date input needs today's date, which must not reach the
  // server-rendered markup. `useMounted` is backed by useSyncExternalStore,
  // so this stays empty through hydration and fills in on the first commit.
  const mounted = useMounted();
  const todayISO = mounted ? new Date().toISOString().slice(0, 10) : "";

  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const headingRef = useRef<HTMLParagraphElement | null>(null);

  function validateStep(target: number): Errors {
    const next: Errors = {};

    if (target === 1) {
      if (!email.trim()) next.email = "Enter your email address.";
      else if (!EMAIL_PATTERN.test(email.trim())) next.email = "That does not look like a valid email address.";
      if (!password) next.password = "Choose a password.";
      else if (password.length < 8) next.password = "Passwords must be at least 8 characters.";
      else if (strength.score < 2) next.password = "That password is too easy to guess. Add case variety or a number.";
      if (!confirm) next.confirm = "Re-enter your password.";
      else if (confirm !== password) next.confirm = "The two passwords do not match.";
    }

    if (target === 2) {
      if (!fullName.trim()) next.fullName = "Enter your name as it appears on your ID.";
      else if (fullName.trim().length < 3 || !fullName.trim().includes(" "))
        next.fullName = "Enter your full legal name, first and last.";
      if (!dob) next.dob = "Enter your date of birth.";
      else if (age === null) next.dob = "Enter a valid date.";
      else if (age > 120) next.dob = "Check the year — that date is not plausible.";
      else if (age < LEGAL_AGE) next.dob = `You must be ${LEGAL_AGE} or older to open an account.`;
      if (!mobile.trim()) next.mobile = "Enter a mobile number we can reach you on.";
      else if (!MOBILE_PATTERN.test(mobile.replace(/[\s-]/g, "")))
        next.mobile = "Enter digits only, 7–15 characters.";
      if (!region) next.region = `Select your ${country.regionLabel.toLowerCase()}.`;
    }

    if (target === 3) {
      if (!acceptedTerms) next.terms = "You must accept the terms and confirm your age to continue.";
      if (!acknowledgedRisk) next.risk = "Please confirm you have read the responsible-gambling notice.";
    }

    return next;
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep((s) => Math.min(3, s + 1));
    headingRef.current?.focus();
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    if (step < 3) {
      goNext();
      return;
    }

    // Re-run every step so a stale earlier field cannot slip through.
    const found = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (validateStep(1).email || validateStep(1).password || validateStep(1).confirm) setStep(1);
      else if (Object.keys(validateStep(2)).length > 0) setStep(2);
      return;
    }

    setBusy(true);
    timer.current = window.setTimeout(() => {
      signIn();
      // The declared date of birth satisfies the site-wide age gate, so the
      // interstitial does not reappear straight after registering.
      confirmAge();
      router.push(kycChoice === "now" ? "/wallet#kyc" : "/");
    }, 800);
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Three short steps. You will need a government ID before your first withdrawal."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-gold-300 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* ---- Step indicator ---- */}
      <nav aria-label="Registration progress" className="mb-6">
        <ol className="flex items-start gap-1.5">
          {STEPS.map((s) => {
            const state = s.n < step ? "done" : s.n === step ? "current" : "todo";
            return (
              <li key={s.n} className="min-w-0 flex-1">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors duration-300",
                    state === "done" && "bg-linear-to-r from-gold-300 to-gold-500",
                    state === "current" && "bg-linear-to-r from-ember-400 to-ember-600",
                    state === "todo" && "bg-white/10",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-[0.6875rem] font-medium",
                    state === "todo" ? "text-white/30" : "text-white/75",
                  )}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="tnum">{s.n}.</span> {s.label}
                </p>
              </li>
            );
          })}
        </ol>
        <p
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-xs text-white/40 outline-none"
          aria-live="polite"
        >
          Step {step} of 3 — {STEPS[step - 1].hint}
        </p>
      </nav>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* ============ STEP 1 — ACCOUNT ============ */}
        {step === 1 && (
          <>
            <SocialButtons verb="Sign up" />
            <OrRule label="or use your email" />

            <Field label="Email address" htmlFor={`${uid}-email`} error={errors.email}>
              <Input
                id={`${uid}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                invalid={Boolean(errors.email)}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div className="space-y-1.5">
              <label htmlFor={`${uid}-password`} className="block text-xs font-medium text-white/65">
                Password
              </label>
              <div className="relative">
                <Input
                  id={`${uid}-password`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="pr-20"
                  value={password}
                  invalid={Boolean(errors.password)}
                  aria-describedby={`${uid}-strength`}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg px-2.5 text-[0.6875rem] font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Live strength meter */}
              <div id={`${uid}-strength`}>
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-300",
                        i < strength.score
                          ? strength.score <= 1
                            ? "bg-loss"
                            : strength.score === 2
                              ? "bg-gold-400"
                              : "bg-win"
                          : "bg-white/10",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[0.6875rem] text-white/40" aria-live="polite">
                  <span
                    className={cn(
                      "font-medium",
                      strength.score <= 1 ? "text-loss" : strength.score === 2 ? "text-gold-300" : "text-win",
                    )}
                  >
                    {strength.label}
                  </span>
                  {" · "}
                  {strength.advice}
                </p>
              </div>
              <ErrorLine>{errors.password}</ErrorLine>
            </div>

            <Field label="Confirm password" htmlFor={`${uid}-confirm`} error={errors.confirm}>
              <Input
                id={`${uid}-confirm`}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirm}
                invalid={Boolean(errors.confirm)}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </>
        )}

        {/* ============ STEP 2 — PERSONAL DETAILS ============ */}
        {step === 2 && (
          <>
            <p className="text-xs leading-relaxed text-white/40">
              These details must match your identity document. Mismatches are the most common reason
              a withdrawal is held.
            </p>

            <Field
              label="Full legal name"
              htmlFor={`${uid}-name`}
              error={errors.fullName}
              hint="As printed on your passport, Aadhaar or driving licence."
            >
              <Input
                id={`${uid}-name`}
                autoComplete="name"
                placeholder="Aarav Mehta"
                value={fullName}
                invalid={Boolean(errors.fullName)}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            {/* Age gate for registration — the hard block lives here, not in the small print. */}
            <div
              className={cn(
                "rounded-xl border p-3.5 transition-colors duration-300",
                underage ? "border-loss/50 bg-loss/8" : "border-white/10 bg-white/3",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={`${uid}-dob`} className="text-xs font-medium text-white/80">
                  Date of birth
                </label>
                <Badge tone={underage ? "ember" : "gold"}>{LEGAL_AGE}+ only</Badge>
              </div>

              <Input
                id={`${uid}-dob`}
                type="date"
                autoComplete="bday"
                max={todayISO || undefined}
                value={dob}
                invalid={Boolean(errors.dob) || underage}
                aria-describedby={`${uid}-dob-note`}
                onChange={(e) => {
                  const value = e.target.value;
                  setDob(value);
                  setAge(value ? ageOn(value, new Date()) : null);
                }}
              />

              <div id={`${uid}-dob-note`} className="mt-2">
                {underage ? (
                  <div role="alert" className="space-y-1.5">
                    <p className="text-xs font-semibold text-loss">
                      You are {age} — you cannot open an account.
                    </p>
                    <p className="text-[0.6875rem] leading-relaxed text-white/55">
                      Gambling by anyone under {LEGAL_AGE} is illegal in every market we operate in,
                      and we are required to refuse registration. This is not something support can
                      override. If someone has asked you to register on their behalf, please do not
                      — the account would be closed and any funds withheld.
                    </p>
                    <p className="text-[0.6875rem] text-white/45">
                      Free, confidential advice for young people:{" "}
                      <a
                        href="https://www.begambleaware.org"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-gold-300 underline-offset-2 hover:underline"
                      >
                        BeGambleAware
                      </a>
                      .
                    </p>
                  </div>
                ) : age !== null && age <= 120 ? (
                  <p className="text-[0.6875rem] text-white/45">
                    Age {age} — eligible. We verify this against your ID before your first withdrawal.
                  </p>
                ) : (
                  <p className="text-[0.6875rem] text-white/35">
                    You must be {LEGAL_AGE} or older. We check this against a government ID later.
                  </p>
                )}
                <ErrorLine>{underage ? undefined : errors.dob}</ErrorLine>
              </div>
            </div>

            <Field label="Mobile number" htmlFor={`${uid}-mobile`} error={errors.mobile}>
              <div className="flex gap-2">
                <span className="inline-flex h-11 shrink-0 items-center rounded-xl border border-white/10 bg-obsidian-900/70 px-3 text-sm tnum text-white/55">
                  {country.dialCode}
                </span>
                <div className="min-w-0 flex-1">
                  <Input
                    id={`${uid}-mobile`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    value={mobile}
                    invalid={Boolean(errors.mobile)}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country of residence" htmlFor={`${uid}-country`}>
                <Select
                  id={`${uid}-country`}
                  autoComplete="country"
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setRegion("");
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={country.regionLabel} htmlFor={`${uid}-region`} error={errors.region}>
                <Select
                  id={`${uid}-region`}
                  value={region}
                  invalid={Boolean(errors.region)}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">Select…</option>
                  {country.regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        {/* ============ STEP 3 — VERIFICATION GATE ============ */}
        {step === 3 && (
          <>
            <div className="rounded-xl border border-white/10 bg-white/3 p-3.5">
              <h2 className="text-sm font-semibold text-white/90">Identity verification</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                You can deposit and place bets straight away. Before your <strong className="font-medium text-white/75">first withdrawal</strong>{" "}
                we must verify who you are — a photo ID and a recent proof of address. This is a
                licensing requirement, not a house rule, and it typically clears within a few hours.
              </p>

              <div
                role="radiogroup"
                aria-label="When would you like to verify your identity?"
                className="mt-3 grid gap-2"
              >
                {[
                  {
                    key: "now" as const,
                    title: "Upload documents now",
                    body: "Takes about two minutes. Your first withdrawal will not be held.",
                  },
                  {
                    key: "later" as const,
                    title: "Do it later",
                    body: "Start playing immediately. We will prompt you before you withdraw.",
                  },
                ].map((option) => {
                  const selected = kycChoice === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setKycChoice(option.key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all duration-200",
                        selected
                          ? "border-gold-400/45 bg-gold-400/8"
                          : "border-white/10 bg-white/2 hover:border-white/20",
                      )}
                    >
                      <span className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                            selected ? "border-gold-300" : "border-white/25",
                          )}
                        >
                          {selected && <span className="size-2 rounded-full bg-gold-300" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-white/90">{option.title}</span>
                          <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-white/45">
                            {option.body}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-3.5">
              <CheckRow
                id={`${uid}-terms`}
                checked={acceptedTerms}
                onChange={(v) => setAcceptedTerms(v)}
                invalid={Boolean(errors.terms)}
              >
                I am {LEGAL_AGE} years of age or older, the details I have given are accurate, and I
                accept the{" "}
                <Link href="/responsible-gambling#terms" className="text-gold-300 underline-offset-2 hover:underline">
                  terms and conditions
                </Link>{" "}
                and{" "}
                <Link href="/responsible-gambling#privacy" className="text-gold-300 underline-offset-2 hover:underline">
                  privacy policy
                </Link>
                .
              </CheckRow>
              <ErrorLine>{errors.terms}</ErrorLine>

              <div className="h-px bg-white/8" />

              <CheckRow
                id={`${uid}-risk`}
                checked={acknowledgedRisk}
                onChange={(v) => setAcknowledgedRisk(v)}
                invalid={Boolean(errors.risk)}
              >
                I understand that gambling carries a real risk of financial loss, that the odds
                favour the house over time, and that I can set deposit limits, reality checks or
                self-exclude at any point from{" "}
                <Link href="/responsible-gambling" className="text-gold-300 underline-offset-2 hover:underline">
                  responsible gambling
                </Link>
                .
              </CheckRow>
              <ErrorLine>{errors.risk}</ErrorLine>
            </div>

            <p className="text-[0.6875rem] leading-relaxed text-white/30">
              Demonstration build — no account is created, no documents are transmitted and no money
              is handled.
            </p>
          </>
        )}

        {/* ---- Navigation ---- */}
        <div className="flex gap-2.5 pt-1">
          {step > 1 && (
            <Button type="button" variant="subtle" size="lg" onClick={goBack} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              onClick={goNext}
              disabled={step === 2 && underage}
              className="flex-[2]"
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" size="lg" loading={busy} className="flex-[2]">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
