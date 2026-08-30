import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import { menuUnitFoodCost, storeCostMetrics } from "@/domain/store-ops";
import { applyStoreMasterDraft, storeMasterDraft } from "@/domain/store-master";

describe("store master and operating P&L", () => {
  it("keeps direct menu food cost separate while rent and utilities change operating profit and BEP", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const latte = state.menu!.find((item) => item.id === "latte")!;
    const foodBefore = menuUnitFoodCost(state, latte);
    const costsBefore = storeCostMetrics(state);
    const draft = storeMasterDraft(state);
    draft.business.occupancy!.baseRentMonthly += 1_000_000;
    draft.business.occupancy!.recurringFeesMonthly += 200_000;
    draft.business.operatingCosts!.fixedMonthly.utilities += 500_000;
    draft.business.operatingCosts!.fixedMonthly.other += 100_000;
    const changed = applyStoreMasterDraft(state, draft);
    const costsAfter = storeCostMetrics(changed);

    expect(menuUnitFoodCost(changed, changed.menu!.find((item) => item.id === "latte")!)).toBe(foodBefore);
    expect(costsAfter.occupancyMonthly - costsBefore.occupancyMonthly).toBe(1_200_000);
    expect(costsAfter.fixedOperatingMonthly - costsBefore.fixedOperatingMonthly).toBe(600_000);
    expect(costsAfter.estimatedOperatingProfit).toBeLessThan(costsBefore.estimatedOperatingProfit);
    expect(costsAfter.weeklyBreakEvenSales).toBeGreaterThan(costsBefore.weeklyBreakEvenSales);
    expect(costsBefore.contributionMargin).toBe(costsBefore.weeklySales - costsBefore.foodCost - costsBefore.variableOperatingCost);
    expect(costsBefore.estimatedOperatingProfit).toBe(costsBefore.weeklySales - costsBefore.totalOperatingCost);
  });

  it("edits only master data and protects historical actuals", () => {
    const state = createDemoState("coffee", "kr-seoul");
    const purchases = structuredClone(state.purchases);
    const sales = structuredClone(state.sales);
    const timeEntries = structuredClone(state.timeEntries);
    const milk = state.inventory!.find((item) => item.id === "whole-milk")!;
    const actualCost = milk.lastPurchaseUnitCost;
    const onHand = milk.onHand;
    const historicalSales = state.sales![0].netSales;
    const draft = storeMasterDraft(state);
    draft.menu.find((item) => item.id === "latte")!.price += 500;
    const draftMilk = draft.inventory.find((item) => item.id === "whole-milk")!;
    draftMilk.parLevel += 5;
    draftMilk.reorderPoint += 2;
    draftMilk.onHand = 999;
    draftMilk.lastPurchaseUnitCost = 1;
    const changed = applyStoreMasterDraft(state, draft);
    const changedMilk = changed.inventory!.find((item) => item.id === "whole-milk")!;

    expect(changed.purchases).toEqual(purchases);
    expect(changed.sales).toEqual(sales);
    expect(changed.timeEntries).toEqual(timeEntries);
    expect(changed.sales![0].netSales).toBe(historicalSales);
    expect(changedMilk.onHand).toBe(onHand);
    expect(changedMilk.lastPurchaseUnitCost).toBe(actualCost);
    expect(changedMilk.parLevel).toBe(milk.parLevel + 5);
    expect(changedMilk.reorderPoint).toBe(milk.reorderPoint + 2);
  });
});
