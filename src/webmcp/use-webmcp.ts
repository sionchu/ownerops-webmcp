"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/state/app-state";
import { registerOwnerOpsTools } from "./register-tools";

export function useWebMcpRegistration() {
  const { getState, runAction, setLocale } = useAppState();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const registration = registerOwnerOpsTools({ getState, runAction, setLocale });
    const statusTimer = window.setTimeout(() => setSupported(registration.supported), 0);
    return () => {
      window.clearTimeout(statusTimer);
      registration.dispose();
    };
  }, [getState, runAction, setLocale]);

  return supported;
}
