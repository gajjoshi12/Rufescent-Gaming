import type { Card, Suit } from "@/lib/poker/types";
import { RANK_LABEL, RANK_NAME } from "@/lib/poker/engine";
import { cn } from "@/lib/format";

/* ============================================================
   Suit pips

   Drawn as paths rather than Unicode: ♠♥♦♣ render at wildly
   different weights and baselines across platforms, which reads
   as cheap on a card face.
   ============================================================ */

const SUIT_PATH: Record<Suit, string> = {
  h: "M50 89C21 67 9 51 9 35 9 21 20 11 33 11c8 0 14 4 17 10 3-6 9-10 17-10 13 0 24 10 24 24 0 16-12 32-41 54z",
  d: "M50 5 89 50 50 95 11 50z",
  s: "M50 7C32 25 11 38 11 56c0 12 9 21 20 21 6 0 11-2 14-6-1 10-5 17-11 22h32c-6-5-10-12-11-22 3 4 8 6 14 6 11 0 20-9 20-21C89 38 68 25 50 7z",
  c: "M50 9c-10 0-19 8-19 18 0 4 1 8 3 11-3-2-7-4-11-4-10 0-19 9-19 19s9 19 19 19c6 0 12-3 16-8-1 10-5 17-11 21h44c-6-4-10-11-11-21 4 5 10 8 16 8 10 0 19-9 19-19s-9-19-19-19c-4 0-8 2-11 4 2-3 3-7 3-11 0-10-9-18-19-18z",
};

const SUIT_NAME: Record<Suit, string> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
};

const IS_RED: Record<Suit, boolean> = { h: true, d: true, s: false, c: false };

export function SuitGlyph({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <path d={SUIT_PATH[suit]} />
    </svg>
  );
}

/* ============================================================
   Card face
   ============================================================ */

export type CardSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<CardSize, { box: string; rank: string; corner: string; centre: string }> = {
  xs: { box: "w-6 h-8.5 rounded-[3px]", rank: "text-[0.5rem]", corner: "size-1", centre: "size-2.5" },
  sm: { box: "w-9 h-13 rounded-[5px]", rank: "text-[0.6875rem]", corner: "size-1.5", centre: "size-4" },
  md: { box: "w-12 h-17 rounded-md", rank: "text-sm", corner: "size-2", centre: "size-5.5" },
  lg: { box: "w-16 h-23 rounded-lg", rank: "text-lg", corner: "size-2.5", centre: "size-7" },
};

