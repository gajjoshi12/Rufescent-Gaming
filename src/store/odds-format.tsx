"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { OddsFormat } from "@/lib/types";
import { formatOdds } from "@/lib/format";
import { usePersistentState } from "@/lib/hooks";

interface OddsFormatValue {
  format: OddsFormat;
  setFormat: (format: OddsFormat) => void;
  cycle: () => void;
  /** Render a decimal price in the viewer's chosen notation. */
  render: (decimal: number) => string;
  hydrated: boolean;
}

const OddsFormatContext = createContext<OddsFormatValue | null>(null);

export const ODDS_FORMATS: { key: OddsFormat; label: string; example: string }[] = [
  { key: "decimal", label: "Decimal", example: "2.50" },
  { key: "fractional", label: "Fractional", example: "6/4" },
  { key: "american", label: "American", example: "+150" },
];

export function OddsFormatProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormat, hydrated] = usePersistentState<OddsFormat>("ruf.oddsFormat", "decimal");

  const cycle = useCallback(() => {
    setFormat((current) => {
      const index = ODDS_FORMATS.findIndex((f) => f.key === current);
      return ODDS_FORMATS[(index + 1) % ODDS_FORMATS.length].key;
    });
  }, [setFormat]);

  const render = useCallback((decimal: number) => formatOdds(decimal, format), [format]);

  const value = useMemo(
    () => ({ format, setFormat, cycle, render, hydrated }),
    [format, setFormat, cycle, render, hydrated],
  );

  return <OddsFormatContext.Provider value={value}>{children}</OddsFormatContext.Provider>;
}

export function useOddsFormat(): OddsFormatValue {
  const ctx = useContext(OddsFormatContext);
  if (!ctx) throw new Error("useOddsFormat must be used inside <OddsFormatProvider>");
  return ctx;
}
