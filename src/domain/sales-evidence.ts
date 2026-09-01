import type { AppState } from "./model";
import { menuUnitFoodCost } from "./store-ops";
import { convertInventoryQuantity } from "./units";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function wasteCostForDate(state: AppState, date: string): number {
  const inventory = new Map((state.inventory ?? []).map((item) => [item.id, item]));
  return sum((state.waste ?? []).filter((record) => record.recordedAt.slice(0, 10) === date).map((record) => {
    const item = inventory.get(record.inventoryItemId);
    if (!item || item.lastPurchaseUnitCost == null) return 0;
    const quantity = convertInventoryQuantity(record.quantity, record.unit, item.unit);
    return quantity == null ? 0 : quantity * item.lastPurchaseUnitCost;
  }));
}

export function analyzeSalesEvidence(state: AppState) {
  const menu = new Map((state.menu ?? []).map((item) => [item.id, item]));
  const daily = (state.sales ?? []).map((snapshot) => {
    const recordedItemSales = sum(snapshot.itemSales.map((item) => item.netSales));
    const theoreticalFoodCost = sum(snapshot.itemSales.map((sold) => {
      const item = menu.get(sold.menuItemId);
      return item ? sold.quantity * menuUnitFoodCost(state, item) : 0;
    }));
    const wasteCost = wasteCostForDate(state, snapshot.date);
    return {
      date: snapshot.date,
      source: snapshot.source,
      netSales: snapshot.netSales,
      orderCount: snapshot.orderCount,
      recordedItemSales,
      unallocatedSales: snapshot.netSales - recordedItemSales,
      theoreticalFoodCost,
      foodCostRatio: snapshot.netSales > 0 ? theoreticalFoodCost / snapshot.netSales : 0,
      wasteCost,
      lossRate: theoreticalFoodCost > 0 ? wasteCost / theoreticalFoodCost : 0,
    };
  });
  const menuEvidence = (state.menu ?? []).map((item) => {
    const lines = (state.sales ?? []).flatMap((snapshot) => snapshot.itemSales.filter((line) => line.menuItemId === item.id));
    const quantity = sum(lines.map((line) => line.quantity));
    const netSales = sum(lines.map((line) => line.netSales));
    const foodCost = quantity * menuUnitFoodCost(state, item);
    return { menuItemId: item.id, name: item.name, quantity, netSales, foodCost, foodCostRatio: netSales > 0 ? foodCost / netSales : null };
  }).filter((item) => item.quantity > 0).sort((a, b) => b.netSales - a.netSales);
  return {
    daily,
    menu: menuEvidence,
    totals: {
      netSales: sum(daily.map((item) => item.netSales)),
      recordedItemSales: sum(daily.map((item) => item.recordedItemSales)),
      unallocatedSales: sum(daily.map((item) => item.unallocatedSales)),
      theoreticalFoodCost: sum(daily.map((item) => item.theoreticalFoodCost)),
      wasteCost: sum(daily.map((item) => item.wasteCost)),
    },
  };
}
