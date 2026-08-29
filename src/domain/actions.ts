import { createDemoState } from "./fixtures";
import { applyChanges, calculateImpact } from "./impact";
import { getIndustryProfile } from "@/industry/profiles";
import { getWeekRebuildOptions, type WeekRebuildPriority } from "./rebuild";
import type { AppState, CapacityGap, IndustryId, MarketId, PlanKind, StaffingChange, StaffingScenario } from "./model";

export type ApplicationAction =
  | { type: "reset_demo" }
  | { type: "create_schedule_draft"; preset: "demo"; industry?: IndustryId; market?: MarketId }
  | { type: "mark_unavailable"; workerId: string; shiftId: string; reason?: string }
  | { type: "preview_scenario"; scenarioId: string }
  | { type: "preview_changes"; title: string; changes: StaffingChange[]; planKind?: PlanKind; capacityGap?: CapacityGap | null }
  | { type: "apply_preview"; previewId: string; version: number }
  | { type: "reject_preview" }
  | { type: "reassign_shift"; shiftId: string; workerId: string; targetDay?: string }
  | { type: "import_state"; state: AppState }
  | { type: "set_activity"; activity: AppState["activity"] };

function workerLabel(worker: AppState["workers"][number] | undefined, fallback = "Candidate") {
  return worker?.name ?? fallback;
}

function unavailable(worker: AppState["workers"][number], start: string, end: string): boolean {
  return Boolean(worker.availability?.some((window) => !window.available && new Date(window.start) < new Date(end) && new Date(window.end) > new Date(start)));
}

function validateStaffingChanges(state: AppState, changes: StaffingChange[]): void {
  if (changes.length === 0 || changes.length > 16) throw new Error("A staffing preview needs one to sixteen bounded changes.");
  for (const change of changes) {
    if (!state.shifts.some((shift) => shift.id === change.shiftId)) throw new Error(`Shift ${change.shiftId} was not found in the current schedule.`);
    if (!state.workers.some((worker) => worker.id === change.workerId)) throw new Error(`Worker ${change.workerId} was not found in the current schedule.`);
  }
}

function getIncidentResponseOptions(state: AppState): StaffingScenario[] {
  if (!state.incident) return [];
  const shift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  if (!shift) return [];
  const candidates = state.workers
    .filter((worker) => worker.id !== state.incident?.workerId)
    .filter((worker) => worker.role === shift.role || (worker.role === "manager" && shift.role === "barista"))
    .filter((worker) => !unavailable(worker, shift.start, shift.end))
    .map((worker) => {
      const label = workerLabel(worker);
      const changes = [{ shiftId: shift.id, workerId: worker.id }];
      const impact = calculateImpact(state, applyChanges(state.shifts, changes));
      return {
        id: `cover-${shift.id}-${worker.id}`,
        kind: "incident_recovery",
        title: `${label} covers the shift`,
        summary: `${label} takes ${shift.start.slice(11, 16)}–${shift.end.slice(11, 16)} as a single reassignment.`,
        rationale: `Restores peak coverage with one schedule change; net wage impact is calculated against the originally assigned worker.`,
        changes,
        impact,
      } satisfies StaffingScenario;
    });

  return candidates
    .sort((a, b) => a.impact.uncoveredPeakMinutes - b.impact.uncoveredPeakMinutes || a.impact.warnings.length - b.impact.warnings.length || a.impact.payrollDelta - b.impact.payrollDelta || a.impact.scheduleChangeCount - b.impact.scheduleChangeCount)
    .slice(0, 3);
}

export type ResponseOptionRequest = {
  objective?: "incident_recovery" | "rebuild_week";
  maxWeeklyHours?: number;
  prioritize?: WeekRebuildPriority;
  allowCapacityGap?: boolean;
};

