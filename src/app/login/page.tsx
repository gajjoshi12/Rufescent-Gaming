"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthLayout, OrRule, SocialButtons } from "@/components/auth/AuthLayout";
import { Button, Field, Input, Toggle } from "@/components/ui/primitives";
import { useSession } from "@/store/session";
import { cn } from "@/lib/format";

const DEMO_EMAIL = "aarav.mehta@example.in";
const DEMO_PASSWORD = "rufescent";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter the email address on your account.";
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "That does not look like a valid email address.";
    if (!password) next.password = "Enter your password.";
    else if (password.length < 6) next.password = "Passwords are at least 6 characters.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    // Stands in for the auth round-trip; the mock session has no credentials check.
    timer.current = window.setTimeout(() => {
      signIn();
      router.push("/");
    }, 700);
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Your open bets and balance are where you left them."
      footer={
        <>
          New to Rufescent?{" "}
          <Link
            href="/signup"
            className="font-medium text-gold-300 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SocialButtons verb="Continue" />
      <OrRule label="or use your email" />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email address" htmlFor="login-email" error={errors.email}>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password}>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-20"
              value={password}
              invalid={Boolean(errors.password)}
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
        </Field>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Toggle
              checked={remember}
              onChange={setRemember}
              label="Keep me signed in"
              description="Only on devices you control."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/responsible-gambling#support"
            className="text-xs text-white/50 underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Demo hint — this build has no real credential store. */}
      <div
        className={cn(
          "mt-5 rounded-xl border border-gold-400/20 bg-gold-400/6 px-3.5 py-3",
          "text-[0.6875rem] leading-relaxed text-white/55",
        )}
      >
        <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-gold-200">
          Demonstration build
        </p>
        <p>
          Any email and password will sign you in. To use the seeded account:{" "}
          <span className="tnum text-white/80">{DEMO_EMAIL}</span> /{" "}
          <span className="tnum text-white/80">{DEMO_PASSWORD}</span>
        </p>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-2 rounded-lg border border-gold-400/30 px-2.5 py-1 text-[0.6875rem] font-medium text-gold-200 transition-colors hover:bg-gold-400/12"
        >
          Fill demo credentials
        </button>
      </div>
    </AuthLayout>
  );
}
