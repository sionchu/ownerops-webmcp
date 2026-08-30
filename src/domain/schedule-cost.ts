import { applyChanges, collectWarnings } from "./impact";
import type { AppState, Shift, TimeEntry } from "./model";

export type ScheduleCostRange = {
  /** Inclusive range start and exclusive range end. ISO timestamps or date-only values. */
  start: string;
  end: string;
};

export type ScheduleBasis = "committed" | "candidate";

export type ScheduleCostOptions = {
  /** Committed is the historical baseline; candidate is projection-only. */
  scheduleBasis?: ScheduleBasis;
};

export type ScheduleCostSummary = {
  scheduleBasis: ScheduleBasis;
  scheduledHours: number;
  scheduledWage: number;
  actualHours: number;
  actualWage: number;
  actualComplete: boolean;
  workerCount: number;
  salesBasis: number;
  laborRatio: number;
  warningCount: number;
};

type Bounds = { start: number; end: number };

function timestamp(value: string): number {
  // Date-only values are interpreted as the local business day, matching the
  // timestamp convention used by the fixture and persisted StoreState.
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
}

function bounds(range: ScheduleCostRange): Bounds | null {
  const start = timestamp(range.start);
  const end = timestamp(range.end);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}

function overlap(start: string, end: string, range: Bounds): number {
  const itemStart = timestamp(start);
  const itemEnd = timestamp(end);
  if (!Number.isFinite(itemStart) || !Number.isFinite(itemEnd) || itemEnd <= itemStart) return 0;
  const clippedStart = Math.max(itemStart, range.start);
  const clippedEnd = Math.min(itemEnd, range.end);
  return clippedEnd > clippedStart ? (clippedEnd - clippedStart) / 3_600_000 : 0;
}

function overlaps(start: string, end: string, range: Bounds): boolean {
  const itemStart = timestamp(start);
  const itemEnd = timestamp(end);
  return Number.isFinite(itemStart) && Number.isFinite(itemEnd) && itemEnd > range.start && itemStart < range.end;
}

function businessDate(value: string): string {
  return value.slice(0, 10);
}

function dayTimestamp(date: string): number {
  return timestamp(`${date}T00:00:00`);
}

function salesBasis(state: AppState, range: Bounds): number {
  const sales = state.sales ?? [];
  if (sales.length > 0) {
    return sales.reduce((total, snapshot) => {
      const dayStart = dayTimestamp(snapshot.date);
      const dayEnd = dayStart + 24 * 3_600_000;
      return dayEnd > range.start && dayStart < range.end ? total + snapshot.netSales : total;
    }, 0);
  }

  // StoreState may be in the deterministic fallback shape without sales
  // snapshots. Keep the same selector useful by using the store's expected
  // day basis rather than inventing a second sales source.
  return Object.entries(state.business.expectedSalesByDay).reduce((total, [date, value]) => {
    const dayStart = dayTimestamp(date);
    const dayEnd = dayStart + 24 * 3_600_000;
    return dayEnd > range.start && dayStart < range.end ? total + value : total;
  }, 0);
}

function candidateShifts(state: AppState): Shift[] {
  const previewChanges = state.preview?.changes ?? [];
  return previewChanges.length > 0 ? applyChanges(state.shifts, previewChanges) : state.shifts;
}

function scheduledSummary(state: AppState, range: Bounds, shifts: Shift[], rates: Map<string, number>) {
  const relevant = shifts.filter((shift) => shift.status === "scheduled" && shift.workerId && overlaps(shift.start, shift.end, range));
  const scheduledHours = relevant.reduce((total, shift) => total + overlap(shift.start, shift.end, range), 0);
  const scheduledWage = relevant.reduce((total, shift) => total + overlap(shift.start, shift.end, range) * (rates.get(shift.workerId!) ?? 0), 0);
  return { relevant, scheduledHours, scheduledWage };
}

function actualSummary(state: AppState, range: Bounds, rates: Map<string, number>) {
  return (state.timeEntries ?? []).reduce((summary, entry: TimeEntry) => {
    if (!entry.clockOut) return summary;
    const hours = overlap(entry.clockIn, entry.clockOut, range);
    return {
      actualHours: summary.actualHours + hours,
      actualWage: summary.actualWage + hours * (rates.get(entry.workerId) ?? 0),
    };
  }, { actualHours: 0, actualWage: 0 });
}

