import { getResponseOptions, type ApplicationAction } from "@/domain/actions";
import { applyChanges, calculateImpact } from "@/domain/impact";
import { getIndustryProfile, isIndustryId } from "@/industry/profiles";
import type { AppState, IndustryId, StaffingChange } from "@/domain/model";
import { parseSnapshot } from "@/snapshot/snapshot";

type JsonSchema = Record<string, unknown>;
type ToolExecuteOptions = { signal: AbortSignal };
type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, options: ToolExecuteOptions) => Promise<unknown> | unknown;
};
type ModelContext = { registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void> };

declare global {
  interface Document { modelContext?: ModelContext }
}

export type ToolBridge = {
  getState: () => AppState;
  runAction: (action: ApplicationAction) => AppState;
};

const emptySchema = { type: "object", properties: {}, additionalProperties: false };
const stringField = (description: string) => ({ type: "string", description });

function businessState(state: AppState) {
  const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
  const impact = calculateImpact(state, planShifts, state.shifts);
  const profile = getIndustryProfile(state.business.industry);
  return {
    summary: `${state.business.name}: ${state.shifts.length} shifts, ${impact.warnings.length} active warnings.`,
    business: { ...state.business, industryLabel: profile.label },
    workers: state.workers.map((worker) => ({ ...worker, roleLabel: profile.roleLabels[worker.role], weeklyHours: impact.workerWeeklyHours[worker.id] ?? 0 })),
    shifts: planShifts.map((shift) => ({ ...shift, roleLabel: profile.roleLabels[shift.role] })),
    incident: state.incident,
    preview: state.preview,
    metrics: {
      projectedLaborCost: impact.projectedLaborCost,
      laborRatio: impact.laborRatio,
      targetLaborRatio: state.business.targetLaborRatio,
      warnings: impact.warnings,
    },
  };
}

export function createToolExecutors(bridge: ToolBridge) {
  return {
    getBusinessState: () => businessState(bridge.getState()),
    createScheduleDraft: (input: { preset?: unknown; industry?: unknown } = { preset: "demo" }) => {
      if (input.preset !== "demo") throw new Error("Only preset 'demo' is supported.");
      if (input.industry !== undefined && !isIndustryId(input.industry)) throw new Error(`Unsupported industry profile: ${String(input.industry)}.`);
      return businessState(bridge.runAction({ type: "create_schedule_draft", preset: "demo", industry: input.industry as IndustryId | undefined }));
    },
    markWorkerUnavailable: (input: { workerId: string; shiftId: string; reason?: string }) => {
      const next = bridge.runAction({ type: "mark_unavailable", ...input });
      return { summary: "The shift is uncovered; no replacement was assigned.", incident: next.incident, shift: next.shifts.find((item) => item.id === input.shiftId) };
    },
    getResponseOptions: () => {
      const options = getResponseOptions(bridge.getState());
      if (options.length === 3) {
        bridge.runAction({ type: "set_activity", activity: { state: "proposalReady", message: "Compared three recovery options.", detail: "Three bounded options are ready to preview." } });
      }
      return { summary: options.length === 3 ? "Three recovery options are ready." : "No complete three-option set is available for the current incident.", count: options.length, options };
    },
    previewStaffingChange: (input: { scenarioId?: string; title?: string; changes?: StaffingChange[] }) => {
      const next = input.scenarioId
        ? bridge.runAction({ type: "preview_scenario", scenarioId: input.scenarioId })
        : bridge.runAction({ type: "preview_changes", title: input.title ?? "Custom staffing change", changes: input.changes ?? [] });
      return { summary: "Preview only — nothing has been committed.", preview: next.preview };
    },
    evaluateCurrentPlan: () => {
      const state = bridge.getState();
      const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
      const impact = calculateImpact(state, planShifts, state.shifts);
      const candidate = state.preview?.changes[0] ? state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId)?.name : undefined;
      bridge.runAction({ type: "set_activity", activity: { state: "reviewed", message: "Agent reviewed live plan.", detail: `${candidate ? `${candidate} candidate` : "Current schedule"} reviewed from the exact live state. Ready to apply.` } });
      return { summary: `Current live schedule has ${impact.warnings.length} warnings and a ${(impact.laborRatio * 100).toFixed(1)}% estimated labor ratio.`, impact };
    },
    applyStaffingChange: (input: { previewId: string; version: number }) => {
      const next = bridge.runAction({ type: "apply_preview", previewId: input.previewId, version: input.version });
      return { summary: "The reviewed staffing change was committed.", impact: calculateImpact(next), preview: next.preview };
    },
    importScheduleSnapshot: (input: { snapshotText: string }) => {
      const parsed = parseSnapshot(input.snapshotText);
      const next = bridge.runAction({ type: "import_state", state: parsed });
      return { summary: "Schedule snapshot restored successfully.", state: businessState(next) };
    },
  };
}

