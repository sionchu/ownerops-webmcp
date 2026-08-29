import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { workerAvailableForInterval } from "@/domain/availability";
import { createDemoState } from "@/domain/fixtures";
import { getDailyBrief, highestPurchasePremium, inventoryAtRisk, occupancyMetrics, theoreticalInventoryUsage } from "@/domain/store-ops";

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
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const candidates = getResponseOptions(state).flatMap((option) => option.changes.map((change) => change.workerId));
    expect(candidates).toContain("hana");
    expect(candidates).not.toContain("minsoo");
  });

  it("keeps the call-out as an availability fact and resolved incident history after recovery", () => {
    let state = createDemoState("coffee");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const options = getResponseOptions(state);
    const option = options[0];
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: option.id });
    state = dispatchApplicationAction(state, { type: "set_activity", activity: { state: "reviewed", message: "Reviewed" } });
    state = dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version });
    expect(state.incident).toBeNull();
    expect(state.incidents?.some((incident) => incident.type === "worker_unavailable" && incident.status === "resolved")).toBe(true);
    expect(state.workers.find((worker) => worker.id === "minsoo")?.availabilityExceptions?.some((exception) => exception.available === false && exception.source === "incident")).toBe(true);
  });

  it("derives theoretical ingredient usage and inventory risk from menu sales", () => {
    const state = createDemoState("coffee");
    const usage = theoreticalInventoryUsage(state);
    expect(usage["espresso-beans"]).toBeGreaterThan(0);
    expect(usage["whole-milk"]).toBeGreaterThan(0);
    const risks = inventoryAtRisk(state);
    expect(risks.length).toBeGreaterThan(0);
    expect(risks.some((risk) => risk.item.id === "whole-milk")).toBe(true);
  });

  it("compares store actual purchase price only to mapped external references", () => {
    const state = createDemoState("coffee");
    const premium = highestPurchasePremium(state);
    expect(premium).not.toBeNull();
    expect(premium?.comparison.reference.freshness).toBe("seed");
    expect(premium?.comparison.actualUnitCost).toBeGreaterThan(Number(premium?.comparison.reference.value));
    expect(state.inventory?.find((item) => item.id === "cup-16")?.marketReferenceKey).toBeUndefined();
  });

  it("calculates occupancy context without treating rent benchmark as store truth", () => {
    const state = createDemoState("coffee");
    const metrics = occupancyMetrics(state);
    expect(metrics.monthlyOccupancyCost).toBe((state.business.occupancy?.baseRentMonthly ?? 0) + (state.business.occupancy?.recurringFeesMonthly ?? 0));
    expect(metrics.estimatedMonthlySales).toBeGreaterThan(0);
    expect(metrics.monthlyBreakEvenSales).toBeGreaterThan(0);
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
});
