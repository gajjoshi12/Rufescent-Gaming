"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptureState, DeviceOption } from "./types";
import { useMounted } from "@/lib/hooks";

/**
 * Real media capture for the broadcast studio.
 *
 * getUserMedia and getDisplayMedia are genuinely available in the browser,
 * so camera, microphone and screen capture all work here for real. What is
 * NOT here is transport: sending these tracks to a viewer needs an SFU
 * (LiveKit, Mux, Agora) or an RTMP ingest. `cameraStream` and `screenStream`
 * are exactly what you would hand to `RTCPeerConnection.addTrack`, so that
 * is the single seam a real backend plugs into.
 *
 * Both APIs require a secure context — HTTPS or localhost.
 */

const INITIAL: CaptureState = {
  camera: "idle",
  screen: "idle",
  microphone: "idle",
  cameraEnabled: true,
  micEnabled: true,
  error: null,
};

/** Turn a DOMException from the media APIs into something a person can act on. */
function describeError(err: unknown, what: string): string {
  const name = err instanceof DOMException ? err.name : "";
  const lower = what.toLowerCase();
  switch (name) {
    case "NotAllowedError":
      return `${what} permission was blocked. Allow it in your browser site settings, then try again.`;
    case "NotFoundError":
      return `No ${lower} was found on this device.`;
    case "NotReadableError":
      return `Your ${lower} is already in use by another app. Close it and retry.`;
    case "OverconstrainedError":
      return `That ${lower} does not support the requested settings.`;
    case "AbortError":
      return `${what} capture was cancelled.`;
    default:
      return err instanceof Error && err.message
        ? `${what} failed: ${err.message}`
        : `${what} could not be started.`;
  }
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useBroadcast() {
  const [state, setState] = useState<CaptureState>(INITIAL);
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<DeviceOption[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [micId, setMicId] = useState<string | null>(null);

  // Streams live in refs as well as state: cleanup must reach the current
  // tracks without re-running on every render.
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  /**
   * Feature detection has to wait for mount.
   *
   * Reading `navigator` during render makes the server say "unsupported"
   * and the client say "supported", which fails hydration. React then
   * discards the tree and remounts — running this hook's cleanup and
   * stopping the camera the moment it starts. `ready` gates the check so
   * both renders agree, and callers show a neutral state until it flips.
   */
  const ready = useMounted();
  const supported =
    ready && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  /** Device labels stay empty until a permission has been granted once. */
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
      );
      setMicrophones(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
      );
    } catch {
      // Enumeration is best-effort; capture itself still works without it.
    }
  }, []);

  /* ---------- Camera and microphone ---------- */

  const startCamera = useCallback(
    async (opts: { deviceId?: string; withAudio?: boolean } = {}) => {
      if (!supported) {
        setState((s) => ({
          ...s,
          camera: "unsupported",
          error: "This browser cannot capture media.",
        }));
        return;
      }

      setState((s) => ({ ...s, camera: "requesting", error: null }));

      try {
        // Build the video constraints conditionally. Passing an explicit
        // `deviceId: undefined` is not the same as omitting the key —
        // Chrome coerces it to a ConstrainDOMString that matches nothing
        // and rejects with NotFoundError, even when a camera exists.
        const video: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        };
        if (opts.deviceId) video.deviceId = { exact: opts.deviceId };

        const stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio:
            opts.withAudio === false
              ? false
              : { echoCancellation: true, noiseSuppression: true },
        });

        // Replacing an existing capture: stop the old one first, or the
        // device stays held and its indicator light never goes out.
        stopStream(cameraStreamRef.current);
        cameraStreamRef.current = stream;
        setCameraStream(stream);

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        setCameraId(videoTrack?.getSettings().deviceId ?? null);
        setMicId(audioTrack?.getSettings().deviceId ?? null);

        setState((s) => ({
          ...s,
          camera: "granted",
          microphone: audioTrack ? "granted" : s.microphone,
          cameraEnabled: true,
          micEnabled: audioTrack ? true : s.micEnabled,
          error: null,
        }));

        void refreshDevices();
      } catch (err) {
        setState((s) => ({
          ...s,
          camera:
            err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "idle",
          error: describeError(err, "Camera"),
        }));
      }
    },
    [supported, refreshDevices],
  );

  const stopCamera = useCallback(() => {
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    setCameraStream(null);
    setState((s) => ({ ...s, camera: "idle", microphone: "idle" }));
  }, []);

  /* ---------- Screen share ---------- */

  const startScreenShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setState((s) => ({
        ...s,
        screen: "unsupported",
        error: "Screen sharing is not available in this browser.",
      }));
      return;
    }

    setState((s) => ({ ...s, screen: "requesting", error: null }));

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        // Tab audio, where the browser offers it.
        audio: true,
      });

      stopStream(screenStreamRef.current);
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setState((s) => ({ ...s, screen: "granted", error: null }));

      // The browser's own "Stop sharing" bar bypasses our UI entirely, so
      // listen for the track ending and reconcile our state with it.
      const track = stream.getVideoTracks()[0];
      track?.addEventListener(
        "ended",
        () => {
          screenStreamRef.current = null;
          setScreenStream(null);
          setState((s) => ({ ...s, screen: "idle" }));
        },
        { once: true },
      );
    } catch (err) {
      const dismissed =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "AbortError");

      setState((s) => ({
        ...s,
        screen: "idle",
        // Cancelling the picker is a normal action, not an error to surface.
        error: dismissed ? null : describeError(err, "Screen share"),
      }));
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenStream(null);
    setState((s) => ({ ...s, screen: "idle" }));
  }, []);

  /* ---------- Toggles ----------
     Disabling a track keeps the device open and the stream intact, so
     unmuting is instant and never re-prompts for permission. */

  const toggleCamera = useCallback(() => {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setState((s) => ({ ...s, cameraEnabled: track.enabled }));
  }, []);

  const toggleMic = useCallback(() => {
    const track = cameraStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setState((s) => ({ ...s, micEnabled: track.enabled }));
  }, []);

  const switchCamera = useCallback(
    (deviceId: string) => startCamera({ deviceId }),
    [startCamera],
  );

  const dismissError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  /** Release every device when the studio unmounts. */
  useEffect(() => {
    return () => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
      cameraStreamRef.current = null;
      screenStreamRef.current = null;
    };
  }, []);

  /** Keep the device list fresh as hardware is plugged in or removed. */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const handler = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [refreshDevices]);

  const isLive = state.camera === "granted" || state.screen === "granted";

  return {
    state,
    supported,
    ready,
    isLive,
    cameraStream,
    screenStream,
    cameras,
    microphones,
    cameraId,
    micId,
    startCamera,
    stopCamera,
    startScreenShare,
    stopScreenShare,
    toggleCamera,
    toggleMic,
    switchCamera,
    refreshDevices,
    dismissError,
  };
}
