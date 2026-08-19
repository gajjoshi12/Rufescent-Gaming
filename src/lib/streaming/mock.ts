/**
 * Streaming fixtures: who is live, what they are playing, and the chat
 * that runs alongside. Seeded so the lobby renders identically on the
 * server and on first paint.
 */

import type { ChatMessage, Stream, StreamCategory, Streamer } from "./types";
import { hashCode, seeded } from "@/lib/format";

const STREAMERS: Streamer[] = [
  { id: "sr-01", handle: "@emberking", displayName: "Ember King", avatarHue: 14, followers: 48_200, verified: true, country: "AE" },
  { id: "sr-02", handle: "@nadiaplays", displayName: "Nadia", avatarHue: 292, followers: 21_450, verified: true, country: "AE" },
  { id: "sr-03", handle: "@thefolder", displayName: "The Folder", avatarHue: 152, followers: 9_820, country: "GB" },
  { id: "sr-04", handle: "@reelrunner", displayName: "Reel Runner", avatarHue: 44, followers: 33_100, verified: true, country: "IN" },
  { id: "sr-05", handle: "@coldcaller", displayName: "Cold Caller", avatarHue: 206, followers: 5_640, country: "SE" },
  { id: "sr-06", handle: "@sultana", displayName: "Sultana", avatarHue: 322, followers: 15_900, country: "AE" },
  { id: "sr-07", handle: "@bankrollbilal", displayName: "Bilal", avatarHue: 96, followers: 7_310, country: "PK" },
  { id: "sr-08", handle: "@quietgrind", displayName: "Quiet Grind", avatarHue: 250, followers: 2_980, country: "DE" },
];

interface StreamSeed {
  id: string;
  streamerIndex: number;
  title: string;
  category: StreamCategory;
  playing: string;
  viewers: number;
  uptime: number;
  hues: [number, number];
  topWin?: number;
  tags: string[];
  hasCamera: boolean;
}

const SEEDS: StreamSeed[] = [
  {
    id: "st-01", streamerIndex: 0, title: "Bonus hunt night — 20 buys, all on camera",
    category: "slots", playing: "Ember Fortune", viewers: 3_412, uptime: 96,
    hues: [12, 44], topWin: 842, tags: ["Bonus hunt", "Face cam", "AED stakes"], hasCamera: true,
  },
  {
    id: "st-02", streamerIndex: 1, title: "Final table run — 9 left, AED 10M pool",
    category: "poker", playing: "Gilded Final Table", viewers: 5_890, uptime: 214,
    hues: [292, 330], topWin: 0, tags: ["Poker", "Final table", "Delayed cards"], hasCamera: true,
  },
  {
    id: "st-03", streamerIndex: 3, title: "Aviator only — chasing a 500x",
    category: "originals", playing: "Ember Aviator", viewers: 2_140, uptime: 41,
    hues: [8, 40], topWin: 268, tags: ["Crash", "Provably fair", "High risk"], hasCamera: true,
  },
  {
    id: "st-04", streamerIndex: 2, title: "Cricket in-play trading, screen shared",
    category: "sports", playing: "IND v AUS · T20", viewers: 1_733, uptime: 58,
    hues: [150, 190], tags: ["In-play", "Exchange", "Screen share"], hasCamera: false,
  },
  {
    id: "st-05", streamerIndex: 5, title: "Mines 5-tile challenge, no cam today",
    category: "originals", playing: "Molten Mines", viewers: 906, uptime: 22,
    hues: [322, 350], topWin: 64, tags: ["Mines", "Strategy"], hasCamera: false,
  },
  {
    id: "st-06", streamerIndex: 4, title: "Low stakes, long session, good company",
    category: "casino", playing: "Blackjack Surrender", viewers: 512, uptime: 173,
    hues: [206, 240], tags: ["Chill", "Low stakes", "Face cam"], hasCamera: true,
  },
  {
    id: "st-07", streamerIndex: 6, title: "Sultan's Vault until the free spins hit",
    category: "slots", playing: "Sultan's Vault", viewers: 1_284, uptime: 67,
    hues: [268, 300], topWin: 121, tags: ["Slots", "Free spins"], hasCamera: true,
  },
  {
    id: "st-08", streamerIndex: 7, title: "Sunday accumulator build — talk me out of it",
    category: "sports", playing: "Premier League", viewers: 348, uptime: 12,
    hues: [250, 200], tags: ["Accumulator", "Screen share"], hasCamera: false,
  },
];

export const STREAMS: Stream[] = SEEDS.map((seed) => ({
  id: seed.id,
  streamer: STREAMERS[seed.streamerIndex],
  title: seed.title,
  category: seed.category,
  playing: seed.playing,
  viewers: seed.viewers,
  uptime: seed.uptime,
  hues: seed.hues,
  topWin: seed.topWin,
  tags: seed.tags,
  hasCamera: seed.hasCamera,
}));

