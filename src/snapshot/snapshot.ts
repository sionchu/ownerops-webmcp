import { isIndustryId } from "@/industry/profiles";
import { getMarketProfile, isMarketId } from "@/market/profiles";
import type { AppState, Business, CurrencyCode, SnapshotState } from "@/domain/model";

const HEADER = "OWNEROPS_SNAPSHOT v1";
const FOOTER = "END_OWNEROPS_SNAPSHOT";

function governedState(state: AppState): SnapshotState {
  return {
    schemaVersion: state.schemaVersion,
    business: state.business,
    workers: state.workers,
    shifts: state.shifts,
    demand: state.demand,
    incident: state.incident,
  };
}

export function serializeSnapshot(state: AppState): string {
  return `${HEADER}\n${JSON.stringify(governedState(state), null, 2)}\n${FOOTER}`;
}

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function parseSnapshot(text: string): AppState {
  const trimmed = text.trim();
  required(trimmed.startsWith(`${HEADER}\n`), "Snapshot must begin with OWNEROPS_SNAPSHOT v1.");
  required(trimmed.endsWith(`\n${FOOTER}`), "Snapshot must end with END_OWNEROPS_SNAPSHOT.");
  const body = trimmed.slice(HEADER.length, -FOOTER.length).trim();
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (error) {
    throw new Error(`Snapshot JSON is malformed: ${error instanceof Error ? error.message : "parse failed"}`);
  }
  required(typeof value === "object" && value !== null, "Snapshot body must be an object.");
  const snapshot = value as Partial<SnapshotState>;
  required(snapshot.schemaVersion === 1, "Unsupported snapshot schemaVersion; expected 1.");
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
  return {
    schemaVersion: 1,
    business: { ...business, industry, market, currency } as Business,
    workers: snapshot.workers,
    shifts: snapshot.shifts,
    demand: snapshot.demand,
    incident: snapshot.incident ?? null,
    preview: null,
    activity: { state: "idle", message: "Schedule snapshot restored." },
  };
}

export function snapshotStateEquals(left: AppState, right: AppState): boolean {
  return JSON.stringify(governedState(left)) === JSON.stringify(governedState(right));
}
