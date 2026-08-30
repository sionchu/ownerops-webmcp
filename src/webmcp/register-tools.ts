import { getResponseOptions, type ApplicationAction, type ResponseOptionRequest } from "@/domain/actions";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState, CapacityGap, IndustryId, MarketId, PlanKind, StaffingChange, StorePlanChange } from "@/domain/model";
import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, inventoryAtRisk, menuUnitFoodCost, purchaseReferenceComparison, storeCostMetrics } from "@/domain/store-ops";
import { analyzeSalesEvidence } from "@/domain/sales-evidence";
import { createStorePlan } from "@/domain/store-plan";
import { planStoreActions, type StorePlanningRequest } from "@/domain/store-planning";
import { getIndustryProfile, isIndustryId } from "@/industry/profiles";
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
  description: "Required UI language. Match the user's latest instruction: en, ko, ja, es, or zh-CN. Language is independent from market/country.",
};
const marketField = {
  type: "string",
  enum: Object.keys(MARKET_PROFILES),
  description: "Optional operating market: kr-seoul, us-nyc, jp-tokyo, es-madrid, or cn-shanghai. Never infer market from language. If omitted, preserve the current market.",
};
const focusValues = ["overview", "people", "sales", "stock", "operations", "costs", "context"] as const;
type StoreFocus = typeof focusValues[number];
const capabilityBoundaryDescription = "CAPABILITY BOUNDARY. Actual payroll or payslip/social-insurance/tax filing, audited bookkeeping/general-ledger work, termination legal workflows, bank payment, real supplier transmission/contact, real POS price mutation, and statutory compliance guarantees are not implemented in the current OwnerOps version. Describe the exact limitation as a future expansion area without a release date, state the closest supported analysis, draft, or preview, offer that supported capability, and never claim an external filing, payment, message, order, or price change was submitted.";

const storePlanChangeSchema: JsonSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        type: { const: "staffing" },
        shiftId: stringField("Existing shift id."),
        workerId: stringField("Worker id."),
        start: stringField("Optional local ISO start."),
        end: stringField("Optional local ISO end."),
      },
      required: ["type", "shiftId", "workerId"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "purchase" },
        inventoryItemId: stringField("Inventory item id."),
        supplierId: stringField("Optional supplier id."),
        quantity: { type: "number", exclusiveMinimum: 0 },
        unit: { type: "string", enum: ["g", "kg", "ml", "l", "ea", "pack", "box"] },
        estimatedUnitCost: { type: "number", minimum: 0 },
      },
      required: ["type", "inventoryItemId", "quantity", "unit"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "prep" },
        menuItemId: stringField("Menu item id."),
        targetQuantity: { type: "number", minimum: 0 },
      },
      required: ["type", "menuItemId", "targetQuantity"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "task" },
        task: {
          type: "object",
          properties: {
            id: stringField("Stable task id."),
            title: stringField("Task title."),
            dueAt: stringField("Optional local ISO due time."),
            shiftId: stringField("Optional shift id."),
            workerId: stringField("Optional worker id."),
            status: { type: "string", enum: ["open", "done"] },
          },
          required: ["id", "title", "status"],
          additionalProperties: false,
        },
      },
      required: ["type", "task"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "shift_release" },
        shiftId: stringField("Existing shift id."),
        newEnd: stringField("New local ISO end time."),
      },
      required: ["type", "shiftId", "newEnd"],
      additionalProperties: false,
    },
  ],
};

function displayName(worker: AppState["workers"][number] | undefined) {
  return worker?.displayName ?? worker?.name;
}

function stateSummary(state: AppState, locale: UiLocale) {
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const market = getMarketProfile(state.business.market);
  const costs = storeCostMetrics(state);
  const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
  const impact = calculateImpact(state, planShifts);
  return {
    business: {
      ...state.business,
      industryLabel: profile.label,
      marketLabel: getMarketLocation(state.business.market, locale),
      wageReference: market.wageReference,
    },
    metrics: {
      weeklyNetSales: costs.weeklySales,
      estimatedFoodCost: costs.foodCost,
      foodCostRatio: costs.foodCostRatio,
      scheduledLaborCost: costs.laborCost,
      laborCostRatio: costs.laborCostRatio,
      flCostRatio: costs.flCostRatio,
      weeklyBreakEvenSales: costs.weeklyBreakEvenSales,
      occupancyMonthly: costs.occupancyMonthly,
      warnings: impact.warnings,
      uncoveredPeakMinutes: impact.uncoveredPeakMinutes,
    },
    activeIncident: state.incident,
    activeStorePlan: state.storePlan,
  };
}

