"use client";

import { BetSlipProvider } from "@/store/bet-slip";
import { LiveOddsProvider } from "@/store/live-odds";
import { OddsFormatProvider } from "@/store/odds-format";
import { SessionProvider } from "@/store/session";

/**
 * Client-side context stack. Ordering matters: the bet slip reads the
 * session (for balance checks) and the odds format, so it nests innermost.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OddsFormatProvider>
        <LiveOddsProvider>
          <BetSlipProvider>{children}</BetSlipProvider>
        </LiveOddsProvider>
      </OddsFormatProvider>
    </SessionProvider>
  );
}
