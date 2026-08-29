import { getResponseOptions, type ApplicationAction, type ResponseOptionRequest } from "@/domain/actions";
import { applyChanges, calculateImpact } from "@/domain/impact";
import { getIndustryProfile, isIndustryId } from "@/industry/profiles";
import type { AppState, CapacityGap, IndustryId, MarketId, PlanKind, StaffingChange } from "@/domain/model";
import { getLocalizedIndustryProfile, isUiLocale, SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n";
import { getMarketLocation, getMarketProfile, isMarketId, MARKET_PROFILES } from "@/market/profiles";
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
  getLocale: () => UiLocale;
  runAction: (action: ApplicationAction) => AppState;
  setLocale: (locale: UiLocale) => void;
};

const emptySchema = { type: "object", properties: {}, additionalProperties: false };
const stringField = (description: string) => ({ type: "string", description });
const uiLocaleField = {
  type: "string",
  enum: SUPPORTED_UI_LOCALES,
  description: "Required UI language. Match the language of the user's latest instruction: en, ko, ja, es, or zh-CN. Language is independent from market/country.",
};
const marketField = {
  type: "string",
  enum: Object.keys(MARKET_PROFILES),
  description: "Optional labor market used for worker display names, currency, and wage reference: kr-seoul, us-nyc, jp-tokyo, es-madrid, or cn-shanghai. Set this only when the user explicitly indicates a country/city/market or asks for that market's wage context. Do not infer market from language; a Spanish-speaking owner can operate in New York. If omitted, preserve the current market.",
};

function displayName(worker: AppState["workers"][number] | undefined) {
  return worker?.displayName ?? worker?.name;
}

function businessState(state: AppState, locale: UiLocale) {
  const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
  const impact = calculateImpact(state, planShifts);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const market = getMarketProfile(state.business.market);
  return {
    summary: `${state.business.name}: ${state.shifts.length} shifts, ${impact.warnings.length} active warnings.`,
    uiLocale: locale,
    business: {
      ...state.business,
      industryLabel: profile.label,
      marketLabel: getMarketLocation(state.business.market, locale),
      wageReference: market.wageReference,
    },
    workers: state.workers.map((worker) => ({
      ...worker,
      displayName: displayName(worker),
      roleLabel: profile.roleLabels[worker.role],
      demoContact: market.workerContacts[worker.id] ?? null,
      weeklyHours: impact.workerWeeklyHours[worker.id] ?? 0,
    })),
    shifts: planShifts.map((shift) => ({ ...shift, roleLabel: profile.roleLabels[shift.role] })),
    incident: state.incident,
    preview: state.preview,
    planKind: state.preview?.kind ?? state.activity.context ?? null,
    capacityGap: state.preview?.capacityGap ?? null,
    metrics: {
      projectedLaborCost: impact.projectedLaborCost,
      currency: state.business.currency,
      laborRatio: impact.laborRatio,
      targetLaborRatio: state.business.targetLaborRatio,
      warnings: impact.warnings,
    },
  };
}

