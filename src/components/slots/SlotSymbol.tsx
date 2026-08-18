import type { SlotSymbol as SymbolSpec } from "@/lib/slots/types";
import { cn } from "@/lib/format";

/* ============================================================
   Symbol artwork

   No image assets: every symbol is an SVG silhouette on a
   beveled tile tinted from the symbol's hue. Bold shapes read
   better than detail at reel size, which is why real cabinets
   use heavy outlines too.
   ============================================================ */

const ICONS: Record<string, string> = {
  /* --- high symbols --- */
  phoenix:
    "M50 8c-7 10-4 19 2 25-9-3-17 0-22 6 8 1 13 5 16 10-10-2-19 3-24 11 11-2 18 1 23 6-8 3-14 9-17 18 12-8 22-9 30-6-3 8-2 16 2 24 4-8 5-16 2-24 8-3 18-2 30 6-3-9-9-15-17-18 5-5 12-8 23-6-5-8-14-13-24-11 3-5 8-9 16-10-5-6-13-9-22-6 6-6 9-15 2-25z",
  flame:
    "M50 6c4 14-3 21-11 29C30 44 24 53 24 63c0 16 12 27 26 27s26-11 26-27c0-8-4-15-10-21-2 6-5 9-9 10 4-13 1-32-7-46zM50 78c-6 0-10-4-10-10 0-6 5-9 8-15 4 5 12 9 12 16 0 5-4 9-10 9z",
  crown:
    "M14 68h72l7-38-22 14L50 18 29 44 7 30zM14 74h72v10H14z",
  gem:
    "M30 16h40l18 24-38 44L12 40zM30 16 22 40h56l-8-24zM12 40h76L50 84z",
  coin:
    "M50 8a42 42 0 100 84 42 42 0 000-84zm0 10a32 32 0 110 64 32 32 0 010-64zm4 10h-8v5c-6 1-10 5-10 11 0 13 18 10 18 16 0 3-3 4-6 4-4 0-8-2-11-4l-4 8c3 3 8 5 13 5v5h8v-5c7-1 11-6 11-12 0-13-18-11-18-16 0-2 2-4 6-4 3 0 7 1 10 3l4-8c-3-2-7-3-13-4z",
  koi:
    "M18 50c0-14 14-26 32-26 12 0 22 5 27 13l17-9-6 22 6 22-17-9c-5 8-15 13-27 13-18 0-32-12-32-26zm14-8a5 5 0 1010 0 5 5 0 00-10 0zm-8 8c8-6 18-9 28-9-10 5-19 9-28 9z",
  lotus:
    "M50 14c8 10 12 21 12 32 8-9 18-14 28-15-2 12-9 22-19 28 10 0 19 3 25 8-9 9-22 13-34 11 4 4 6 8 6 12H32c0-4 2-8 6-12-12 2-25-2-34-11 6-5 15-8 25-8-10-6-17-16-19-28 10 1 20 6 28 15 0-11 4-22 12-32z",
  wave:
    "M8 40c10-12 22-12 32 0s22 12 32 0 12-12 20-6v16c-8-6-12-6-20 6s-22 12-32 0-22-12-32 0zm0 26c10-12 22-12 32 0s22 12 32 0 12-12 20-6v16c-8-6-12-6-20 6s-22 12-32 0-22-12-32 0z",
  lantern:
    "M44 8h12v8H44zM26 22h48c4 0 6 3 5 7l-4 14c8 6 12 15 12 25s-4 19-12 25l4 14c1 4-1 7-5 7H26c-4 0-6-3-5-7l4-14C17 87 13 78 13 68s4-19 12-25l-4-14c-1-4 1-7 5-7zm24 16c-10 0-18 13-18 30s8 30 18 30 18-13 18-30-8-30-18-30z",
  lamp:
    "M20 58c0-12 12-20 28-20 10 0 18 3 23 8l17-10-4 14 12 6-12 6 4 14-17-10c-5 5-13 8-23 8-16 0-28-8-28-16zm14-24c0-6 6-10 14-10s14 4 14 10z",
  scimitar:
    "M14 84c14-6 30-20 44-38 10-13 16-26 18-38l10 4c-2 14-9 29-20 43C52 73 34 87 18 92zm52-62 12 4-6 10-12-6zM10 78l10 4-4 10-10-4z",
  chest:
    "M14 40c0-14 16-24 36-24s36 10 36 24v6H14zm0 12h72v34H14zm30 0h12v14H44zM8 46h84v10H8z",
  star:
    "M50 6l12 28 30 3-22 20 6 30-26-15-26 15 6-30L8 37l30-3z",
  seal:
    "M50 6l10 12 16-3 2 16 15 7-9 14 9 14-15 7-2 16-16-3-10 12-10-12-16 3-2-16-15-7 9-14-9-14 15-7 2-16 16 3zm0 22a22 22 0 100 44 22 22 0 000-44z",

  /* --- wilds: a shared silhouette, tinted per game --- */
  "wild-flame":
    "M50 4c5 16-4 24-13 33-10 9-17 19-17 30 0 17 14 29 30 29s30-12 30-29c0-9-4-17-11-24-2 7-6 11-11 12 5-15 1-36-8-51z",
  "wild-koi":
    "M16 50c0-15 15-28 34-28 13 0 24 6 30 14l18-10-7 24 7 24-18-10c-6 8-17 14-30 14-19 0-34-13-34-28z",
  "wild-vault":
    "M50 6l38 20v28c0 20-15 34-38 40-23-6-38-20-38-40V26zm0 22a20 20 0 100 40 20 20 0 000-40z",
};

