import { cn, formatCompact } from "@/lib/format";

/* ============================================================
   Casino chips

   Denominations follow the standard clay-chip colour convention so
   a stack reads at a glance: white, red, green, black, purple,
   yellow, then the high-value plaques.
   ============================================================ */

interface Denomination {
  value: number;
  /** Body colour. */
  body: string;
  /** Edge-spot colour. */
  spot: string;
  /** Text colour on the inlay. */
  ink: string;
}

const DENOMINATIONS: Denomination[] = [
  { value: 100_000, body: "#3b1f5e", spot: "#f0e6ff", ink: "#f0e6ff" },
  { value: 25_000, body: "#7d4f06", spot: "#ffe08a", ink: "#ffe08a" },
  { value: 5_000, body: "#1c1a22", spot: "#e9e6ef", ink: "#e9e6ef" },
  { value: 1_000, body: "#0f5c3c", spot: "#dff5e9", ink: "#dff5e9" },
  { value: 500, body: "#1f4d8f", spot: "#dceaff", ink: "#dceaff" },
  { value: 100, body: "#991618", spot: "#ffdedb", ink: "#ffdedb" },
  { value: 25, body: "#c9c4b8", spot: "#4a4550", ink: "#2a2730" },
  { value: 5, body: "#e8e4da", spot: "#991618", ink: "#2a2730" },
  { value: 1, body: "#f2efe6", spot: "#1f4d8f", ink: "#2a2730" },
];

/** Break an amount into the fewest chips, largest first. */
export function breakIntoChips(amount: number, maxChips = 5): { denom: Denomination; count: number }[] {
  let remaining = Math.round(amount);
  const out: { denom: Denomination; count: number }[] = [];

  for (const denom of DENOMINATIONS) {
    if (remaining < denom.value) continue;
    const count = Math.floor(remaining / denom.value);
    remaining -= count * denom.value;
    out.push({ denom, count });
    if (out.length >= maxChips) break;
  }

  if (out.length === 0 && amount > 0) {
    out.push({ denom: DENOMINATIONS[DENOMINATIONS.length - 1], count: 1 });
  }
  return out;
}

const CHIP_SIZES = {
  xs: 14,
  sm: 20,
  md: 28,
  lg: 38,
} as const;

export type ChipSize = keyof typeof CHIP_SIZES;

/**
 * A single chip, drawn as SVG so the edge spots stay crisp at any size.
 * Six spots around the rim plus a recessed inlay is the standard
 * 11.5g clay composite look.
 */
export function Chip({
  value,
  size = "md",
  className,
  showValue,
  style,
}: {
  value: number;
  size?: ChipSize;
  className?: string;
  showValue?: boolean;
  style?: React.CSSProperties;
}) {
  const denom =
    DENOMINATIONS.find((d) => d.value <= value) ?? DENOMINATIONS[DENOMINATIONS.length - 1];
  const px = CHIP_SIZES[size];

  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      className={cn("shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]", className)}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`chip-shade-${denom.value}`} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="48" fill={denom.body} />

      {/* Six edge spots */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x="43"
          y="1"
          width="14"
          height="17"
          rx="2.5"
          fill={denom.spot}
          transform={`rotate(${i * 60} 50 50)`}
        />
      ))}

      <circle cx="50" cy="50" r="37" fill={denom.body} />
      <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="31" fill="none" stroke={denom.spot} strokeWidth="1.2" opacity="0.65" />

      {showValue && (
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize={denom.value >= 1000 ? 22 : 26}
          fontWeight="700"
          fill={denom.ink}
          fontFamily="var(--font-display), sans-serif"
        >
          {denom.value >= 1000 ? formatCompact(denom.value) : denom.value}
        </text>
      )}

      <circle cx="50" cy="50" r="48" fill={`url(#chip-shade-${denom.value})`} />
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
    </svg>
  );
}

/**
 * A vertical stack of one denomination. Chips overlap by most of their
 * height so the edges read as a column rather than a row of discs.
 */
export function ChipColumn({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count: number;
  size?: ChipSize;
}) {
  const shown = Math.min(count, 6);
  const px = CHIP_SIZES[size];
  const overlap = px * 0.16;

  return (
    <div
      className="relative"
      style={{ width: px, height: px + overlap * (shown - 1) }}
      aria-hidden="true"
    >
      {Array.from({ length: shown }, (_, i) => (
        <Chip
          key={i}
          value={value}
          size={size}
          className="absolute left-0"
          style={{ bottom: i * overlap, zIndex: i }}
        />
      ))}
    </div>
  );
}

/**
 * A betting stack: the amount broken into denominations, with the
 * numeric total alongside. Used for seat bets and the pot.
 */
export function ChipStack({
  amount,
  size = "sm",
  showAmount = true,
  className,
  align = "center",
}: {
  amount: number;
  size?: ChipSize;
  showAmount?: boolean;
  className?: string;
  align?: "center" | "left";
}) {
  if (amount <= 0) return null;
  const groups = breakIntoChips(amount, 3);

  return (
    <div
      className={cn(
        "flex items-end gap-1",
        align === "center" ? "justify-center" : "justify-start",
        className,
      )}
    >
      <div className="flex items-end gap-0.5">
        {groups.map((group, i) => (
          <ChipColumn key={i} value={group.denom.value} count={group.count} size={size} />
        ))}
      </div>
      {showAmount && (
        <span className="rounded bg-obsidian-950/80 px-1.5 py-0.5 text-[0.625rem] font-semibold text-gold-200 tnum">
          {formatCompact(amount)}
        </span>
      )}
    </div>
  );
}

/** Compact stack indicator shown on a seat plate. */
export function StackBadge({ amount, bigBlind }: { amount: number; bigBlind: number }) {
  const bb = bigBlind > 0 ? Math.floor(amount / bigBlind) : 0;
  const short = bb > 0 && bb <= 15;

  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[0.6875rem] font-semibold text-white tnum">
        {amount.toLocaleString("en-AE")}
      </span>
      {bigBlind > 0 && (
        <span
          className={cn(
            "text-[0.5625rem] tnum",
            short ? "font-semibold text-loss" : "text-white/40",
          )}
          title={short ? "Short stack" : undefined}
        >
          {bb}bb
        </span>
      )}
    </span>
  );
}
