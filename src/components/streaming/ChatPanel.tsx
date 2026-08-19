"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/streaming/types";
import { cn, formatCompact, hueGradient } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";

const TIP_PRESETS = [5, 25, 100];

const KIND_STYLE: Record<ChatMessage["kind"], string> = {
  message: "",
  win: "rounded-lg border border-win/25 bg-win/8 px-2 py-1.5",
  tip: "rounded-lg border border-gold-400/30 bg-gold-400/10 px-2 py-1.5",
  follow: "rounded-lg border border-ember-400/25 bg-ember-500/8 px-2 py-1.5",
  system: "text-white/35 italic",
};

export function ChatPanel({
  messages,
  onSend,
  onTip,
  viewers,
  className,
}: {
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onTip: (amount: number) => void;
  viewers: number;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [pinned, setPinned] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the tail only while the reader is already at the bottom, so
  // scrolling up to read something does not yank them back down.
  useEffect(() => {
    if (!pinned) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pinned]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setPinned(atBottom);
  }

  return (
    <section
      aria-label="Stream chat"
      className={cn("glass flex min-h-0 flex-col rounded-2xl", className)}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3.5 py-2.5">
        <h2 className="text-sm font-semibold">Chat</h2>
        <span className="flex items-center gap-1 text-[0.6875rem] text-white/40 tnum">
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true">
            <path d="M8 3C4.5 3 1.7 5.1 1 8c.7 2.9 3.5 5 7 5s6.3-2.1 7-5c-.7-2.9-3.5-5-7-5Zm0 8a3 3 0 110-6 3 3 0 010 6Z" />
          </svg>
          {formatCompact(viewers)}
        </span>
      </header>

      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5"
      >
        {messages.map((message) => (
          <ChatLine key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>

      {!pinned && (
        <button
          type="button"
          onClick={() => {
            setPinned(true);
            endRef.current?.scrollIntoView({ block: "nearest" });
          }}
          className="mx-3 mb-1 shrink-0 rounded-lg bg-ember-600/80 py-1 text-[0.6875rem] font-medium text-white"
        >
          Jump to newest
        </button>
      )}

      <div className="shrink-0 border-t border-white/8 p-2.5">
        <div className="mb-2 flex gap-1.5">
          {TIP_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onTip(amount)}
              className="flex-1 rounded-lg border border-gold-400/25 bg-gold-400/8 py-1 text-[0.6875rem] font-semibold text-gold-200 transition-colors hover:bg-gold-400/18 tnum"
            >
              Tip {amount}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend(draft);
            setDraft("");
          }}
          className="flex gap-1.5"
        >
          <label htmlFor="chat-input" className="sr-only">
            Send a chat message
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say something…"
            maxLength={200}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-lg border border-white/12 bg-obsidian-950/60 px-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold-400/50"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 rounded-lg bg-linear-to-br from-ember-400 to-ember-600 px-3 text-xs font-semibold text-white transition-opacity disabled:opacity-35"
          >
            Send
          </button>
        </form>

        <p className="mt-1.5 text-center text-[0.5625rem] text-white/25">
          Be decent. Harassment and stake-shaming get you muted.
        </p>
      </div>
    </section>
  );
}

function ChatLine({ message }: { message: ChatMessage }) {
  const isEvent = message.kind !== "message";

  return (
    <div className={cn("text-[0.6875rem] leading-relaxed", KIND_STYLE[message.kind])}>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          aria-hidden="true"
          className="inline-block size-3 shrink-0 translate-y-0.5 rounded-full"
          style={{ background: hueGradient(message.authorHue) }}
        />
        <span
          className={cn(
            "font-semibold",
            message.isYou ? "text-gold-200" : message.isHost ? "text-ember-300" : "text-white/75",
          )}
        >
          {message.author}
        </span>
        {message.isHost && <Badge tone="ember">Host</Badge>}

        {isEvent ? (
          <span
            className={cn(
              "font-medium",
              message.kind === "win"
                ? "text-win"
                : message.kind === "tip"
                  ? "text-gold-200"
                  : "text-ember-200",
            )}
          >
            {message.body}
            {message.amount !== undefined && (
              <span className="ml-1 font-bold tnum">AED&nbsp;{message.amount}</span>
            )}
          </span>
        ) : (
          <span className="text-white/60">{message.body}</span>
        )}
      </span>
    </div>
  );
}
