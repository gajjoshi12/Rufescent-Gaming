"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FillBar, spotsLeft } from "@/components/fantasy/ContestCard";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import { Sheet, Toast } from "@/components/ui/Sheet";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  LinkButton,
  Segmented,
  StatTile,
} from "@/components/ui/primitives";
import {
  LeaderboardSkeleton,
  LoadingRegion,
  PlayerRowSkeleton,
  Skeleton,
} from "@/components/ui/Skeletons";
import { api } from "@/lib/api";
import {
  CURRENCY,
  clamp,
  cn,
  formatCompact,
  formatKickoff,
  formatMoney,
  hueGradient,
} from "@/lib/format";
import { useAsync, useNow, usePersistentState } from "@/lib/hooks";
import { TEAM_RULES, type SquadRules } from "@/lib/mock/fantasy";
import type { FantasyContest, FantasyPlayer, FantasyRole, LeaderboardEntry } from "@/lib/types";
import { useSession } from "@/store/session";

type Tab = "team" | "leaderboard" | "prizes";

const TABS: { key: Tab; label: string }[] = [
  { key: "team", label: "Team builder" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "prizes", label: "Prizes" },
];

const ROLE_LABEL: Record<FantasyRole, string> = {
  WK: "Wicket-keeper",
  BAT: "Batter",
  AR: "All-rounder",
  BOWL: "Bowler",
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

/** Only cricket and soccer have published rule sets; anything else borrows cricket's. */
function rulesForSport(sport: FantasyContest["sport"]): SquadRules {
  return sport === "soccer" ? TEAM_RULES.soccer : (TEAM_RULES[sport as "cricket"] ?? TEAM_RULES.cricket);
}

/* ============================================================
   Page
   ============================================================ */

export default function ContestDetailPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = use(params);
  const [tab, setTab] = useState<Tab>("team");
  const now = useNow(15_000);
  const { user } = useSession();

  const { data: contest, loading } = useAsync(() => api.fantasy.contest(contestId), [contestId]);

  if (!loading && !contest) notFound();

  const affordable = !contest || contest.entryFee <= user.balance;

  return (
    <>
      <SubBar
        title={contest?.title ?? "Contest"}
        subtitle={contest?.matchLabel}
        backHref="/fantasy"
        action={
          contest?.guaranteed ? (
            <Badge tone="gold">
              <span aria-hidden="true">✦</span> Guaranteed
            </Badge>
          ) : undefined
        }
      />

      <Shell slip={false}>
        {/* SubBar owns the page <h1>; sections below start at <h2>. */}
        {loading || !contest ? (
          <LoadingRegion label="Loading contest">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-9 w-64 rounded-xl" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </LoadingRegion>
        ) : (
          <>
            <Section>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold sm:text-xl">
                      {contest.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/45">{contest.matchLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {contest.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[0.625rem] text-white/45"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatTile
                    label="Prize pool"
                    value={`${CURRENCY}${formatCompact(contest.prizePool)}`}
                    tone="gold"
                    hint={`1st ${CURRENCY}${formatCompact(contest.firstPrize)}`}
                  />
                  <StatTile
                    label="Entry"
                    value={
                      contest.entryFee === 0
                        ? "Free"
                        : formatMoney(contest.entryFee, { decimals: false })
                    }
                    hint={contest.multiEntry ? "Multi-entry" : "Single entry"}
                  />
                  <StatTile
                    label="Spots left"
                    value={formatCompact(spotsLeft(contest))}
                    hint={`of ${formatCompact(contest.totalSpots)}`}
                  />
                  <StatTile
                    label="Locks"
                    value={now === null ? "—" : formatKickoff(contest.startsAt, now)}
                    tone="ember"
                    hint={`${contest.winnersPct}% win`}
                  />
                </div>

                <FillBar contest={contest} className="mt-3.5" />

                {!affordable && contest.entryFee > 0 && (
                  <p className="mt-2.5 text-xs text-ember-300">
                    Your balance is {formatMoney(user.balance, { decimals: false })}.{" "}
                    <Link href="/wallet" className="underline hover:text-gold-200">
                      Add funds
                    </Link>{" "}
                    to enter this contest.
                  </p>
                )}
              </Card>
            </Section>

            <div className="scroll-x -mx-3 mb-4 px-3 sm:-mx-5 sm:px-5">
              <Segmented label="Contest sections" options={TABS} value={tab} onChange={setTab} />
            </div>

            <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label}>
              {tab === "team" && <TeamBuilder contest={contest} />}
              {tab === "leaderboard" && <LeaderboardTab contestId={contest.id} />}
              {tab === "prizes" && <PrizesTab contest={contest} />}
            </div>
          </>
        )}
      </Shell>
    </>
  );
}

