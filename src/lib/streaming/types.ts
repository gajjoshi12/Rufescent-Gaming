/** Live streaming domain model. */

export type StreamCategory = "slots" | "poker" | "sports" | "originals" | "casino";

export interface Streamer {
  id: string;
  handle: string;
  displayName: string;
  avatarHue: number;
  followers: number;
  /** Verified broadcasters get a mark next to the handle. */
  verified?: boolean;
  country: string;
}

export interface Stream {
  id: string;
  streamer: Streamer;
  title: string;
  category: StreamCategory;
  /** Game or market the broadcaster is playing. */
  playing: string;
  viewers: number;
  /** Minutes elapsed since the stream started. */
  uptime: number;
  /** Hue pair used to generate the thumbnail, since there is no artwork. */
  hues: [number, number];
  /** Biggest multiplier hit this session, shown as a badge. */
  topWin?: number;
  tags: string[];
  /** Broadcaster has their camera on as well as their screen. */
  hasCamera: boolean;
}

export type ChatKind = "message" | "win" | "tip" | "system" | "follow";

export interface ChatMessage {
  id: string;
  kind: ChatKind;
  author: string;
  authorHue: number;
  body: string;
  /** Seconds since the stream started, so ordering is stable. */
  at: number;
  /** Tip amount in credits, tip messages only. */
  amount?: number;
  isYou?: boolean;
  /** Broadcaster's own messages get a badge. */
  isHost?: boolean;
}

/* ---------- Broadcast studio ---------- */

export type MediaKind = "camera" | "screen" | "microphone";

export type PermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export interface DeviceOption {
  deviceId: string;
  label: string;
}

/** What the studio is currently capturing. */
export interface CaptureState {
  camera: PermissionState;
  screen: PermissionState;
  microphone: PermissionState;
  cameraEnabled: boolean;
  micEnabled: boolean;
  /** Human-readable reason a capture failed, for the error banner. */
  error: string | null;
}