function warningCount(state: AppState, range: Bounds, shifts: Shift[], relevantShiftIds: Set<string>, relevantWorkerIds: Set<string>): number {
  const warnings = collectWarnings(state, shifts).warnings;
  return warnings.filter((warning) => {
    if (warning.code === "weekly_hours") return Boolean(warning.workerId && relevantWorkerIds.has(warning.workerId));
    if (warning.code === "peak_coverage") {
      const peak = state.business.peakWindows.find((candidate) => warning.message.startsWith(`${candidate.day} `));
      return Boolean(peak && overlaps(`${peak.day}T${peak.start}:00`, `${peak.day}T${peak.end}:00`, range));
    }
    return Boolean(warning.shiftId && relevantShiftIds.has(warning.shiftId));
  }).length;
}

/**
 * Derive scheduled/actual wage evidence for one day or an inclusive set of
 * business days. The range end is exclusive. This selector never mutates the
 * supplied StoreState and uses the existing worker rates, shifts, time entries,
 * sales basis, and warning rules. Committed is the safe default. Candidate
 * projection must be explicit; actual completeness always follows committed
 * shifts and signed variance is unavailable for a candidate-basis summary.
 */
export function scheduleCostSummary(state: AppState, range: ScheduleCostRange, options: ScheduleCostOptions = {}): ScheduleCostSummary {
  const scheduleBasis = options.scheduleBasis ?? "committed";
  const resolved = bounds(range);
  if (!resolved) return { scheduleBasis, scheduledHours: 0, scheduledWage: 0, actualHours: 0, actualWage: 0, actualComplete: false, workerCount: 0, salesBasis: 0, laborRatio: 0, warningCount: 0 };

  const rates = new Map(state.workers.map((worker) => [worker.id, worker.hourlyRate]));
  const shifts = scheduleBasis === "candidate" ? candidateShifts(state) : state.shifts;
  const scheduled = scheduledSummary(state, resolved, shifts, rates);
  const committed = scheduleBasis === "committed" ? scheduled : scheduledSummary(state, resolved, state.shifts, rates);
  const actual = actualSummary(state, resolved, rates);
  const closedActualShiftIds = new Set((state.timeEntries ?? [])
    .filter((entry) => Boolean(entry.shiftId && entry.clockOut))
    .map((entry) => entry.shiftId!));
  const actualComplete = committed.relevant.length > 0
    && committed.relevant.every((shift) => closedActualShiftIds.has(shift.id));
  const sales = salesBasis(state, resolved);
  const relevantShiftIds = new Set(scheduled.relevant.map((shift) => shift.id));
  const relevantWorkerIds = new Set(scheduled.relevant.flatMap((shift) => shift.workerId ? [shift.workerId] : []));

  return {
    scheduleBasis,
    scheduledHours: scheduled.scheduledHours,
    scheduledWage: scheduled.scheduledWage,
    actualHours: actual.actualHours,
    actualWage: actual.actualWage,
    actualComplete,
    workerCount: relevantWorkerIds.size,
    salesBasis: sales,
    laborRatio: sales > 0 ? scheduled.scheduledWage / sales : 0,
    warningCount: warningCount(state, resolved, shifts, relevantShiftIds, relevantWorkerIds),
  };
}

/** Signed actual-vs-scheduled evidence is meaningful only for a closed comparison set. */
export function scheduleActualWageVariance(summary: ScheduleCostSummary): number | null {
  return summary.scheduleBasis === "committed" && summary.actualComplete
    ? summary.actualWage - summary.scheduledWage
    : null;
}

/** Resolve one shift's scheduled wage through the same summary selector. */
export function scheduledWageForShift(state: AppState, shift: Shift, workerId = shift.workerId): number {
  if (!workerId) return 0;
  const projected: AppState = {
    ...state,
    preview: null,
    shifts: [{ ...shift, workerId, status: "scheduled" }],
  };
  return scheduleCostSummary(projected, { start: shift.start, end: shift.end }).scheduledWage;
}

/** Convenience range for a single local business date. */
export function scheduleDayRange(date: string): ScheduleCostRange {
  const start = new Date(`${businessDate(date)}T12:00:00`);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const localIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`;
  return { start: localIso(start), end: localIso(end) };
}