/* ============================================================
   Team builder
   ============================================================ */

interface SavedTeam {
  picks: string[];
  captain: string | null;
  vice: string | null;
  savedAt: string | null;
}

const EMPTY_TEAM: SavedTeam = { picks: [], captain: null, vice: null, savedAt: null };

interface SquadState {
  rules: SquadRules;
  roles: FantasyRole[];
  size: number;
  roleCounts: Record<string, number>;
  teamCounts: Record<string, number>;
  creditsLeft: number;
}

/** Role minimums still outstanding, optionally counting one extra pick in `extra`. */
function outstandingMinimums(state: SquadState, extra?: FantasyRole): number {
  return state.roles.reduce((sum, role) => {
    const min = state.rules.roleMin[role] ?? 0;
    const have = (state.roleCounts[role] ?? 0) + (extra === role ? 1 : 0);
    return sum + Math.max(0, min - have);
  }, 0);
}

/** Why this player cannot be added right now — null when the pick is legal. */
function blockReason(player: FantasyPlayer, state: SquadState): string | null {
  const { rules } = state;
  if (state.size >= rules.size) return `Squad is full — ${rules.size} players maximum`;
  if (player.credits > state.creditsLeft + 1e-6) {
    return `Not enough credits — needs ${player.credits.toFixed(1)}, ${state.creditsLeft.toFixed(1)} left`;
  }
  const roleMax = rules.roleMax[player.role] ?? rules.size;
  if ((state.roleCounts[player.role] ?? 0) >= roleMax) {
    return `Maximum ${roleMax} ${ROLE_LABEL[player.role].toLowerCase()}s allowed`;
  }
  if ((state.teamCounts[player.team] ?? 0) >= rules.maxPerTeam) {
    return `Maximum ${rules.maxPerTeam} players from ${player.team}`;
  }
  // Adding this player must still leave enough slots for every role minimum.
  if (outstandingMinimums(state, player.role) > rules.size - state.size - 1) {
    return "Adding this player leaves no room for the required roles";
  }
  return null;
}

function squadViolations(state: SquadState, team: SavedTeam): string[] {
  const { rules } = state;
  const out: string[] = [];

  if (state.size < rules.size) {
    out.push(`Pick ${rules.size - state.size} more player${rules.size - state.size === 1 ? "" : "s"}`);
  } else if (state.size > rules.size) {
    out.push(`Remove ${state.size - rules.size}`);
  }
  if (state.creditsLeft < 0) out.push(`Over budget by ${Math.abs(state.creditsLeft).toFixed(1)} credits`);

  for (const role of state.roles) {
    const count = state.roleCounts[role] ?? 0;
    const min = rules.roleMin[role] ?? 0;
    const max = rules.roleMax[role] ?? rules.size;
    if (count < min) out.push(`Need at least ${min} ${role} (have ${count})`);
    if (count > max) out.push(`At most ${max} ${role} (have ${count})`);
  }
  for (const [teamName, count] of Object.entries(state.teamCounts)) {
    if (count > rules.maxPerTeam) out.push(`Max ${rules.maxPerTeam} from ${teamName} (have ${count})`);
  }
  if (state.size === rules.size) {
    if (!team.captain) out.push("Choose a captain");
    if (!team.vice) out.push("Choose a vice-captain");
  }
  return out;
}

