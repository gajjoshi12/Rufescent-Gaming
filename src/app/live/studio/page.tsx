"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StreamCategory } from "@/lib/streaming/types";
import { STREAM_CATEGORIES } from "@/lib/streaming/mock";
import { useBroadcast } from "@/lib/streaming/useBroadcast";
import { useLiveChat, useViewerCount } from "@/lib/streaming/useLiveChat";
import { cn } from "@/lib/format";
import { Section, Shell } from "@/components/layout/Shell";
import { SubBar } from "@/components/layout/TopBar";
import { Badge, Button, Field, Input, LivePip, StatTile } from "@/components/ui/primitives";
import { StreamStage } from "@/components/streaming/StreamStage";
import { BroadcastControls } from "@/components/streaming/BroadcastControls";
import { ChatPanel } from "@/components/streaming/ChatPanel";

/** Elapsed broadcast time, started when the user hits "Go live". */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running) return;
    const id = setTimeout(() => setSeconds(0), 0);
    return () => clearTimeout(id);
  }, [running]);

  return seconds;
}

function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function StudioPage() {
  const broadcast = useBroadcast();
  const [title, setTitle] = useState("Late night slots, come say hi");
  const [category, setCategory] = useState<StreamCategory>("slots");
  const [wantsLive, setWantsLive] = useState(false);

  const hasSource = Boolean(broadcast.cameraStream || broadcast.screenStream);

  // Derived rather than synced: losing every source mid-broadcast ends the
  // stream the same way a real encoder would, without an effect chasing it.
  const live = wantsLive && hasSource;

  const elapsed = useElapsed(live);
  const viewers = useViewerCount(live ? 34 : 0);
  const { messages, send, tip } = useLiveChat("studio", live ? viewers : 0);

  return (
    <>
      <SubBar
        title="Broadcast studio"
        subtitle={live ? `Live · ${clock(elapsed)}` : "Set up your stream"}
        backHref="/live"
        action={
          live ? (
            <Badge tone="live">
              <LivePip />
              On air
            </Badge>
          ) : undefined
        }
      />

      <Shell slip={false} sidebar={false}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          {/* ---------- Stage ---------- */}
          <div className="min-w-0 space-y-4">
            <StreamStage
              screenStream={broadcast.screenStream}
              cameraStream={broadcast.cameraStream}
              cameraEnabled={broadcast.state.cameraEnabled}
              placeholderHues={[12, 44]}
              placeholderLabel="Turn on your camera or share a screen to see your preview here."
              live={live}
            >
              {live && (
                <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-obsidian-950/80 px-2.5 py-1 text-[0.625rem] font-semibold text-white/85 tnum backdrop-blur">
                  {viewers} watching · {clock(elapsed)}
                </span>
              )}
            </StreamStage>

            <Section aria-label="Capture controls" className="mb-0">
              <BroadcastControls broadcast={broadcast} />
            </Section>

            {/* Go live */}
            <div className="glass rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stream title" htmlFor="stream-title">
                  <Input
                    id="stream-title"
                    value={title}
                    maxLength={80}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What are you playing?"
                  />
                </Field>

                <div>
                  <label
                    htmlFor="stream-category"
                    className="mb-1.5 block text-xs font-medium text-white/65"
                  >
                    Category
                  </label>
                  <select
                    id="stream-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StreamCategory)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-obsidian-900/70 px-3.5 text-sm text-white outline-none transition-colors hover:border-white/18 focus:border-gold-400/50"
                  >
                    {STREAM_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant={live ? "danger" : "gold"}
                  size="lg"
                  disabled={!hasSource || !title.trim()}
                  onClick={() => setWantsLive((v) => !v)}
                >
                  {live ? "End broadcast" : "Go live"}
                </Button>

                {!hasSource && (
                  <p className="text-[0.6875rem] text-white/40">
                    Start a camera or share your screen first.
                  </p>
                )}
              </div>
            </div>

            {live && (
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="Elapsed" value={clock(elapsed)} />
                <StatTile label="Viewers" value={viewers} tone="gold" />
                <StatTile
                  label="Sources"
                  value={
                    (broadcast.cameraStream ? 1 : 0) + (broadcast.screenStream ? 1 : 0)
                  }
                  hint={broadcast.screenStream ? "Screen + camera" : "Camera only"}
                />
              </div>
            )}

            <p className="text-center text-[0.6875rem] leading-relaxed text-white/30">
              Capture is real and runs entirely on your device. Broadcasting to an audience needs a
              media server, so the viewers and chat here are simulated.{" "}
              <Link
                href="/responsible-gambling#limits"
                className="text-gold-300/70 underline-offset-2 hover:underline"
              >
                Set a session limit
              </Link>
            </p>
          </div>

          {/* ---------- Chat ---------- */}
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