export function findStream(id: string): Stream | undefined {
  return STREAMS.find((s) => s.id === id);
}

export function streamsByCategory(category?: StreamCategory): Stream[] {
  return category ? STREAMS.filter((s) => s.category === category) : STREAMS;
}

export const STREAM_CATEGORIES: { key: StreamCategory; label: string; icon: string }[] = [
  { key: "slots", label: "Slots", icon: "🎰" },
  { key: "poker", label: "Poker", icon: "♠" },
  { key: "originals", label: "Originals", icon: "◆" },
  { key: "sports", label: "Sports", icon: "⚽" },
  { key: "casino", label: "Casino", icon: "🎲" },
];

/* ============================================================
   Chat

   A believable rolling chat. Lines are drawn from a seeded pool
   rather than written per stream, so any stream has traffic
   without eight hand-authored transcripts.
   ============================================================ */

const CHATTERS: [string, number][] = [
  ["hamdan_97", 18], ["riya.k", 300], ["MaxBetMo", 96], ["quietfold", 210],
  ["tilted", 355], ["greenfelt", 140], ["one_more_spin", 40], ["Aisha", 268],
  ["nolimit", 8], ["dubaidegen", 172], ["cashoutcarl", 62], ["Zaid", 320],
  ["thin_value", 118], ["bigblindbaby", 236], ["luckylefty", 84],
];

const LINES = [
  "that tilt was criminal", "cash out CASH OUT", "he never folds there",
  "chat is so bad at this", "one more buy then bed", "how is that not a win",
  "the multiplier is cooking", "respect the discipline", "my seed was better ngl",
  "who else is up tonight", "this is the one, I can feel it",
  "please stop chasing", "clip that", "AED well spent honestly",
  "set a limit mate", "screen share is crisp", "what stake is this",
  "GG", "third scatter please", "biggest tilt I have seen all week",
  "that RTP is not real", "he actually hit it", "bankroll management who",
  "chat carried that decision", "up early for this", "new follower here, hi",
];

const WIN_LINES = [
  "hit a 268x on the last round", "free spins landed, 42x",
  "flopped a set and got paid", "cashed at 12.4x",
  "five of a kind, finally", "took down the side pot",
];

/**
 * Build a deterministic opening backlog for a stream, then let
 * `useLiveChat` append to it on a timer.
 */
export function seedChat(streamId: string, count = 22): ChatMessage[] {
  const rng = seeded(hashCode(streamId));
  const out: ChatMessage[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    const [author, hue] = CHATTERS[Math.floor(rng() * CHATTERS.length)];
    const at = Math.round(i * (6 + rng() * 9));

    if (roll > 0.93) {
      out.push({
        id: `${streamId}-c${i}`,
        kind: "tip",
        author,
        authorHue: hue,
        body: "sent a tip",
        amount: [5, 10, 25, 50, 100][Math.floor(rng() * 5)],
        at,
      });
    } else if (roll > 0.86) {
      out.push({
        id: `${streamId}-c${i}`,
        kind: "win",
        author,
        authorHue: hue,
        body: WIN_LINES[Math.floor(rng() * WIN_LINES.length)],
        at,
      });
    } else if (roll > 0.82) {
      out.push({
        id: `${streamId}-c${i}`,
        kind: "follow",
        author,
        authorHue: hue,
        body: "followed the channel",
        at,
      });
    } else {
      out.push({
        id: `${streamId}-c${i}`,
        kind: "message",
        author,
        authorHue: hue,
        body: LINES[Math.floor(rng() * LINES.length)],
        at,
      });
    }
  }

  return out;
}

/** One more chat line, used by the ticking hook. Never called during render. */
export function nextChatMessage(streamId: string, sequence: number): ChatMessage {
  const rng = seeded(hashCode(`${streamId}:${sequence}`));
  const roll = rng();
  const [author, hue] = CHATTERS[Math.floor(rng() * CHATTERS.length)];

  const kind: ChatMessage["kind"] =
    roll > 0.94 ? "tip" : roll > 0.88 ? "win" : roll > 0.85 ? "follow" : "message";

  return {
    id: `${streamId}-live-${sequence}`,
    kind,
    author,
    authorHue: hue,
    body:
      kind === "tip"
        ? "sent a tip"
        : kind === "follow"
          ? "followed the channel"
          : kind === "win"
            ? WIN_LINES[Math.floor(rng() * WIN_LINES.length)]
            : LINES[Math.floor(rng() * LINES.length)],
    amount: kind === "tip" ? [5, 10, 25, 50, 100][Math.floor(rng() * 5)] : undefined,
    at: 1000 + sequence,
  };
}