function TeamBuilder({ contest }: { contest: FantasyContest }) {
  const rules = useMemo(() => rulesForSport(contest.sport), [contest.sport]);
  const roles = useMemo(
    () => Object.keys(rules.roleMax) as FantasyRole[],
    [rules],
  );

  const [activeRole, setActiveRole] = useState<FantasyRole>(roles[0]);
  const [captainOpen, setCaptainOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const { data, loading } = useAsync(() => api.fantasy.players(contest.sport), [contest.sport]);
  const pool = useMemo(() => data ?? [], [data]);

  const [team, setTeam] = usePersistentState<SavedTeam>(
    `ruf.fantasy.team.${contest.id}`,
    EMPTY_TEAM,
  );

  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const picked = useMemo(
    () => team.picks.map((id) => byId.get(id)).filter((p): p is FantasyPlayer => Boolean(p)),
    [team.picks, byId],
  );

  const state = useMemo<SquadState>(() => {
    const roleCounts: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};
    let credits = 0;
    for (const p of picked) {
      roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
      teamCounts[p.team] = (teamCounts[p.team] ?? 0) + 1;
      credits += p.credits;
    }
    return {
      rules,
      roles,
      size: picked.length,
      roleCounts,
      teamCounts,
      creditsLeft: Number((rules.credits - credits).toFixed(1)),
    };
  }, [picked, rules, roles]);

  const creditsUsed = Number((rules.credits - state.creditsLeft).toFixed(1));
  const violations = useMemo(() => squadViolations(state, team), [state, team]);
  const legal = violations.length === 0;

  const toggle = useCallback(
    (player: FantasyPlayer) => {
      setTeam((prev) =>
        prev.picks.includes(player.id)
          ? {
              ...prev,
              picks: prev.picks.filter((id) => id !== player.id),
              captain: prev.captain === player.id ? null : prev.captain,
              vice: prev.vice === player.id ? null : prev.vice,
              savedAt: null,
            }
          : { ...prev, picks: [...prev.picks, player.id], savedAt: null },
      );
    },
    [setTeam],
  );

  const setCaptain = useCallback(
    (id: string) =>
      setTeam((prev) => ({
        ...prev,
        captain: prev.captain === id ? null : id,
        vice: prev.vice === id ? null : prev.vice,
        savedAt: null,
      })),
    [setTeam],
  );

  const setVice = useCallback(
    (id: string) =>
      setTeam((prev) => ({
        ...prev,
        vice: prev.vice === id ? null : id,
        captain: prev.captain === id ? null : prev.captain,
        savedAt: null,
      })),
    [setTeam],
  );

  const clearTeam = useCallback(() => setTeam(EMPTY_TEAM), [setTeam]);

  const save = useCallback(() => {
    setTeam((prev) => ({ ...prev, savedAt: new Date().toISOString() }));
    setToastOpen(true);
  }, [setTeam]);

  useEffect(() => {
    if (!toastOpen) return;
    const id = setTimeout(() => setToastOpen(false), 3_500);
    return () => clearTimeout(id);
  }, [toastOpen]);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        key: role,
        label: role,
        badge: `${state.roleCounts[role] ?? 0}/${rules.roleMax[role] ?? rules.size}`,
      })),
    [roles, state.roleCounts, rules],
  );

  const visible = useMemo(
    () => pool.filter((p) => p.role === activeRole).sort((a, b) => b.points - a.points),
    [pool, activeRole],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <PlayerRowSkeleton count={6} />
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="Player pool not published yet"
        message="Line-ups for this fixture go live closer to the lock time. Join the contest now and build your squad when the pool opens."
        action={
          <LinkButton href="/fantasy" variant="subtle" size="sm">
            Back to contests
          </LinkButton>
        }
      />
    );
  }

  const creditPct = clamp((creditsUsed / rules.credits) * 100, 0, 100);

  return (
    <div className="pb-2">
      {/* Budget + violations summary */}
      <div
        aria-live="polite"
        className="glass-soft mb-3 rounded-2xl px-3.5 py-3"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Squad</p>
            <p className="font-display text-lg font-semibold tnum">
              {state.size}
              <span className="text-white/35">/{rules.size}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Credits left</p>
            <p
              className={cn(
                "font-display text-lg font-semibold tnum",
                state.creditsLeft < 0 ? "text-loss" : "text-gilt",
              )}
            >
              {state.creditsLeft.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              state.creditsLeft < 0
                ? "bg-loss"
                : "bg-linear-to-r from-gold-300 to-ember-500",
            )}
            style={{ width: `${creditPct}%` }}
          />
        </div>
        <p className="mt-1 text-[0.625rem] text-white/35 tnum">
          {creditsUsed.toFixed(1)} of {rules.credits} credits used · max {rules.maxPerTeam} per team
        </p>

        {violations.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {violations.map((v) => (
              <li
                key={v}
                className="rounded-full border border-ember-400/25 bg-ember-500/12 px-2 py-0.5 text-[0.625rem] text-ember-200"
              >
                {v}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[0.6875rem] font-medium text-win">
            Squad is legal — ready to save.
          </p>
        )}
      </div>

      {/* Role tabs */}
      <div className="scroll-x -mx-3 mb-2.5 px-3 sm:-mx-5 sm:px-5">
        <Segmented
          label="Filter players by role"
          size="sm"
          options={roleOptions}
          value={activeRole}
          onChange={setActiveRole}
        />
      </div>

      <div className="mb-1.5 flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-white/60">
          {ROLE_LABEL[activeRole]}s
          <span className="ml-1.5 text-white/30 tnum">
            (min {rules.roleMin[activeRole] ?? 0} · max {rules.roleMax[activeRole] ?? rules.size})
          </span>
        </h3>
        <span className="hidden text-[0.625rem] uppercase tracking-wider text-white/30 sm:block">
          Sel% · Pts · Cr
        </span>
      </div>

      <ul className="space-y-1.5">
        {visible.map((player) => {
          const selected = team.picks.includes(player.id);
          const reason = selected ? null : blockReason(player, state);
          return (
            <li key={player.id}>
              <PlayerRow
                player={player}
                selected={selected}
                captain={team.captain === player.id}
                vice={team.vice === player.id}
                blocked={reason}
                onToggle={() => toggle(player)}
              />
            </li>
          );
        })}
      </ul>

      {/* Sticky action bar — parked above the mobile tab bar */}
      <div className="sticky bottom-[4.75rem] z-40 mt-3 xl:bottom-4">
        <div className="glass flex items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-[0_18px_40px_-20px_#000]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] text-white/45">
              <span className="font-semibold text-white tnum">
                {state.size}/{rules.size}
              </span>{" "}
              players ·{" "}
              <span
                className={cn(
                  "font-semibold tnum",
                  state.creditsLeft < 0 ? "text-loss" : "text-gold-200",
                )}
              >
                {state.creditsLeft.toFixed(1)}
              </span>{" "}
              cr left
            </p>
            <p className="truncate text-[0.625rem] text-white/35">
              {team.captain
                ? `C ${byId.get(team.captain)?.short ?? "—"}`
                : "No captain"}{" "}
              ·{" "}
              {team.vice ? `VC ${byId.get(team.vice)?.short ?? "—"}` : "No vice-captain"}
            </p>
          </div>

          <Button
            variant="subtle"
            size="sm"
            onClick={() => setCaptainOpen(true)}
            disabled={picked.length === 0}
          >
            C / VC
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!legal}>
            {team.savedAt ? "Saved ✓" : "Save team"}
          </Button>
        </div>
      </div>

      {picked.length > 0 && (
        <button
          type="button"
          onClick={clearTeam}
          className="mx-auto mt-3 block text-[0.6875rem] text-white/35 underline transition-colors hover:text-white/60"
        >
          Clear squad
        </button>
      )}

      <CaptainSheet
        open={captainOpen}
        onClose={() => setCaptainOpen(false)}
        picked={picked}
        team={team}
        rules={rules}
        onCaptain={setCaptain}
        onVice={setVice}
      />

      <Toast open={toastOpen} tone="win" onDismiss={() => setToastOpen(false)}>
        Team saved for <strong>{contest.title}</strong> — you can edit it until the fixture locks.
      </Toast>
    </div>
  );
}

