import { createDemoState } from "./fixtures";
import { applyChanges, calculateImpact } from "./impact";
import { workerEligibleForShift } from "./availability";
import { getWeekRebuildOptions, type WeekRebuildPriority } from "./rebuild";
import { commitStorePlan, evaluateStorePlan } from "./store-plan";
import type { AppState, CapacityGap, IndustryId, MarketId, OperationalIncidentType, PlanKind, StaffingChange, StaffingScenario, StorePlan } from "./model";

export type ApplicationAction =
  | { type: "reset_demo" }
  | { type: "create_schedule_draft"; preset: "demo"; industry?: IndustryId; market?: MarketId }
  | { type: "mark_unavailable"; workerId: string; shiftId: string; reason?: string }
  | { type: "preview_scenario"; scenarioId: string }
  | { type: "preview_changes"; title: string; changes: StaffingChange[]; planKind?: PlanKind; capacityGap?: CapacityGap | null }
  | { type: "apply_preview"; previewId: string; version: number }
  | { type: "reject_preview" }
  | { type: "reassign_shift"; shiftId: string; workerId: string; targetDay?: string }
  | { type: "set_store_plan"; plan: StorePlan }
  | { type: "review_store_plan" }
  | { type: "apply_store_plan"; planId: string; version: number }
  | { type: "record_stock_count"; inventoryItemId: string; onHand: number }
  | { type: "complete_task"; taskId: string }
  | { type: "record_manager_note"; summary: string; incidentType?: OperationalIncidentType }
  | { type: "import_state"; state: AppState }
  | { type: "set_activity"; activity: AppState["activity"] };

function workerLabel(worker: AppState["workers"][number] | undefined, fallback = "Candidate") {
  return worker?.name ?? fallback;
}

function validateStaffingChanges(state: AppState, changes: StaffingChange[]): void {
  if (changes.length === 0 || changes.length > 16) throw new Error("A staffing preview needs one to sixteen bounded changes.");
  for (const change of changes) {
    if (!state.shifts.some((shift) => shift.id === change.shiftId)) throw new Error(`Shift ${change.shiftId} was not found in the current schedule.`);
    if (!state.workers.some((worker) => worker.id === change.workerId)) throw new Error(`Worker ${change.workerId} was not found in the current schedule.`);
  }
}

function resolveLegacyStaffingIncident(state: AppState, shiftId: string, resolvedAt: string) {
  return (state.incidents ?? []).map((incident) => incident.type === "worker_unavailable" && incident.shiftId === shiftId && incident.status !== "resolved"
    ? { ...incident, status: "resolved" as const, resolvedAt }
    : incident);
}