export function PlayingCard({
  card,
  size = "md",
  faceDown,
  dimmed,
  highlighted,
  className,
  style,
}: {
  card?: Card;
  size?: CardSize;
  faceDown?: boolean;
  /** Muted, for cards not part of the winning five. */
  dimmed?: boolean;
  /** Gold ring on the five cards that make the hand. */
  highlighted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZES[size];

  if (faceDown || !card) {
    return <CardBack size={size} className={className} style={style} />;
  }

  const red = IS_RED[card.suit];
  const label = `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;

  return (
    <div
      role="img"
      aria-label={label}
      style={style}
      className={cn(
        "relative shrink-0 select-none overflow-hidden border border-black/25",
        "bg-linear-to-br from-white via-[#fdfcfa] to-[#eae6dd]",
        "shadow-[0_2px_4px_-1px_rgba(0,0,0,0.5),0_8px_18px_-8px_rgba(0,0,0,0.7)]",
        s.box,
        dimmed && "opacity-45 saturate-50",
        highlighted &&
          "ring-2 ring-gold-300 shadow-[0_0_0_1px_var(--color-gold-400),0_0_22px_-4px_var(--color-gold-400)]",
        className,
      )}
    >
      {/* Inner bevel — stops the face reading as flat white */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-6px_10px_-8px_rgba(0,0,0,0.45)]"
      />

      <span
        className={cn(
          "absolute left-[7%] top-[4%] flex flex-col items-center leading-none",
          red ? "text-[#c8102e]" : "text-[#14131a]",
        )}
      >
        <span className={cn("font-bold tracking-tighter", s.rank)}>{RANK_LABEL[card.rank]}</span>
        <SuitGlyph suit={card.suit} className={cn("mt-[1px]", s.corner)} />
      </span>

      <SuitGlyph
        suit={card.suit}
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-95",
          red ? "text-[#c8102e]" : "text-[#14131a]",
          s.centre,
        )}
      />

      {/* Mirrored index, as on a real card */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-[4%] right-[7%] flex rotate-180 flex-col items-center leading-none",
          red ? "text-[#c8102e]" : "text-[#14131a]",
        )}
      >
        <span className={cn("font-bold tracking-tighter", s.rank)}>{RANK_LABEL[card.rank]}</span>
        <SuitGlyph suit={card.suit} className={cn("mt-[1px]", s.corner)} />
      </span>
    </div>
  );
}

/* ============================================================
   Card back — Rufescent guilloche
   ============================================================ */

export function CardBack({
  size = "md",
  className,
  style,
}: {
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZES[size];
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "relative shrink-0 select-none overflow-hidden border border-black/40",
        "bg-linear-to-br from-ember-600 via-ember-800 to-obsidian-900",
        "shadow-[0_2px_4px_-1px_rgba(0,0,0,0.6),0_8px_18px_-8px_rgba(0,0,0,0.8)]",
        s.box,
        className,
      )}
    >
      <svg viewBox="0 0 60 84" className="absolute inset-0 size-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pc-gold" x1="0" y1="0" x2="60" y2="84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffe08a" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#f5b418" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ad7003" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        <rect x="3" y="3" width="54" height="78" rx="4" fill="none" stroke="url(#pc-gold)" strokeWidth="1" />
        <rect x="6" y="6" width="48" height="72" rx="3" fill="none" stroke="url(#pc-gold)" strokeWidth="0.4" opacity="0.6" />

        {/* Lattice */}
        <g stroke="url(#pc-gold)" strokeWidth="0.35" opacity="0.4">
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`a${i}`} x1={-10 + i * 8} y1="0" x2={20 + i * 8} y2="84" />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`b${i}`} x1={70 - i * 8} y1="0" x2={40 - i * 8} y2="84" />
          ))}
        </g>

        {/* Centre medallion */}
        <circle cx="30" cy="42" r="13" fill="rgba(8,7,10,0.5)" stroke="url(#pc-gold)" strokeWidth="0.8" />
        <circle cx="30" cy="42" r="9.5" fill="none" stroke="url(#pc-gold)" strokeWidth="0.35" opacity="0.7" />
        <text
          x="30"
          y="47"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="url(#pc-gold)"
          fontFamily="var(--font-display), sans-serif"
        >
          R
        </text>
      </svg>
    </div>
  );
}

/* ============================================================
   Groups
   ============================================================ */

/** Overlapping pair of hole cards, as they sit in front of a seat. */
export function HoleCards({
  cards,
  size = "sm",
  faceDown,
  dealt = true,
  winningCards,
  className,
}: {
  cards: Card[];
  size?: CardSize;
  faceDown?: boolean;
  dealt?: boolean;
  winningCards?: Set<string>;
  className?: string;
}) {
  if (cards.length === 0 && !faceDown) return null;
  const slots = cards.length > 0 ? cards : [undefined, undefined];

  return (
    <div className={cn("flex", className)}>
      {slots.map((card, i) => (
        <div
          key={i}
          className={cn(
            "transition-all duration-500 ease-out",
            i > 0 && "-ml-3.5",
            !dealt && "translate-y-8 scale-90 opacity-0",
          )}
          style={{
            transform: `rotate(${i === 0 ? -6 : 6}deg)`,
            transitionDelay: `${i * 90}ms`,
            zIndex: i,
          }}
        >
          <PlayingCard
            card={card}
            size={size}
            faceDown={faceDown}
            highlighted={card && winningCards?.has(`${card.rank}${card.suit}`)}
          />
        </div>
      ))}
    </div>
  );
}

/** The five community cards, revealed street by street. */
export function CommunityCards({
  board,
  size = "md",
  winningCards,
}: {
  board: Card[];
  size?: CardSize;
  winningCards?: Set<string>;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5" aria-label="Community cards">
      {Array.from({ length: 5 }, (_, i) => {
        const card = board[i];
        return (
          <div
            key={i}
            className={cn(
              "transition-all duration-500 ease-out",
              card ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            {card ? (
              <PlayingCard
                card={card}
                size={size}
                highlighted={winningCards?.has(`${card.rank}${card.suit}`)}
              />
            ) : (
              // Placeholder keeps the row from reflowing as streets land.
              <div
                aria-hidden="true"
                className={cn(
                  SIZES[size].box,
                  "border border-dashed border-white/8 bg-black/15",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