/* ---------- Player row ---------- */

function PlayerRow({
  player,
  selected,
  captain,
  vice,
  blocked,
  onToggle,
}: {
  player: FantasyPlayer;
  selected: boolean;
  captain: boolean;
  vice: boolean;
  blocked: string | null;
  onToggle: () => void;
}) {
  const hue = hueFromHex(player.teamColor);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors",
        selected
          ? "border-gold-400/30 bg-gold-400/6"
          : "border-white/6 bg-white/[0.02] hover:bg-white/5",
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold text-white/90 shadow-inner"
        style={{ background: hueGradient(hue) }}
      >
        {player.short.slice(0, 2).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-medium text-white/90">
          <span className="truncate">{player.name}</span>
          {captain && (
            <span className="shrink-0 rounded bg-gold-300 px-1 text-[0.5625rem] font-bold text-obsidian-950">
              C
            </span>
          )}
          {vice && (
            <span className="shrink-0 rounded bg-white/25 px-1 text-[0.5625rem] font-bold text-white">
              VC
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-white/40">
          <span
            className="shrink-0 rounded px-1 py-px font-medium"
            style={{ background: `${player.teamColor}22`, color: player.teamColor }}
          >
            {teamShort(player.team)}
          </span>
          <span className="shrink-0 tnum">{player.selectedBy}%</span>
          <FormSparkline form={player.form} />
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[0.8125rem] font-semibold text-white/85 tnum">{player.points}</p>
        <p className="text-[0.625rem] text-white/35">pts</p>
      </div>

      <div className="w-9 shrink-0 text-right">
        <p className="text-[0.8125rem] font-semibold text-gold-200 tnum">
          {player.credits.toFixed(1)}
        </p>
        <p className="text-[0.625rem] text-white/35">cr</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={!selected && blocked !== null}
        title={blocked ?? (selected ? `Remove ${player.name}` : `Add ${player.name}`)}
        aria-label={
          selected
            ? `Remove ${player.name} from your squad`
            : blocked
              ? `Cannot add ${player.name}: ${blocked}`
              : `Add ${player.name} to your squad`
        }
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full border text-base font-semibold transition-all active:scale-95",
          selected
            ? "border-loss/40 bg-loss/15 text-loss"
            : blocked
              ? "cursor-not-allowed border-white/8 bg-white/4 text-white/20"
              : "border-ember-400/40 bg-ember-500/15 text-ember-200 hover:bg-ember-500/28",
        )}
      >
        <span aria-hidden="true">{selected ? "−" : "+"}</span>
      </button>
    </div>
  );
}

