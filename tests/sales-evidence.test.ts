import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import type { MarketId } from "@/domain/model";
import { analyzeSalesEvidence } from "@/domain/sales-evidence";

const MARKETS: MarketId[] = ["kr-seoul", "us-nyc", "jp-tokyo", "es-madrid", "cn-shanghai"];

describe("sales evidence", () => {
  it.each(MARKETS)("keeps %s sales traceable without presenting demo evidence as live", (market) => {
    const state = createDemoState("coffee", market);
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
