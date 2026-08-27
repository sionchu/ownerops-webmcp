import { createDemoState } from "./fixtures";
import { applyChanges, calculateImpact } from "./impact";
import type { AppState, StaffingChange, StaffingScenario } from "./model";

export type ApplicationAction =
  | { type: "reset_demo" }
  | { type: "create_schedule_draft"; preset: "demo" }
  | { type: "mark_unavailable"; workerId: string; shiftId: string; reason?: string }
  | { type: "preview_scenario"; scenarioId: string }
  | { type: "preview_changes"; title: string; changes: StaffingChange[] }
  | { type: "apply_preview"; previewId: string; version: number }
  | { type: "reject_preview" }
  | { type: "reassign_shift"; shiftId: string; workerId: string; targetDay?: string }
  | { type: "import_state"; state: AppState }
  | { type: "set_activity"; activity: AppState["activity"] };

function unavailable(worker: AppState["workers"][number], start: string, end: string): boolean {
  return Boolean(worker.availability?.some((window) => !window.available && new Date(window.start) < new Date(end) && new Date(window.end) > new Date(start)));
}

export function getResponseOptions(state: AppState): StaffingScenario[] {
  if (!state.incident) return [];
  const shift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  if (!shift) return [];
  const candidates = state.workers
    .filter((worker) => worker.id !== state.incident?.workerId)
    .filter((worker) => worker.role === shift.role || (worker.role === "manager" && shift.role === "barista"))
    .filter((worker) => !unavailable(worker, shift.start, shift.end))
    .map((worker) => {
      const changes = [{ shiftId: shift.id, workerId: worker.id }];
      const impact = calculateImpact(state, applyChanges(state.shifts, changes), state.shifts);
      return {
        id: `cover-${shift.id}-${worker.id}`,
        title: `${worker.name} covers the shift`,
        summary: `${worker.name} takes ${shift.start.slice(11, 16)}–${shift.end.slice(11, 16)} as a single reassignment.`,
        rationale: `Restores peak coverage with one schedule change; estimated labor ratio ${(impact.laborRatio * 100).toFixed(1)}%.`,
        changes,
        impact,
      } satisfies StaffingScenario;
    });

  return candidates
    .sort((a, b) => a.impact.uncoveredPeakMinutes - b.impact.uncoveredPeakMinutes || a.impact.warnings.length - b.impact.warnings.length || a.impact.payrollDelta - b.impact.payrollDelta || a.impact.scheduleChangeCount - b.impact.scheduleChangeCount)
    .slice(0, 3);
}

function shiftToDay(start: string, end: string, targetDay: string) {
  return {
    start: `${targetDay}${start.slice(10)}`,
    end: `${targetDay}${end.slice(10)}`,
  };
}

export function dispatchApplicationAction(state: AppState, action: ApplicationAction): AppState {
  switch (action.type) {
    case "reset_demo":
    case "create_schedule_draft":
      return createDemoState();
    case "set_activity":
      return { ...state, activity: action.activity };
    case "mark_unavailable": {
      const worker = state.workers.find((item) => item.id === action.workerId);
      const shift = state.shifts.find((item) => item.id === action.shiftId);
      if (!worker || !shift || shift.workerId !== worker.id) throw new Error("Worker and shift do not match the current schedule.");
      const workers = state.workers.map((item) => item.id === worker.id ? { ...item, availability: [...(item.availability ?? []), { start: shift.start, end: shift.end, available: false }] } : item);
      const shifts = state.shifts.map((item) => item.id === shift.id ? { ...item, workerId: null, status: "uncovered" as const } : item);
      return {
        ...state,
        workers,
        shifts,
        preview: null,
        incident: { type: "worker_unavailable", workerId: worker.id, shiftId: shift.id, reason: action.reason },
        activity: { state: "warning", message: "Coverage gap detected.", detail: `${worker.name} is unavailable for the Friday evening shift.` },
      };
    }
    case "preview_scenario": {
      const scenario = getResponseOptions(state).find((item) => item.id === action.scenarioId);
      if (!scenario) throw new Error("Scenario is not available for the current incident.");
      return { ...state, preview: { id: `preview-${scenario.id}`, version: 1, scenarioId: scenario.id, title: scenario.title, changes: scenario.changes, impact: scenario.impact }, activity: { state: "proposalReady", message: "Staffing change is ready to review.", detail: "Preview only — nothing has been committed." } };
    }
    case "preview_changes": {
      const proposed = applyChanges(state.shifts, action.changes);
      return { ...state, preview: { id: `preview-custom-${Date.now()}`, version: 1, scenarioId: "custom", title: action.title, changes: action.changes, impact: calculateImpact(state, proposed, state.shifts) }, activity: { state: "proposalReady", message: "Custom staffing change is ready to review.", detail: "Preview only — nothing has been committed." } };
    }
    case "reject_preview":
      return { ...state, preview: null, activity: { state: state.incident ? "warning" : "idle", message: "Preview dismissed. Schedule is unchanged." } };
    case "apply_preview": {
      if (!state.preview || state.preview.id !== action.previewId || state.preview.version !== action.version) throw new Error("Preview is missing or stale. Review the current option again.");
      return { ...state, shifts: applyChanges(state.shifts, state.preview.changes), preview: null, incident: null, activity: { state: "applied", message: "Schedule updated.", detail: "The reviewed staffing change is now committed." } };
    }
    case "reassign_shift": {
      const current = state.shifts.find((item) => item.id === action.shiftId);
      const worker = state.workers.find((item) => item.id === action.workerId);
      if (!current || !worker) throw new Error("Shift or worker was not found.");
      const movedTime = action.targetDay ? shiftToDay(current.start, current.end, action.targetDay) : { start: current.start, end: current.end };
      if (state.preview && state.preview.changes.some((change) => change.shiftId === current.id)) {
        const changes = state.preview.changes.map((change) => change.shiftId === current.id ? { ...change, workerId: worker.id, ...movedTime } : change);
        const proposed = applyChanges(state.shifts, changes);
        return { ...state, preview: { ...state.preview, version: state.preview.version + 1, title: `${worker.name} covers the shift`, changes, impact: calculateImpact(state, proposed, state.shifts) }, activity: { state: "checking", message: "Preview updated from your edit.", detail: `Reassigned to ${worker.name}; impact has been recalculated.` } };
      }
      const shifts = state.shifts.map((item) => item.id === current.id ? { ...item, workerId: worker.id, ...movedTime, status: "scheduled" as const } : item);
      return { ...state, shifts, preview: null, incident: state.incident?.shiftId === current.id ? null : state.incident, activity: { state: "checking", message: "Manual edit evaluated.", detail: `${worker.name} now owns the shift in the live schedule.` } };
    }
    case "import_state":
      return { ...action.state, preview: null, activity: { state: "applied", message: "Schedule snapshot restored." } };
  }
}
