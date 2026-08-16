"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { currentLevel, findTournament } from "@/lib/poker/mock";
import { useTable } from "@/lib/poker/useTable";
import { cn, formatCompact, formatMoney } from "@/lib/format";
import { Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import { Badge, Button, LivePip, StatTile } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { PokerTable } from "@/components/poker/PokerTable";
import { ActionBar } from "@/components/poker/ActionBar";

export default function PokerTablePage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const tournament = findTournament(tournamentId);
  if (!tournament) notFound();
  return <TableView tournamentId={tournamentId} />;
}

function TableView({ tournamentId }: { tournamentId: string }) {
  const tournament = findTournament(tournamentId)!;
  const level = currentLevel(tournament);
  const [logOpen, setLogOpen] = useState(false);

  const { state, hero, heroSeat, potTotal, dealing } = useTable({
    tableId: `${tournamentId}-t01`,
    seatCount: Math.min(tournament.seatsPerTable, 9),
    startingStack: tournament.startingStack,
    smallBlind: level.smallBlind,
    bigBlind: level.bigBlind,
    ante: level.ante,
  });

  return (
    <>
      <SubBar
        title={tournament.name}
        subtitle={`Level ${tournament.currentLevel} · ${level.smallBlind}/${level.bigBlind}${level.ante ? ` ante ${level.ante}` : ""}`}
        backHref="/casino/poker"
        action={
          <Badge tone="live">
            <LivePip />
            Table 1
          </Badge>
        }
      />

      <Shell slip={false} sidebar={false}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
          {/* ---- Table column ---- */}
          <div className="min-w-0">
            <PokerTable
              state={state}
              potTotal={potTotal}
              dealing={dealing}
              showdownVisible
            />

            <div className="mt-4">
              <ActionBar
                hero={hero}
                heroSeat={heroSeat}
                potTotal={potTotal}
                currentBet={state.currentBet}
                bigBlind={state.bigBlind}
              />
            </div>

            {/* Mobile: log lives behind a button rather than a rail */}
            <div className="mt-3 xl:hidden">
              <Button variant="subtle" fullWidth onClick={() => setLogOpen(true)}>
                Hand history · #{state.handNumber}
              </Button>
            </div>
          </div>

          {/* ---- Info rail (desktop) ---- */}
          <aside className="hidden space-y-3 xl:block" aria-label="Table information">
            <div className="glass rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-semibold">Tournament</h2>
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Prize pool"
                  value={`₹${formatCompact(tournament.prizePool)}`}
                  tone="gold"
                />
                <StatTile label="Left" value={tournament.playersLeft.toLocaleString("en-IN")} />
                <StatTile label="Avg stack" value={formatCompact(tournament.averageStack)} />
                <StatTile
                  label="Your stack"
                  value={formatCompact(heroSeat?.player?.stack ?? 0)}
                  tone="win"
                />
              </div>

              <div className="mt-3 space-y-1 border-t border-white/8 pt-3 text-[0.6875rem]">
                <Row label="Level" value={`${tournament.currentLevel}`} />
                <Row label="Blinds" value={`${level.smallBlind}/${level.bigBlind}`} />
                {level.ante > 0 && <Row label="Ante" value={`${level.ante}`} />}
                <Row
                  label="Next payout"
                  value={formatMoney(
                    tournament.payouts[tournament.payouts.length - 1]?.amount ?? 0,
                    { decimals: false },
                  )}
                />
              </div>
            </div>

            <HandLog log={state.log} />
          </aside>
        </div>

        <p className="mt-5 text-center text-[0.6875rem] leading-relaxed text-white/30">
          Demonstration table — opponents are simulated and no real money is staked.{" "}
          <Link
            href="/responsible-gambling#limits"
            className="text-gold-300/70 underline-offset-2 hover:underline"
          >
            Set a session limit
          </Link>
        </p>
      </Shell>

      <Sheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Hand history"
        description={`Hand #${state.handNumber}`}
      >
        <HandLog log={state.log} bare />
      </Sheet>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="font-medium text-white/85 tnum">{value}</span>
    </div>
  );
}

/**
 * Rolling commentary. Auto-scrolls to the newest line, which is what a
 * player watching the rail expects.
 */
function HandLog({ log, bare }: { log: string[]; bare?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [log.length]);

  const body = (
    <ol className="space-y-1 text-[0.6875rem] leading-relaxed">
      {log.map((line, i) => (
        <li
          key={i}
          className={cn(
            "tnum",
            i === log.length - 1 ? "text-gold-200" : "text-white/45",
            line.startsWith("Hand #") && "mt-2 font-semibold text-white/70",
          )}
        >
          {line}
        </li>
      ))}
      <div ref={endRef} />
    </ol>
  );

  if (bare) return body;

  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="mb-2 text-sm font-semibold">Hand history</h2>
      <div
        className="max-h-72 overflow-y-auto pr-1"
        role="log"
        aria-live="polite"
        aria-label="Hand commentary"
      >
        {body}
      </div>
    </div>
  );
}
