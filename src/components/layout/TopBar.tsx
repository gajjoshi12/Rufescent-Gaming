"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn, formatMoney, hueGradient } from "@/lib/format";
import { Wordmark } from "@/components/brand/Logo";
import { Button, LinkButton } from "@/components/ui/primitives";
import { ODDS_FORMATS, useOddsFormat } from "@/store/odds-format";
import { useSession } from "@/store/session";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./navigation";

export function TopBar() {
  const pathname = usePathname();
  const { user, signedIn } = useSession();
  const { format, setFormat } = useOddsFormat();
  const [formatOpen, setFormatOpen] = useState(false);

  return (
    <header className="sticky top-0 z-80 border-b border-white/8 bg-obsidian-950/85 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex h-14 max-w-[104rem] items-center gap-3 px-3 sm:px-5 lg:h-16">
        <Link href="/" aria-label="Rufescent Gaming home" className="shrink-0">
          <Wordmark size={30} />
        </Link>

        {/* Desktop primary nav */}
        <nav aria-label="Sections" className="ml-4 hidden items-center gap-0.5 xl:flex">
          {PRIMARY_NAV.filter((i) => i.href !== "/profile" && i.href !== "/wallet").map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active ? "text-white" : "text-white/50 hover:text-white/85",
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-linear-to-r from-ember-400 to-gold-400"
                  />
                )}
              </Link>
            );
          })}
          {SECONDARY_NAV.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive(pathname, item) ? "text-white" : "text-white/50 hover:text-white/85",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Odds format switch */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFormatOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={formatOpen}
              aria-label={`Odds format: ${format}`}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-2.5 text-[0.6875rem] font-medium text-white/65 transition-colors hover:border-gold-400/30 hover:text-gold-200"
            >
              <span className="hidden sm:inline">Odds</span>
              <span className="font-semibold capitalize text-gold-300">{format.slice(0, 4)}</span>
              <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {formatOpen && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setFormatOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <ul
                  role="listbox"
                  aria-label="Odds format"
                  className="glass absolute right-0 top-11 z-20 w-44 animate-rise overflow-hidden rounded-xl p-1"
                >
                  {ODDS_FORMATS.map((option) => (
                    <li key={option.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option.key === format}
                        onClick={() => {
                          setFormat(option.key);
                          setFormatOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors",
                          option.key === format
                            ? "bg-ember-500/20 text-gold-200"
                            : "text-white/65 hover:bg-white/6",
                        )}
                      >
                        <span>{option.label}</span>
                        <span className="text-white/35 tnum">{option.example}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {signedIn ? (
            <>
              {/* Balance chip → wallet */}
              <Link
                href="/wallet"
                className="flex h-9 items-center gap-2 rounded-lg border border-gold-400/25 bg-gold-400/8 px-2.5 transition-colors hover:border-gold-400/50 hover:bg-gold-400/14"
              >
                <span className="text-xs font-semibold text-gold-200 tnum">
                  {formatMoney(user.balance, { decimals: false })}
                </span>
                <span
                  aria-hidden="true"
                  className="grid size-5 place-items-center rounded-md bg-gold-300 text-xs font-bold text-obsidian-950"
                >
                  +
                </span>
                <span className="sr-only">Balance — open wallet to deposit</span>
              </Link>

              <Link
                href="/profile"
                aria-label="Profile and settings"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/12 text-xs font-semibold text-white transition-transform hover:scale-105"
                style={{ background: hueGradient(user.avatarHue) }}
              >
                {user.displayName.charAt(0)}
              </Link>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </LinkButton>
              <LinkButton href="/signup" variant="gold" size="sm">
                Join now
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Compact secondary bar for section pages — back link plus a title. */
export function SubBar({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sticky top-14 z-70 border-b border-white/6 bg-obsidian-950/80 backdrop-blur-xl lg:top-16">
      <div className="mx-auto flex h-12 max-w-[104rem] items-center gap-3 px-3 sm:px-5">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/8 hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-[0.625rem] text-white/40">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/** Used on the landing page hero when the visitor is not signed in. */
export function GuestCta() {
  const { signedIn, signIn } = useSession();
  if (signedIn) return null;
  return (
    <Button variant="gold" onClick={signIn}>
      Continue as demo user
    </Button>
  );
}
