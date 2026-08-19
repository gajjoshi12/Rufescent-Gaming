"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { STREAMS, findStream } from "@/lib/streaming/mock";
import { useLiveChat, useViewerCount } from "@/lib/streaming/useLiveChat";
import { cn, formatCompact, hueGradient } from "@/lib/format";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import { Badge, Button, LivePip } from "@/components/ui/primitives";
import { StreamStage } from "@/components/streaming/StreamStage";
import { ChatPanel } from "@/components/streaming/ChatPanel";
import { StreamRow, formatUptime } from "@/components/streaming/StreamCard";

export default function WatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = use(params);
  const stream = findStream(streamId);
  if (!stream) notFound();
  return <WatchView streamId={streamId} />;
}

function WatchView({ streamId }: { streamId: string }) {
  const stream = findStream(streamId)!;
  const viewers = useViewerCount(stream.viewers);
  const { messages, send, tip } = useLiveChat(streamId, stream.viewers);
  const [following, setFollowing] = useState(false);

  const others = STREAMS.filter((s) => s.id !== streamId).slice(0, 5);

  return (
    <>
      <SubBar
        title={stream.title}
        subtitle={`${stream.streamer.displayName} · ${stream.playing}`}
        backHref="/live"
        action={
          <Badge tone="live">
            <LivePip />
            {formatCompact(viewers)}
          </Badge>
        }
      />

      <Shell slip={false} sidebar={false}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <div className="min-w-0 space-y-4">
            {/* There is no inbound media without a server, so the stage
                renders its generated placeholder for a remote channel. */}
            <StreamStage
              screenStream={null}
              cameraStream={null}
              placeholderHues={stream.hues}
              placeholderLabel={`${stream.streamer.displayName} is playing ${stream.playing}. Live video needs a media server, which this build does not run — chat and presence below are simulated.`}
              live
            >
              <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-obsidian-950/80 px-2.5 py-1 text-[0.625rem] font-semibold text-white/85 tnum backdrop-blur">
                {formatCompact(viewers)} watching · {formatUptime(stream.uptime)}
              </span>
            </StreamStage>

            {/* Channel bar */}
            <div className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white ring-1 ring-black/40"
                  style={{ background: hueGradient(stream.streamer.avatarHue) }}
                >
                  {stream.streamer.displayName.charAt(0)}
                </span>

                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold text-white">{stream.title}</h1>
                  <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-white/45">
                    <span className="font-medium text-white/70">
                      {stream.streamer.displayName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tnum">
                      {formatCompact(stream.streamer.followers + (following ? 1 : 0))} followers
                    </span>
                    <span aria-hidden="true">·</span>
                    <Link
                      href="/casino"
                      className="text-gold-300 underline-offset-2 hover:underline"
                    >
                      {stream.playing}
                    </Link>
                  </p>
                </div>

                <Button
                  variant={following ? "subtle" : "gold"}
                  size="sm"
                  onClick={() => setFollowing((f) => !f)}
                >
                  {following ? "Following" : "Follow"}
                </Button>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Stream tags">
                {stream.tags.map((tag) => (
                  <li key={tag}>
                    <Badge>{tag}</Badge>
                  </li>
                ))}
                {stream.topWin !== undefined && stream.topWin > 0 && (
                  <li>
                    <Badge tone="win">Top win {stream.topWin}x</Badge>
                  </li>
                )}
              </ul>
            </div>

            {/* Up next */}
            <Section aria-label="Other channels" className="mb-0">
              <h2 className="mb-2 text-sm font-semibold">Up next</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {others.map((other) => (
                  <StreamRow key={other.id} stream={other} />
                ))}
              </div>
            </Section>

            <div className="rounded-2xl border border-gold-400/20 bg-gold-700/8 p-4">
              <p className="text-xs leading-relaxed text-white/55">
                Streams show one person&rsquo;s session, edited by nothing but luck. Big wins get
                clipped and shared; the hours between them rarely do.{" "}
                <Link
                  href="/responsible-gambling"
                  className="font-medium text-gold-300 underline-offset-2 hover:underline"
                >
                  Keep your own limits in mind
                </Link>
                .
              </p>
            </div>

            <p className="text-center text-[0.6875rem] text-white/30">
              Want to broadcast?{" "}
              <Link href="/live/studio" className="text-gold-300 underline-offset-2 hover:underline">
                Open the studio
              </Link>{" "}
              — camera and screen capture work for real.
            </p>
          </div>

          <ChatPanel
            messages={messages}
            onSend={send}
            onTip={tip}
            viewers={viewers}
            className={cn("h-[28rem] xl:sticky xl:top-24 xl:h-[calc(100dvh-9rem)]")}
          />
        </div>
      </Shell>
    </>
  );
}
