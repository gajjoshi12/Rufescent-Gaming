import { cn } from "@/lib/format";

/**
 * Rufescent monogram — an ember-cut "R" inside a beveled shield.
 * Drop a replacement at /public/logo.svg and swap <Mark> for an <img>
 * if you want to use supplied artwork instead.
 */
export function Mark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ruf-shield" x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f95d51" />
          <stop offset="0.48" stopColor="#c01d1a" />
          <stop offset="1" stopColor="#430a0e" />
        </linearGradient>
        <linearGradient id="ruf-gold" x1="14" y1="10" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe08a" />
          <stop offset="0.5" stopColor="#f5b418" />
          <stop offset="1" stopColor="#ad7003" />
        </linearGradient>
        <linearGradient id="ruf-sheen" x1="10" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M24 1.6 6.4 8.2v14.4c0 10.6 7.1 20.2 17.6 23.8 10.5-3.6 17.6-13.2 17.6-23.8V8.2L24 1.6Z"
        fill="url(#ruf-shield)"
      />
      <path
        d="M24 1.6 6.4 8.2v14.4c0 10.6 7.1 20.2 17.6 23.8 10.5-3.6 17.6-13.2 17.6-23.8V8.2L24 1.6Z"
        stroke="url(#ruf-gold)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M24 1.6 6.4 8.2v14.4c0 4.2 1.1 8.3 3.1 11.9L24 1.6Z" fill="url(#ruf-sheen)" />

      {/* R */}
      <path
        d="M17.4 35.4V13h9.4c4.6 0 7.5 2.6 7.5 6.7 0 3-1.6 5.2-4.3 6.2l5 9.5h-5.3l-4.3-8.6h-3.3v8.6h-4.7Zm4.7-12.5h4.2c2.1 0 3.4-1.1 3.4-2.9 0-1.8-1.3-2.9-3.4-2.9h-4.2v5.8Z"
        fill="url(#ruf-gold)"
      />
    </svg>
  );
}

export function Wordmark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-gilt">
          RUFESCENT
        </span>
        <span className="mt-0.5 text-[0.5rem] font-medium uppercase tracking-[0.32em] text-ember-200/60">
          Gaming
        </span>
      </span>
    </span>
  );
}
