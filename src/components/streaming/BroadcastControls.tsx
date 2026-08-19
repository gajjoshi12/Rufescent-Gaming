"use client";

import type { useBroadcast } from "@/lib/streaming/useBroadcast";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/primitives";

type Broadcast = ReturnType<typeof useBroadcast>;

/* ---------- Icons ---------- */

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    camera: <path d="M2 5h11v14H2zM15 9.5l7-4v13l-7-4z" />,
    "camera-off": (
      <>
        <path d="M2 5h9.5l9 14H2z" opacity="0.5" />
        <path d="M3 2.5 21.5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    "mic-off": (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" opacity="0.5" />
        <path d="M3 2.5 21.5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    screen: (
      <>
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  };

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* ---------- Control button ---------- */

function ControlButton({
  active,
  danger,
  label,
  icon,
  onClick,
  disabled,
}: {
  active?: boolean;
  danger?: boolean;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
        danger
          ? "border-loss/40 bg-loss/15 text-loss hover:bg-loss/25"
          : active
            ? "border-gold-400/50 bg-gold-400/15 text-gold-200"
            : "border-white/12 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90",
      )}
    >
      <Icon name={icon} className="size-4" />
      <span className="text-[0.5625rem] font-medium">{label}</span>
    </button>
  );
}

/* ---------- Panel ---------- */

export function BroadcastControls({ broadcast }: { broadcast: Broadcast }) {
  const {
    state,
    supported,
    ready,
    cameraStream,
    screenStream,
    cameras,
    cameraId,
    startCamera,
    stopCamera,
    startScreenShare,
    stopScreenShare,
    toggleCamera,
    toggleMic,
    switchCamera,
    dismissError,
  } = broadcast;

  const cameraOn = Boolean(cameraStream);
  const screenOn = Boolean(screenStream);

  // Until the mount-gated check resolves, render nothing rather than
  // claiming the browser cannot capture — that text would otherwise be
  // the server-rendered HTML on every page load.
  if (!ready) return <div className="h-12" aria-hidden="true" />;

  if (!supported) {
    return (
      <div className="rounded-xl border border-loss/30 bg-loss/10 p-4 text-xs leading-relaxed text-loss">
        This browser cannot capture camera or screen. Media capture needs a modern browser on a
        secure (HTTPS) connection.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-loss/30 bg-loss/10 p-3"
        >
          <p className="text-[0.6875rem] leading-relaxed text-loss">{state.error}</p>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss error"
            className="shrink-0 text-loss/60 transition-colors hover:text-loss"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Primary sources */}
      <div className="flex gap-2">
        {cameraOn ? (
          <>
            <ControlButton
              label={state.cameraEnabled ? "Camera on" : "Camera off"}
              icon={state.cameraEnabled ? "camera" : "camera-off"}
              active={state.cameraEnabled}
              onClick={toggleCamera}
            />
            <ControlButton
              label={state.micEnabled ? "Mic on" : "Muted"}
              icon={state.micEnabled ? "mic" : "mic-off"}
              active={state.micEnabled}
              onClick={toggleMic}
              disabled={state.microphone !== "granted"}
            />
          </>
        ) : (
          <ControlButton
            label={state.camera === "requesting" ? "Asking…" : "Start camera"}
            icon="camera"
            onClick={() => startCamera()}
            disabled={state.camera === "requesting"}
          />
        )}

        <ControlButton
          label={
            screenOn ? "Stop share" : state.screen === "requesting" ? "Choose…" : "Share screen"
          }
          icon={screenOn ? "stop" : "screen"}
          active={screenOn}
          danger={screenOn}
          onClick={screenOn ? stopScreenShare : startScreenShare}
          disabled={state.screen === "requesting"}
        />
      </div>

      {/* Device picker — labels only populate after a grant */}
      {cameraOn && cameras.length > 1 && (
        <div>
          <label
            htmlFor="camera-select"
            className="mb-1 block text-[0.625rem] uppercase tracking-wider text-white/35"
          >
            Camera
          </label>
          <select
            id="camera-select"
            value={cameraId ?? ""}
            onChange={(e) => void switchCamera(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/12 bg-obsidian-900/70 px-3 text-xs text-white outline-none transition-colors hover:border-white/25 focus:border-gold-400/50"
          >
            {cameras.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {cameraOn && (
        <Button variant="subtle" size="sm" fullWidth onClick={stopCamera}>
          Turn off camera and microphone
        </Button>
      )}

      <p className="text-[0.625rem] leading-relaxed text-white/30">
        Nothing leaves your device. Capture runs entirely in your browser — broadcasting to viewers
        would need a media server, which this build does not have.
      </p>
    </div>
  );
}
