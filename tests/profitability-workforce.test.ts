import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import { planStoreActions } from "@/domain/store-planning";
import { scheduleCostSummary } from "@/domain/schedule-cost";

describe("profitability-first workforce semantics", () => {
  it("expresses a cost-first week rebuild in owner-value metrics without creating coverage gaps", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const result = planStoreActions(state, { objective: "reduce_labor_cost", maxWeeklyHours: 40, prioritize: "cost" });
    const plan = result.plans[0];
    expect(plan).toBeTruthy();
    expect(plan.changes.some((change) => change.type === "staffing")).toBe(true);
    expect(plan.impact.after.estimatedOperatingProfit).toBeGreaterThan(plan.impact.before.estimatedOperatingProfit);
    expect(plan.impact.after.operatingMargin).toBeGreaterThanOrEqual(plan.impact.before.operatingMargin);
    expect(plan.impact.after.flCostRatio).toBeLessThanOrEqual(plan.impact.before.flCostRatio);
    expect(plan.impact.after.uncoveredPeakMinutes).toBe(0);
    expect(plan.impact.delta.estimatedOperatingProfit).toBeCloseTo(-plan.impact.delta.laborCost);
  });

  it("never labels a partial-week actual wage ratio against the whole week's sales", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const summary = scheduleCostSummary(state, { start: "2026-08-24T00:00:00", end: "2026-08-31T00:00:00" });
    expect(summary.actualWage).toBeCloseTo(279_900);
    expect(summary.actualComparableWage).toBeCloseTo(279_900);
    expect(summary.actualSalesBasis).toBe(1_300_000);
    expect(summary.actualLaborRatio).toBeCloseTo(279_900 / 1_300_000);
    expect(summary.actualLaborRatio).toBeCloseTo(summary.actualComparableWage / summary.actualSalesBasis);
    expect(summary.actualLaborRatio).not.toBeCloseTo(summary.actualWage / summary.salesBasis);
  });
});
