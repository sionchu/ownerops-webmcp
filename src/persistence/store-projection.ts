import type { AppState } from "@/domain/model";

export type StorePersistenceProjection = {
  storeId: string;
  business: AppState["business"];
  workers: AppState["workers"];
  shifts: AppState["shifts"];
  timeEntries: NonNullable<AppState["timeEntries"]>;
  incidents: NonNullable<AppState["incidents"]>;
  sales: NonNullable<AppState["sales"]>;
  menu: NonNullable<AppState["menu"]>;
  prepItems: NonNullable<AppState["prepItems"]>;
  inventory: NonNullable<AppState["inventory"]>;
  suppliers: NonNullable<AppState["suppliers"]>;
  purchases: NonNullable<AppState["purchases"]>;
  purchaseOrders: NonNullable<AppState["purchaseOrders"]>;
  waste: NonNullable<AppState["waste"]>;
  tasks: NonNullable<AppState["tasks"]>;
  log: NonNullable<AppState["log"]>;
  currentIncident: AppState["incident"];
  persistedAt?: string;
};

export function storeIdForState(state: AppState): string {
  return `demo-${state.business.market}-${state.business.industry}`;
}

function scopedId(storeId: string, id: string): string {
  const prefix = `${storeId}:`;
  return id.startsWith(prefix) ? id : `${prefix}${id}`;
}

export function projectStateForPersistence(state: AppState): StorePersistenceProjection {
  const storeId = storeIdForState(state);
  return {
    storeId,
    business: structuredClone(state.business),
    workers: structuredClone(state.workers).map((worker) => ({
      ...worker,
      availabilityExceptions: (worker.availabilityExceptions ?? []).map((exception) => ({ ...exception, id: scopedId(storeId, exception.id) })),
    })),
    shifts: structuredClone(state.shifts),
    timeEntries: structuredClone(state.timeEntries ?? []).map((entry) => ({ ...entry, id: scopedId(storeId, entry.id) })),
    incidents: structuredClone(state.incidents ?? []).map((incident) => ({ ...incident, id: scopedId(storeId, incident.id) })),
    sales: structuredClone(state.sales ?? []).map((sale) => ({ ...sale, id: scopedId(storeId, sale.id) })),
    menu: structuredClone(state.menu ?? []),
    prepItems: structuredClone(state.prepItems ?? []),
    inventory: structuredClone(state.inventory ?? []),
    suppliers: structuredClone(state.suppliers ?? []),
    purchases: structuredClone(state.purchases ?? []).map((purchase) => ({ ...purchase, id: scopedId(storeId, purchase.id) })),
    purchaseOrders: structuredClone(state.purchaseOrders ?? []).map((order) => ({ ...order, id: scopedId(storeId, order.id) })),
    waste: structuredClone(state.waste ?? []).map((record) => ({ ...record, id: scopedId(storeId, record.id) })),
    tasks: structuredClone(state.tasks ?? []).map((task) => ({ ...task, id: scopedId(storeId, task.id) })),
    log: structuredClone(state.log ?? []).map((entry) => ({ ...entry, id: scopedId(storeId, entry.id) })),
    currentIncident: state.incident ? structuredClone(state.incident) : null,
  };
}

function preferPersisted<T>(persisted: T[], fallback: T[]): T[] {
  return persisted.length > 0 ? structuredClone(persisted) : fallback;
}

export function mergePersistenceProjection(base: AppState, projection: StorePersistenceProjection): AppState {
  if (projection.business.market !== base.business.market || projection.business.industry !== base.business.industry) return base;
  return {
    ...base,
    business: structuredClone(projection.business),
    workers: preferPersisted(projection.workers, base.workers),
    shifts: preferPersisted(projection.shifts, base.shifts),
    timeEntries: structuredClone(projection.timeEntries),
    incidents: structuredClone(projection.incidents),
    sales: preferPersisted(projection.sales, base.sales ?? []),
    menu: preferPersisted(projection.menu, base.menu ?? []),
    prepItems: structuredClone(projection.prepItems),
    inventory: preferPersisted(projection.inventory, base.inventory ?? []),
    suppliers: preferPersisted(projection.suppliers, base.suppliers ?? []),
    purchases: structuredClone(projection.purchases),
    purchaseOrders: structuredClone(projection.purchaseOrders),
    waste: structuredClone(projection.waste),
    tasks: structuredClone(projection.tasks),
    log: structuredClone(projection.log),
    incident: projection.currentIncident ? structuredClone(projection.currentIncident) : null,
    preview: null,
    storePlan: null,
    activity: { state: "idle", message: "Persisted store state loaded." },
  };
}
