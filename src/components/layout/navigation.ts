import type { SportKey } from "@/lib/types";

/** Single source of truth for both the mobile tab bar and the desktop rail. */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Marks the tab active for any nested route under this prefix. */
  match: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "◆", match: "/" },
  { href: "/sports", label: "Sports", icon: "⚽", match: "/sports" },
  { href: "/casino", label: "Casino", icon: "♠", match: "/casino" },
  { href: "/fantasy", label: "Fantasy", icon: "🏆", match: "/fantasy" },
  { href: "/wallet", label: "Wallet", icon: "◈", match: "/wallet" },
  { href: "/profile", label: "Profile", icon: "◉", match: "/profile" },
];

export const SPORT_NAV: { key: SportKey; label: string; icon: string }[] = [
  { key: "soccer", label: "Soccer", icon: "⚽" },
  { key: "cricket", label: "Cricket", icon: "🏏" },
  { key: "basketball", label: "Basketball", icon: "🏀" },
  { key: "tennis", label: "Tennis", icon: "🎾" },
  { key: "esports", label: "Esports", icon: "🎮" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/sports/live", label: "In-play", icon: "◉", match: "/sports/live" },
  { href: "/live", label: "Live streams", icon: "📡", match: "/live" },
  { href: "/casino/poker", label: "Poker room", icon: "♠", match: "/casino/poker" },
  { href: "/promotions", label: "Promotions", icon: "★", match: "/promotions" },
  { href: "/responsible-gambling", label: "Responsible play", icon: "✦", match: "/responsible-gambling" },
];

/** True when `pathname` should light up the tab for `item`. */
export function isActive(pathname: string, item: Pick<NavItem, "match">): boolean {
  if (item.match === "/") return pathname === "/";
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
