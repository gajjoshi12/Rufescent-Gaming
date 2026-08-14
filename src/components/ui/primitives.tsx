"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/format";

/* ============================================================
   Button
   ============================================================ */

type ButtonVariant = "primary" | "gold" | "ghost" | "outline" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
  "transition-all duration-200 ease-out select-none " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "active:scale-[0.975] touch-manipulation";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-br from-ember-400 to-ember-600 text-white shadow-[0_8px_24px_-10px_var(--color-ember-500)] " +
    "hover:from-ember-300 hover:to-ember-500 hover:shadow-[0_10px_30px_-8px_var(--color-ember-400)]",
  gold:
    "bg-linear-to-br from-gold-200 to-gold-500 text-obsidian-950 font-semibold " +
    "shadow-[0_8px_24px_-10px_var(--color-gold-400)] hover:from-gold-100 hover:to-gold-400",
  outline:
    "border border-gold-400/35 text-gold-200 hover:border-gold-300/70 hover:bg-gold-400/10",
  ghost: "text-white/70 hover:text-white hover:bg-white/6",
  subtle: "bg-white/7 text-white/90 hover:bg-white/12 border border-white/8",
  danger: "bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-[0.95rem]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================
   Card
   ============================================================ */

export function Card({
  className,
  children,
  as: Tag = "div",
  interactive,
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  interactive?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "glass rounded-2xl",
        interactive &&
          "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-gold-400/25 " +
            "hover:shadow-[0_24px_48px_-28px_var(--color-ember-700)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  action,
  icon,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          {icon && <span aria-hidden="true">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ============================================================
   Badge / Pill
   ============================================================ */

type BadgeTone = "neutral" | "ember" | "gold" | "live" | "win" | "info" | "back" | "lay";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-white/8 text-white/65 border-white/10",
  ember: "bg-ember-500/15 text-ember-200 border-ember-400/25",
  gold: "bg-gold-400/12 text-gold-200 border-gold-400/25",
  live: "bg-live/15 text-[#ff8a84] border-live/30",
  win: "bg-win/12 text-win border-win/25",
  info: "bg-info/12 text-info border-info/25",
  back: "bg-back-500/15 text-back-300 border-back-500/30",
  lay: "bg-lay-500/15 text-lay-300 border-lay-500/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LivePip({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-1.5", className)} aria-hidden="true">
      <span className="absolute inline-flex size-full animate-pulse-live rounded-full bg-live" />
      <span className="relative inline-flex size-1.5 rounded-full bg-live" />
    </span>
  );
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <Badge tone="live">
      <LivePip />
      {label}
    </Badge>
  );
}

/* ============================================================
   Segmented control — the workhorse for format/mode toggles
   ============================================================ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
  className,
  stretch,
}: {
  options: { key: T; label: string; icon?: React.ReactNode; badge?: string | number }[];
  value: T;
  onChange: (key: T) => void;
  size?: "sm" | "md";
  label: string;
  className?: string;
  /** Fill the container and divide the width evenly between options. */
  stretch?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "items-center gap-0.5 rounded-xl border border-white/8 bg-obsidian-900/70 p-0.5 backdrop-blur",
        stretch ? "flex w-full" : "inline-flex",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-[0.625rem] font-medium transition-all duration-200 ease-out",
              size === "sm" ? "h-7 px-2.5 text-[0.6875rem]" : "h-9 px-3.5 text-xs",
              stretch && "min-w-0 flex-1 justify-center",
              active
                ? "bg-linear-to-br from-ember-500/85 to-ember-700/85 text-white shadow-[0_4px_14px_-6px_var(--color-ember-500)]"
                : "text-white/50 hover:bg-white/5 hover:text-white/80",
            )}
          >
            {option.icon}
            {option.label}
            {option.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[0.5625rem] tabular-nums",
                  active ? "bg-black/25 text-white/85" : "bg-white/8 text-white/50",
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Form fields
   ============================================================ */

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string; invalid?: boolean }
>(function Input({ className, prefix, invalid, ...rest }, ref) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border bg-obsidian-900/70 px-3.5 text-sm text-white placeholder:text-white/25",
          "transition-colors duration-200 outline-none",
          "focus:border-gold-400/50 focus:bg-obsidian-850",
          invalid ? "border-loss/60" : "border-white/10 hover:border-white/18",
          prefix && "pl-8",
          className,
        )}
        {...rest}
      />
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/65">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[0.6875rem] text-loss" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[0.6875rem] text-white/35">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 py-2",
        disabled ? "opacity-50" : "cursor-pointer",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white/90">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-white/45">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-250 ease-out",
          checked
            ? "border-gold-400/40 bg-linear-to-r from-ember-500 to-gold-500"
            : "border-white/12 bg-white/8",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-white shadow-md transition-transform duration-250",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* ============================================================
   Feedback
   ============================================================ */

export function EmptyState({
  icon = "◇",
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <span className="text-3xl opacity-40" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-medium text-white/80">{title}</p>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-white/40">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "gold" | "win" | "ember";
}) {
  const valueTone = {
    neutral: "text-white",
    gold: "text-gilt",
    win: "text-win",
    ember: "text-ember-300",
  }[tone];

  return (
    <div className="glass-soft rounded-xl px-3.5 py-3">
      <p className="text-[0.625rem] font-medium uppercase tracking-wider text-white/40">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-semibold tnum", valueTone)}>{value}</p>
      {hint && <p className="mt-0.5 text-[0.6875rem] text-white/35">{hint}</p>}
    </div>
  );
}

/** Horizontal rule with a gold hairline, used between page sections. */
export function Divider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-linear-to-r from-transparent via-gold-400/18 to-transparent",
        className,
      )}
      role="presentation"
    />
  );
}