function FormSparkline({ form }: { form: number[] }) {
  if (form.length < 2) return null;
  const max = Math.max(...form);
  const min = Math.min(...form);
  const span = Math.max(max - min, 1);
  const points = form
    .map((v, i) => `${(i / (form.length - 1)) * 34 + 1},${11 - ((v - min) / span) * 9}`)
    .join(" ");
  const rising = form[form.length - 1] >= form[0];

  return (
    <svg
      viewBox="0 0 36 12"
      className="h-3 w-9 shrink-0"
      fill="none"
      role="img"
      aria-label={`Recent form: ${form.join(", ")}`}
    >
      <polyline
        points={points}
        stroke={rising ? "var(--color-win)" : "var(--color-loss)"}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Captain sheet ---------- */

function CaptainSheet({
  open,
  onClose,
  picked,
  team,
  rules,
  onCaptain,
  onVice,
}: {
  open: boolean;
  onClose: () => void;
  picked: FantasyPlayer[];
  team: SavedTeam;
  rules: SquadRules;
  onCaptain: (id: string) => void;
  onVice: (id: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Captain & vice-captain"
      description={`Captain scores ${rules.captainMultiplier}× points, vice-captain ${rules.viceCaptainMultiplier}×.`}
      footer={
        <Button fullWidth onClick={onClose} disabled={!team.captain || !team.vice}>
          {team.captain && team.vice ? "Done" : "Pick both to continue"}
        </Button>
      }
    >
      <ul className="space-y-1.5">
        {picked.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold text-white/90"
              style={{ background: hueGradient(hueFromHex(player.teamColor)) }}
            >
              {player.short.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium text-white/90">{player.name}</p>
              <p className="text-[0.625rem] text-white/40 tnum">
                {player.role} · {teamShort(player.team)} · {player.points} pts
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCaptain(player.id)}
              aria-pressed={team.captain === player.id}
              aria-label={`Make ${player.name} captain`}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-bold transition-colors",
                team.captain === player.id
                  ? "border-gold-300 bg-gold-300 text-obsidian-950"
                  : "border-white/12 text-white/50 hover:border-gold-300/50 hover:text-gold-200",
              )}
            >
              C
            </button>
            <button
              type="button"
              onClick={() => onVice(player.id)}
              aria-pressed={team.vice === player.id}
              aria-label={`Make ${player.name} vice-captain`}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-[0.625rem] font-bold transition-colors",
                team.vice === player.id
                  ? "border-white/60 bg-white/85 text-obsidian-950"
                  : "border-white/12 text-white/50 hover:border-white/40 hover:text-white/80",
              )}
            >
              VC
            </button>
          </li>
        ))}
        {picked.length === 0 && (
          <li className="py-6 text-center text-sm text-white/40">
            Add players to your squad first.
          </li>
        )}
      </ul>
    </Sheet>
  );
}

