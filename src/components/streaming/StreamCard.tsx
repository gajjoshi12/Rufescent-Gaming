"use client";

import Link from "next/link";
import type { Stream } from "@/lib/streaming/types";
import { cn, formatCompact, hueGradient } from "@/lib/format";
import { Badge, LivePip } from "@/components/ui/primitives";

/** "1h 36m" from a minute count. */
export function formatUptime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function StreamCard({ stream }: { stream: Stream }) {
  return (
    <Link
      href={`/live/${stream.id}`}
      className="group block rounded-2xl focus-visible:outline-offset-4"
    >
      {/* Thumbnail — generated, since there is no real frame to grab */}
      <div
        className="relative mb-2 aspect-video overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold-400/45 group-hover:shadow-[0_22px_44px_-20px_var(--color-ember-700)]"
        style={{ background: hueGradient(stream.hues[0], stream.hues[1] - stream.hues[0]) }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-obsidian-950/92 via-obsidian-950/25 to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-8 size-40 rounded-full bg-white/18 blur-3xl"
        />

        {/* Faux capture-card scanlines, so it reads as a video frame */}
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 3px)",
          }}
        />

        <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-live/40 bg-obsidian-950/80 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-widest text-[#ff8a84] backdrop-blur">
          <LivePip />
          Live
        </span>

        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-obsidian-950/80 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-white/85 tnum backdrop-blur">
          {formatCompact(stream.viewers)} watching
        </span>

        {stream.hasCamera && (
          <span className="absolute bottom-2 right-2 rounded-md border border-white/20 bg-obsidian-950/75 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wider text-white/70">
            Face cam
          </span>
        )}

        <span className="absolute inset-x-2 bottom-2 block pr-16">
          <span className="block truncate text-[0.6875rem] font-medium text-white/85">
            {stream.playing}
          </span>
          <span className="block text-[0.5625rem] text-white/45 tnum">
            {formatUptime(stream.uptime)} elapsed
          </span>
        </span>
      </div>

      {/* Meta */}
      <div className="flex gap-2.5 px-0.5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-white ring-1 ring-black/40"
          style={{ background: hueGradient(stream.streamer.avatarHue) }}
        >
          {stream.streamer.displayName.charAt(0)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white/90">{stream.title}</p>
          <p className="flex items-center gap-1 truncate text-[0.625rem] text-white/40">
            {stream.streamer.displayName}
            {stream.streamer.verified && (
              <svg viewBox="0 0 16 16" className="size-2.5 shrink-0 text-gold-300" fill="currentColor" aria-label="Verified">
                <path d="M8 0l2 1.6 2.5-.3.6 2.4 2.2 1.3-1.1 2.3 1.1 2.3-2.2 1.3-.6 2.4-2.5-.3L8 16l-2-1.6-2.5.3-.6-2.4L.7 11l1.1-2.3L.7 6.4 2.9 5.1l.6-2.4L6 3z" />
              </svg>
            )}
            <span aria-hidden="true">·</span>
            {formatCompact(stream.streamer.followers)} followers
          </p>
        </div>

        {stream.topWin !== undefined && stream.topWin > 0 && (
          <span className="shrink-0 self-start rounded-md border border-win/30 bg-win/10 px-1.5 py-0.5 text-[0.5625rem] font-bold text-win tnum">
            {stream.topWin}x
          </span>
        )}
      </div>
    </Link>
  );
}

/** Compact row used in the "up next" rail beside a stream. */
export function StreamRow({ stream }: { stream: Stream }) {
  return (
    <Link
      href={`/live/${stream.id}`}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 p-2",
        "transition-all hover:border-gold-400/25 hover:bg-white/6",
      )}
    >
      <span
        aria-hidden="true"
        className="h-11 w-20 shrink-0 overflow-hidden rounded-lg"
        style={{ background: hueGradient(stream.hues[0], stream.hues[1] - stream.hues[0]) }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.6875rem] font-medium text-white/85">
          {stream.title}
        </span>
        <span className="block truncate text-[0.5625rem] text-white/40 tnum">
          {stream.streamer.displayName} · {formatCompact(stream.viewers)} watching
        </span>
      </span>
      <Badge tone="live">
        <LivePip />
      </Badge>
    </Link>
  );
}
