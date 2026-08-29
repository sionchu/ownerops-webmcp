"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/state/app-state";
import { registerOwnerOpsTools } from "./register-tools";

const RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000, 3000] as const;

export function useWebMcpRegistration() {
  const { getState, getLocale, runAction, setLocale } = useAppState();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryIndex = 0;
    let retryTimer: number | null = null;
    let activeRegistration: ReturnType<typeof registerOwnerOpsTools> | null = null;

    const clearRetryTimer = () => {
      if (retryTimer === null) return;
      window.clearTimeout(retryTimer);
      retryTimer = null;
    };

    const attemptRegistration = (restart = false) => {
      if (cancelled || activeRegistration) return;
      clearRetryTimer();
      if (restart) retryIndex = 0;

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
      retryTimer = window.setTimeout(() => attemptRegistration(), delay);
    };

    const recheckAvailability = () => {
      if (cancelled || activeRegistration) return;
      setSupported(null);
      attemptRegistration(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") recheckAvailability();
    };

    window.addEventListener("focus", recheckAvailability);
    window.addEventListener("pageshow", recheckAvailability);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    attemptRegistration(true);

    return () => {
      cancelled = true;
      clearRetryTimer();
      window.removeEventListener("focus", recheckAvailability);
      window.removeEventListener("pageshow", recheckAvailability);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activeRegistration?.dispose();
    };
  }, [getState, getLocale, runAction, setLocale]);

  return supported;
}
