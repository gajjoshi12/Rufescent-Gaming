"use client";

import Link from "next/link";
import { Mark, Wordmark } from "@/components/brand/Logo";
import { Shell } from "@/components/layout/Shell";
import { Card, Divider } from "@/components/ui/primitives";
import { QUICK_STATS } from "@/lib/mock/promotions";
import { cn } from "@/lib/format";

const VALUE_PROPS: { title: string; body: string }[] = [
  {
    title: "One balance, four products",
    body: "Sportsbook, exchange, casino and daily fantasy settle against a single wallet — no transfers, no waiting.",
  },
  {
    title: "Withdrawals in minutes",
    body: "UPI payouts clear in a median of eight minutes once your identity check is complete.",
  },
  {
    title: "Limits you set yourself",
    body: "Deposit caps, loss limits, reality checks and self-exclusion are built in, not buried in a settings menu.",
  },
];

/**
 * Split chrome shared by /login and /signup.
 *
 * Desktop gets the brand panel on the left and the form card on the right;
 * mobile drops the panel entirely and leads with the monogram so the form
 * is the first thing on screen.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Shell sidebar={false} slip={false}>
      <div className="mx-auto grid w-full max-w-5xl gap-8 py-4 lg:grid-cols-[1fr_25.5rem] lg:items-start lg:gap-12 lg:py-10">
        {/* ---- Brand panel (desktop only) ---- */}
        <aside className="hidden min-w-0 lg:block">
          <Link href="/" className="inline-flex rounded-lg" aria-label="Rufescent Gaming home">
            <Wordmark size={40} />
          </Link>

          <p className="mt-8 max-w-md text-2xl font-semibold leading-snug tracking-tight">
            The <span className="text-gilt">whole book</span>, one account.
          </p>

          <ul className="mt-6 max-w-md space-y-4">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-linear-to-br from-gold-200 to-ember-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white/90">{prop.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-white/45">
                    {prop.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <Divider className="my-7 max-w-md" />

          <dl className="grid max-w-md grid-cols-3 gap-4">
            {QUICK_STATS.slice(0, 3).map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="text-[0.625rem] font-medium uppercase tracking-wider text-white/40">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold tnum text-gilt">
                  {stat.value}
                </dd>
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-white/30">{stat.hint}</p>
              </div>
            ))}
          </dl>

          <p className="mt-8 max-w-md text-[0.6875rem] leading-relaxed text-white/30">
            Demonstration build. Figures are illustrative and no real money is handled. 18+ only —
            gambling involves risk of financial loss.
          </p>
        </aside>

        {/* ---- Form card ---- */}
        <div className="min-w-0">
          <Link
            href="/"
            className="mx-auto mb-5 flex w-fit rounded-lg lg:hidden"
            aria-label="Rufescent Gaming home"
          >
            <Mark size={44} />
          </Link>

          <Card className="p-5 sm:p-6">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/45">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </Card>

          <div className="mt-4 text-center text-sm text-white/50">{footer}</div>

          <p className="mt-5 text-center text-[0.6875rem] leading-relaxed text-white/25 lg:hidden">
            18+ only. Gambling involves risk of financial loss. Demonstration build — no real money
            is handled.
          </p>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   Shared bits
   ============================================================ */

/** Google / Apple sign-in. Deliberately secondary to the email form. */
export function SocialButtons({ verb }: { verb: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        { key: "google", label: "Google", icon: <GoogleGlyph /> },
        { key: "apple", label: "Apple", icon: <AppleGlyph /> },
      ].map((provider) => (
        <button
          key={provider.key}
          type="button"
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5",
            "text-sm font-medium text-white/80 transition-colors duration-200",
            "hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.985]",
          )}
        >
          {provider.icon}
          <span>
            {verb} with {provider.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** "or" rule between the social block and the email form. */
export function OrRule({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="presentation">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-white/30">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.86-.08-1.5-.24-2.16H12v3.93h6.6c-.13 1.1-.85 2.75-2.45 3.86l-.02.15 3.56 2.76.25.02c2.26-2.09 3.56-5.17 3.56-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.79-2.93c-1.01.7-2.37 1.2-4.15 1.2-3.17 0-5.86-2.09-6.82-4.98l-.14.01-3.7 2.87-.05.13C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.18 14.39a7.4 7.4 0 0 1-.4-2.39c0-.83.15-1.64.39-2.39l-.01-.16-3.75-2.9-.12.06A11.99 11.99 0 0 0 0 12c0 1.94.47 3.77 1.29 5.39l3.89-3Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.63c2.25 0 3.77.97 4.63 1.78l3.39-3.3C17.95 1.17 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.88 3c.97-2.89 3.66-4.98 6.83-4.98Z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.7c-.03-2.84 2.32-4.2 2.43-4.27-1.32-1.94-3.38-2.2-4.11-2.23-1.75-.18-3.42 1.03-4.31 1.03-.89 0-2.26-1-3.72-.98-1.91.03-3.68 1.11-4.66 2.82-1.99 3.45-.51 8.55 1.42 11.35.95 1.37 2.07 2.9 3.55 2.85 1.43-.06 1.97-.92 3.69-.92s2.21.92 3.72.89c1.54-.03 2.51-1.39 3.44-2.77 1.09-1.59 1.53-3.13 1.56-3.21-.03-.02-2.99-1.15-3.02-4.56ZM13.6 4.3c.79-.96 1.32-2.29 1.17-3.61-1.14.05-2.51.76-3.32 1.71-.73.85-1.37 2.2-1.2 3.5 1.27.1 2.57-.65 3.35-1.6Z" />
    </svg>
  );
}
