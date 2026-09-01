import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/model";
import type { UiLocale } from "@/i18n";
import { createToolExecutors, registerOwnerOpsTools, siteToolsOnlyBoundary } from "@/webmcp/register-tools";

function bridge(initial = createDemoState()) {
  let state: AppState = initial;
  let locale: UiLocale = "en";
  return {
    getState: () => state,
    getLocale: () => locale,
    setLocale: (next: UiLocale) => { locale = next; },
    runAction: (action: Parameters<typeof dispatchApplicationAction>[1]) => (state = dispatchApplicationAction(state, action)),
  };
}

describe("shared UI and WebMCP StoreState path", () => {
  it("keeps equivalent human and tool call-out actions on the same canonical path", () => {
    const ui = dispatchApplicationAction(createDemoState("coffee"), {
      type: "mark_unavailable",
      workerId: "minsoo",
      shiftId: "fri-minsoo-18",
      reason: "Last-minute absence",
    });
    const web = bridge(createDemoState("coffee"));
    createToolExecutors(web).markWorkerUnavailable({
      workerId: "minsoo",
      shiftId: "fri-minsoo-18",
      reason: "Last-minute absence",
      uiLocale: "en",
    });
    expect(web.getState()).toEqual(ui);
  });

  it("configures industry and market independently from UI language", () => {
    const web = bridge();
    const result = createToolExecutors(web).configureDemoStore({ industry: "pizza", market: "us-nyc", uiLocale: "es" });
    expect(web.getState().business.industry).toBe("pizza");
    expect(web.getState().business.market).toBe("us-nyc");
    expect(web.getState().business.currency).toBe("USD");
    expect(web.getLocale()).toBe("es");
    expect(result.business.marketLabel).toBe("Nueva York");
    expect(web.getState().inventory?.some((item) => item.id === "mozzarella")).toBe(true);
  });

  it("preserves live staffing work when only industry changes", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", uiLocale: "ko" });
    const options = executors.getResponseOptions();
    executors.previewStaffingChange({ scenarioId: options.options[0].id, uiLocale: "ko" });
    const previewId = web.getState().preview?.id;

    executors.configureDemoStore({ industry: "pizza", uiLocale: "ko" });
    expect(web.getState().business.industry).toBe("pizza");
    expect(web.getState().incident?.workerId).toBe("minsoo");
    expect(web.getState().preview?.id).toBe(previewId);
    expect(web.getState().inventory?.some((item) => item.id === "mozzarella")).toBe(true);
  });

  it("returns focused stock/cost state instead of a raw StoreState dump", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    const stock = executors.getStoreState({ focus: "stock" }) as {
      inventory: Array<{ id: string; referenceComparison?: unknown }>;
      atRisk: unknown[];
      purchaseOrders: unknown[];
      workers?: unknown;
    };
    expect(stock.inventory.some((item) => item.id === "whole-milk")).toBe(true);
    expect(stock.atRisk.length).toBeGreaterThan(0);
    expect(stock.workers).toBeUndefined();

    const costs = executors.getStoreState({ focus: "costs" }) as { costMetrics: { weeklyBreakEvenSales: number; flCostRatio: number } };
    expect(costs.costMetrics.weeklyBreakEvenSales).toBeGreaterThan(0);
    expect(costs.costMetrics.flCostRatio).toBeGreaterThan(0);
  });

  it("creates a prioritized multi-domain daily brief", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    executors.recordOperatingEvent({ eventType: "worker_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out", uiLocale: "ko" });
    const brief = executors.getDailyBrief({ limit: 5 });
    expect(brief.items.length).toBeGreaterThanOrEqual(3);
    expect(brief.items[0].domain).toBe("people");
    expect(brief.items.some((item) => item.domain === "stock")).toBe(true);
  });

  it("plans, previews, reviews and applies a cross-domain prepare-today plan", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    executors.recordOperatingEvent({ eventType: "worker_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out", uiLocale: "ko" });

    const planned = executors.planStoreActions({ objective: "prepare_today" });
    expect(planned.plans).toHaveLength(1);
    expect(planned.recommendedPreview).not.toBeNull();
    const changes = planned.recommendedPreview!.changes;
    expect(changes.some((change) => change.type === "staffing")).toBe(true);
    expect(changes.some((change) => change.type === "purchase")).toBe(true);

    const previewed = executors.previewStorePlan({
      planId: planned.recommendedPreview!.id,
      title: planned.recommendedPreview!.title,
      changes,
      uiLocale: "ko",
    });
    expect(previewed.storePlan?.state).toBe("preview");
    expect(previewed.storePlan?.impact.before).toBeTruthy();
    expect(previewed.storePlan?.impact.after).toBeTruthy();
    expect(previewed.storePlan?.impact.delta.purchaseCashOutlay).toBeGreaterThan(0);
    expect(web.getState().purchaseOrders ?? []).toHaveLength(0);

    const reviewed = executors.evaluateCurrentPlan();
    expect(reviewed.storePlan?.state).toBe("reviewed");
    const plan = web.getState().storePlan!;
    const applied = executors.applyStorePlan({ planId: plan.id, version: plan.version, uiLocale: "ko" });
    expect(web.getState().storePlan).toBeNull();
    expect(web.getState().incident).toBeNull();
    expect(web.getState().incidents?.some((incident) => incident.type === "worker_unavailable" && incident.status === "resolved")).toBe(true);
    expect(web.getState().purchaseOrders?.some((order) => order.status === "planned")).toBe(true);
    expect("dailyBrief" in applied.state ? applied.state.dailyBrief : undefined).toBeTruthy();
  });

  it("does not increase on-hand inventory when a purchase plan is merely applied", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    const milkBefore = web.getState().inventory?.find((item) => item.id === "whole-milk")?.onHand;
    const planned = executors.planStoreActions({ objective: "inventory_reorder", inventoryItemId: "whole-milk" });
    const plan = planned.plans[0];
    expect(plan).toBeTruthy();
    executors.previewStorePlan({ planId: plan.id, title: plan.title, changes: plan.changes, uiLocale: "ko" });
    executors.evaluateCurrentPlan();
    const reviewed = web.getState().storePlan!;
    executors.applyStorePlan({ planId: reviewed.id, version: reviewed.version, uiLocale: "ko" });
    expect(web.getState().inventory?.find((item) => item.id === "whole-milk")?.onHand).toBe(milkBefore);
    expect(web.getState().purchaseOrders?.some((order) => order.inventoryItemId === "whole-milk" && order.status === "planned")).toBe(true);
  });

  it("keeps human edits inside the StorePlan candidate before review", () => {
    const web = bridge(createDemoState("coffee", "kr-seoul"));
    const executors = createToolExecutors(web);
    executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", uiLocale: "ko" });
    const planned = executors.planStoreActions({ objective: "staff_recovery" });
    const plan = planned.plans[0];
    executors.previewStorePlan({ planId: plan.id, title: plan.title, changes: plan.changes, uiLocale: "ko" });

    const beforeVersion = web.getState().storePlan!.version;
    web.runAction({ type: "reassign_shift", shiftId: "fri-minsoo-18", workerId: "hana" });
    expect(web.getState().storePlan?.version).toBe(beforeVersion + 1);
    expect(web.getState().storePlan?.changes.some((change) => change.type === "staffing" && change.shiftId === "fri-minsoo-18" && change.workerId === "hana")).toBe(true);
    expect(web.getState().activity.state).toBe("reviewNeeded");
    executors.evaluateCurrentPlan();
    expect(web.getState().storePlan?.state).toBe("reviewed");
  });

  it("requires uiLocale for state-changing Store tools", () => {
    const web = bridge();
    const executors = createToolExecutors(web);
    expect(() => executors.configureDemoStore({ industry: "coffee" })).toThrow(/uiLocale is required/i);
    expect(() => executors.recordOperatingEvent({ eventType: "manager_note", summary: "test" })).toThrow(/uiLocale is required/i);
  });

  it("registers exactly the nine intent-level WebMCP tools", async () => {
    const web = bridge();
    const registrations: Array<{ tool: { name: string; inputSchema?: unknown; annotations?: { readOnlyHint?: boolean }; description: string }; signal?: AbortSignal }> = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        modelContext: {
          registerTool: async (tool: { name: string; inputSchema?: unknown; annotations?: { readOnlyHint?: boolean }; description: string }, options?: { signal?: AbortSignal }) => {
            registrations.push({ tool, signal: options?.signal });
          },
        },
      },
    });

    const registration = registerOwnerOpsTools(web);
    await Promise.resolve();
    expect(registrations.map(({ tool }) => tool.name)).toEqual([
      "configure_demo_store",
      "get_store_state",
      "get_daily_brief",
      "record_operating_event",
      "plan_store_actions",
      "preview_store_plan",
      "evaluate_current_plan",
      "apply_store_plan",
      "restore_store_snapshot",
    ]);
    expect(registrations).toHaveLength(9);
    expect(registrations.every(({ tool }) => tool.description.includes(siteToolsOnlyBoundary))).toBe(true);
    expect(registrations.filter(({ tool }) => tool.annotations?.readOnlyHint === true)).toHaveLength(4);
    expect(registrations.filter(({ tool }) => tool.annotations?.readOnlyHint === false)).toHaveLength(5);
    expect(registrations.find(({ tool }) => tool.name === "get_store_state")?.tool.description).toMatch(/PRIMARY READ PATH/);
    expect(registrations.find(({ tool }) => tool.name === "plan_store_actions")?.tool.description).toMatch(/PRIMARY PLANNING PATH/);
    expect(registrations.find(({ tool }) => tool.name === "restore_store_snapshot")?.tool.description).toMatch(/BACKUP\/RESTORE ONLY/);
    for (const name of ["get_store_state", "plan_store_actions", "apply_store_plan"]) {
      const description = registrations.find(({ tool }) => tool.name === name)?.tool.description ?? "";
      expect(description).toMatch(/not implemented in the current OwnerOps version/);
      expect(description).toMatch(/future expansion area without a release date/);
      expect(description).toMatch(/closest supported analysis, draft, or preview/);
      expect(description).toMatch(/never claim an external filing, payment, message, order, or price change was submitted/);
    }
    expect(registrations.every(({ tool }) => typeof tool.inputSchema === "object")).toBe(true);

    registration.dispose();
    expect(registrations.every(({ signal }) => signal?.aborted)).toBe(true);
    delete (globalThis as { document?: unknown }).document;
  });
});