function storeState(state: AppState, locale: UiLocale, focus: StoreFocus = "overview") {
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const market = getMarketProfile(state.business.market);
  const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
  const impact = calculateImpact(state, planShifts);
  const base = {
    summary: `${state.business.name} · ${getMarketLocation(state.business.market, locale)} · ${focus}`,
    uiLocale: locale,
    focus,
    ...stateSummary(state, locale),
  };

  if (focus === "overview") return { ...base, dailyBrief: getDailyBrief(state, 5) };
  if (focus === "people") return {
    ...base,
    workers: state.workers.map((worker) => ({
      ...worker,
      displayName: displayName(worker),
      roleLabel: profile.roleLabels[worker.role],
      demoContact: market.workerContacts[worker.id] ?? null,
      weeklyHours: impact.workerWeeklyHours[worker.id] ?? 0,
    })),
    shifts: planShifts.map((shift) => ({ ...shift, roleLabel: profile.roleLabels[shift.role] })),
    timeEntries: state.timeEntries ?? [],
    incidents: state.incidents ?? [],
  };
  if (focus === "sales") return {
    ...base,
    sales: state.sales ?? [],
    salesEvidence: analyzeSalesEvidence(state),
    menuCostAnalysis: analyzeMenuCosts(state),
    menu: (state.menu ?? []).map((item) => {
      const cost = menuUnitFoodCost(state, item);
      return { ...item, estimatedUnitFoodCost: cost, estimatedFoodCostRatio: item.price > 0 ? cost / item.price : 0 };
    }),
  };
  if (focus === "stock") return {
    ...base,
    inventoryCostAnalysis: analyzeInventoryCosts(state),
    inventory: (state.inventory ?? []).map((item) => ({ ...item, referenceComparison: purchaseReferenceComparison(state, item) })),
    atRisk: inventoryAtRisk(state),
    suppliers: state.suppliers ?? [],
    purchaseOrders: state.purchaseOrders ?? [],
    waste: state.waste ?? [],
  };
  if (focus === "operations") return { ...base, tasks: state.tasks ?? [], incidents: state.incidents ?? [], log: state.log ?? [] };
  if (focus === "costs") return {
    ...base,
    menuCostAnalysis: analyzeMenuCosts(state),
    inventoryCostAnalysis: analyzeInventoryCosts(state),
    costMetrics: storeCostMetrics(state),
    occupancy: state.business.occupancy,
    operatingCosts: state.business.operatingCosts,
    purchaseReferences: (state.inventory ?? []).map((item) => purchaseReferenceComparison(state, item)).filter(Boolean),
  };
  return { ...base, context: state.context, references: state.references ?? [] };
}

