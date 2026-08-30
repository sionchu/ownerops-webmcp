import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import type { MenuItem, PrepItem } from "@/domain/model";
import { analyzeMenuCosts, analyzeTheoreticalInventoryUsage, inventoryDaysOfCover, menuUnitFoodCost, storeCostMetrics, theoreticalInventoryUsage } from "@/domain/store-ops";
import { convertInventoryQuantity } from "@/domain/units";

function menu(id: string, recipe: MenuItem["recipe"], price = 10_000): MenuItem {
  return { id, name: id, category: "test", price, recipe, active: true };
}

describe("unit-safe costing", () => {
  it("converts compatible quantities and rejects invented count conversions", () => {
    expect(convertInventoryQuantity(1_000, "g", "kg")).toBe(1);
    expect(convertInventoryQuantity(250, "ml", "l")).toBeCloseTo(0.25);
    expect(convertInventoryQuantity(1, "kg", "g")).toBe(1_000);
    expect(convertInventoryQuantity(1, "l", "ml")).toBe(1_000);
    expect(convertInventoryQuantity(1, "kg", "ea")).toBeNull();
    expect(convertInventoryQuantity(1, "pack", "ea")).toBeNull();
  });

  it("normalizes recipe lines to purchase units before costing", () => {
    const base = createDemoState("coffee");
    const milk = base.inventory!.find((item) => item.id === "whole-milk")!;
    const milkState = {
      ...base,
      inventory: [{ ...milk, unit: "l" as const, lastPurchaseUnitCost: 2_500 }],
      menu: [menu("milk-test", [{ inventoryItemId: milk.id, quantity: 250, unit: "ml" }], 5_000)],
      sales: [],
    };
    expect(menuUnitFoodCost(milkState, milkState.menu[0])).toBeCloseTo(625);

    const chickenState = {
      ...base,
      inventory: [{ ...milk, id: "chicken", name: "Chicken", unit: "kg" as const, lastPurchaseUnitCost: 8_500 }],
      menu: [menu("chicken-test", [{ inventoryItemId: "chicken", quantity: 180, unit: "g" }], 10_000)],
      sales: [],
    };
    expect(menuUnitFoodCost(chickenState, chickenState.menu[0])).toBeCloseTo(1_530);
  });

  it("converts Inventory to Prep to Menu through each declared unit", () => {
    const base = createDemoState("coffee");
    const milk = base.inventory!.find((item) => item.id === "whole-milk")!;
    const prep: PrepItem = {
      id: "milk-prep",
      name: "Milk prep",
      category: "prep",
      outputQuantity: 1,
      outputUnit: "l",
      recipe: [{ inventoryItemId: milk.id, quantity: 1_000, unit: "ml" }],
      batchYieldRate: 1,
      active: true,
    };
    const state = {
      ...base,
      inventory: [{ ...milk, unit: "l" as const, lastPurchaseUnitCost: 2_500 }],
      prepItems: [prep],
      menu: [menu("prep-test", [{ prepItemId: prep.id, quantity: 250, unit: "ml" }], 5_000)],
      sales: [],
    };
    expect(menuUnitFoodCost(state, state.menu[0])).toBeCloseTo(625);
  });

  it("returns usage and cover in canonical inventory units", () => {
    const base = createDemoState("coffee");
    const milk = base.inventory!.find((item) => item.id === "whole-milk")!;
    const state = {
      ...base,
      inventory: [{ ...milk, unit: "l" as const, onHand: 1, lastPurchaseUnitCost: 2_500 }],
      menu: [menu("usage-test", [{ inventoryItemId: milk.id, quantity: 250, unit: "ml" }])],
      sales: [{ id: "sale", date: "2026-08-24", grossSales: 5_000, netSales: 5_000, orderCount: 1, itemSales: [{ menuItemId: "usage-test", quantity: 1, netSales: 5_000 }], source: "demo" as const }],
    };
    expect(theoreticalInventoryUsage(state)[milk.id]).toBeCloseTo(0.25);
    expect(inventoryDaysOfCover(state, state.inventory[0])).toBeCloseTo(4);
  });

  it("fails closed with an explicit unit diagnostic", () => {
    const base = createDemoState("coffee");
    const milk = base.inventory!.find((item) => item.id === "whole-milk")!;
    const state = {
      ...base,
      inventory: [{ ...milk, unit: "ea" as const, lastPurchaseUnitCost: 2_500 }],
      menu: [menu("bad-unit", [{ inventoryItemId: milk.id, quantity: 1, unit: "kg" }])],
      sales: [{ id: "bad-sale", date: "2026-08-24", grossSales: 1, netSales: 1, orderCount: 1, itemSales: [{ menuItemId: "bad-unit", quantity: 1, netSales: 1 }], source: "demo" as const }],
    };
    const result = analyzeMenuCosts(state)[0];
    expect(result.status).toBe("unit_issue");
    expect(result.unitFoodCost).toBeNull();
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "unit_issue")).toBe(true);
    expect(analyzeTheoreticalInventoryUsage(state).diagnostics[0].code).toBe("unit_issue");
  });

  it("keeps seeded Seoul/industry ratios finite and bounded", () => {
    for (const industry of ["coffee", "pizza", "salon", "sushi", "curry", "diner"] as const) {
      const analyses = analyzeMenuCosts(createDemoState(industry, "kr-seoul"));
      for (const analysis of analyses) {
        expect(analysis.sellingPrice).toBeGreaterThan(0);
        if (analysis.foodCostRatio !== null) expect(Number.isFinite(analysis.foodCostRatio)).toBe(true);
        expect(analysis.status).toBe("complete");
        expect(analysis.foodCostRatio === null || analysis.foodCostRatio < 1).toBe(true);
      }
    }
  });

  it("keeps seeded store-level food cost ratios finite and free of unit-scale explosions", () => {
    for (const industry of ["coffee", "pizza", "salon", "sushi", "curry", "diner"] as const) {
      const metrics = storeCostMetrics(createDemoState(industry, "kr-seoul"));
      expect(Number.isFinite(metrics.foodCost)).toBe(true);
      expect(Number.isFinite(metrics.foodCostRatio)).toBe(true);
      expect(metrics.foodCost).toBeGreaterThanOrEqual(0);
      // This is a deterministic demo-fixture integrity guard, not a universal business rule.
      // It specifically prevents a reintroduction of 1,000x g/kg or ml/l aggregation errors.
      expect(metrics.foodCostRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.foodCostRatio).toBeLessThan(1);
    }
  });
});
