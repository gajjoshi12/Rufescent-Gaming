"use client";

import Link from "next/link";
import { CURRENCY, formatCompact } from "@/lib/format";
import { ORIGINALS, originalRtp } from "@/lib/originals/games";
import { OPENING_BALANCE } from "@/lib/originals/useBankroll";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import { Badge, Divider, SectionHeading, StatTile } from "@/components/ui/primitives";
import { OriginalCard } from "@/components/originals/OriginalCard";

/* ============================================================
   Originals hub

   The catalogue lobby lists 50 titles it cannot actually run; this
   page is the opposite — five games, every one playable, with the
   maths on show rather than hidden behind marketing copy.
   ============================================================ */

const PILLARS = [
  {
    icon: "◆",
    title: "One edge, every setting",
    body: "Mine count, risk profile, row count, win chance — none of them move the return. Each paytable is computed from the same 3% edge, so there is no trap setting.",
  },
  {
    icon: "✓",
    title: "Seeded before you play",
    body: "Every round comes from a server seed committed to in advance, your own client seed and a round counter. Rotate the pair and the old seed is revealed.",
  },
  {
    icon: "⚡",
    title: "Settled on the spot",
    body: "No round timer you cannot see, no pending state. The moment a bead lands or a tile turns, the demo balance moves.",
  },
];

export default function OriginalsPage() {
  const [lead, ...rest] = ORIGINALS;

  return (
    <>
      <SubBar title="Rufescent Originals" subtitle="House games" backHref="/casino" />

      <Shell slip={false}>
        {/* ---------- Hero ---------- */}
        <Section>
          <div className="glass relative isolate overflow-hidden rounded-3xl px-4 py-6 sm:px-7 sm:py-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-ember-600/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -left-24 size-72 rounded-full bg-gold-600/18 blur-3xl"
            />

            <div className="relative max-w-2xl">
              <Badge tone="gold">Built in-house</Badge>
              <h1 className="mt-2.5 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                Five games. <span className="text-ember">No studio in between.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
                Crash, mines, plinko, dice and a prize wheel — each one running a real math model in
                your browser, priced in dirhams, and provably fair from the first round. Play them
                all on one demo bankroll of{" "}
                <span className="tnum text-white/80">
                  {CURRENCY}
                  {OPENING_BALANCE.toLocaleString("en-AE")}
                </span>
                .
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatTile label="Games" value={ORIGINALS.length} tone="gold" />
                <StatTile label="RTP" value="97.00%" tone="win" hint="Every title" />
                <StatTile label="Min stake" value={`${CURRENCY}5`} />
                <StatTile
                  label="Top win"
                  value={`${formatCompact(Math.max(...ORIGINALS.map((g) => g.maxWin)))}x`}
                  tone="ember"
                  hint="Molten Mines, 24 buried"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- The line-up ---------- */}
        <Section>
          <SectionHeading
            title="The line-up"
            icon="◆"
            subtitle="Tap any tile to play — no download, no account switch"
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

        {/* ---------- Why ---------- */}
        <Section>
          <SectionHeading title="How the house games work" icon="◇" />
          <div className="grid gap-3 sm:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="glass-soft rounded-2xl p-4">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-lg border border-gold-400/30 bg-gold-400/10 text-sm text-gold-200"
                >
                  {pillar.icon}
                </span>
                <h3 className="mt-2.5 text-sm font-semibold text-white/90">{pillar.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/45">{pillar.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- Spec table ---------- */}
        <Section>
          <SectionHeading title="Side by side" icon="≡" subtitle="All stakes in AED" />
          <div className="scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[0.625rem] uppercase tracking-wider text-white/35">
                  <th className="pb-2 pr-3 font-semibold">Game</th>
                  <th className="pb-2 pr-3 font-semibold">RTP</th>
                  <th className="pb-2 pr-3 font-semibold">Edge</th>
                  <th className="pb-2 pr-3 font-semibold">Volatility</th>
                  <th className="pb-2 pr-3 font-semibold">Max win</th>
                  <th className="pb-2 font-semibold">Stakes</th>
                </tr>
              </thead>
              <tbody>
                {ORIGINALS.map((config) => (
                  <tr key={config.slug} className="group">
                    <td className="border-t border-white/8 py-2.5 pr-3">
                      <Link
                        href={`/casino/${config.slug}`}
                        className="flex items-center gap-2 font-medium text-white/85 transition-colors hover:text-gold-200"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-6 shrink-0 place-items-center rounded-md border text-[0.625rem]"
                          style={{
                            borderColor: config.theme.accent + "55",
                            color: config.theme.accent,
                          }}
                        >
                          {config.glyph}
                        </span>
                        {config.name}
                      </Link>
                    </td>
                    <td className="border-t border-white/8 py-2.5 pr-3 text-win tnum">
                      {originalRtp(config).toFixed(2)}%
                    </td>
                    <td className="border-t border-white/8 py-2.5 pr-3 text-white/55 tnum">
                      {(config.edge * 100).toFixed(1)}%
                    </td>
                    <td className="border-t border-white/8 py-2.5 pr-3 capitalize text-white/55">
                      {config.volatility}
                    </td>
                    <td className="border-t border-white/8 py-2.5 pr-3 text-gilt tnum">
                      {formatCompact(config.maxWin)}x
                    </td>
                    <td className="border-t border-white/8 py-2.5 text-white/55 tnum">
                      {CURRENCY}
                      {config.minBet} – {formatCompact(config.maxBet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Divider className="my-7" />

        <Section aria-label="Responsible play">
          <div className="rounded-2xl border border-gold-400/20 bg-gold-700/8 p-4">
            <h2 className="mb-1.5 text-sm font-semibold text-gold-200">A fair game is still a game</h2>
            <p className="text-xs leading-relaxed text-white/55">
              Provably fair means the result was not tampered with — it does not mean the game is
              even money. Over enough rounds these games keep 3% of everything staked, whichever
              settings you pick.
            </p>
            <Link
              href="/responsible-gambling#limits"
              className="mt-2.5 inline-block text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
            >
              Set a deposit or session limit
            </Link>
          </div>
        </Section>
      </Shell>
    </>
  );
}
