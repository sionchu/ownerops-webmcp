"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { dispatchApplicationAction, getResponseOptions, type ApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState, PlanImpact, ReferenceObservation, StaffingScenario } from "@/domain/model";
import { normalizeUiLocale, type UiLocale } from "@/i18n";
import { mergePersistenceProjection, storeIdForState, type StorePersistenceProjection } from "@/persistence/store-projection";

type StoreTruthSource = "database" | "deterministic-seed";
type ReferenceEvidenceSource = "database-provider-cache" | "database-benchmark-cache" | "deterministic-seed";
export type StoreDataProvenance = {
  storeTruth: StoreTruthSource;
  referenceEvidence: ReferenceEvidenceSource;
  disclosure: string;
  storeUpdatedAt?: string;
  referenceObservedAt?: string;
  referenceFetchedAt?: string;
};

type RuntimeBusiness = AppState["business"] & { dataProvenance?: StoreDataProvenance };

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
  getLocale: () => UiLocale;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function referenceIdentity(reference: ReferenceObservation) {
  return `${reference.kind}:${reference.referenceKey}`;
}

function mergeCachedReferences(state: AppState, incoming: ReferenceObservation[]): AppState {
  if (incoming.length === 0) return state;
  const replacementKeys = new Set(incoming.map(referenceIdentity));
  const retained = (state.references ?? []).filter((reference) => !replacementKeys.has(referenceIdentity(reference)));
  return { ...state, references: [...retained, ...incoming] };
}

function provenanceDisclosure(storeTruth: StoreTruthSource, referenceEvidence: ReferenceEvidenceSource): string {
  const store = storeTruth === "database"
    ? "Store operational truth is DB-backed."
    : "Store operational truth is the deterministic demo fallback, not a DB-backed store record.";
  const reference = referenceEvidence === "database-provider-cache"
    ? "Market reference evidence comes from cached provider observations stored in DB; check provider and freshness before consequential purchasing."
    : referenceEvidence === "database-benchmark-cache"
      ? "Market reference evidence is a benchmark/template cached in DB, not a live provider quote; actual supplier receipts remain the store-truth cost basis."
      : "Market reference evidence is deterministic fallback data, not a live provider quote.";
  return `${store} ${reference}`;
}

function withDataProvenance(state: AppState, storeTruth: StoreTruthSource, referenceEvidence: ReferenceEvidenceSource, timestamps: Partial<Pick<StoreDataProvenance, "storeUpdatedAt" | "referenceObservedAt" | "referenceFetchedAt">> = {}): AppState {
  const previous = (state.business as RuntimeBusiness).dataProvenance;
  return {
    ...state,
    business: {
      ...state.business,
      dataProvenance: {
        storeTruth,
        referenceEvidence,
        disclosure: provenanceDisclosure(storeTruth, referenceEvidence),
        storeUpdatedAt: timestamps.storeUpdatedAt ?? previous?.storeUpdatedAt,
        referenceObservedAt: timestamps.referenceObservedAt ?? previous?.referenceObservedAt,
        referenceFetchedAt: timestamps.referenceFetchedAt ?? previous?.referenceFetchedAt,
      },
    } as AppState["business"],
  };
}

function dataProvenance(state: AppState): StoreDataProvenance {
  return (state.business as RuntimeBusiness).dataProvenance ?? {
    storeTruth: "deterministic-seed",
    referenceEvidence: "deterministic-seed",
    disclosure: provenanceDisclosure("deterministic-seed", "deterministic-seed"),
  };
}

