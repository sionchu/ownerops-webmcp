import { applyChanges, calculateImpact, hoursBetween } from "./impact";
import type { AppState, CapacityGap, Shift, StaffingChange, StaffingScenario, Worker } from "./model";

export type WeekRebuildPriority = "cost" | "balance" | "minimal_changes";

export type WeekRebuildRequest = {
  maxWeeklyHours?: number;
  prioritize?: WeekRebuildPriority;
  allowCapacityGap?: boolean;
};

type Strategy = WeekRebuildPriority;

function overlaps(a: Shift, b: Shift): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(a.end) > new Date(b.start);
}

function isUnavailable(worker: Worker, shift: Shift): boolean {
  return Boolean(worker.availability?.some((window) => !window.available && new Date(window.start) < new Date(shift.end) && new Date(window.end) > new Date(shift.start)));
}

function eligibleForShift(worker: Worker, shift: Shift): boolean {
  return worker.role === shift.role || (worker.role === "manager" && shift.role === "barista");
}

function assignmentCost(state: AppState, shifts: Shift[]): number {
  const rates = new Map(state.workers.map((worker) => [worker.id, worker.hourlyRate]));
  return shifts.reduce((sum, shift) => shift.workerId && shift.status === "scheduled"
    ? sum + hoursBetween(shift.start, shift.end) * (rates.get(shift.workerId) ?? 0)
    : sum, 0);
}

function managerCapacityGap(state: AppState, maxWeeklyHours: number): CapacityGap | null {
  const managerWorkers = state.workers.filter((worker) => worker.role === "manager");
  const managerShifts = state.shifts
    .filter((shift) => shift.role === "manager" && shift.status === "scheduled")
    .sort((a, b) => a.start.localeCompare(b.start));
  if (managerWorkers.length === 0 || managerShifts.length === 0) return null;

  const requiredHours = managerShifts.reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0);
  const availableHours = managerWorkers.length * maxWeeklyHours;
  const gapHours = Math.max(0, requiredHours - availableHours);
  if (gapHours <= 0) return null;

  const shiftIds: string[] = [];
  let coveredHours = 0;
  let consumedCapacity = 0;
  for (const shift of managerShifts) {
    const shiftHours = hoursBetween(shift.start, shift.end);
    if (consumedCapacity + shiftHours <= availableHours) {
      consumedCapacity += shiftHours;
      continue;
    }
    shiftIds.push(shift.id);
    coveredHours += shiftHours;
    if (coveredHours >= gapHours) break;
  }

  return {
    role: "manager",
    hoursPerWeek: gapHours,
    shiftIds,
    reason: `Current manager-qualified capacity is ${gapHours} hours short of the ${maxWeeklyHours}-hour weekly limit while preserving the published manager shifts.`,
  };
}

function planFullWeek(state: AppState, maxWeeklyHours: number, strategy: Exclude<Strategy, "minimal_changes">): Shift[] {
  const planned: Shift[] = [];
  const hours = Object.fromEntries(state.workers.map((worker) => [worker.id, 0])) as Record<string, number>;

  for (const shift of state.shifts.filter((item) => item.role === "manager").sort((a, b) => a.start.localeCompare(b.start))) {
    planned.push({ ...shift });
    if (shift.workerId) hours[shift.workerId] = (hours[shift.workerId] ?? 0) + hoursBetween(shift.start, shift.end);
  }

  const flexible = state.shifts.filter((item) => item.role !== "manager").sort((a, b) => a.start.localeCompare(b.start));
  for (const shift of flexible) {
    const duration = hoursBetween(shift.start, shift.end);
    const candidates = state.workers.filter((worker) => {
      if (!eligibleForShift(worker, shift) || isUnavailable(worker, shift)) return false;
      if ((hours[worker.id] ?? 0) + duration > maxWeeklyHours) return false;
      const candidateShift = { ...shift, workerId: worker.id, status: "scheduled" as const };
      return !planned.some((item) => item.workerId === worker.id && overlaps(item, candidateShift));
    });

    const fallback = state.workers.find((worker) => worker.id === shift.workerId);
    const selected = candidates.length > 0
      ? [...candidates].sort((a, b) => {
          if (strategy === "balance") {
            return (hours[a.id] ?? 0) - (hours[b.id] ?? 0)
              || a.hourlyRate - b.hourlyRate
              || Number(a.id !== shift.workerId) - Number(b.id !== shift.workerId)
              || a.id.localeCompare(b.id);
          }
          return a.hourlyRate - b.hourlyRate
            || (hours[a.id] ?? 0) - (hours[b.id] ?? 0)
            || Number(a.id !== shift.workerId) - Number(b.id !== shift.workerId)
            || a.id.localeCompare(b.id);
        })[0]
      : fallback;

    const workerId = selected?.id ?? shift.workerId;
    const next = { ...shift, workerId, status: workerId ? "scheduled" as const : shift.status };
    planned.push(next);
    if (workerId) hours[workerId] = (hours[workerId] ?? 0) + duration;
  }

  return state.shifts.map((shift) => planned.find((item) => item.id === shift.id) ?? shift);
}