/* ============================================================
   Leaderboard
   ============================================================ */

function LeaderboardTab({ contestId }: { contestId: string }) {
  const { data, loading } = useAsync(() => api.fantasy.leaderboard(contestId), [contestId]);
  const rows = useMemo(() => data ?? [], [data]);
  const you = rows.find((r) => r.isYou);

  const youRef = useRef<HTMLLIElement>(null);
  const [youVisible, setYouVisible] = useState(true);

  useEffect(() => {
    const el = youRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setYouVisible(entry.isIntersecting),
      { rootMargin: "-80px 0px -120px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rows]);

  if (loading) return <LeaderboardSkeleton count={10} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Leaderboard opens at lock"
        message="Ranks appear once the contest locks and the fixture is under way."
      />
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3 px-3 text-[0.625rem] uppercase tracking-wider text-white/30">
        <span className="w-9">Rank</span>
        <span className="flex-1">Team</span>
        <span className="w-14 text-right">Points</span>
        <span className="hidden w-16 text-right sm:block">Prize</span>
      </div>

      <ul className="space-y-1">
        {rows.map((entry) => (
          <li key={entry.rank} ref={entry.isYou ? youRef : undefined}>
            <LeaderboardRow entry={entry} />
          </li>
        ))}
      </ul>

      {you && !youVisible && (
        <div className="sticky bottom-[4.75rem] z-40 mt-2 xl:bottom-4">
          <LeaderboardRow entry={you} pinned />
        </div>
      )}
    </div>
  );
}

const PODIUM: Record<number, { ring: string; text: string }> = {
  1: { ring: "border-gold-300/60 bg-gold-400/10", text: "text-gold-200" },
  2: { ring: "border-white/35 bg-white/8", text: "text-white/85" },
  3: { ring: "border-[#c2864a]/60 bg-[#c2864a]/12", text: "text-[#e0a06a]" },
};

function LeaderboardRow({ entry, pinned }: { entry: LeaderboardEntry; pinned?: boolean }) {
  const podium = PODIUM[entry.rank];
  const movement = entry.movement;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        entry.isYou
          ? "border-gold-400/45 bg-gold-400/8"
          : podium
            ? `${podium.ring}`
            : "border-white/6 bg-white/[0.02]",
        pinned && "glass border-gold-400/50 shadow-[0_18px_40px_-20px_#000]",
      )}
    >
      <span
        className={cn(
          "w-9 shrink-0 font-display text-sm font-semibold tnum",
          podium ? podium.text : "text-white/60",
        )}
      >
        #{entry.rank}
      </span>

      <span
        className={cn(
          "shrink-0 text-[0.625rem] tnum",
          movement > 0 ? "text-win" : movement < 0 ? "text-loss" : "text-white/25",
        )}
        aria-label={
          movement > 0
            ? `Up ${movement} places`
            : movement < 0
              ? `Down ${Math.abs(movement)} places`
              : "No change"
        }
      >
        <span aria-hidden="true">
          {movement > 0 ? "▲" : movement < 0 ? "▼" : "—"}
          {movement !== 0 && Math.abs(movement)}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold text-white/90"
        style={{ background: hueGradient(entry.avatarHue) }}
      >
        {entry.user.slice(0, 2).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-medium text-white/90">
          <span className="truncate">{entry.user}</span>
          {entry.isYou && <Badge tone="gold">You</Badge>}
        </p>
        <p className="truncate text-[0.625rem] text-white/40">{entry.teamName}</p>
      </div>

      <span className="w-14 shrink-0 text-right font-display text-sm font-semibold text-white tnum">
        {entry.points}
      </span>

      <span className="hidden w-16 shrink-0 text-right text-xs font-semibold text-gold-200 tnum sm:block">
        {CURRENCY}
        {formatCompact(entry.prize)}
      </span>
    </div>
  );
}

