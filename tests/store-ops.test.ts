import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { workerAvailableForInterval } from "@/domain/availability";
import { createDemoState } from "@/domain/fixtures";
import type { ReferenceObservation } from "@/domain/model";
import { resolveCommodityReference } from "@/domain/reference-resolver";
import { createStorePlan, evaluateStorePlan } from "@/domain/store-plan";
import { planStoreActions } from "@/domain/store-planning";
import { getDailyBrief, highestPurchasePremium, inventoryAtRisk, menuUnitFoodCost, occupancyMetrics, storeCostMetrics, theoreticalInventoryUsage } from "@/domain/store-ops";

describe("OwnerOps StoreState operating foundation", () => {
  it("creates realistic industry-specific coffee operating data", () => {
    const state = createDemoState("coffee", "kr-seoul");
    expect(state.business.timezone).toBe("Asia/Seoul");
    expect(state.business.occupancy?.baseRentMonthly).toBeGreaterThan(0);
    expect(state.inventory?.map((item) => item.id)).toEqual(expect.arrayContaining(["espresso-beans", "whole-milk", "oat-milk", "croissant", "cup-16"]));
    expect(state.menu?.map((item) => item.id)).toEqual(expect.arrayContaining(["americano", "latte", "croissant-menu"]));
    expect(state.suppliers?.length).toBeGreaterThan(0);
    expect(state.purchases?.length).toBeGreaterThan(0);
    expect(state.waste?.some((record) => record.inventoryItemId === "croissant")).toBe(true);
    expect(state.tasks?.length).toBeGreaterThanOrEqual(4);
    expect(state.references?.some((reference) => reference.provider === "KAMIS")).toBe(true);
    expect(state.context?.weather?.freshness).toBe("seed");
  });

  it("changes actual purchased inventory by industry instead of relabeling one generic catalog", () => {
    const coffee = createDemoState("coffee");
    const salon = createDemoState("salon");
    expect(coffee.inventory?.some((item) => item.id === "espresso-beans")).toBe(true);
    expect(coffee.inventory?.some((item) => item.id === "color")).toBe(false);
    expect(salon.inventory?.some((item) => item.id === "color")).toBe(true);
    expect(salon.inventory?.some((item) => item.id === "espresso-beans")).toBe(false);
    expect(salon.workers.find((worker) => worker.id === "jiyoung")?.skills).toContain("color");
  });

  it("stores regular part-time availability and rejects intervals outside it", () => {
    const state = createDemoState("coffee");
    const minsoo = state.workers.find((worker) => worker.id === "minsoo")!;
    expect(minsoo.regularAvailability?.length).toBeGreaterThan(0);
    expect(workerAvailableForInterval(minsoo, "2026-08-24T08:00:00", "2026-08-24T14:00:00")).toBe(true);
    expect(workerAvailableForInterval(minsoo, "2026-08-25T08:00:00", "2026-08-25T14:00:00")).toBe(false);
  });

  it("uses availability-aware candidates for incident recovery", () => {
    let state = createDemoState("coffee");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const candidates = getResponseOptions(state).flatMap((option) => option.changes.map((change) => change.workerId));
    expect(candidates).toContain("hana");
    expect(candidates).not.toContain("minsoo");
  });

  it("keeps the call-out as an availability fact and resolved incident history after recovery", () => {
    let state = createDemoState("coffee");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const option = getResponseOptions(state)[0];
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: option.id });
    state = dispatchApplicationAction(state, { type: "set_activity", activity: { state: "reviewed", message: "Reviewed" } });
    state = dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version });
    expect(state.incident).toBeNull();
    expect(state.incidents?.some((incident) => incident.type === "worker_unavailable" && incident.status === "resolved")).toBe(true);
    expect(state.workers.find((worker) => worker.id === "minsoo")?.availabilityExceptions?.some((exception) => exception.available === false && exception.source === "incident")).toBe(true);
  });

  it("derives theoretical ingredient usage from menu sales", () => {
    const state = createDemoState("coffee");
    const usage = theoreticalInventoryUsage(state);
    expect(usage["espresso-beans"]).toBeGreaterThan(0);
    expect(usage["whole-milk"]).toBeGreaterThan(0);
    const risks = inventoryAtRisk(state);
    expect(risks.length).toBeGreaterThan(0);
    expect(risks.some((risk) => risk.item.id === "whole-milk")).toBe(true);
  });

  it("makes recipe food cost yield-aware without changing store purchase truth", () => {
    const state = createDemoState("coffee");
    const latte = state.menu!.find((item) => item.id === "latte")!;
    const baseline = menuUnitFoodCost(state, latte);
    const yieldAware = {
      ...latte,
      recipe: latte.recipe.map((line, index) => index === 0 ? { ...line, yieldRate: 0.8 } : line),
    };
    expect(menuUnitFoodCost(state, yieldAware)).toBeGreaterThan(baseline);
  });

  it("resolves external references live first, then safely falls back to seed", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const seed = resolveCommodityReference(state, "coffee_beans");
    expect(seed.source).toBe("seed");
    expect(seed.degraded).toBe(true);
    expect(seed.reason).toMatch(/seed reference/i);

    const live: ReferenceObservation = {
      id: "live-coffee",
      kind: "commodity_price",
      provider: "Live provider test",
      referenceKey: "coffee_beans",
      geography: "Seoul",
      observedAt: "2026-08-30T05:00:00",
      fetchedAt: "2026-08-30T05:01:00",
      value: 21000,
      unit: "kg",
      currency: "KRW",
      freshness: "live",
    };
    const resolved = resolveCommodityReference(state, "coffee_beans", live);
    expect(resolved.source).toBe("live");
    expect(resolved.degraded).toBe(false);
    expect(resolved.observation?.value).toBe(21000);
  });

  it("compares store actual purchase price only to mapped references and exposes fallback provenance", () => {
    const state = createDemoState("coffee");
    const premium = highestPurchasePremium(state);
    expect(premium).not.toBeNull();
    expect(premium?.comparison.reference.freshness).toBe("seed");
    expect(premium?.comparison.degraded).toBe(true);
    expect(premium?.comparison.actualUnitCost).toBeGreaterThan(Number(premium?.comparison.reference.value));
    expect(state.inventory?.find((item) => item.id === "cup-16")?.marketReferenceKey).toBeUndefined();
  });

  it("calculates food/labor/occupancy and break-even as separate operating cost buckets", () => {
    const state = createDemoState("coffee");
    const costs = storeCostMetrics(state);
    expect(costs.foodCost).toBeGreaterThan(0);
    expect(costs.laborCost).toBeGreaterThan(0);
    expect(costs.occupancyMonthly).toBe((state.business.occupancy?.baseRentMonthly ?? 0) + (state.business.occupancy?.recurringFeesMonthly ?? 0));
    expect(costs.weeklyBreakEvenSales).toBeGreaterThan(0);
    expect(costs.flCostRatio).toBeCloseTo(costs.foodCostRatio + costs.laborCostRatio, 8);

    const metrics = occupancyMetrics(state);
    const rentReference = state.references?.find((reference) => reference.kind === "rent_benchmark");
    expect(rentReference?.freshness).toBe("seed");
    expect(rentReference?.value).not.toBe(metrics.monthlyOccupancyCost);
  });

  it("builds a short multi-domain daily brief", () => {
    let state = createDemoState("coffee");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const brief = getDailyBrief(state);
    expect(brief.length).toBeGreaterThanOrEqual(3);
    expect(brief.length).toBeLessThanOrEqual(5);
    expect(brief[0].domain).toBe("people");
    expect(brief.some((item) => item.domain === "stock")).toBe(true);
    expect(brief.some((item) => item.domain === "context" || item.domain === "costs")).toBe(true);
  });

  it("keeps purchase cash outlay separate in multi-domain Before/After/Delta", () => {
    const state = createDemoState("coffee");
    const milk = state.inventory!.find((item) => item.id === "whole-milk")!;
    const impact = evaluateStorePlan(state, [
      { type: "purchase", inventoryItemId: milk.id, supplierId: milk.supplierId, quantity: 12, unit: milk.unit, estimatedUnitCost: milk.lastPurchaseUnitCost },
    ]);
    expect(impact.before.purchaseCashOutlay).toBe(0);
    expect(impact.after.purchaseCashOutlay).toBeGreaterThan(0);
    expect(impact.delta.purchaseCashOutlay).toBe(impact.after.purchaseCashOutlay);
    expect(impact.domains.stock?.affectedInventoryItemIds).toContain("whole-milk");
  });

  it("plans a cross-domain prepare-today response when staffing and stock both need action", () => {
    let state = createDemoState("coffee");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const result = planStoreActions(state, { objective: "prepare_today" });
    expect(result.plans).toHaveLength(1);
    const plan = result.plans[0];
    expect(plan.changes.some((change) => change.type === "staffing")).toBe(true);
    expect(plan.changes.some((change) => change.type === "purchase")).toBe(true);
    expect(plan.impact.domains.people).toBeTruthy();
    expect(plan.impact.domains.stock).toBeTruthy();
  });

  it("requires review before committing a StorePlan", () => {
    let state = createDemoState("coffee");
    const milk = state.inventory!.find((item) => item.id === "whole-milk")!;
    const plan = createStorePlan(state, "Milk reorder", [{ type: "purchase", inventoryItemId: milk.id, quantity: 12, unit: milk.unit, estimatedUnitCost: milk.lastPurchaseUnitCost }], "plan-milk");
    state = dispatchApplicationAction(state, { type: "set_store_plan", plan });
    expect(() => dispatchApplicationAction(state, { type: "apply_store_plan", planId: plan.id, version: plan.version })).toThrow(/review required/i);
    state = dispatchApplicationAction(state, { type: "review_store_plan" });
    state = dispatchApplicationAction(state, { type: "apply_store_plan", planId: state.storePlan!.id, version: state.storePlan!.version });
    expect(state.purchaseOrders?.some((order) => order.inventoryItemId === "whole-milk" && order.status === "planned")).toBe(true);
    expect(state.inventory?.find((item) => item.id === "whole-milk")?.onHand).toBe(milk.onHand);
  });
});