function minimalChangePlan(state: AppState, maxWeeklyHours: number): Shift[] {
  const baselineCost = assignmentCost(state, state.shifts);
  const candidates: Shift[][] = [];

  for (const shift of state.shifts.filter((item) => item.role === "barista" && item.workerId)) {
    const currentWorker = state.workers.find((worker) => worker.id === shift.workerId);
    if (!currentWorker) continue;
    for (const worker of state.workers) {
      if (worker.id === currentWorker.id || worker.hourlyRate >= currentWorker.hourlyRate) continue;
      if (!eligibleForShift(worker, shift) || isUnavailable(worker, shift)) continue;
      const proposed = state.shifts.map((item) => item.id === shift.id ? { ...item, workerId: worker.id, status: "scheduled" as const } : item);
      const impact = calculateImpact(state, proposed);
      if ((impact.workerWeeklyHours[worker.id] ?? 0) > maxWeeklyHours || impact.uncoveredPeakMinutes > 0) continue;
      if (impact.warnings.some((warning) => warning.code === "role_mismatch" || warning.code === "availability")) continue;
      candidates.push(proposed);
    }
  }

  return candidates.sort((a, b) => assignmentCost(state, a) - assignmentCost(state, b))[0] ?? state.shifts;
}

function changesFrom(state: AppState, proposed: Shift[]): StaffingChange[] {
  const current = new Map(state.shifts.map((shift) => [shift.id, shift]));
  return proposed.flatMap((shift) => {
    const before = current.get(shift.id);
    if (!before || !shift.workerId || before.workerId === shift.workerId && before.start === shift.start && before.end === shift.end) return [];
    return [{ shiftId: shift.id, workerId: shift.workerId, start: shift.start, end: shift.end }];
  });
}

function scenario(state: AppState, strategy: Strategy, proposed: Shift[], maxWeeklyHours: number, gap: CapacityGap | null): StaffingScenario {
  const changes = changesFrom(state, proposed);
  const impact = calculateImpact(state, applyChanges(state.shifts, changes));
  const label = strategy === "cost" ? "Cost-first week rebuild" : strategy === "balance" ? "Balanced week rebuild" : "Minimal-change week rebuild";
  return {
    id: `week-rebuild-${strategy}-${maxWeeklyHours}`,
    kind: "week_rebuild",
    title: label,
    summary: `${changes.length} shift assignments change while configured peak coverage stays intact.`,
    rationale: gap
      ? `Rebuilds the published week around a ${maxWeeklyHours}-hour limit and exposes the remaining qualified-role capacity gap instead of hiding it.`
      : `Rebuilds the published week around a ${maxWeeklyHours}-hour limit using the current team only.`,
    changes,
    impact,
    capacityGap: gap,
  };
}

export function getWeekRebuildOptions(state: AppState, request: WeekRebuildRequest = {}): StaffingScenario[] {
  const maxWeeklyHours = Math.max(1, Math.min(80, request.maxWeeklyHours ?? state.business.weeklyHourWarningThreshold));
  const gap = managerCapacityGap(state, maxWeeklyHours);
  if (gap && request.allowCapacityGap === false) return [];

  const plans: Record<Strategy, Shift[]> = {
    cost: planFullWeek(state, maxWeeklyHours, "cost"),
    balance: planFullWeek(state, maxWeeklyHours, "balance"),
    minimal_changes: minimalChangePlan(state, maxWeeklyHours),
  };
  const priority = request.prioritize ?? "cost";
  const order: Strategy[] = [priority, ...(["cost", "balance", "minimal_changes"] as Strategy[]).filter((item) => item !== priority)];

  return order
    .map((strategy) => scenario(state, strategy, plans[strategy], maxWeeklyHours, gap))
    .filter((option, index, options) => option.changes.length > 0 && options.findIndex((other) => JSON.stringify(other.changes) === JSON.stringify(option.changes)) === index)
    .slice(0, 3);
}
