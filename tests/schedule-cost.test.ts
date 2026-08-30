import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { scheduleCostSummary, scheduleDayRange } from "@/domain/schedule-cost";
import { createStorePlan } from "@/domain/store-plan";

const weekRange = { start: "2026-08-24T00:00:00", end: "2026-08-31T00:00:00" };

describe("schedule cost summary", () => {
  it("derives one day's scheduled hours, wage, workers, sales basis, and warnings", () => {
    const state = createDemoState();
    const summary = scheduleCostSummary(state, scheduleDayRange("2026-08-24"));
    const rate = (workerId: string) => state.workers.find((worker) => worker.id === workerId)!.hourlyRate;

    expect(summary.scheduledHours).toBe(20);
    expect(summary.scheduledWage).toBe(6 * rate("minsoo") + 6 * rate("jiyoung") + 8 * rate("younghee"));
    expect(summary.workerCount).toBe(3);
    expect(summary.salesBasis).toBe(state.sales!.find((sale) => sale.date === "2026-08-24")!.netSales);
    expect(summary.laborRatio).toBeCloseTo(summary.scheduledWage / summary.salesBasis, 8);
    expect(summary.warningCount).toBe(1);
  });

  it("derives the full week's scheduled wage and hours from the same shift truth", () => {
    const state = createDemoState();
    const summary = scheduleCostSummary(state, weekRange);
    expect(summary.scheduledHours).toBe(154);
    expect(summary.scheduledWage).toBe(2_030_000);
    expect(summary.workerCount).toBe(5);
    expect(summary.salesBasis).toBe(state.sales!.reduce((total, sale) => total + sale.netSales, 0));
    expect(summary.warningCount).toBe(1);
  });

  it("clips actual time-entry wage to the selected range", () => {
    const state = createDemoState();
    const worker = state.workers.find((candidate) => candidate.id === "minsoo")!;
    const withActual = {
      ...state,
      timeEntries: [{ id: "actual-one", workerId: worker.id, clockIn: "2026-08-24T08:00:00", clockOut: "2026-08-24T12:00:00", source: "manual" as const }],
    };
    const monday = scheduleCostSummary(withActual, scheduleDayRange("2026-08-24"));
    const tuesday = scheduleCostSummary(withActual, scheduleDayRange("2026-08-25"));
    expect(monday.actualHours).toBe(4);
    expect(monday.actualWage).toBe(4 * worker.hourlyRate);
    expect(tuesday.actualHours).toBe(0);
    expect(tuesday.actualWage).toBe(0);
  });

  it("shows a staffing plan's wage delta and keeps the canonical schedule immutable", () => {
    const original = createDemoState();
    const beforeJson = JSON.stringify(original);
    const before = scheduleCostSummary(original, weekRange);
    let state = dispatchApplicationAction(original, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const option = getResponseOptions(state).find((candidate) => candidate.changes[0]?.workerId === "hana")!;
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: option.id });
    const candidate = scheduleCostSummary(state, weekRange);

    expect(candidate.scheduledWage - before.scheduledWage).toBe(-2_000);
    expect(candidate.scheduledHours).toBe(before.scheduledHours);
    expect(JSON.stringify(original)).toBe(beforeJson);
  });

  it("uses the same scheduled wage basis for a cross-domain StorePlan delta", () => {
    const state = createDemoState();
    const plan = createStorePlan(state, "Cover Friday evening", [{ type: "staffing", shiftId: "fri-minsoo-18", workerId: "hana" }], "plan-friday-cover");
    expect(plan.impact.before.laborCost).toBe(2_030_000);
    expect(plan.impact.after.laborCost - plan.impact.before.laborCost).toBe(-2_000);
    expect(plan.impact.delta.laborCost).toBe(-2_000);
  });

  it("does not mutate state when callers switch day and week ranges", () => {
    const state = createDemoState();
    const beforeJson = JSON.stringify(state);
    scheduleCostSummary(state, scheduleDayRange("2026-08-24"));
    scheduleCostSummary(state, weekRange);
    expect(JSON.stringify(state)).toBe(beforeJson);
  });
});