export function createToolExecutors(bridge: ToolBridge) {
  const requireUiLocale = (uiLocale: unknown): UiLocale => {
    if (uiLocale === undefined) throw new Error("uiLocale is required for state-changing OwnerOps tools. Re-read the current Site Tools schema and retry with en, ko, ja, es, or zh-CN matching the user's latest instruction.");
    if (!isUiLocale(uiLocale)) throw new Error(`Unsupported UI locale: ${String(uiLocale)}.`);
    bridge.setLocale(uiLocale);
    return uiLocale;
  };

  const configureDemoStore = (input: { industry?: unknown; market?: unknown; uiLocale?: unknown }) => {
    if (input.industry !== undefined && !isIndustryId(input.industry)) throw new Error(`Unsupported industry profile: ${String(input.industry)}.`);
    if (input.market !== undefined && !isMarketId(input.market)) throw new Error(`Unsupported market profile: ${String(input.market)}.`);
    const locale = requireUiLocale(input.uiLocale);
    const next = bridge.runAction({
      type: "create_schedule_draft",
      preset: "demo",
      industry: input.industry as IndustryId | undefined,
      market: input.market as MarketId | undefined,
    });
    return storeState(next, locale, "overview");
  };

  const recordOperatingEvent = (input: { eventType: string; workerId?: string; shiftId?: string; reason?: string; inventoryItemId?: string; onHand?: number; taskId?: string; summary?: string; uiLocale?: unknown }) => {
    requireUiLocale(input.uiLocale);
    if (input.eventType === "worker_unavailable") {
      if (!input.workerId || !input.shiftId) throw new Error("workerId and shiftId are required for worker_unavailable.");
      return bridge.runAction({ type: "mark_unavailable", workerId: input.workerId, shiftId: input.shiftId, reason: input.reason });
    }
    if (input.eventType === "stock_count") {
      if (!input.inventoryItemId || input.onHand === undefined) throw new Error("inventoryItemId and onHand are required for stock_count.");
      return bridge.runAction({ type: "record_stock_count", inventoryItemId: input.inventoryItemId, onHand: input.onHand });
    }
    if (input.eventType === "task_completed") {
      if (!input.taskId) throw new Error("taskId is required for task_completed.");
      return bridge.runAction({ type: "complete_task", taskId: input.taskId });
    }
    if (input.eventType === "manager_note" || input.eventType === "equipment_issue") {
      if (!input.summary) throw new Error("summary is required for a manager note or equipment issue.");
      return bridge.runAction({ type: "record_manager_note", summary: input.summary, incidentType: input.eventType === "equipment_issue" ? "equipment_issue" : undefined });
    }
    throw new Error(`Unsupported operating event type: ${input.eventType}.`);
  };

  const restoreStoreSnapshot = (input: { snapshotText: string; uiLocale?: unknown }) => {
    const locale = requireUiLocale(input.uiLocale);
    const parsed = parseSnapshot(input.snapshotText);
    const next = bridge.runAction({ type: "import_state", state: parsed });
    return { summary: "OwnerOps snapshot restored successfully.", state: storeState(next, locale, "overview") };
  };

  return {
    configureDemoStore,
    getStoreState: (input: { focus?: StoreFocus } = {}) => storeState(bridge.getState(), bridge.getLocale(), input.focus ?? "overview"),
    getDailyBrief: (input: { limit?: number } = {}) => ({
      summary: "Priority operating brief from current canonical StoreState.",
      businessDate: bridge.getState().context?.businessDate,
      items: getDailyBrief(bridge.getState(), input.limit ?? 5),
      dataProvenance: (bridge.getState().business as AppState["business"] & { dataProvenance?: unknown }).dataProvenance ?? null,
    }),
    recordOperatingEvent,
    planStoreActions: (input: StorePlanningRequest) => {
      const result = planStoreActions(bridge.getState(), input);
      return {
        ...result,
        recommendedPreview: result.plans[0]
          ? { id: result.plans[0].id, title: result.plans[0].title, changes: result.plans[0].changes, impact: result.plans[0].impact }
          : null,
      };
    },
    previewStorePlan: (input: { planId?: string; title?: string; changes: StorePlanChange[]; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const plan = createStorePlan(bridge.getState(), input.title ?? "Agent store plan", input.changes, input.planId);
      const next = bridge.runAction({ type: "set_store_plan", plan });
      return { summary: "Cross-domain preview is visible; nothing has been committed.", storePlan: next.storePlan, staffingPreview: next.preview };
    },
    evaluateCurrentPlan: () => {
      const state = bridge.getState();
      if (state.storePlan) {
        const next = bridge.runAction({ type: "review_store_plan" });
        return { summary: `Reviewed ${next.storePlan?.changes.length ?? 0} live store changes from canonical state.`, storePlan: next.storePlan };
      }
      const planShifts = state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts;
      const impact = calculateImpact(state, planShifts);
      const candidateWorker = state.preview?.changes[0] ? state.workers.find((worker) => worker.id === state.preview?.changes[0]?.workerId) : undefined;
      bridge.runAction({
        type: "set_activity",
        activity: {
          state: "reviewed",
          message: "Agent reviewed live plan.",
          detail: `${state.preview && state.preview.changes.length > 1 ? `${state.preview.changes.length} schedule changes` : displayName(candidateWorker) ? `${displayName(candidateWorker)} candidate` : "Current schedule"} reviewed from the exact live state. Ready to apply.`,
          context: state.preview?.kind,
        },
      });
      return { summary: `Current live schedule has ${impact.warnings.length} warnings.`, impact };
    },
    applyStorePlan: (input: { planId: string; version: number; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = bridge.runAction({ type: "apply_store_plan", planId: input.planId, version: input.version });
      return {
        summary: "Reviewed store plan materialized in canonical state. Planned purchases remain purchase orders until receipt.",
        state: storeState(next, bridge.getLocale(), "overview"),
      };
    },
    restoreStoreSnapshot,

    // Compatibility aliases for existing UI/domain tests while the RE0 migrates. Not registered as Site Tools.
    getBusinessState: () => storeState(bridge.getState(), bridge.getLocale(), "people"),
    createScheduleDraft: (input: { preset?: unknown; industry?: unknown; market?: unknown; uiLocale?: unknown } = { preset: "demo" }) => {
      if (input.preset !== "demo") throw new Error("Only preset 'demo' is supported.");
      return configureDemoStore(input);
    },
    markWorkerUnavailable: (input: { workerId: string; shiftId: string; reason?: string; uiLocale?: unknown }) => recordOperatingEvent({ eventType: "worker_unavailable", ...input }),
    getResponseOptions: (input: ResponseOptionRequest = {}) => {
      const options = getResponseOptions(bridge.getState(), input);
      const recommended = options[0];
      return {
        summary: `${options.length} staffing plans are ready.`,
        count: options.length,
        options,
        recommendedPreview: recommended ? { planKind: recommended.kind, title: recommended.title, changes: recommended.changes, capacityGap: recommended.capacityGap } : null,
      };
    },
    previewStaffingChange: (input: { scenarioId?: string; title?: string; changes?: StaffingChange[]; planKind?: PlanKind; capacityGap?: CapacityGap | null; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = input.scenarioId
        ? bridge.runAction({ type: "preview_scenario", scenarioId: input.scenarioId })
        : bridge.runAction({ type: "preview_changes", title: input.title ?? "Custom staffing change", changes: input.changes ?? [], planKind: input.planKind, capacityGap: input.capacityGap });
      return { summary: "Preview only — nothing has been committed.", preview: next.preview };
    },
    applyStaffingChange: (input: { previewId: string; version: number; uiLocale?: unknown }) => {
      requireUiLocale(input.uiLocale);
      const next = bridge.runAction({ type: "apply_preview", previewId: input.previewId, version: input.version });
      return { summary: "The reviewed staffing change was committed.", impact: calculateImpact(next), preview: next.preview };
    },
    importScheduleSnapshot: restoreStoreSnapshot,
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
    name: "configure_demo_store",
    title: "Configure OwnerOps demo store",
    description: "Configure the demo industry/market for explicit setup changes. Preserve the current market unless explicitly changed. Never infer market from the user's language.",
    inputSchema: {
      type: "object",
      properties: {
        industry: { type: "string", enum: ["diner", "pizza", "coffee", "salon", "sushi", "curry"] },
        market: marketField,
        uiLocale: uiLocaleField,
      },
      required: ["industry", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.configureDemoStore({ industry: input.industry, market: input.market, uiLocale: input.uiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "get_store_state",
    title: "Read current live OwnerOps store state",
    description: `PRIMARY READ PATH. Read exact canonical StoreState directly through this Site Tool. When this tool is available, do not use browser/DOM inspection, computer-use, screenshots, or automatic clicking to read OwnerOps data. Use focus=overview, people, sales, stock, operations, costs, or context so the agent receives focused evidence instead of a giant raw state dump. Answer supported questions directly without asking the owner to navigate modules. Never open/export Snapshot UI for live work. ${capabilityBoundaryDescription}`,
    inputSchema: {
      type: "object",
      properties: { focus: { type: "string", enum: focusValues, description: "Operating domain needed for the current intent." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => tools.getStoreState({ focus: input.focus as StoreFocus | undefined }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "get_daily_brief",
    title: "Get today's OwnerOps operating brief",
    description: "Preferred first tool for 'prepare today', 'what do I need to know', or 'what is risky'. Use this Site Tool directly instead of browser/computer-use when available. Return only the highest-priority evidence across people, stock, costs, operations, and context, with dataProvenance for source/freshness reasoning.",
    inputSchema: { type: "object", properties: { limit: { type: "number", minimum: 1, maximum: 5 } }, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async (input) => tools.getDailyBrief({ limit: typeof input.limit === "number" ? input.limit : undefined }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "record_operating_event",
    title: "Record a store operating fact",
    description: "Record an owner-supplied fact in canonical StoreState without inventing a recovery plan. Supports worker call-out, stock count, task completion, manager note, and equipment issue. Plan actions separately when the owner asks for action.",
    inputSchema: {
      type: "object",
      properties: {
        eventType: { type: "string", enum: ["worker_unavailable", "stock_count", "task_completed", "manager_note", "equipment_issue"] },
        workerId: stringField("Worker id for call-out."),
        shiftId: stringField("Shift id for call-out."),
        reason: stringField("Optional reason."),
        inventoryItemId: stringField("Inventory item for stock count."),
        onHand: { type: "number", minimum: 0 },
        taskId: stringField("Task id to complete."),
        summary: stringField("Manager note or equipment issue."),
        uiLocale: uiLocaleField,
      },
      required: ["eventType", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.recordOperatingEvent(input as Parameters<typeof tools.recordOperatingEvent>[0]),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "plan_store_actions",
    title: "Plan OwnerOps store actions",
    description: `PRIMARY PLANNING PATH. Generate only the deterministic StorePlans supported by this schema and live state. Commit-ready objectives currently include staff_recovery, rebuild_week, reduce_labor_cost, inventory_reorder, and prepare_today. If an objective or quantified effect is unsupported or uncalibrated, return an explicit limitation and the closest supported analysis/draft/preview instead of fabricating a plan. ${capabilityBoundaryDescription}`,
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string", enum: ["prepare_today", "staff_recovery", "rebuild_week", "reduce_labor_cost", "inventory_reorder", "reduce_waste", "respond_to_weather", "occupancy_pressure", "closing_tasks"] },
        maxWeeklyHours: { type: "number", minimum: 1, maximum: 80 },
        prioritize: { type: "string", enum: ["cost", "balance", "minimal_changes"] },
        inventoryItemId: stringField("Optional inventory item id for reorder."),
        maxItems: { type: "number", minimum: 1, maximum: 5 },
      },
      required: ["objective"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => tools.planStoreActions(input as StorePlanningRequest),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "preview_store_plan",
    title: "Preview cross-domain OwnerOps plan",
    description: "Materialize a StorePlan without committing it. Use recommendedPreview from plan_store_actions. Staffing projects into the schedule UI; stock/task/cost effects remain in the same StorePlan with Before/After/Delta impact. Never round-trip through Snapshot text.",
    inputSchema: {
      type: "object",
      properties: {
        planId: stringField("Stable plan id returned by planning."),
        title: stringField("Plan title."),
        changes: { type: "array", minItems: 1, maxItems: 20, items: storePlanChangeSchema },
        uiLocale: uiLocaleField,
      },
      required: ["changes", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.previewStorePlan(input as Parameters<typeof tools.previewStorePlan>[0]),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "evaluate_current_plan",
    title: "Evaluate exact current OwnerOps plan",
    description: "Re-read and review the exact live candidate after human edits. For StorePlan, recompute cross-domain Before/After/Delta and review flags. For a staffing-only candidate, recompute the exact schedule. Do not inspect Snapshot text.",
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true },
    execute: async () => tools.evaluateCurrentPlan(),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "apply_store_plan",
    title: "Apply reviewed OwnerOps store plan",
    description: `Commit only the current reviewed StorePlan when id/version still match. Apply changes only to canonical StoreState. Purchase actions become planned purchase orders and never fake receipt or on-hand inventory. No external supplier order, message, payment, filing, POS mutation, or legal submission occurs. ${capabilityBoundaryDescription}`,
    inputSchema: {
      type: "object",
      properties: { planId: stringField("Current reviewed StorePlan id."), version: { type: "number", minimum: 1 }, uiLocale: uiLocaleField },
      required: ["planId", "version", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.applyStorePlan(input as { planId: string; version: number; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  register(document.modelContext.registerTool({
    name: "restore_store_snapshot",
    title: "Restore provided OwnerOps snapshot",
    description: "BACKUP/RESTORE ONLY. Use only when the user explicitly asks to restore/import a snapshot or directly provides complete OWNEROPS_SNAPSHOT text. Never use Snapshot export/import to inspect, optimize, plan, or pass live state between agent steps.",
    inputSchema: {
      type: "object",
      properties: { snapshotText: { type: "string", minLength: 40, maxLength: 200000 }, uiLocale: uiLocaleField },
      required: ["snapshotText", "uiLocale"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (input) => tools.restoreStoreSnapshot(input as { snapshotText: string; uiLocale?: UiLocale }),
  }, { signal: controller.signal }));

  return { supported: true, dispose: () => controller.abort() };
}