/** Card royals are drawn as text rather than a path. */
const RANK_GLYPH: Record<string, string> = {
  "rank-10": "10",
  "rank-J": "J",
  "rank-Q": "Q",
  "rank-K": "K",
  "rank-A": "A",
};

export function SymbolArt({ symbol, className }: { symbol: SymbolSpec; className?: string }) {
  const glyph = RANK_GLYPH[symbol.icon];
  const gradientId = `sym-${symbol.id}`;

  return (
    <svg viewBox="0 0 100 100" className={cn("size-full", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="20" y1="6" x2="80" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={`hsl(${symbol.hue} 95% 78%)`} />
          <stop offset="45%" stopColor={`hsl(${symbol.hue} 88% 55%)`} />
          <stop offset="100%" stopColor={`hsl(${symbol.hue} 80% 32%)`} />
        </linearGradient>
      </defs>

      {glyph ? (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={glyph.length > 1 ? 48 : 62}
          fontWeight="800"
          fill={`url(#${gradientId})`}
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.5"
          paintOrder="stroke"
          fontFamily="var(--font-display), sans-serif"
          letterSpacing="-2"
        >
          {glyph}
        </text>
      ) : (
        <path
          d={ICONS[symbol.icon] ?? ICONS.gem}
          fill={`url(#${gradientId})`}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/* ============================================================
   Tile
   ============================================================ */

export function SymbolTile({
  symbol,
  highlighted,
  dimmed,
  className,
}: {
  symbol: SymbolSpec;
  /** Part of a winning line — gets the gold frame and pulse. */
  highlighted?: boolean;
  /** Not part of any win, once wins are being shown. */
  dimmed?: boolean;
  className?: string;
}) {
  const special = symbol.tier === "special";
  const high = symbol.tier === "high";

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden rounded-lg transition-all duration-300",
        // Enough to make the winning line pop, not so much that the rest of
        // the board disappears — you still want to read a near miss.
        dimmed && "opacity-60 saturate-[0.7] brightness-75",
        className,
      )}
      style={{
        background: special
          ? `linear-gradient(160deg, hsl(${symbol.hue} 70% 22%), hsl(${symbol.hue} 60% 8%))`
          : high
            ? `linear-gradient(160deg, hsl(${symbol.hue} 45% 18%), hsl(${symbol.hue} 40% 7%))`
            : "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(0,0,0,0.28))",
      }}
    >
      {/* Bevel */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -8px 14px -8px rgba(0,0,0,0.8)",
        }}
      />

      <SymbolArt
        symbol={symbol}
        className={cn(
          "relative p-[14%] drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]",
          highlighted && "animate-win-pulse",
        )}
      />

      {/* Ribbons make the two special symbols unmistakable */}
      {symbol.isWild && (
        <span className="absolute inset-x-0 bottom-0 bg-linear-to-r from-transparent via-gold-500/90 to-transparent py-[2px] text-center text-[0.5rem] font-black uppercase tracking-[0.15em] text-obsidian-950">
          Wild
        </span>
      )}
      {symbol.isScatter && (
        <span className="absolute inset-x-0 bottom-0 bg-linear-to-r from-transparent via-ember-500/90 to-transparent py-[2px] text-center text-[0.5rem] font-black uppercase tracking-[0.12em] text-white">
          Scatter
        </span>
      )}

      {highlighted && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-gold-300 shadow-[inset_0_0_18px_rgba(245,180,24,0.45)]"
        />
      )}
    </div>
  );
}
