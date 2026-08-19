"use client";

import { useEffect, useRef, useState } from "react";
import { cn, hueGradient } from "@/lib/format";
import { LivePip } from "@/components/ui/primitives";

/**
 * Attaches a MediaStream to a video element.
 *
 * `srcObject` cannot be expressed in JSX, so it has to be assigned through
 * a ref. Playback is kicked off manually because autoplay only survives
 * when the element is muted, and a rejected play() promise is normal when
 * the element unmounts mid-call.
 */
function useStreamRef(stream: MediaStream | null) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return ref;
}

export function VideoSurface({
  stream,
  muted = true,
  mirrored,
  className,
  label,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  /** Front-facing camera previews read correctly when flipped. */
  mirrored?: boolean;
  className?: string;
  label: string;
}) {
  const ref = useStreamRef(stream);

  return (
    <video
      ref={ref}
      muted={muted}
      playsInline
      autoPlay
      aria-label={label}
      className={cn("size-full object-cover", mirrored && "-scale-x-100", className)}
    />
  );
}

/**
 * The composited broadcast view: screen share fills the frame with the
 * camera inset over it, which is the layout viewers expect from a gameplay
 * stream. With only one source, that source fills the frame.
 */
export function StreamStage({
  screenStream,
  cameraStream,
  cameraEnabled,
  placeholderHues,
  placeholderLabel,
  live,
  children,
}: {
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
  cameraEnabled?: boolean;
  /** Used to generate art when there is nothing to show yet. */
  placeholderHues: [number, number];
  placeholderLabel: string;
  live?: boolean;
  children?: React.ReactNode;
}) {
  const [pipCorner, setPipCorner] = useState<"br" | "bl" | "tr" | "tl">("br");
  const hasScreen = Boolean(screenStream);
  const hasCamera = Boolean(cameraStream) && cameraEnabled !== false;

  const corners = {
    br: "bottom-3 right-3",
    bl: "bottom-3 left-3",
    tr: "top-3 right-3",
    tl: "top-3 left-3",
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-obsidian-950">
      {/* Primary surface */}
      {hasScreen ? (
        <VideoSurface stream={screenStream} label="Shared screen" className="object-contain" />
      ) : hasCamera ? (
        <VideoSurface stream={cameraStream} mirrored label="Your camera" />
      ) : (
        <StagePlaceholder hues={placeholderHues} label={placeholderLabel} />
      )}

      {/* Camera inset, only when the screen already owns the frame */}
      {hasScreen && hasCamera && (
        <button
          type="button"
          onClick={() =>
            setPipCorner((c) => (c === "br" ? "bl" : c === "bl" ? "tl" : c === "tl" ? "tr" : "br"))
          }
          aria-label="Move camera inset to the next corner"
          className={cn(
            "absolute z-10 w-1/4 min-w-28 max-w-56 overflow-hidden rounded-xl border-2 border-white/20",
            "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] transition-all duration-300",
            "hover:border-gold-400/60",
            corners[pipCorner],
          )}
        >
          <span className="block aspect-video">
            <VideoSurface stream={cameraStream} mirrored label="Your camera" />
          </span>
        </button>
      )}

      {/* Camera muted but screen running */}
      {hasScreen && cameraStream && cameraEnabled === false && (
        <div
          className={cn(
            "absolute z-10 grid w-1/4 min-w-28 max-w-56 place-items-center rounded-xl border-2 border-white/15 bg-obsidian-900/90 aspect-video",
            corners[pipCorner],
          )}
        >
          <span className="text-[0.625rem] uppercase tracking-widest text-white/40">
            Camera off
          </span>
        </div>
      )}

      {live && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-live/40 bg-obsidian-950/80 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#ff8a84] backdrop-blur">
          <LivePip />
          Live
        </span>
      )}

      {children}
    </div>
  );
}

function StagePlaceholder({ hues, label }: { hues: [number, number]; label: string }) {
  return (
    <div
      className="relative grid size-full place-items-center"
      style={{ background: hueGradient(hues[0], hues[1] - hues[0]) }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-obsidian-950/90 via-obsidian-950/40 to-transparent"
      />
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-10 size-52 rounded-full bg-white/15 blur-3xl"
      />
      <p className="relative px-6 text-center text-sm text-white/70">{label}</p>
    </div>
  );
}