function referenceEvidenceFromApi(source: unknown): ReferenceEvidenceSource {
  if (source === "database-provider-cache") return "database-provider-cache";
  if (source === "database-benchmark-cache") return "database-benchmark-cache";
  return "deterministic-seed";
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => withDataProvenance(createDemoState("coffee", "kr-seoul"), "deterministic-seed", "deterministic-seed"));
  const [locale, setLocaleState] = useState<UiLocale>("en");
  const [hydrated, setHydrated] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const stateRef = useRef(state);
  const localeRef = useRef<UiLocale>(locale);

  const setLocale = useCallback((nextLocale: UiLocale) => {
    localeRef.current = nextLocale;
    setLocaleState(nextLocale);
    if (typeof document !== "undefined") document.documentElement.lang = nextLocale;
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const detectedLocale = normalizeUiLocale(window.navigator.language) ?? "en";
      localeRef.current = detectedLocale;
      setLocaleState(detectedLocale);
      document.documentElement.lang = detectedLocale;
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const storeId = storeIdForState(stateRef.current);
    void fetch(`/api/store-state?storeId=${encodeURIComponent(storeId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ source?: string; projection?: StorePersistenceProjection | null }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const current = stateRef.current;
        const refs = dataProvenance(current).referenceEvidence;
        const next = payload?.projection
          ? withDataProvenance(mergePersistenceProjection(current, payload.projection), "database", refs, { storeUpdatedAt: payload.projection.persistedAt })
          : withDataProvenance(current, "deterministic-seed", refs);
        stateRef.current = next;
        setState(next);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const current = stateRef.current;
        const next = withDataProvenance(current, "deterministic-seed", dataProvenance(current).referenceEvidence);
        stateRef.current = next;
        setState(next);
        console.warn("OwnerOps persisted store unavailable; deterministic seed retained.", error);
      });
    return () => controller.abort();
  }, [hydrated, state.business.market, state.business.industry, reloadVersion]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const market = state.business.market;
    void fetch(`/api/references?market=${encodeURIComponent(market)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ source?: string; references?: ReferenceObservation[] }>;
      })
      .then((payload) => {
        if (!payload || controller.signal.aborted) return;
        const current = stateRef.current;
        const referenceEvidence = referenceEvidenceFromApi(payload.source);
        const merged = payload.references?.length ? mergeCachedReferences(current, payload.references) : current;
        const latest = (payload.references ?? []).reduce((acc, reference) => ({ observed: !acc.observed || reference.observedAt > acc.observed ? reference.observedAt : acc.observed, fetched: !acc.fetched || reference.fetchedAt > acc.fetched ? reference.fetchedAt : acc.fetched }), { observed: "", fetched: "" });
        const next = withDataProvenance(merged, dataProvenance(current).storeTruth, referenceEvidence, { referenceObservedAt: latest.observed || undefined, referenceFetchedAt: latest.fetched || undefined });
        stateRef.current = next;
        setState(next);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const current = stateRef.current;
        const next = withDataProvenance(current, dataProvenance(current).storeTruth, "deterministic-seed");
        stateRef.current = next;
        setState(next);
        console.warn("OwnerOps reference cache unavailable; deterministic seed retained.", error);
      });
    return () => controller.abort();
  }, [hydrated, state.business.market, reloadVersion]);

  const runAction = useCallback((action: ApplicationAction) => {
    const previous = stateRef.current;
    let next = action.type === "reset_demo"
      ? createDemoState(previous.business.industry, previous.business.market)
      : dispatchApplicationAction(previous, action);
    const configuredStoreChanged = next.business.market !== previous.business.market || next.business.industry !== previous.business.industry;
    if (configuredStoreChanged || action.type === "reset_demo") {
      next = withDataProvenance(next, "deterministic-seed", "deterministic-seed");
    } else {
      const current = dataProvenance(previous);
      next = withDataProvenance(next, current.storeTruth, current.referenceEvidence);
    }
    stateRef.current = next;
    setState(next);
    if (action.type === "reset_demo") setReloadVersion((version) => version + 1);
    return next;
  }, []);
  const getState = useCallback(() => stateRef.current, []);
  const getLocale = useCallback(() => localeRef.current, []);

  const value = useMemo<AppStateContextValue>(() => ({
    state,
    impact: calculateImpact(state),
    previewImpact: state.preview ? calculateImpact(state, applyChanges(state.shifts, state.preview.changes)) : null,
    scenarios: getResponseOptions(state),
    hydrated,
    locale,
    setLocale,
    runAction,
    getState,
    getLocale,
  }), [state, hydrated, locale, setLocale, runAction, getState, getLocale]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used within AppStateProvider.");
  return value;
}
