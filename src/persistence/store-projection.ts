import type { AppState, OperationalIncident, PurchaseOrder, StoreLogEntry, StoreTask, TimeEntry, Worker } from "@/domain/model";

export type PersistedInventoryCount = {
  itemId: string;
  onHand: number;
};

export type StorePersistenceProjection = {
  storeId: string;
  business: {
    name: string;
    industry: AppState["business"]["industry"];
    market: AppState["business"]["market"];
    currency: AppState["business"]["currency"];
    timezone: string;
  };
  workers: Worker[];
  shifts: AppState["shifts"];
  timeEntries: TimeEntry[];
  incidents: OperationalIncident[];
  purchaseOrders: PurchaseOrder[];
  tasks: StoreTask[];
  log: StoreLogEntry[];
  inventoryCounts: PersistedInventoryCount[];
  currentIncident: AppState["incident"];
  persistedAt?: string;
};

export function storeIdForState(state: AppState): string {
  return `demo-${state.business.market}-${state.business.industry}`;
}

export function projectStateForPersistence(state: AppState): StorePersistenceProjection {
  return {
    storeId: storeIdForState(state),
    business: {
      name: state.business.name,
      industry: state.business.industry,
      market: state.business.market,
      currency: state.business.currency,
      timezone: state.business.timezone ?? "UTC",
    },
    workers: structuredClone(state.workers),
    shifts: structuredClone(state.shifts),
    timeEntries: structuredClone(state.timeEntries ?? []),
    incidents: structuredClone(state.incidents ?? []),
    purchaseOrders: structuredClone(state.purchaseOrders ?? []),
    tasks: structuredClone(state.tasks ?? []),
    log: structuredClone(state.log ?? []),
    inventoryCounts: (state.inventory ?? []).map((item) => ({ itemId: item.id, onHand: item.onHand })),
    currentIncident: state.incident ? structuredClone(state.incident) : null,
  };
}

export function mergePersistenceProjection(base: AppState, projection: StorePersistenceProjection): AppState {
  if (projection.business.market !== base.business.market || projection.business.industry !== base.business.industry) return base;
  const inventoryCounts = new Map(projection.inventoryCounts.map((count) => [count.itemId, count.onHand]));
  return {
    ...base,
    business: {
      ...base.business,
      name: projection.business.name,
      timezone: projection.business.timezone,
    },
    workers: structuredClone(projection.workers),
    shifts: structuredClone(projection.shifts),
    timeEntries: structuredClone(projection.timeEntries),
    incidents: structuredClone(projection.incidents),
    purchaseOrders: structuredClone(projection.purchaseOrders),
    tasks: structuredClone(projection.tasks),
    log: structuredClone(projection.log),
    inventory: (base.inventory ?? []).map((item) => inventoryCounts.has(item.id) ? { ...item, onHand: inventoryCounts.get(item.id)! } : item),
    incident: projection.currentIncident ? structuredClone(projection.currentIncident) : null,
    preview: null,
    storePlan: null,
    activity: { state: "idle", message: "Persisted store state loaded." },
  };
}