export function createToolExecutors(bridge: ToolBridge) {
  const requireUiLocale = (uiLocale: unknown): UiLocale => {
    if (uiLocale === undefined) throw new Error("uiLocale is required for state-changing OwnerOps tools. Re-read the current Site Tools schema and retry with en, ko, ja, es, or zh-CN matching the user's latest instruction.");
    if (!isUiLocale(uiLocale)) throw new Error(`Unsupported UI locale: ${String(uiLocale)}.`);
    bridge.setLocale(uiLocale);
    return uiLocale;
  };

  return {
    getBusinessState: () => businessState(bridge.getState(), bridge.getLocale()),
    createScheduleDraft: (input: { preset?: unknown; industry?: unknown; market?: unknown; uiLocale?: unknown } = { preset: "demo" }) => {
      if (input.preset !== "demo") throw new Error("Only preset 'demo' is supported.");
      if (input.industry !== undefined && !isIndustryId(input.industry)) throw new Error(`Unsupported industry profile: ${String(input.industry)}.`);
      if (input.market !== undefined && !isMarketId(input.market)) throw new Error(`Unsupported market profile: ${String(input.market)}.`);
      const locale = requireUiLocale(input.uiLocale);
      const next = bridge.runAction({
        type: "create_schedule_draft",
        preset: "demo",
        industry: input.industry as IndustryId | undefined,
        market: input.market as MarketId | undefined,
      });
      return businessState(next, locale);
    },
    markWorkerUnavailable: (input: { workerId: string; shiftId: string; reason?: string; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = bridge.runAction({ type: "mark_unavailable", workerId: input.workerId, shiftId: input.shiftId, reason: input.reason });
      return { summary: "The shift is uncovered; no replacement was assigned.", incident: next.incident, shift: next.shifts.find((item) => item.id === input.shiftId) };
    },
    getResponseOptions: (input: ResponseOptionRequest = {}) => {
      const options = getResponseOptions(bridge.getState(), input);
      const rebuild = input.objective === "rebuild_week";
      const recommended = rebuild ? options[0] : undefined;
      return {
        summary: rebuild
          ? options.length > 0 ? `${options.length} deterministic week-rebuild plans are ready. The first matches the requested priority.` : "No week rebuild satisfies the requested constraints with the allowed capacity-gap policy."
          : options.length === 3 ? "Three recovery options are ready." : "No complete three-option set is available for the current incident.",
        count: options.length,
        options,
        recommendedPreview: recommended ? { planKind: "week_rebuild" as const, title: recommended.title, changes: recommended.changes, capacityGap: recommended.capacityGap ?? null } : null,
      };
    },
    previewStaffingChange: (input: { scenarioId?: string; title?: string; changes?: StaffingChange[]; planKind?: PlanKind; capacityGap?: CapacityGap | null; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = input.scenarioId
        ? bridge.runAction({ type: "preview_scenario", scenarioId: input.scenarioId })
        : bridge.runAction({ type: "preview_changes", title: input.title ?? "Custom staffing change", changes: input.changes ?? [], planKind: input.planKind, capacityGap: input.capacityGap });
      return { summary: "Preview only — nothing has been committed.", preview: next.preview };
    },
    evaluateCurrentPlan: () => {
      const state = bridge.getState();
      const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
      const impact = calculateImpact(state, planShifts);
      const candidateWorker = state.preview?.changes[0] ? state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId) : undefined;
      bridge.runAction({ type: "set_activity", activity: { state: "reviewed", message: "Agent reviewed live plan.", detail: `${state.preview && state.preview.changes.length > 1 ? `${state.preview.changes.length} schedule changes` : displayName(candidateWorker) ? `${displayName(candidateWorker)} candidate` : "Current schedule"} reviewed from the exact live state. Ready to apply.`, context: state.preview?.kind } });
      return { summary: `Current live schedule has ${impact.warnings.length} warnings and a ${(impact.laborRatio * 100).toFixed(1)}% estimated labor ratio.`, impact };
    },
    applyStaffingChange: (input: { previewId: string; version: number; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = bridge.runAction({ type: "apply_preview", previewId: input.previewId, version: input.version });
      return { summary: "The reviewed staffing change was committed.", impact: calculateImpact(next), preview: next.preview };
    },
    importScheduleSnapshot: (input: { snapshotText: string; uiLocale?: unknown }) => {
      const locale = requireUiLocale(input.uiLocale);
      const parsed = parseSnapshot(input.snapshotText);
      const next = bridge.runAction({ type: "import_state", state: parsed });
      return { summary: "Schedule snapshot restored successfully.", state: businessState(next, locale) };
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
    description: "Inspect the exact OwnerOps schedule currently visible to the user, including UI language, labor market, currency, wage reference, masked demo contacts, workers, shifts, incident, preview, labor estimate, weekly hours, and warnings.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.getBusinessState(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "create_schedule_draft",
    title: "Create demo schedule draft",
    description: "Create or reconfigure the bounded weekly demo schedule. uiLocale MUST match the language of the user's latest instruction. An industry-only correction preserves the live incident, preview, and schedule. Changing market creates a fresh market-specific demo because worker names, wages, and currency change. Never infer market from language.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["demo"], description: "The only supported MVP draft preset." },
        industry: { type: "string", enum: ["diner", "pizza", "coffee", "salon", "sushi", "curry"], description: "Optional generic industry profile. If omitted, preserve the current industry." },
        market: marketField,
        uiLocale: uiLocaleField,
      },
      required: ["preset", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.createScheduleDraft({ preset: input.preset, industry: input.industry, market: input.market, uiLocale: input.uiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "mark_worker_unavailable",
    title: "Mark worker unavailable",
    description: "Mark an assigned worker unavailable for an existing shift. The shift becomes uncovered and no replacement is assigned automatically. uiLocale MUST match the language of the user's latest instruction; market is unchanged.",
    inputSchema: { type: "object", properties: { workerId: stringField("Stable worker id."), shiftId: stringField("Stable assigned shift id."), reason: stringField("Optional short operational reason."), uiLocale: uiLocaleField }, required: ["workerId", "shiftId", "uiLocale"], additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.markWorkerUnavailable(input as { workerId: string; shiftId: string; reason?: string; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "get_response_options",
    title: "Generate staffing response plans",
    description: "Generate deterministic staffing plans without committing anything. Use objective=incident_recovery for the current call-out. Use objective=rebuild_week when the owner asks to optimize, rebuild, reduce labor cost, rebalance hours, or expose missing qualified capacity across the whole week. Week rebuild always preserves the published peak-coverage windows. When the user asked for action rather than explanation only, prefer previewing the first returned plan without asking another permission question because preview is non-committing.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string", enum: ["incident_recovery", "rebuild_week"], description: "Planning scope. Defaults to incident_recovery for backward compatibility." },
        maxWeeklyHours: { type: "number", minimum: 1, maximum: 80, description: "Optional weekly-hour ceiling for rebuild_week; defaults to the configured review threshold." },
        prioritize: { type: "string", enum: ["cost", "balance", "minimal_changes"], description: "Primary week-rebuild strategy. The tool still returns deterministic alternatives." },
        allowCapacityGap: { type: "boolean", description: "If true, return the best plan plus an explicit qualified-role capacity gap when the current team cannot satisfy the hour ceiling. Defaults to true." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => tools.getResponseOptions(input as ResponseOptionRequest),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "preview_staffing_change",
    title: "Preview staffing change",
    description: "Display an incident recovery or a bounded full-week rebuild as a candidate preview without committing it. For rebuild_week, pass the recommendedPreview title, changes, planKind, and capacityGap returned by get_response_options. A preview may reshape many shifts at once; the human can still edit the live candidate before agent review.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: stringField("Id returned by get_response_options."),
        title: stringField("Short title for an explicit bounded change set."),
        changes: { type: "array", maxItems: 16, items: { type: "object", properties: { shiftId: stringField("Existing shift id."), workerId: stringField("Replacement worker id."), start: stringField("Optional ISO local start."), end: stringField("Optional ISO local end.") }, required: ["shiftId", "workerId"], additionalProperties: false } },
        planKind: { type: "string", enum: ["custom", "week_rebuild"], description: "Set week_rebuild when previewing a full-week plan returned by get_response_options." },
        capacityGap: { type: "object", properties: { role: { type: "string", enum: ["barista", "manager"] }, hoursPerWeek: { type: "number" }, shiftIds: { type: "array", items: { type: "string" } }, reason: { type: "string" } }, required: ["role", "hoursPerWeek", "shiftIds", "reason"], additionalProperties: false },
        uiLocale: uiLocaleField,
      },
      required: ["uiLocale"],
      anyOf: [{ required: ["scenarioId"] }, { required: ["changes"] }],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.previewStaffingChange(input as { scenarioId?: string; title?: string; changes?: StaffingChange[]; planKind?: PlanKind; capacityGap?: CapacityGap | null; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "evaluate_current_plan",
    title: "Evaluate current live plan",
    description: "Evaluate the exact schedule state currently visible after human edits, using the same deterministic calculations as the OwnerOps UI. Does not change UI language or market.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.evaluateCurrentPlan(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "apply_staffing_change",
    title: "Apply reviewed staffing change",
    description: "Commit the current reviewed preview only when its id and version still match, then clear the preview and recalculate impact. uiLocale MUST match the language of the user's latest instruction; market is unchanged.",
    inputSchema: { type: "object", properties: { previewId: stringField("Current preview id shown by OwnerOps."), version: { type: "number", description: "Current preview version; prevents stale apply." }, uiLocale: uiLocaleField }, required: ["previewId", "version", "uiLocale"], additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.applyStaffingChange(input as { previewId: string; version: number; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "import_schedule_snapshot",
    title: "Import OwnerOps schedule snapshot",
    description: "Validate and transactionally restore a portable OWNEROPS_SNAPSHOT v1 document. Invalid input leaves the current state unchanged. uiLocale MUST match the language of the user's latest instruction.",
    inputSchema: { type: "object", properties: { snapshotText: { type: "string", minLength: 40, maxLength: 100000, description: "Complete OWNEROPS_SNAPSHOT v1 text." }, uiLocale: uiLocaleField }, required: ["snapshotText", "uiLocale"], additionalProperties: false },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.importScheduleSnapshot(input as { snapshotText: string; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  return { supported: true, dispose: () => controller.abort() };
}
