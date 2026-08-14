"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { KycStatus, ResponsibleLimits, User } from "@/lib/types";
import { CURRENT_USER, DEFAULT_LIMITS } from "@/lib/mock/wallet";
import { usePersistentState } from "@/lib/hooks";

interface SessionValue {
  user: User;
  signedIn: boolean;
  /** Age gate is separate from auth — it blocks the whole site until answered. */
  ageConfirmed: boolean;
  ageGateReady: boolean;
  limits: ResponsibleLimits;
  /** Minutes elapsed in this session, used for reality-check prompts. */
  sessionMinutes: number;
  realityCheckDue: boolean;

  signIn: () => void;
  signOut: () => void;
  confirmAge: () => void;
  declineAge: () => void;
  ageDeclined: boolean;

  adjust: (delta: number) => void;
  setKycStatus: (status: KycStatus) => void;
  updateLimits: (patch: Partial<ResponsibleLimits>) => void;
  acknowledgeRealityCheck: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(CURRENT_USER);
  const [signedIn, setSignedIn] = usePersistentState<boolean>("ruf.signedIn", true);
  const [ageConfirmed, setAgeConfirmed, ageGateReady] = usePersistentState<boolean>(
    "ruf.ageConfirmed",
    false,
  );
  const [ageDeclined, setAgeDeclined] = useState(false);
  const [limits, setLimits] = usePersistentState<ResponsibleLimits>("ruf.limits", DEFAULT_LIMITS);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [checkAcknowledgedAt, setCheckAcknowledgedAt] = useState(0);

  // Session clock. Real platforms are required to surface elapsed play time.
  useEffect(() => {
    const id = setInterval(() => setSessionMinutes((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const realityCheckDue =
    limits.realityCheckMinutes > 0 &&
    sessionMinutes - checkAcknowledgedAt >= limits.realityCheckMinutes;

  const adjust = useCallback((delta: number) => {
    setUser((u) => ({
      ...u,
      balance: Math.max(0, Number((u.balance + delta).toFixed(2))),
      withdrawable: Math.max(0, Number((u.withdrawable + Math.min(delta, 0)).toFixed(2))),
    }));
  }, []);

  const setKycStatus = useCallback((kycStatus: KycStatus) => {
    setUser((u) => ({ ...u, kycStatus }));
  }, []);

  const updateLimits = useCallback(
    (patch: Partial<ResponsibleLimits>) => setLimits((l) => ({ ...l, ...patch })),
    [setLimits],
  );

  const value = useMemo<SessionValue>(
    () => ({
      user,
      signedIn,
      ageConfirmed,
      ageGateReady,
      ageDeclined,
      limits,
      sessionMinutes,
      realityCheckDue,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
      confirmAge: () => {
        setAgeConfirmed(true);
        setAgeDeclined(false);
      },
      declineAge: () => setAgeDeclined(true),
      adjust,
      setKycStatus,
      updateLimits,
      acknowledgeRealityCheck: () => setCheckAcknowledgedAt(sessionMinutes),
    }),
    [
      user, signedIn, ageConfirmed, ageGateReady, ageDeclined, limits,
      sessionMinutes, realityCheckDue, setSignedIn, setAgeConfirmed,
      adjust, setKycStatus, updateLimits,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
