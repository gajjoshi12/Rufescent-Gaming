"use client";

import Link from "next/link";
import { Mark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/primitives";
import { useSession } from "@/store/session";
import { useFocusTrap, useScrollLock } from "@/lib/hooks";

/**
 * Blocking age-verification gate.
 *
 * Renders over the whole app until the visitor confirms they are 18 or
 * over. The answer is remembered in localStorage, and `ageGateReady`
 * keeps the gate from flashing on every load before that read completes.
 */
export function AgeGate() {
  const { ageConfirmed, ageGateReady, confirmAge, declineAge, ageDeclined } = useSession();
  const open = ageGateReady && !ageConfirmed;
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-end justify-center sm:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-obsidian-950/94 backdrop-blur-lg"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-body"
        className="glass relative m-3 w-full max-w-md animate-rise rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <Mark size={52} />
          <h1 id="age-gate-title" className="mt-4 font-display text-xl font-semibold">
            Are you 18 or over?
          </h1>
          <p id="age-gate-body" className="mt-2 text-sm leading-relaxed text-white/55">
            Rufescent Gaming is restricted to adults. You must confirm your age before you can view
            odds, games or contests. We verify age and identity again before any withdrawal.
          </p>
        </div>

        {ageDeclined ? (
          <div
            role="alert"
            className="rounded-xl border border-loss/30 bg-loss/10 p-4 text-center"
          >
            <p className="text-sm font-medium text-loss">Access denied</p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">
              You must be at least 18 years old to use this platform. If you entered this by mistake,
              you can confirm your age below.
            </p>
            <button
              type="button"
              onClick={confirmAge}
              className="mt-3 text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
            >
              I am 18 or over
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <Button variant="gold" size="lg" fullWidth onClick={confirmAge}>
              Yes, I am 18 or over
            </Button>
            <Button variant="subtle" size="lg" fullWidth onClick={declineAge}>
              No, I am under 18
            </Button>
          </div>
        )}

        <p className="mt-5 text-center text-[0.6875rem] leading-relaxed text-white/30">
          Gambling can be addictive. Play responsibly and never stake more than you can afford to
          lose.{" "}
          <Link href="/responsible-gambling" className="text-gold-300/70 underline-offset-2 hover:underline">
            Learn about our safer-gambling tools
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Periodic reminder of elapsed session time — a standard duty-of-care
 * prompt that regulators expect on real-money platforms.
 */
export function RealityCheck() {
  const { realityCheckDue, sessionMinutes, acknowledgeRealityCheck } = useSession();
  const panelRef = useFocusTrap<HTMLDivElement>(realityCheckDue);

  if (!realityCheckDue) return null;

  return (
    <div className="fixed inset-0 z-190 grid place-items-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-obsidian-950/85 backdrop-blur-md" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reality-check-title"
        className="glass relative w-full max-w-sm animate-rise rounded-2xl p-6 text-center"
      >
        <span aria-hidden="true" className="text-3xl">
          ⏱
        </span>
        <h2 id="reality-check-title" className="mt-3 font-display text-lg font-semibold">
          You&rsquo;ve been playing for {sessionMinutes} minutes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Take a moment to check in with yourself. Are you still playing for entertainment?
        </p>
        <div className="mt-5 space-y-2">
          <Button variant="gold" fullWidth onClick={acknowledgeRealityCheck}>
            Continue playing
          </Button>
          <Link
            href="/responsible-gambling"
            onClick={acknowledgeRealityCheck}
            className="block rounded-xl border border-white/10 py-2.5 text-sm text-white/70 transition-colors hover:border-gold-400/30 hover:text-gold-200"
          >
            Review my limits
          </Link>
        </div>
      </div>
    </div>
  );
}
