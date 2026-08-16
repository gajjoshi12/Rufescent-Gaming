"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tournament, TournamentFormat } from "@/lib/poker/types";
import { MY_SEATS, TOURNAMENTS, currentLevel, findTournament } from "@/lib/poker/mock";
import { cn, formatCompact, formatKickoff, formatMoney } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  Divider,
  LinkButton,
  LivePip,
  SectionHeading,
  Segmented,
  StatTile,
} from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/poker/Chips";

type FormatFilter = "all" | TournamentFormat;

const FORMATS: { key: FormatFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mtt", label: "Tournaments" },
  { key: "sng", label: "Sit & Go" },
  { key: "bounty", label: "Bounty" },
  { key: "turbo", label: "Turbo" },
  { key: "cash", label: "Cash" },
];

const STATUS_TONE = {
  registering: { tone: "gold" as const, label: "Registering" },
  "late-reg": { tone: "ember" as const, label: "Late reg" },
  running: { tone: "live" as const, label: "Running" },
  "final-table": { tone: "win" as const, label: "Final table" },
  finished: { tone: "neutral" as const, label: "Finished" },
};

export default function PokerLobbyPage() {
  const [format, setFormat] = useState<FormatFilter>("all");
  const [detail, setDetail] = useState<Tournament | null>(null);
  const now = useNow(1000);

  const listed = useMemo(
    () => (format === "all" ? TOURNAMENTS : TOURNAMENTS.filter((t) => t.format === format)),
    [format],
  );

  const featured = TOURNAMENTS[0];

  return (
    <Shell slip={false}>
      <PokerHero tournament={featured} now={now} />

      {MY_SEATS.length > 0 && (
        <Section aria-label="Your tables">
          <SectionHeading
            title="Your tables"
            subtitle="Hands are dealt whether or not you're watching"
            icon={<LivePip />}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {MY_SEATS.map((seat) => {
              const tournament = findTournament(seat.tournamentId);
              if (!tournament) return null;
              return (
                <Link
                  key={seat.tableId}
                  href={`/casino/poker/${tournament.id}`}
                  className="glass flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:border-gold-400/25"
                >
                  <Chip value={seat.stack} size="md" showValue />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{tournament.name}</p>
                    <p className="text-[0.6875rem] text-white/40 tnum">
                      Rank {seat.rank} of {tournament.playersLeft.toLocaleString("en-IN")} ·{" "}
                      {seat.stack.toLocaleString("en-IN")} chips
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-1 text-[0.6875rem] font-semibold tnum",
                      seat.bigBlinds <= 15
                        ? "bg-loss/15 text-loss"
                        : "bg-win/12 text-win",
                    )}
                  >
                    {seat.bigBlinds}bb
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <Section aria-label="Tournament list">
        <SectionHeading
          title="Poker room"
          subtitle={`${listed.length} table${listed.length === 1 ? "" : "s"} open`}
          icon="♠"
          action={
            <Segmented
              label="Format"
              size="sm"
              value={format}
              onChange={setFormat}
              options={FORMATS}
            />
          }
        />

        <div className="space-y-2.5">
          {listed.map((tournament) => (
            <TournamentRow
              key={tournament.id}
              tournament={tournament}
              now={now}
              onDetails={() => setDetail(tournament)}
            />
          ))}
        </div>
      </Section>

      <Divider className="my-7" />

      <Section aria-label="How the room works">
        <div className="rounded-2xl border border-gold-400/20 bg-gold-700/8 p-4">
          <h2 className="mb-1.5 text-sm font-semibold text-gold-200">About these tables</h2>
          <p className="text-xs leading-relaxed text-white/55">
            Hands are dealt by a real Texas Hold&rsquo;em engine — a shuffled 52-card deck, proper
            betting rounds, side pots and a full seven-card showdown evaluation. Your opponents are
            simulated: each has its own aggression and looseness, and reads the board rather than
            acting at random. No real money is staked and no other people are at the table.
          </p>
          <Link
            href="/responsible-gambling#limits"
            className="mt-2.5 inline-block text-xs font-medium text-gold-300 underline-offset-2 hover:underline"
          >
            Set a session or deposit limit
          </Link>
        </div>
      </Section>

      <TournamentDetail tournament={detail} onClose={() => setDetail(null)} now={now} />
    </Shell>
  );
}

/* ============================================================
   Hero
   ============================================================ */

function PokerHero({ tournament, now }: { tournament: Tournament; now: number | null }) {
  return (
    <Section aria-label="Featured tournament">
      <div className="relative overflow-hidden rounded-3xl border border-gold-400/20">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 30% 20%, #6d1f24 0%, #3a1014 45%, #1a0609 100%)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute -right-16 -top-20 size-72 rounded-full bg-gold-500/15 blur-[80px]"
        />

        <div className="relative p-5 sm:p-8">
          <Badge tone="gold" className="mb-3">
            Poker room
          </Badge>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-4xl">
            {tournament.name}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/55">
            {tournament.description}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Guaranteed"
              value={`₹${formatCompact(tournament.guaranteed)}`}
              tone="gold"
            />
            <StatTile label="Buy-in" value={formatMoney(tournament.buyIn, { decimals: false })} />
            <StatTile
              label="Entrants"
              value={tournament.entrants.toLocaleString("en-IN")}
              hint={`of ${formatCompact(tournament.maxEntrants)}`}
            />
            <StatTile
              label="Starts"
              value={now === null ? "—" : formatKickoff(tournament.startsAt, now)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href={`/casino/poker/${tournament.id}`} variant="gold" size="lg">
              Take a seat
            </LinkButton>
            <LinkButton href="/casino" variant="outline" size="lg">
              Back to casino
            </LinkButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   Row
   ============================================================ */

function TournamentRow({
  tournament,
  now,
  onDetails,
}: {
  tournament: Tournament;
  now: number | null;
  onDetails: () => void;
}) {
  const status = STATUS_TONE[tournament.status];
  const fillPct = Math.min(100, (tournament.entrants / tournament.maxEntrants) * 100);
  const level = currentLevel(tournament);
  const live = tournament.status === "running" || tournament.status === "final-table";

  return (
    <article className="glass relative overflow-hidden rounded-2xl transition-all hover:border-gold-400/20">
      {live && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-ember-400 via-live to-ember-700"
        />
      )}

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={status.tone}>
              {live && <LivePip />}
              {status.label}
            </Badge>
            {tournament.tags.slice(0, 2).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <h3 className="truncate text-sm font-semibold text-white">{tournament.name}</h3>

          <p className="mt-0.5 text-[0.6875rem] text-white/40 tnum">
            {live ? (
              <>
                {tournament.playersLeft.toLocaleString("en-IN")} left · Level{" "}
                {tournament.currentLevel} ({level.smallBlind}/{level.bigBlind}) · Avg{" "}
                {formatCompact(tournament.averageStack)}
              </>
            ) : (
              <>
                {now === null ? "—" : formatKickoff(tournament.startsAt, now)} ·{" "}
                {tournament.startingStack.toLocaleString("en-IN")} chips ·{" "}
                {level.duration}-min levels
              </>
            )}
          </p>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                fillPct > 85
                  ? "bg-linear-to-r from-ember-500 to-loss"
                  : "bg-linear-to-r from-ember-400 to-gold-400",
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-gilt tnum">
              ₹{formatCompact(tournament.prizePool)}
            </p>
            <p className="text-[0.625rem] text-white/35">
              {tournament.buyIn === 0
                ? "Free"
                : `${formatMoney(tournament.buyIn, { decimals: false })}${tournament.fee ? ` + ${formatCompact(tournament.fee)}` : ""}`}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <LinkButton href={`/casino/poker/${tournament.id}`} variant="gold" size="sm">
              {live ? "Watch" : "Register"}
            </LinkButton>
            <Button variant="ghost" size="sm" onClick={onDetails}>
              Details
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Detail sheet — blind structure and payouts
   ============================================================ */

function TournamentDetail({
  tournament,
  onClose,
  now,
}: {
  tournament: Tournament | null;
  onClose: () => void;
  now: number | null;
}) {
  const [tab, setTab] = useState<"structure" | "payouts">("structure");
  if (!tournament) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={tournament.name}
      description={`${tournament.startingStack.toLocaleString("en-IN")} starting chips · ${tournament.seatsPerTable}-max`}
      size="lg"
      footer={
        <LinkButton href={`/casino/poker/${tournament.id}`} variant="gold" fullWidth>
          Take a seat
        </LinkButton>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Prize pool" value={`₹${formatCompact(tournament.prizePool)}`} tone="gold" />
          <StatTile label="Entrants" value={tournament.entrants.toLocaleString("en-IN")} />
          <StatTile label="Left" value={tournament.playersLeft.toLocaleString("en-IN")} />
          <StatTile
            label="Starts"
            value={now === null ? "—" : formatKickoff(tournament.startsAt, now)}
          />
        </div>

        {tournament.bounty && (
          <p className="rounded-xl border border-ember-400/25 bg-ember-500/10 px-3.5 py-2.5 text-xs text-ember-100">
            Progressive knockout — {formatMoney(tournament.bounty, { decimals: false })} sits on
            every player. Half of each bounty you win is paid immediately, half is added to your own.
          </p>
        )}

        <Segmented
          label="Tournament information"
          stretch
          value={tab}
          onChange={setTab}
          options={[
            { key: "structure", label: "Blind structure" },
            { key: "payouts", label: "Payouts" },
          ]}
        />

        {tab === "structure" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[0.625rem] uppercase tracking-wider text-white/35">
                  <th className="py-2 pr-3 font-medium">Level</th>
                  <th className="py-2 pr-3 font-medium">Blinds</th>
                  <th className="py-2 pr-3 font-medium">Ante</th>
                  <th className="py-2 font-medium">Length</th>
                </tr>
              </thead>
              <tbody>
                {tournament.levels.slice(0, 16).map((level) => (
                  <tr
                    key={level.level}
                    className={cn(
                      "border-b border-white/5",
                      level.level === tournament.currentLevel && "bg-gold-400/8",
                    )}
                  >
                    <td className="py-1.5 pr-3 tnum">
                      {level.level}
                      {level.level === tournament.currentLevel && (
                        <span className="ml-1.5 text-[0.5625rem] font-semibold text-gold-300">
                          NOW
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 tnum text-white/80">
                      {level.smallBlind.toLocaleString("en-IN")} /{" "}
                      {level.bigBlind.toLocaleString("en-IN")}
                    </td>
                    <td className="py-1.5 pr-3 tnum text-white/45">
                      {level.ante ? level.ante.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-1.5 tnum text-white/45">{level.duration}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="space-y-1">
            {tournament.payouts.map((tier) => (
              <li
                key={tier.label}
                className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-white/3"
              >
                <span className="text-xs text-white/70">{tier.label}</span>
                <span className="text-xs font-semibold text-gold-200 tnum">
                  {formatMoney(tier.amount, { decimals: false })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[0.6875rem] leading-relaxed text-white/35">
          Demonstration build — no real money is staked. Opponents are simulated.
        </p>
      </div>
    </Sheet>
  );
}
