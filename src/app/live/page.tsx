"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StreamCategory } from "@/lib/streaming/types";
import { STREAMS, STREAM_CATEGORIES } from "@/lib/streaming/mock";
import { formatCompact } from "@/lib/format";
import { Section, Shell } from "@/components/layout/Shell";
import {
  Badge,
  EmptyState,
  LinkButton,
  LivePip,
  SectionHeading,
  Segmented,
} from "@/components/ui/primitives";
import { StreamCard } from "@/components/streaming/StreamCard";

type Filter = "all" | StreamCategory;

export default function LiveLobbyPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const listed = useMemo(
    () => (filter === "all" ? STREAMS : STREAMS.filter((s) => s.category === filter)),
    [filter],
  );

  const totalViewers = STREAMS.reduce((sum, s) => sum + s.viewers, 0);
  const featured = STREAMS[1];

  return (
    <Shell slip={false}>
      {/* ---------- Hero ---------- */}
      <Section aria-label="Go live">
        <div className="relative overflow-hidden rounded-3xl border border-gold-400/20">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 85% 75% at 25% 15%, #6d1f24 0%, #3a1014 48%, #150609 100%)",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-80 rounded-full bg-gold-500/15 blur-[90px]"
          />

          <div className="relative p-5 sm:p-8">
            <Badge tone="live" className="mb-3">
              <LivePip />
              {STREAMS.length} channels live
            </Badge>

            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-4xl">
              Play it out loud
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/55">
              Share your screen and your camera while you play. Chat rides alongside every stream,
              so a session stops being a thing you do on your own at 2am.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/live/studio" variant="gold" size="lg">
                Start streaming
              </LinkButton>
              <LinkButton href={`/live/${featured.id}`} variant="outline" size="lg">
                Watch top channel
              </LinkButton>
            </div>

            <p className="mt-4 text-[0.6875rem] text-white/35 tnum">
              {formatCompact(totalViewers)} people watching right now
            </p>
          </div>
        </div>
      </Section>

      {/* ---------- Channels ---------- */}
      <Section aria-label="Live channels">
        <SectionHeading
          title="Live now"
          subtitle={`${listed.length} channel${listed.length === 1 ? "" : "s"}`}
          icon={<LivePip />}
        />

        {/* Six options will not fit a phone, and SectionHeading pins its
            action slot to shrink-0, so the filter scrolls on its own row. */}
        <div className="scroll-x -mx-3 mb-3 px-3 sm:-mx-5 sm:px-5">
          <Segmented
            label="Stream category"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { key: "all", label: "All", badge: STREAMS.length },
              ...STREAM_CATEGORIES.map((c) => ({
                key: c.key as Filter,
                label: c.label,
                badge: STREAMS.filter((s) => s.category === c.key).length,
              })),
            ]}
          />
        </div>

        {listed.length === 0 ? (
          <EmptyState
            icon="📡"
            title="Nobody live in this category"
            message="Try another category, or start the first stream yourself."
            action={
              <LinkButton href="/live/studio" variant="gold" size="sm">
                Go live
              </LinkButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listed.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------- Ground rules ---------- */}
      <Section aria-label="Streaming guidelines">
        <div className="rounded-2xl border border-gold-400/20 bg-gold-700/8 p-4">
          <h2 className="mb-1.5 text-sm font-semibold text-gold-200">Before you go live</h2>
          <ul className="space-y-1.5 text-xs leading-relaxed text-white/55">
            <li>
              Your screen share shows everything in the captured window — pick a single tab rather
              than your whole display if your balance, email or messages are on screen.
            </li>
            <li>
              Don&rsquo;t present losses as wins or edit out the downswings. Misrepresenting results
              gets a channel removed.
            </li>
            <li>
              Never tell viewers what to stake. No tipping-off, no bet-along pressure, no chasing.
            </li>
            <li>
              Streaming makes long sessions feel shorter than they are.{" "}
              <Link
                href="/responsible-gambling#reality-check"
                className="text-gold-300 underline-offset-2 hover:underline"
              >
                Set a reality check
              </Link>{" "}
              before you start.
            </li>
          </ul>
        </div>
      </Section>
    </Shell>
  );
}