function getIncidentResponseOptions(state: AppState): StaffingScenario[] {
  if (!state.incident) return [];
  const shift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  if (!shift) return [];
  const candidates = state.workers
    .filter((worker) => worker.id !== state.incident?.workerId)
    .filter((worker) => workerEligibleForShift(worker, { ...shift, workerId: worker.id, status: "scheduled" }))
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

function staffingProjection(state: AppState, plan: StorePlan) {
  const staffingChanges = plan.changes.flatMap((change) => change.type === "staffing"
    ? [{ shiftId: change.shiftId, workerId: change.workerId, start: change.start, end: change.end }]
    : []);
  if (staffingChanges.length === 0) return null;
  return {
    id: plan.id,
    version: plan.version,
    scenarioId: plan.id,
    kind: "custom" as const,
    title: plan.title,
    changes: staffingChanges,
    impact: calculateImpact(state, applyChanges(state.shifts, staffingChanges)),
  };
}

function reconfigureIndustryOnly(state: AppState, industry: IndustryId): AppState {
  const configured = createDemoState(industry, state.business.market);
  const configuredWorkers = new Map(configured.workers.map((worker) => [worker.id, worker]));
  return {
    ...state,
    business: {
      ...state.business,
      industry,
      name: configured.business.name,
      targetFoodCostRatio: configured.business.targetFoodCostRatio,
      policies: configured.business.policies,
    },
    workers: state.workers.map((worker) => ({ ...worker, skills: configuredWorkers.get(worker.id)?.skills ?? worker.skills })),
    menu: configured.menu,
    inventory: configured.inventory,
    suppliers: configured.suppliers,
    purchases: configured.purchases,
    purchaseOrders: [],
    waste: configured.waste,
    tasks: configured.tasks,
    references: configured.references,
    storePlan: null,
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
      if (industry === state.business.industry && market === state.business.market) return state;
      if (market !== state.business.market) return createDemoState(industry, market);
      return reconfigureIndustryOnly(state, industry);
    }
    case "set_activity":
      return { ...state, activity: action.activity };
    case "mark_unavailable": {
      const worker = state.workers.find((item) => item.id === action.workerId);
      const shift = state.shifts.find((item) => item.id === action.shiftId);
      if (!worker || !shift || shift.workerId !== worker.id) throw new Error("Worker and shift do not match the current schedule.");
      const sequence = (state.incidents?.length ?? 0) + 1;
      const exceptionId = `availability-${shift.id}-${sequence}`;
      const incidentId = `incident-${shift.id}-${sequence}`;
      const workers = state.workers.map((item) => item.id === worker.id ? {
        ...item,
        availabilityExceptions: [...(item.availabilityExceptions ?? []), { id: exceptionId, start: shift.start, end: shift.end, available: false, reason: action.reason, source: "incident" as const }],
      } : item);
      const shifts = state.shifts.map((item) => item.id === shift.id ? { ...item, workerId: null, status: "uncovered" as const } : item);
      return {
        ...state,
        workers,
        shifts,
        preview: null,
        storePlan: null,
        incident: { type: "worker_unavailable", workerId: worker.id, shiftId: shift.id, reason: action.reason },
        incidents: [...(state.incidents ?? []), { id: incidentId, type: "worker_unavailable", status: "open", createdAt: shift.start, workerId: worker.id, shiftId: shift.id, reason: action.reason }],
        log: [...(state.log ?? []), { id: `log-${incidentId}`, createdAt: shift.start, type: "incident", summary: `${workerLabel(worker)} unavailable for ${shift.start.slice(0, 10)} ${shift.start.slice(11, 16)}–${shift.end.slice(11, 16)}.`, relatedIds: [incidentId, worker.id, shift.id] }],
        activity: { state: "warning", message: "Coverage gap detected.", detail: `${workerLabel(worker)} is unavailable for the assigned shift.`, context: "incident_recovery" },
      };
    }
    case "preview_scenario": {
      const scenario = getResponseOptions(state).find((item) => item.id === action.scenarioId);
      if (!scenario) throw new Error("Scenario is not available for the current incident.");
      const replacementName = workerLabel(state.workers.find((worker) => worker.id === scenario.changes[0]?.workerId));
      return { ...state, storePlan: null, preview: { id: `preview-${scenario.id}`, version: 1, scenarioId: scenario.id, kind: scenario.kind, title: scenario.title, changes: scenario.changes, impact: scenario.impact, capacityGap: scenario.capacityGap }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: `${replacementName} is shown as a preview only. Nothing has been committed.`, context: scenario.kind } };
    }
    case "preview_changes": {
      validateStaffingChanges(state, action.changes);
      const proposed = applyChanges(state.shifts, action.changes);
      return { ...state, storePlan: null, preview: { id: `preview-custom-${Date.now()}`, version: 1, scenarioId: "custom", kind: action.planKind ?? "custom", title: action.title, changes: action.changes, impact: calculateImpact(state, proposed), capacityGap: action.capacityGap }, activity: { state: "proposalReady", message: "Agent proposal ready.", detail: "Staffing plan is a preview only. Nothing has been committed.", context: action.planKind ?? "custom" } };
    }
    case "set_store_plan": {
      const plan = { ...action.plan, state: "preview" as const };
      return {
        ...state,
        storePlan: plan,
        preview: staffingProjection(state, plan),
        activity: { state: "proposalReady", message: "Agent operating plan ready.", detail: `${plan.changes.length} cross-domain changes are in preview.` },
      };
    }
    case "review_store_plan": {
      if (!state.storePlan) throw new Error("No store plan is open for review.");
      const reviewed = { ...state.storePlan, impact: evaluateStorePlan(state, state.storePlan.changes), state: "reviewed" as const };
      return {
        ...state,
        storePlan: reviewed,
        preview: state.preview ? { ...state.preview, version: reviewed.version } : null,
        activity: { state: "reviewed", message: "Agent reviewed live store plan.", detail: `${reviewed.changes.length} changes recalculated from current canonical state.` },
      };
    }
    case "apply_store_plan": {
      if (!state.storePlan || state.storePlan.id !== action.planId || state.storePlan.version !== action.version) throw new Error("Store plan is missing or stale. Review the current plan again.");
      const plan = state.storePlan;
      let next = commitStorePlan(state, plan);
      const resolvedShiftId = state.incident?.shiftId;
      const resolvesIncident = Boolean(resolvedShiftId && plan.changes.some((change) => change.type === "staffing" && change.shiftId === resolvedShiftId));
      if (resolvesIncident && resolvedShiftId) {
        const now = new Date().toISOString();
        next = { ...next, incident: null, incidents: resolveLegacyStaffingIncident(state, resolvedShiftId, now) };
      }
      return next;
    }
    case "record_stock_count": {
      if (!Number.isFinite(action.onHand) || action.onHand < 0) throw new Error("Stock count must be a non-negative number.");
      const item = (state.inventory ?? []).find((value) => value.id === action.inventoryItemId);
      if (!item) throw new Error(`Inventory item ${action.inventoryItemId} was not found.`);
      return {
        ...state,
        inventory: (state.inventory ?? []).map((value) => value.id === item.id ? { ...value, onHand: action.onHand } : value),
        log: [...(state.log ?? []), { id: `log-stock-${item.id}-${Date.now()}`, createdAt: `${state.context?.businessDate ?? "2026-08-28"}T12:00:00`, type: "stock", summary: `${item.name} count updated to ${action.onHand} ${item.unit}.`, relatedIds: [item.id] }],
      };
    }
    case "complete_task": {
      const task = (state.tasks ?? []).find((value) => value.id === action.taskId);
      if (!task) throw new Error(`Task ${action.taskId} was not found.`);
      return {
        ...state,
        tasks: (state.tasks ?? []).map((value) => value.id === task.id ? { ...value, status: "done" as const } : value),
        log: [...(state.log ?? []), { id: `log-task-${task.id}-${Date.now()}`, createdAt: `${state.context?.businessDate ?? "2026-08-28"}T21:55:00`, type: "task", summary: `Completed task: ${task.title}.`, relatedIds: [task.id] }],
      };
    }
    case "record_manager_note": {
      const createdAt = `${state.context?.businessDate ?? "2026-08-28"}T12:00:00`;
      const sequence = (state.incidents?.length ?? 0) + 1;
      const incident = action.incidentType ? { id: `incident-note-${sequence}`, type: action.incidentType, status: "open" as const, createdAt, reason: action.summary } : null;
      return {
        ...state,
        incidents: incident ? [...(state.incidents ?? []), incident] : state.incidents,
        log: [...(state.log ?? []), { id: `log-note-${Date.now()}`, createdAt, type: "note", summary: action.summary, relatedIds: incident ? [incident.id] : undefined }],
      };
    }
    case "reject_preview":
      return { ...state, preview: null, storePlan: null, activity: { state: state.incident ? "warning" : "idle", message: "Preview dismissed. Store state is unchanged." } };
    case "apply_preview": {
      if (!state.preview || state.preview.id !== action.previewId || state.preview.version !== action.version) throw new Error("Preview is missing or stale. Review the current option again.");
      if (state.activity.state !== "reviewed") throw new Error("Review required before applying this staffing preview.");
      const appliedWorkerName = workerLabel(state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId), state.preview.changes.length > 1 ? "The reviewed plan" : "The replacement");
      const resolvedShiftId = state.incident?.shiftId;
      const now = new Date().toISOString();
      return {
        ...state,
        shifts: applyChanges(state.shifts, state.preview.changes),
        preview: null,
        storePlan: null,
        incident: null,
        incidents: resolvedShiftId ? resolveLegacyStaffingIncident(state, resolvedShiftId, now) : state.incidents,
        activity: { state: "applied", message: "Plan applied.", detail: `${appliedWorkerName} covers the reviewed plan. Preview cleared.`, context: state.preview.kind },
      };
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
        const nextPreview = { ...state.preview, version: state.preview.version + 1, title: state.preview.title, changes, impact: calculateImpact(state, proposed) };
        let nextStorePlan = state.storePlan;
        if (nextStorePlan) {
          const nonStaffing = nextStorePlan.changes.filter((change) => change.type !== "staffing" || change.shiftId !== current.id);
          const storeChanges = [...nonStaffing, { type: "staffing" as const, shiftId: current.id, workerId: worker.id, ...movedTime }];
          nextStorePlan = { ...nextStorePlan, version: nextStorePlan.version + 1, changes: storeChanges, impact: evaluateStorePlan(state, storeChanges), state: "preview" };
          nextPreview.version = nextStorePlan.version;
        }
        return { ...state, preview: nextPreview, storePlan: nextStorePlan, activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${workerLabel(previousWorker, "Previous assignment")} → ${workerLabel(worker)}; exact candidate updated. Agent review pending.`, context: state.preview.kind } };
      }
      const shifts = state.shifts.map((item) => item.id === current.id ? { ...item, workerId: worker.id, ...movedTime, status: "scheduled" as const } : item);
      const resolvesIncident = state.incident?.shiftId === current.id;
      return {
        ...state,
        shifts,
        preview: null,
        storePlan: null,
        incident: resolvesIncident ? null : state.incident,
        incidents: resolvesIncident ? resolveLegacyStaffingIncident(state, current.id, new Date().toISOString()) : state.incidents,
        activity: { state: "reviewNeeded", message: "Human edit detected.", detail: `${workerLabel(worker)} now owns the shift in the live schedule. Agent review pending.` },
      };
    }
    case "import_state":
      return { ...action.state, preview: null, storePlan: null, activity: { state: "applied", message: "Store snapshot restored." } };
  }
}
