import type { AppState, ReferenceFreshness, ReferenceObservation } from "./model";

export type ReferenceRequest = {
  kind: ReferenceObservation["kind"];
  referenceKey: string;
  geography?: string;
};

export type ResolvedReference = {
  observation: ReferenceObservation | null;
  source: "live" | "recent" | "cached" | "seed" | "stale" | "none";
  degraded: boolean;
  reason?: string;
};

const FRESHNESS_PRIORITY: Record<ReferenceFreshness, number> = {
  live: 5,
  recent: 4,
  cached: 3,
  seed: 2,
  stale: 1,
};

function matches(reference: ReferenceObservation, request: ReferenceRequest): boolean {
  return reference.kind === request.kind
    && reference.referenceKey === request.referenceKey
    && (request.geography === undefined || reference.geography === request.geography);
}

function newestFirst(a: ReferenceObservation, b: ReferenceObservation): number {
  return b.observedAt.localeCompare(a.observedAt) || b.fetchedAt.localeCompare(a.fetchedAt);
}

/**
 * Pure resolver. Network/provider adapters may pass a freshly fetched observation as `liveObservation`.
 * When the live fetch is absent or failed, stored recent/cached/seed data is used without inventing a value.
 */
export function resolveReference(
  state: AppState,
  request: ReferenceRequest,
  liveObservation?: ReferenceObservation | null,
): ResolvedReference {
  if (liveObservation && matches(liveObservation, request)) {
    return {
      observation: { ...liveObservation, freshness: "live" },
      source: "live",
      degraded: false,
    };
  }

  const candidates = (state.references ?? [])
    .filter((reference) => matches(reference, request))
    .sort((a, b) => FRESHNESS_PRIORITY[b.freshness] - FRESHNESS_PRIORITY[a.freshness] || newestFirst(a, b));

  const observation = candidates[0] ?? null;
  if (!observation) {
    return {
      observation: null,
      source: "none",
      degraded: true,
      reason: "No live, cached, or seed reference is available for this key.",
    };
  }

  const degraded = observation.freshness !== "recent";
  return {
    observation,
    source: observation.freshness,
    degraded,
    reason: degraded
      ? observation.freshness === "cached"
        ? "Live provider data is unavailable; using the latest cached reference."
        : observation.freshness === "seed"
          ? "Live provider data is unavailable; using the demo seed reference."
          : observation.freshness === "stale"
            ? "Only a stale reference is available; treat comparisons as directional only."
            : undefined
      : "Using a recently fetched stored reference.",
  };
}

export function resolveCommodityReference(state: AppState, referenceKey: string, liveObservation?: ReferenceObservation | null) {
  return resolveReference(state, { kind: "commodity_price", referenceKey }, liveObservation);
}

export function resolveRentReference(state: AppState, liveObservation?: ReferenceObservation | null) {
  return resolveReference(state, { kind: "rent_benchmark", referenceKey: "commercial_rent_benchmark" }, liveObservation);
}
