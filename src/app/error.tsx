"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real deployment this is where the error would go to Sentry et al.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 pb-[var(--shell-pad-bottom)] text-center"
    >
      <span aria-hidden="true" className="text-4xl">
        ⚠
      </span>
      <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        We couldn&rsquo;t load this part of the platform. No bets or balances were affected.
      </p>
      {error.digest && (
        <p className="mt-2 text-[0.6875rem] text-white/25">Reference: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button variant="gold" onClick={reset}>
          Try again
        </Button>
        <LinkButton href="/" variant="subtle">
          Back home
        </LinkButton>
      </div>
    </main>
  );
}
