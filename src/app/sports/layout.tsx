import type { Metadata } from "next";

/**
 * The sports pages are client components and so cannot export metadata
 * themselves; this layout supplies it for the whole subtree. It renders no
 * chrome — TopBar, ticker, nav and bet slip all live in the root layout.
 */
export const metadata: Metadata = {
  title: "Sports betting",
  description:
    "Exchange and fixed odds on soccer, cricket, basketball, tennis and esports, with live in-play markets and cash out.",
};

export default function SportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