export function registerOwnerOpsTools(bridge: ToolBridge): { supported: boolean; dispose: () => void } {
  if (typeof document === "undefined" || !document.modelContext) return { supported: false, dispose: () => undefined };
  const controller = new AbortController();
  const tools = createToolExecutors(bridge);
  const register = (promise: Promise<void>) => promise.catch((error) => {
    if (!controller.signal.aborted) bridge.runAction({ type: "set_activity", activity: { state: "error", message: "WebMCP tool registration failed.", detail: error instanceof Error ? error.message : "Unknown registration error" } });
  });

  register(document.modelContext.registerTool({
    name: "get_business_state",
    title: "Get live business state",
    description: "Inspect the exact OwnerOps schedule currently visible to the user, including workers, shifts, incident, preview, labor estimate, weekly hours, and warnings.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.getBusinessState(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "create_schedule_draft",
    title: "Create demo schedule draft",
    description: "Create the bounded weekly demo schedule in the live OwnerOps page. The optional industry selects a generic business profile; external agents should map branded language to the nearest generic category without reproducing a branded visual identity.",
    inputSchema: { type: "object", properties: { preset: { type: "string", enum: ["demo"], description: "The only supported MVP draft preset." }, industry: { type: "string", enum: ["diner", "pizza", "coffee", "salon", "sushi", "curry"], description: "Optional generic industry profile; defaults to diner." } }, required: ["preset"], additionalProperties: false },
    execute: async (input) => {
      return tools.createScheduleDraft({ preset: input.preset, industry: input.industry });
    },
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "mark_worker_unavailable",
    title: "Mark worker unavailable",
    description: "Mark an assigned worker unavailable for an existing shift. The shift becomes uncovered and no replacement is assigned automatically.",
    inputSchema: { type: "object", properties: { workerId: stringField("Stable worker id."), shiftId: stringField("Stable assigned shift id."), reason: stringField("Optional short operational reason.") }, required: ["workerId", "shiftId"], additionalProperties: false },
    execute: async (input) => tools.markWorkerUnavailable(input as { workerId: string; shiftId: string; reason?: string }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "get_response_options",
    title: "Compare staffing recovery options",
    description: "Return exactly three deterministic recovery options for the current uncovered incident when the demo fixture supports them. Does not change the committed schedule.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.getResponseOptions(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "preview_staffing_change",
    title: "Preview staffing change",
    description: "Display a recovery scenario or bounded shift reassignment in the schedule as a candidate preview without committing it.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: stringField("Id returned by get_response_options."),
        title: stringField("Short title for an explicit bounded change set."),
        changes: { type: "array", maxItems: 3, items: { type: "object", properties: { shiftId: stringField("Existing shift id."), workerId: stringField("Replacement worker id."), start: stringField("Optional ISO local start."), end: stringField("Optional ISO local end.") }, required: ["shiftId", "workerId"], additionalProperties: false } },
      },
      anyOf: [{ required: ["scenarioId"] }, { required: ["changes"] }],
      additionalProperties: false,
    },
    execute: async (input) => tools.previewStaffingChange(input as { scenarioId?: string; title?: string; changes?: StaffingChange[] }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "evaluate_current_plan",
    title: "Evaluate current live plan",
    description: "Evaluate the exact schedule state currently visible after human edits, using the same deterministic calculations as the OwnerOps UI.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.evaluateCurrentPlan(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "apply_staffing_change",
    title: "Apply reviewed staffing change",
    description: "Commit the current reviewed preview only when its id and version still match, then clear the preview and recalculate impact.",
    inputSchema: { type: "object", properties: { previewId: stringField("Current preview id shown by OwnerOps."), version: { type: "number", description: "Current preview version; prevents stale apply." } }, required: ["previewId", "version"], additionalProperties: false },
    execute: async (input) => tools.applyStaffingChange(input as { previewId: string; version: number }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "import_schedule_snapshot",
    title: "Import OwnerOps schedule snapshot",
    description: "Validate and transactionally restore a portable OWNEROPS_SNAPSHOT v1 document. Invalid input leaves the current state unchanged.",
    inputSchema: { type: "object", properties: { snapshotText: { type: "string", minLength: 40, maxLength: 100000, description: "Complete OWNEROPS_SNAPSHOT v1 text." } }, required: ["snapshotText"], additionalProperties: false },
    execute: async (input) => tools.importScheduleSnapshot(input as { snapshotText: string }),
  }, { signal: controller.signal }));

  return { supported: true, dispose: () => controller.abort() };
}
