"use client";

import { useId } from "react";
import { cn } from "@/lib/format";
import { useEscapeKey, useFocusTrap, useScrollLock } from "@/lib/hooks";

/**
 * A bottom sheet on mobile that becomes a centred dialog (or right-hand
 * drawer) from `md` up. Handles scroll lock, Escape, focus trapping and
 * the labelling that makes it a real dialog to assistive tech.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "sheet",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** `sheet` centres on desktop; `drawer` docks to the right edge. */
  variant?: "sheet" | "drawer";
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  useScrollLock(open);
  useEscapeKey(open, onClose);

  if (!open) return null;

  const widths = { sm: "md:max-w-sm", md: "md:max-w-lg", lg: "md:max-w-2xl" }[size];

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-obsidian-950/80 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col animate-sheet-up",
          "glass rounded-t-3xl border-b-0 md:rounded-3xl md:border-b",
          "md:animate-rise",
          widths,
          variant === "drawer" && "md:absolute md:right-4 md:top-4 md:bottom-4 md:max-h-none md:w-96",
          className,
        )}
      >
        {/* Grab handle — mobile affordance only */}
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full bg-white/18" />
        </div>

        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-xs text-white/45">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer && (
          <footer className="border-t border-white/8 bg-obsidian-900/60 px-5 py-4 pb-safe">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Fixed-position toast, bottom-centre above the mobile nav. */
export function Toast({
  open,
  tone = "info",
  children,
  onDismiss,
}: {
  open: boolean;
  tone?: "info" | "win" | "loss";
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  if (!open) return null;
  const tones = {
    info: "border-info/30 bg-info/12 text-info",
    win: "border-win/30 bg-win/12 text-win",
    loss: "border-loss/30 bg-loss/12 text-loss",
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-4 bottom-24 z-90 animate-rise rounded-xl border px-4 py-3 text-sm backdrop-blur-xl",
        "md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm",
        tones,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">{children}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 shrink-0 opacity-60 transition-opacity hover:opacity-100"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
