import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import { analyzeSalesEvidence } from "@/domain/sales-evidence";

describe("sales evidence", () => {
  it("keeps the weekly sales headline traceable to daily and menu evidence", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const evidence = analyzeSalesEvidence(state);

    expect(evidence.daily).toHaveLength(7);
    expect(evidence.daily.every((day) => day.source === "demo")).toBe(true);
    expect(evidence.daily.every((day) => day.netSales > 0 && day.orderCount > 0)).toBe(true);
    expect(evidence.menu.length).toBeGreaterThanOrEqual(4);
    expect(evidence.menu.every((item) => item.quantity > 0 && item.netSales > 0)).toBe(true);
    expect(evidence.totals.netSales).toBeCloseTo(Object.values(state.business.expectedSalesByDay).reduce((sum, value) => sum + value, 0));
    expect(Number.isFinite(evidence.totals.theoreticalFoodCost)).toBe(true);
    expect(Number.isFinite(evidence.totals.wasteCost)).toBe(true);
    expect(Math.abs(evidence.totals.unallocatedSales) / evidence.totals.netSales).toBeLessThan(0.03);
    expect(evidence.menu.find((item) => item.menuItemId === "croissant-menu")?.foodCost).toBeGreaterThan(0);
  });
});
