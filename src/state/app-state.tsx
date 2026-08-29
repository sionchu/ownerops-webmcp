"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { dispatchApplicationAction, getResponseOptions, type ApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState, PlanImpact, StaffingScenario } from "@/domain/model";
import { normalizeUiLocale, UI_LOCALE_STORAGE_KEY, type UiLocale } from "@/i18n";
import { loadPersistedState, persistState } from "./persistence";

type AppStateContextValue = {
  state: AppState;
  impact: PlanImpact;
  previewImpact: PlanImpact | null;
  scenarios: StaffingScenario[];
  hydrated: boolean;
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  runAction: (action: ApplicationAction) => AppState;
  getState: () => AppState;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [locale, setLocaleState] = useState<UiLocale>("en");
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const localeRef = useRef<UiLocale>(locale);

  const setLocale = useCallback((nextLocale: UiLocale) => {
    localeRef.current = nextLocale;
    setLocaleState(nextLocale);
    if (typeof document !== "undefined") document.documentElement.lang = nextLocale;
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const persisted = loadPersistedState(window.localStorage);
      if (persisted) {
        stateRef.current = persisted;
        setState(persisted);
      }
      const detectedLocale = normalizeUiLocale(window.localStorage.getItem(UI_LOCALE_STORAGE_KEY))
        ?? normalizeUiLocale(window.navigator.language)
        ?? "en";
      localeRef.current = detectedLocale;
      setLocaleState(detectedLocale);
      document.documentElement.lang = detectedLocale;
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState(window.localStorage, state);
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  }, [hydrated, state, locale]);

  const runAction = useCallback((action: ApplicationAction) => {
    const next = dispatchApplicationAction(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);
  const getState = useCallback(() => stateRef.current, []);

  const value = useMemo<AppStateContextValue>(() => ({
    state,
    impact: calculateImpact(state),
    previewImpact: state.preview ? calculateImpact(state, applyChanges(state.shifts, state.preview.changes), state.shifts) : null,
    scenarios: getResponseOptions(state),
    hydrated,
    locale,
    setLocale,
    runAction,
    getState,
  }), [state, hydrated, locale, setLocale, runAction, getState]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used within AppStateProvider.");
  return value;
}
