import { cn } from "@/lib/format";
import { BetSlipRail } from "@/components/betting/BetSlip";
import { Sidebar } from "./Sidebar";

/**
 * Page container. Mobile is a single column with the tab bar clearing the
 * bottom; from `xl` the layout becomes sidebar / content / bet-slip rail.
 */
export function Shell({
  children,
  sidebar = true,
  slip = true,
  className,
  width = "wide",
}: {
  children: React.ReactNode;
  sidebar?: boolean;
  slip?: boolean;
  className?: string;
  /** `narrow` centres a reading-width column, e.g. legal and settings pages. */
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[104rem] gap-6 px-3 pt-4 sm:px-5",
        "pb-[var(--shell-pad-bottom)] xl:pb-10",
      )}
    >
      {sidebar && <Sidebar />}

      <main
        id="main"
        className={cn(
          "min-w-0 flex-1",
          width === "narrow" && "mx-auto max-w-3xl",
          className,
        )}
      >
        {children}
      </main>

      {slip && <BetSlipRail />}
    </div>
  );
}

/** Vertical rhythm helper so every page section spaces identically. */
export function Section({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("mb-7", className)} {...rest}>
      {children}
    </section>
  );
}

/**
 * Horizontally scrolling rail with snap points. Used for featured matches,
 * promo banners, provider chips and game carousels.
 */
export function Rail({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("scroll-x -mx-3 flex gap-3 px-3 pb-1 sm:-mx-5 sm:px-5", className)}
    >
      {children}
    </div>
  );
}
