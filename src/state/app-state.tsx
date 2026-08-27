"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { dispatchApplicationAction, getResponseOptions, type ApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState, PlanImpact, StaffingScenario } from "@/domain/model";
import { loadPersistedState, persistState } from "./persistence";

type AppStateContextValue = {
  state: AppState;
  impact: PlanImpact;
  previewImpact: PlanImpact | null;
  scenarios: StaffingScenario[];
  hydrated: boolean;
  runAction: (action: ApplicationAction) => AppState;
  getState: () => AppState;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const persisted = loadPersistedState(window.localStorage);
      if (persisted) {
        stateRef.current = persisted;
        setState(persisted);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (hydrated) persistState(window.localStorage, state);
  }, [hydrated, state]);

  const runAction = useCallback((action: ApplicationAction) => {
    const next = dispatchApplicationAction(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const value = useMemo<AppStateContextValue>(() => ({
    state,
    impact: calculateImpact(state),
    previewImpact: state.preview ? calculateImpact(state, applyChanges(state.shifts, state.preview.changes), state.shifts) : null,
    scenarios: getResponseOptions(state),
    hydrated,
    runAction,
    getState: () => stateRef.current,
  }), [state, hydrated, runAction]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used within AppStateProvider.");
  return value;
}
