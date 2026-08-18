"use client";

import Link from "next/link";
import type { OriginalConfig, OriginalKind } from "@/lib/originals/types";
import { ORIGINALS, originalRtp } from "@/lib/originals/games";
import { cn, formatCompact } from "@/lib/format";
import { Rail, Section } from "@/components/layout/Shell";
import { Badge, SectionHeading } from "@/components/ui/primitives";

/* ============================================================
   Kind art

   Each Original gets a drawn mark rather than the catalogue's
   generated gradient: these are the house games, and the lobby
   should say so at a glance.
   ============================================================ */

function KindArt({ kind, accent, accent2 }: { kind: OriginalKind; accent: string; accent2: string }) {
  const stroke = { stroke: accent, strokeWidth: 2.6, fill: "none", strokeLinecap: "round" } as const;

  if (kind === "crash") {
    return (
      <svg viewBox="0 0 64 44" className="size-full" aria-hidden="true">
        <path d="M4 40C18 40 30 32 40 16 45 8 50 5 58 4" {...stroke} strokeLinejoin="round" />
        <path d="M4 40C18 40 30 32 40 16 45 8 50 5 58 4L58 40Z" fill={accent} fillOpacity="0.16" />
        <path d="M50 6.5 60 2.5l-3.5 9-2-3.5-4.5-1.5Z" fill={accent2} />
      </svg>
    );
  }

  if (kind === "mines") {
    return (
      <svg viewBox="0 0 64 44" className="size-full" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={8 + (i % 4) * 13}
            y={6 + Math.floor(i / 4) * 12}
            width="10"
            height="9"
            rx="2"
            fill="rgba(255,255,255,0.10)"
          />
        ))}
        <path d="M32 12 40 19 32 30 24 19 32 12Z" fill={accent} />
        <path d="M32 12 40 19H24l8-7Z" fill="#ffffff" fillOpacity="0.35" />
      </svg>
    );
  }

  if (kind === "plinko") {
    return (
      <svg viewBox="0 0 64 44" className="size-full" aria-hidden="true">
        {[0, 1, 2, 3].map((row) =>
          Array.from({ length: row + 1 }, (_, i) => (
            <circle
              key={row + ":" + i}
              cx={32 + (i - row / 2) * 11}
              cy={9 + row * 8}
              r="1.9"
              fill="rgba(255,255,255,0.42)"
            />
          )),
        )}
        <circle cx="26.5" cy="38" r="3.4" fill={accent} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={9 + i * 10}
            y={40}
            width="8.5"
            height="3"
            rx="1.2"
            fill={i === 0 || i === 4 ? accent2 : accent}
            opacity={i === 0 || i === 4 ? 0.95 : 0.4}
          />
        ))}
      </svg>
    );
  }

  if (kind === "dice") {
    return (
      <svg viewBox="0 0 64 44" className="size-full" aria-hidden="true">
        <rect x="6" y="19" width="52" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
        <rect x="6" y="19" width="30" height="6" rx="3" fill={accent} />
        <rect x="32" y="12" width="6" height="20" rx="2" fill="#ffffff" />
        <circle cx="48" cy="22" r="6.5" fill={accent2} fillOpacity="0.25" stroke={accent2} strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 44" className="size-full" aria-hidden="true">
      <g transform="translate(32 24)">
        {Array.from({ length: 10 }, (_, i) => {
          const a0 = (i * 36 - 90) * (Math.PI / 180);
          const a1 = ((i + 1) * 36 - 90) * (Math.PI / 180);
          const r = 17;
          return (
            <path
              key={i}
              d={
                "M0 0L" +
                (Math.cos(a0) * r).toFixed(2) +
                " " +
                (Math.sin(a0) * r).toFixed(2) +
                "A" + r + " " + r + " 0 0 1 " +
                (Math.cos(a1) * r).toFixed(2) +
                " " +
                (Math.sin(a1) * r).toFixed(2) +
                "Z"
              }
              fill={i % 2 === 0 ? accent : accent2}
              fillOpacity={i % 2 === 0 ? 0.9 : 0.35}
            />
          );
        })}
        <circle r="6" fill="#0b0810" />
      </g>
      <path d="M32 3 28 10h8z" fill="#ffffff" />
    </svg>
  );
}

/* ============================================================
   Tile
   ============================================================ */

export function OriginalCard({
  config,
  size = "md",
}: {
  config: OriginalConfig;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href={"/casino/" + config.slug}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-white/10",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/25",
        size === "lg" ? "aspect-[4/3] sm:aspect-[16/10]" : "aspect-[4/3]",
      )}
      style={{ background: config.theme.backdrop }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full blur-[52px] transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: config.theme.glow, opacity: 0.75 }}
      />

      <span className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <Badge tone="gold">Original</Badge>
        <span className="rounded-md border border-white/12 bg-obsidian-950/60 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-white/60 tnum">
          RTP {originalRtp(config).toFixed(0)}%
        </span>
      </span>

      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 transition-transform duration-500 ease-out group-hover:scale-105",
          size === "lg" ? "top-[26%] w-32 sm:w-40" : "top-[24%] w-24",
        )}
      >
        <KindArt kind={config.kind} accent={config.theme.accent} accent2={config.theme.accent2} />
      </span>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-obsidian-950/92 to-transparent"
      />

      <span className="absolute inset-x-3 bottom-3">
        <span className="block truncate font-display text-sm font-semibold text-white sm:text-base">
          {config.name}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[0.6875rem] leading-snug text-white/45">
          {config.subtitle}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-md px-1.5 py-0.5 text-[0.5625rem] font-bold text-obsidian-950"
            style={{ background: config.theme.accent }}
          >
            {formatCompact(config.maxWin)}x max
          </span>
          <span className="rounded-md border border-white/12 px-1.5 py-0.5 text-[0.5625rem] font-medium capitalize text-white/50">
            {config.volatility} volatility
          </span>
        </span>
      </span>
    </Link>
  );
}

/* ============================================================
   Lobby section
   ============================================================ */

export function OriginalsShowcase({ href = "/casino/originals" }: { href?: string }) {
  const [lead, ...rest] = ORIGINALS;

  return (
    <Section aria-label="Rufescent Originals">
      <SectionHeading
        title="Rufescent Originals"
        icon="◆"
        subtitle="Built in-house — provably fair, instant settlement, no studio in between"
        action={
          <Link
            href={href}
            className="rounded-lg px-1 text-xs font-medium text-gold-300 transition-colors hover:text-gold-100"
          >
            See all
            <span className="sr-only"> Rufescent Originals</span>
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <OriginalCard config={lead} size="lg" />
        <div className="grid grid-cols-2 gap-3">
          {rest.map((config) => (
            <OriginalCard key={config.slug} config={config} />
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Compact rail, for pages that already carry a lot of vertical weight. */
export function OriginalsRail({ title = "Rufescent Originals" }: { title?: string }) {
  return (
    <Section>
      <SectionHeading
        title={title}
        icon="◆"
        subtitle="Provably fair house games"
        action={
          <Link
            href="/casino/originals"
            className="rounded-lg px-1 text-xs font-medium text-gold-300 transition-colors hover:text-gold-100"
          >
            See all
          </Link>
        }
      />
      <Rail label={title}>
        {ORIGINALS.map((config) => (
          <div key={config.slug} className="w-56 shrink-0 snap-start sm:w-64">
            <OriginalCard config={config} />
          </div>
        ))}
      </Rail>
    </Section>
  );
}
