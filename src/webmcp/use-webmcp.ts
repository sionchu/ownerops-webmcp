"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/state/app-state";
import { registerOwnerOpsTools } from "./register-tools";

const RETRY_DELAYS_MS = [100, 250, 500, 750, 1000] as const;

export function useWebMcpRegistration() {
  const { getState, getLocale, runAction, setLocale } = useAppState();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryIndex = 0;
    let retryTimer: number | null = null;
    let activeRegistration: ReturnType<typeof registerOwnerOpsTools> | null = null;

    setSupported(null);

    const attemptRegistration = () => {
      if (cancelled) return;

      const registration = registerOwnerOpsTools({ getState, getLocale, runAction, setLocale });
      if (registration.supported) {
        activeRegistration = registration;
        setSupported(true);
        return;
      }

      registration.dispose();
      const delay = RETRY_DELAYS_MS[retryIndex];
      if (delay === undefined) {
        setSupported(false);
        return;
      }

      retryIndex += 1;
      retryTimer = window.setTimeout(attemptRegistration, delay);
    };

    attemptRegistration();

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      activeRegistration?.dispose();
    };
  }, [getState, getLocale, runAction, setLocale]);

  return supported;
}
