import { createDemoState } from "@/domain/fixtures";
import type { AppState, Business, CurrencyCode } from "@/domain/model";
import { isIndustryId } from "@/industry/profiles";
import { getMarketProfile, isMarketId } from "@/market/profiles";

const HEADER_V1 = "OWNEROPS_SNAPSHOT v1";
const HEADER_V2 = "OWNEROPS_SNAPSHOT v2";
const FOOTER = "END_OWNEROPS_SNAPSHOT";

type PortableStoreState = Pick<AppState,
  | "schemaVersion"
  | "business"
  | "workers"
  | "shifts"
  | "demand"
  | "incident"
  | "timeEntries"
  | "incidents"
  | "sales"
  | "menu"
  | "inventory"
  | "suppliers"
  | "purchases"
  | "purchaseOrders"
  | "waste"
  | "tasks"
  | "log"
  | "references"
  | "context"
> & { snapshotVersion: 2 };

function governedState(state: AppState): PortableStoreState {
  return {
    snapshotVersion: 2,
    schemaVersion: state.schemaVersion,
    business: state.business,
    workers: state.workers,
    shifts: state.shifts,
    demand: state.demand,
    incident: state.incident,
    timeEntries: state.timeEntries ?? [],
    incidents: state.incidents ?? [],
    sales: state.sales ?? [],
    menu: state.menu ?? [],
    inventory: state.inventory ?? [],
    suppliers: state.suppliers ?? [],
    purchases: state.purchases ?? [],
    purchaseOrders: state.purchaseOrders ?? [],
    waste: state.waste ?? [],
    tasks: state.tasks ?? [],
    log: state.log ?? [],
    references: state.references ?? [],
    context: state.context,
  };
}

export function serializeSnapshot(state: AppState): string {
  return `${HEADER_V2}\n${JSON.stringify(governedState(state), null, 2)}\n${FOOTER}`;
}

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parseBody(trimmed: string, header: string): unknown {
  required(trimmed.startsWith(`${header}\n`), `Snapshot must begin with ${header}.`);
  required(trimmed.endsWith(`\n${FOOTER}`), `Snapshot must end with ${FOOTER}.`);
  const body = trimmed.slice(header.length, -FOOTER.length).trim();
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Snapshot JSON is malformed: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function validateBase(value: unknown) {
  required(typeof value === "object" && value !== null, "Snapshot body must be an object.");
  const snapshot = value as Partial<AppState>;
  required(snapshot.schemaVersion === 1, "Unsupported application schemaVersion; expected 1 during StoreState migration.");
  required(typeof snapshot.business === "object" && snapshot.business !== null, "Snapshot business is required.");
  required(typeof snapshot.business.name === "string", "Snapshot business.name is required.");
  const business = snapshot.business as Partial<Business>;
  const industry = business.industry === undefined ? "coffee" : business.industry;
  required(isIndustryId(industry), `Snapshot business.industry '${String(industry)}' is not supported.`);
  const market = business.market === undefined ? "kr-seoul" : business.market;
  required(isMarketId(market), `Snapshot business.market '${String(market)}' is not supported.`);
  const expectedCurrency = getMarketProfile(market).currency;
  const currency = (business.currency ?? expectedCurrency) as CurrencyCode;
  required(currency === expectedCurrency, `Snapshot business.currency '${String(currency)}' does not match market '${market}'.`);
  required(Array.isArray(snapshot.workers) && snapshot.workers.length > 0, "Snapshot workers must be a non-empty array.");
  required(Array.isArray(snapshot.shifts), "Snapshot shifts must be an array.");
  required(Array.isArray(snapshot.demand), "Snapshot demand must be an array.");
  for (const worker of snapshot.workers) {
    required(typeof worker.id === "string" && typeof worker.name === "string", "Every worker needs stable id and name fields.");
    required((worker.role === "barista" || worker.role === "manager") && typeof worker.hourlyRate === "number", `Worker ${worker.id} has invalid role or hourlyRate.`);
  }
  const workerIds = new Set(snapshot.workers.map((worker) => worker.id));
  for (const shift of snapshot.shifts) {
    required(typeof shift.id === "string" && typeof shift.start === "string" && typeof shift.end === "string", "Every shift needs stable id, start, and end fields.");
    required(shift.workerId === null || workerIds.has(shift.workerId), `Shift ${shift.id} refers to an unknown worker.`);
    required(new Date(shift.start).getTime() < new Date(shift.end).getTime(), `Shift ${shift.id} has an invalid time range.`);
  }
  return { snapshot, business, industry, market, currency };
}

function parseV1(trimmed: string): AppState {
  const value = parseBody(trimmed, HEADER_V1);
  const { snapshot, business, industry, market, currency } = validateBase(value);
  // Legacy snapshots contain only staffing/business state. Hydrate new store domains from the matching
  // deterministic profile, then overlay the portable legacy truth.
  const base = createDemoState(industry, market);
  return {
    ...base,
    schemaVersion: 1,
    business: { ...base.business, ...business, industry, market, currency } as Business,
    workers: snapshot.workers!,
    shifts: snapshot.shifts!,
    demand: snapshot.demand!,
    incident: snapshot.incident ?? null,
    preview: null,
    storePlan: null,
    activity: { state: "idle", message: "Legacy schedule snapshot restored into StoreState." },
  };
}

function parseV2(trimmed: string): AppState {
  const value = parseBody(trimmed, HEADER_V2);
  const { snapshot, business, industry, market, currency } = validateBase(value);
  const portable = value as Partial<PortableStoreState>;
  required(portable.snapshotVersion === 2, "OWNEROPS_SNAPSHOT v2 requires snapshotVersion 2.");
  const arrayFields: Array<keyof PortableStoreState> = [
    "timeEntries", "incidents", "sales", "menu", "inventory", "suppliers", "purchases", "purchaseOrders", "waste", "tasks", "log", "references",
  ];
  for (const field of arrayFields) required(Array.isArray(portable[field]), `Snapshot ${String(field)} must be an array.`);

  return {
    schemaVersion: 1,
    business: { ...business, industry, market, currency } as Business,
    workers: snapshot.workers!,
    shifts: snapshot.shifts!,
    demand: snapshot.demand!,
    incident: snapshot.incident ?? null,
    preview: null,
    storePlan: null,
    activity: { state: "idle", message: "Store snapshot restored." },
    timeEntries: portable.timeEntries ?? [],
    incidents: portable.incidents ?? [],
    sales: portable.sales ?? [],
    menu: portable.menu ?? [],
    inventory: portable.inventory ?? [],
    suppliers: portable.suppliers ?? [],
    purchases: portable.purchases ?? [],
    purchaseOrders: portable.purchaseOrders ?? [],
    waste: portable.waste ?? [],
    tasks: portable.tasks ?? [],
    log: portable.log ?? [],
    references: portable.references ?? [],
    context: portable.context,
  };
}

export function parseSnapshot(text: string): AppState {
  const trimmed = text.trim();
  if (trimmed.startsWith(`${HEADER_V2}\n`)) return parseV2(trimmed);
  if (trimmed.startsWith(`${HEADER_V1}\n`)) return parseV1(trimmed);
  throw new Error("Snapshot must begin with OWNEROPS_SNAPSHOT v2 or legacy OWNEROPS_SNAPSHOT v1.");
}

export function snapshotStateEquals(left: AppState, right: AppState): boolean {
  return JSON.stringify(governedState(left)) === JSON.stringify(governedState(right));
}
