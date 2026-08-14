"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { SPORTS } from "@/lib/mock/sports";
import { CASINO_CATEGORIES } from "@/lib/mock/casino";
import { LivePip } from "@/components/ui/primitives";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./navigation";

/**
 * Desktop-only left rail. Mirrors the mobile tab bar and adds the sport
 * and casino sub-navigation that has no room on small screens.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Browse"
      className="sticky top-24 hidden h-[calc(100dvh-8rem)] w-56 shrink-0 overflow-y-auto no-scrollbar xl:block"
    >
      <nav className="space-y-6 pb-8">
        <NavGroup label="Menu">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(pathname, item)}
            />
          ))}
        </NavGroup>

        <NavGroup label="Sports">
          {SPORTS.map((sport) => (
            <NavLink
              key={sport.key}
              href={`/sports/${sport.key}`}
              icon={sport.icon}
              label={sport.name}
              active={pathname.startsWith(`/sports/${sport.key}`)}
              trailing={
                <span className="flex items-center gap-1 text-[0.625rem] text-white/30 tnum">
                  <LivePip />
                  {sport.liveCount}
                </span>
              }
            />
          ))}
        </NavGroup>

        <NavGroup label="Casino">
          {CASINO_CATEGORIES.map((category) => (
            <NavLink
              key={category.key}
              href={`/casino?category=${category.key}`}
              icon={category.icon}
              label={category.label}
              active={false}
            />
          ))}
        </NavGroup>

        <NavGroup label="More">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(pathname, item)}
            />
          ))}
        </NavGroup>
      </nav>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-[0.625rem] font-semibold uppercase tracking-widest text-white/25">
        {label}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  trailing,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] transition-all duration-200",
          active
            ? "bg-linear-to-r from-ember-600/25 to-transparent font-medium text-white"
            : "text-white/50 hover:bg-white/4 hover:text-white/85",
        )}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-linear-to-b from-ember-400 to-gold-400"
          />
        )}
        <span className="w-4 text-center text-sm leading-none" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing}
      </Link>
    </li>
  );
}
