"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, formatMoney } from "@/lib/format";
import { useSession } from "@/store/session";
import { useBetSlip } from "@/store/bet-slip";
import { PRIMARY_NAV, isActive } from "./navigation";

/**
 * Mobile tab bar. Hidden from `xl` up, where the sidebar takes over.
 * Sits above the safe-area inset so it clears the iOS home indicator.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useSession();
  const { selections } = useBetSlip();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-80 border-t border-white/8 bg-obsidian-950/92 backdrop-blur-xl pb-safe xl:hidden"
    >
      <ul className="grid grid-cols-6">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item);
          const showBadge = item.href === "/sports" && selections.length > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 transition-colors duration-200",
                  active ? "text-gold-300" : "text-white/40 hover:text-white/70",
                )}
              >
                {/* Active indicator */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 top-0 h-0.5 rounded-full transition-all duration-300",
                    active
                      ? "bg-linear-to-r from-transparent via-gold-300 to-transparent opacity-100"
                      : "opacity-0",
                  )}
                />

                <span className="relative text-base leading-none" aria-hidden="true">
                  {item.icon}
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 grid size-3.5 place-items-center rounded-full bg-ember-500 text-[0.5rem] font-bold text-white tnum">
                      {selections.length}
                    </span>
                  )}
                </span>

                <span className="text-[0.5625rem] font-medium tracking-tight">
                  {item.href === "/wallet" ? formatMoney(user.balance, { decimals: false }) : item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
