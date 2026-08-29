import type { AppState, PlanImpact, RuleWarning, Shift, StaffingChange, Worker } from "./model";

export function hoursBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
}

export function weeklyHours(workers: Worker[], shifts: Shift[]): Record<string, number> {
  return Object.fromEntries(
    workers.map((worker) => [worker.id, shifts.filter((item) => item.workerId === worker.id && item.status === "scheduled").reduce((sum, item) => sum + hoursBetween(item.start, item.end), 0)]),
  );
}

export function estimatedPayroll(workers: Worker[], shifts: Shift[]): number {
  const rates = new Map(workers.map((worker) => [worker.id, worker.hourlyRate]));
  return shifts.reduce((sum, item) => (item.workerId && item.status === "scheduled" ? sum + hoursBetween(item.start, item.end) * (rates.get(item.workerId) ?? 0) : sum), 0);
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

function nightOverlap(shift: Shift): boolean {
  const startHour = new Date(shift.start).getHours();
  const endHour = new Date(shift.end).getHours();
  return startHour < 6 || endHour > 22 || (endHour === 0 && hoursBetween(shift.start, shift.end) > 0);
}

export function applyChanges(shifts: Shift[], changes: StaffingChange[]): Shift[] {
  const byId = new Map(changes.map((change) => [change.shiftId, change]));
  return shifts.map((item) => {
    const change = byId.get(item.id);
    return change
      ? { ...item, workerId: change.workerId, start: change.start ?? item.start, end: change.end ?? item.end, status: "scheduled" as const }
      : item;
  });
}

export function collectWarnings(state: AppState, shifts = state.shifts): { warnings: RuleWarning[]; uncoveredPeakMinutes: number } {
  const warnings: RuleWarning[] = [];
  const workers = new Map(state.workers.map((worker) => [worker.id, worker]));
  const hours = weeklyHours(state.workers, shifts);

  for (const worker of state.workers) {
    if ((hours[worker.id] ?? 0) > state.business.weeklyHourWarningThreshold) {
      warnings.push({ code: "weekly_hours", severity: "warning", workerId: worker.id, message: `${worker.name} is scheduled for ${hours[worker.id]} hours, above the configured ${state.business.weeklyHourWarningThreshold}-hour review threshold.` });
    }
  }

  for (const item of shifts) {
    if (!item.workerId || item.status === "uncovered") continue;
    const worker = workers.get(item.workerId);
    if (!worker) continue;
    if (worker.role !== item.role && !(worker.role === "manager" && item.role === "barista")) {
      warnings.push({ code: "role_mismatch", severity: "warning", workerId: worker.id, shiftId: item.id, message: `${worker.name}'s role does not match this ${item.role} shift.` });
    }
    if (worker.availability?.some((window) => !window.available && overlaps(item.start, item.end, window.start, window.end))) {
      warnings.push({ code: "availability", severity: "warning", workerId: worker.id, shiftId: item.id, message: `${worker.name} is unavailable during this shift.` });
    }
    if (nightOverlap(item)) {
      warnings.push({ code: "night_work", severity: "info", workerId: worker.id, shiftId: item.id, message: `${worker.name}'s shift overlaps the configured night-work window.` });
    }
  }

  let uncoveredPeakMinutes = 0;
  for (const peak of state.business.peakWindows) {
    const peakStart = new Date(`${peak.day}T${peak.start}:00`).getTime();
    const peakEnd = new Date(`${peak.day}T${peak.end}:00`).getTime();
    let shortfall = 0;
    for (let time = peakStart; time < peakEnd; time += 30 * 60_000) {
      const segmentEnd = time + 30 * 60_000;
      const coverage = shifts.filter((item) => item.workerId && item.status === "scheduled" && new Date(item.start).getTime() < segmentEnd && new Date(item.end).getTime() > time).length;
      if (coverage < peak.minCoverage) shortfall += 30;
    }
    if (shortfall > 0) {
      uncoveredPeakMinutes += shortfall;
      warnings.push({ code: "peak_coverage", severity: "warning", message: `${peak.day} peak coverage is below ${peak.minCoverage} people for ${shortfall} minutes.` });
    }
  }
  return { warnings, uncoveredPeakMinutes };
}

export function decisionBaselineShifts(state: AppState): Shift[] {
  if (!state.incident) return state.shifts;
  return state.shifts.map((shift) => shift.id === state.incident?.shiftId
    ? { ...shift, workerId: state.incident.workerId, status: "scheduled" as const }
    : shift);
}

export function calculateImpact(state: AppState, shifts = state.shifts, baselineShifts = decisionBaselineShifts(state)): PlanImpact {
  const projectedLaborCost = estimatedPayroll(state.workers, shifts);
  const expectedSales = Object.values(state.business.expectedSalesByDay).reduce((sum, value) => sum + value, 0);
  const { warnings, uncoveredPeakMinutes } = collectWarnings(state, shifts);
  const baseline = new Map(baselineShifts.map((item) => [item.id, item]));
  const scheduleChangeCount = shifts.filter((item) => {
    const before = baseline.get(item.id);
    return !before || before.workerId !== item.workerId || before.start !== item.start || before.end !== item.end || before.status !== item.status;
  }).length;
  return {
    payrollDelta: projectedLaborCost - estimatedPayroll(state.workers, baselineShifts),
    projectedLaborCost,
    laborRatio: expectedSales > 0 ? projectedLaborCost / expectedSales : 0,
    workerWeeklyHours: weeklyHours(state.workers, shifts),
    warnings,
    uncoveredPeakMinutes,
    scheduleChangeCount,
  };
}