export function getResponseOptions(state: AppState, request: ResponseOptionRequest = {}): StaffingScenario[] {
  if (request.objective === "rebuild_week") {
    return getWeekRebuildOptions(state, {
      maxWeeklyHours: request.maxWeeklyHours,
      prioritize: request.prioritize,
      allowCapacityGap: request.allowCapacityGap,
    });
  }
  return getIncidentResponseOptions(state);
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
    case "create_schedule_draft": {
      if (action.industry === undefined && action.market === undefined) return state;
      const industry = action.industry ?? state.business.industry;
      const market = action.market ?? state.business.market;
      if (market !== state.business.market) return createDemoState(industry, market);
      if (industry === state.business.industry) return state;
      const profile = getIndustryProfile(industry);
      return { ...state, business: { ...state.business, industry, name: profile.businessName } };
    }
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
        activity: { state: "warning", message: "Coverage gap detected.", detail: `${workerLabel(worker)} is unavailable for the Friday evening shift.`, context: "incident_recovery" },
      };
    }
    case "preview_scenario": {
      const scenario = getResponseOptions(state).find((item) => item.id === action.scenarioId);
      if (!scenario) throw new Error("Scenario is not available for the current incident.");
      const replacementName = workerLabel(state.workers.find((worker) => worker.id === scenario.changes[0]?.workerId));
      return { ...state, preview: { id: `preview-${scenario.id}`, version: 1, scenarioId: scenario.id, kind: scenario.kind, title: scenario.title, changes: scenario.changes, impact: scenario.impact, capacityGap: scenario.capacityGap }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: `${replacementName} is shown as a preview only. Nothing has been committed.`, context: scenario.kind } };
    }
    case "preview_changes": {
      validateStaffingChanges(state, action.changes);
      const proposed = applyChanges(state.shifts, action.changes);
      return { ...state, preview: { id: `preview-custom-${Date.now()}`, version: 1, scenarioId: "custom", kind: action.planKind ?? "custom", title: action.title, changes: action.changes, impact: calculateImpact(state, proposed), capacityGap: action.capacityGap }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: "Staffing plan is a preview only. Nothing has been committed.", context: action.planKind ?? "custom" } };
    }
    case "reject_preview":
      return { ...state, preview: null, activity: { state: state.incident ? "warning" : "idle", message: "Preview dismissed. Schedule is unchanged." } };
    case "apply_preview": {
      if (!state.preview || state.preview.id !== action.previewId || state.preview.version !== action.version) throw new Error("Preview is missing or stale. Review the current option again.");
      if (state.activity.state !== "reviewed") throw new Error("Review required before applying this staffing preview.");
      const appliedWorkerName = workerLabel(state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId), "The replacement");
      return { ...state, shifts: applyChanges(state.shifts, state.preview.changes), preview: null, incident: null, activity: { state: "applied", message: "Plan applied.", detail: `${appliedWorkerName} covers the reviewed plan. Preview cleared.`, context: state.preview.kind } };
    }
    case "reassign_shift": {
      const current = state.shifts.find((item) => item.id === action.shiftId);
      const worker = state.workers.find((item) => item.id === action.workerId);
      if (!current || !worker) throw new Error("Shift or worker was not found.");
      const candidateCurrent = state.preview ? applyChanges(state.shifts, state.preview.changes).find((item) => item.id === current.id) ?? current : current;
      const movedTime = action.targetDay ? shiftToDay(candidateCurrent.start, candidateCurrent.end, action.targetDay) : { start: candidateCurrent.start, end: candidateCurrent.end };
      if (state.preview) {
        const previousWorker = state.workers.find((item) => item.id === candidateCurrent.workerId);
        const nextChange = { shiftId: current.id, workerId: worker.id, ...movedTime };
        const hasExistingChange = state.preview.changes.some((change) => change.shiftId === current.id);
        const changes = hasExistingChange
          ? state.preview.changes.map((change) => change.shiftId === current.id ? { ...change, ...nextChange } : change)
          : [...state.preview.changes, nextChange];
        validateStaffingChanges(state, changes);
        const proposed = applyChanges(state.shifts, changes);
        return { ...state, preview: { ...state.preview, version: state.preview.version + 1, title: state.preview.title, changes, impact: calculateImpact(state, proposed) }, activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${workerLabel(previousWorker, "Previous assignment")} → ${workerLabel(worker)}; exact candidate updated. Agent review pending.`, context: state.preview.kind } };
      }
      const shifts = state.shifts.map((item) => item.id === current.id ? { ...item, workerId: worker.id, ...movedTime, status: "scheduled" as const } : item);
      return { ...state, shifts, preview: null, incident: state.incident?.shiftId === current.id ? null : state.incident, activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${workerLabel(worker)} now owns the shift in the live schedule. Agent review pending.` } };
    }
    case "import_state":
      return { ...action.state, preview: null, activity: { state: "applied", message: "Schedule snapshot restored." } };
  }
}