/* ============================================================
   Prizes
   ============================================================ */

export interface PrizeBand {
  label: string;
  from: number;
  to: number;
  count: number;
  amount: number;
}

const BAND_STARTS = [1, 2, 3, 4, 11, 51, 201, 1_001, 5_001, 20_001];

function roundPrize(value: number): number {
  if (value >= 1_000) return Math.round(value / 100) * 100;
  if (value >= 100) return Math.round(value / 10) * 10;
  return Math.max(1, Math.round(value));
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/**
 * Rank bands for a contest's prize ladder. The top three come off the
 * advertised first prize; whatever is left of the pool is spread across the
 * remaining bands with a 1/√rank decay so per-winner amounts fall away
 * smoothly and never exceed the band above.
 */
export function prizeBands(contest: FantasyContest): PrizeBand[] {
  const winners = clamp(
    Math.round((contest.totalSpots * contest.winnersPct) / 100),
    1,
    contest.totalSpots,
  );

  const starts = BAND_STARTS.filter((s) => s <= winners);
  const ranges = starts
    .map((from, i) => {
      const to = Math.min((starts[i + 1] ?? winners + 1) - 1, winners);
      return { from, to, count: to - from + 1 };
    })
    .filter((r) => r.count > 0);

  const topAmounts = [contest.firstPrize, contest.firstPrize * 0.4, contest.firstPrize * 0.2];
  // Rank 1 pays the advertised first prize exactly; only the derived bands round.
  const head = ranges
    .slice(0, 3)
    .map((r, i) => ({ ...r, amount: i === 0 ? contest.firstPrize : roundPrize(topAmounts[i]) }));
  const used = head.reduce((sum, b) => sum + b.amount * b.count, 0);

  const tail = ranges.slice(3);
  const remaining = Math.max(0, contest.prizePool - used);
  const weights = tail.map((r) => r.count / Math.sqrt(r.from));
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  let ceiling = head.length > 0 ? head[head.length - 1].amount : contest.firstPrize;
  const tailBands = tail.map((r, i) => {
    const perWinner = (remaining * weights[i]) / weightSum / r.count;
    const amount = Math.max(1, Math.min(roundPrize(perWinner), ceiling));
    ceiling = amount;
    return { ...r, amount };
  });

  return [...head, ...tailBands].map((b) => ({
    ...b,
    label: b.from === b.to ? ordinal(b.from) : `${b.from.toLocaleString("en-IN")} – ${b.to.toLocaleString("en-IN")}`,
  }));
}

function PrizesTab({ contest }: { contest: FantasyContest }) {
  const bands = useMemo(() => prizeBands(contest), [contest]);
  const distributed = bands.reduce((sum, b) => sum + b.amount * b.count, 0);
  const winners = bands.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Prize pool</p>
            <p className="font-display text-3xl font-semibold text-gilt tnum">
              {CURRENCY}
              {formatCompact(contest.prizePool)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.625rem] uppercase tracking-wider text-white/40">Winners</p>
            <p className="font-display text-lg font-semibold text-white tnum">
              {winners.toLocaleString("en-IN")}
              <span className="ml-1 text-xs font-normal text-white/40">
                ({contest.winnersPct}% of {formatCompact(contest.totalSpots)})
              </span>
            </p>
          </div>
        </div>

        <Divider className="my-3.5" />

        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[19rem] text-sm">
            <caption className="sr-only">Prize breakdown by finishing rank</caption>
            <thead>
              <tr className="text-[0.625rem] uppercase tracking-wider text-white/35">
                <th scope="col" className="px-1 pb-2 text-left font-medium">
                  Rank
                </th>
                <th scope="col" className="px-1 pb-2 text-right font-medium">
                  Winners
                </th>
                <th scope="col" className="px-1 pb-2 text-right font-medium">
                  Prize each
                </th>
                <th scope="col" className="px-1 pb-2 text-right font-medium">
                  Band total
                </th>
              </tr>
            </thead>
            <tbody>
              {bands.map((band) => (
                <tr key={band.label} className="border-t border-white/6">
                  <th
                    scope="row"
                    className={cn(
                      "px-1 py-2.5 text-left font-medium",
                      band.from === 1
                        ? "text-gold-200"
                        : band.from <= 3
                          ? "text-white/85"
                          : "text-white/60",
                    )}
                  >
                    {band.label}
                  </th>
                  <td className="px-1 py-2.5 text-right text-white/50 tnum">
                    {band.count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-1 py-2.5 text-right font-semibold text-white/90 tnum">
                    {formatMoney(band.amount, { decimals: false })}
                  </td>
                  <td className="px-1 py-2.5 text-right text-white/50 tnum">
                    {CURRENCY}
                    {formatCompact(band.amount * band.count)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gold-400/25">
                <th scope="row" className="px-1 pt-2.5 text-left text-xs font-medium text-white/60">
                  Distributed
                </th>
                <td className="px-1 pt-2.5 text-right text-xs text-white/40 tnum">{winners}</td>
                <td />
                <td className="px-1 pt-2.5 text-right text-xs font-semibold text-gold-200 tnum">
                  ≈ {CURRENCY}
                  {formatCompact(distributed)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="space-y-2 p-4 text-xs leading-relaxed text-white/50">
        <h3 className="text-sm font-semibold text-white/85">Payout terms</h3>
        {contest.guaranteed ? (
          <p>
            <span className="font-medium text-gold-200">Guaranteed prize pool.</span> The full{" "}
            {CURRENCY}
            {formatCompact(contest.prizePool)} is paid out even if the contest does not fill all{" "}
            {formatCompact(contest.totalSpots)} spots.
          </p>
        ) : (
          <p>
            <span className="font-medium text-white/80">Not guaranteed.</span> This pool scales with
            entries — if the contest does not fill, the prize pool and every band above shrink in
            proportion to the number of teams entered.
          </p>
        )}
        <p>
          Contests that fail to reach the minimum entry count are cancelled at lock and entry fees
          are refunded to your wallet in full, usually within a few minutes and always within 24
          hours.
        </p>
        <p>
          Ties are split equally across the tied ranks. Prize amounts are rounded to the nearest
          rupee, so the distributed total can differ marginally from the advertised pool.
        </p>
        <p className="text-white/35">
          Fantasy contests are games of skill. 18+ only.{" "}
          <Link href="/responsible-gambling" className="underline hover:text-gold-200">
            Play responsibly
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

/* ============================================================
   Small helpers
   ============================================================ */

/** Team crest colours arrive as hex; the avatar gradient wants a hue angle. */
function hueFromHex(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 210;
  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 210;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return Math.round((hue * 60 + 360) % 360);
}

function teamShort(team: string): string {
  const words = team.split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}
