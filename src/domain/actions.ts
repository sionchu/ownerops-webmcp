import { createDemoState } from "./fixtures";
import { applyChanges, calculateImpact } from "./impact";
import type { AppState, IndustryId, StaffingChange, StaffingScenario } from "./model";

export type ApplicationAction =
  | { type: "reset_demo" }
  | { type: "create_schedule_draft"; preset: "demo"; industry?: IndustryId }
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

function validateStaffingChanges(state: AppState, changes: StaffingChange[]): void {
  if (changes.length === 0 || changes.length > 3) throw new Error("A staffing preview needs one to three bounded changes.");
  for (const change of changes) {
    if (!state.shifts.some((shift) => shift.id === change.shiftId)) throw new Error(`Shift ${change.shiftId} was not found in the current schedule.`);
    if (!state.workers.some((worker) => worker.id === change.workerId)) throw new Error(`Worker ${change.workerId} was not found in the current schedule.`);
  }
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
      return createDemoState();
    case "create_schedule_draft":
      return createDemoState(action.industry ?? "diner");
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
      const replacementName = state.workers.find((worker) => worker.id === scenario.changes[0]?.workerId)?.name ?? "Candidate";
      return { ...state, preview: { id: `preview-${scenario.id}`, version: 1, scenarioId: scenario.id, title: scenario.title, changes: scenario.changes, impact: scenario.impact }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: `${replacementName} is shown as a preview only. Nothing has been committed.` } };
    }
    case "preview_changes": {
      validateStaffingChanges(state, action.changes);
      const proposed = applyChanges(state.shifts, action.changes);
      return { ...state, preview: { id: `preview-custom-${Date.now()}`, version: 1, scenarioId: "custom", title: action.title, changes: action.changes, impact: calculateImpact(state, proposed, state.shifts) }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: "Custom staffing change is a preview only. Nothing has been committed." } };
    }
    case "reject_preview":
      return { ...state, preview: null, activity: { state: state.incident ? "warning" : "idle", message: "Preview dismissed. Schedule is unchanged." } };
    case "apply_preview": {
      if (!state.preview || state.preview.id !== action.previewId || state.preview.version !== action.version) throw new Error("Preview is missing or stale. Review the current option again.");
      const appliedWorkerName = state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId)?.name ?? "The replacement";
      return { ...state, shifts: applyChanges(state.shifts, state.preview.changes), preview: null, incident: null, activity: { state: "applied", message: "Plan applied.", detail: `${appliedWorkerName} covers the reviewed shift. Preview cleared.` } };
    }
    case "reassign_shift": {
      const current = state.shifts.find((item) => item.id === action.shiftId);
      const worker = state.workers.find((item) => item.id === action.workerId);
      if (!current || !worker) throw new Error("Shift or worker was not found.");
      const movedTime = action.targetDay ? shiftToDay(current.start, current.end, action.targetDay) : { start: current.start, end: current.end };
      if (state.preview && state.preview.changes.some((change) => change.shiftId === current.id)) {
        const currentChange = state.preview.changes.find((change) => change.shiftId === current.id);
        const previousWorker = state.workers.find((item) => item.id === currentChange?.workerId);
        const changes = state.preview.changes.map((change) => change.shiftId === current.id ? { ...change, workerId: worker.id, ...movedTime } : change);
        const proposed = applyChanges(state.shifts, changes);
        return { ...state, preview: { ...state.preview, version: state.preview.version + 1, title: `${worker.name} covers the shift`, changes, impact: calculateImpact(state, proposed, state.shifts) }, activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${previousWorker?.name ?? "Proposed replacement"} → ${worker.name}; local impact updated. Agent review pending.` } };
      }
      const shifts = state.shifts.map((item) => item.id === current.id ? { ...item, workerId: worker.id, ...movedTime, status: "scheduled" as const } : item);
      return { ...state, shifts, preview: null, incident: state.incident?.shiftId === current.id ? null : state.incident, activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${worker.name} now owns the shift in the live schedule. Agent review pending.` } };
    }
    case "import_state":
      return { ...action.state, preview: null, activity: { state: "applied", message: "Schedule snapshot restored." } };
  }
}
