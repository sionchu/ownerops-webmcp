import { applyChanges, calculateImpact } from "./impact";
import { estimatedWasteCost, storeCostMetrics } from "./store-ops";
import type { AppState, StoreMetricDelta, StoreMetricSnapshot, StorePlan, StorePlanChange, StorePlanImpact } from "./model";

function purchaseCashOutlay(changes: StorePlanChange[], state: AppState): number {
  const inventory = new Map((state.inventory ?? []).map((item) => [item.id, item]));
  return changes.reduce((total, change) => {
    if (change.type !== "purchase") return total;
    const unitCost = change.estimatedUnitCost ?? inventory.get(change.inventoryItemId)?.lastPurchaseUnitCost ?? 0;
    return total + Math.max(0, change.quantity) * Math.max(0, unitCost);
  }, 0);
}

function applyStorePlanChanges(state: AppState, changes: StorePlanChange[]): AppState {
  const staffingChanges = changes.flatMap((change) => change.type === "staffing"
    ? [{ shiftId: change.shiftId, workerId: change.workerId, start: change.start, end: change.end }]
    : []);
  const releases = new Map(changes.filter((change) => change.type === "shift_release").map((change) => [change.shiftId, change.newEnd]));
  const purchases = new Map(changes.filter((change) => change.type === "purchase").map((change) => [change.inventoryItemId, change]));
  const tasks = changes.filter((change) => change.type === "task").map((change) => change.task);

  const staffed = staffingChanges.length > 0 ? applyChanges(state.shifts, staffingChanges) : state.shifts;
  const shifts = staffed.map((shift) => releases.has(shift.id) ? { ...shift, end: releases.get(shift.id)! } : shift);
  const inventory = (state.inventory ?? []).map((item) => {
    const purchase = purchases.get(item.id);
    return purchase ? { ...item, onHand: item.onHand + Math.max(0, purchase.quantity) } : item;
  });

  return {
    ...state,
    shifts,
    inventory,
    tasks: [...(state.tasks ?? []), ...tasks],
  };
}

function metricSnapshot(state: AppState, cashOutlay = 0): StoreMetricSnapshot {
  const costs = storeCostMetrics(state);
  const staffing = calculateImpact(state);
  return {
    netSales: costs.weeklySales,
    foodCost: costs.foodCost,
    laborCost: costs.laborCost,
    variableOperatingCost: costs.variableOperatingCost,
    occupancyCost: costs.occupancyWeekly,
    fixedOperatingCost: costs.fixedOperatingWeekly,
    purchaseCashOutlay: cashOutlay,
    estimatedWasteCost: estimatedWasteCost(state),
    uncoveredPeakMinutes: staffing.uncoveredPeakMinutes,
    reviewFlagCount: staffing.warnings.filter((warning) => warning.severity === "warning").length,
    breakEvenSales: costs.weeklyBreakEvenSales,
  };
}

function metricDelta(before: StoreMetricSnapshot, after: StoreMetricSnapshot): StoreMetricDelta {
  return {
    netSales: after.netSales - before.netSales,
    foodCost: after.foodCost - before.foodCost,
    laborCost: after.laborCost - before.laborCost,
    variableOperatingCost: after.variableOperatingCost - before.variableOperatingCost,
    occupancyCost: after.occupancyCost - before.occupancyCost,
    fixedOperatingCost: after.fixedOperatingCost - before.fixedOperatingCost,
    purchaseCashOutlay: after.purchaseCashOutlay - before.purchaseCashOutlay,
    estimatedWasteCost: after.estimatedWasteCost - before.estimatedWasteCost,
    uncoveredPeakMinutes: after.uncoveredPeakMinutes - before.uncoveredPeakMinutes,
    reviewFlagCount: after.reviewFlagCount - before.reviewFlagCount,
    breakEvenSales: after.breakEvenSales - before.breakEvenSales,
  };
}

export function evaluateStorePlan(state: AppState, changes: StorePlanChange[]): StorePlanImpact {
  const candidate = applyStorePlanChanges(state, changes);
  const cashOutlay = purchaseCashOutlay(changes, state);
  const before = metricSnapshot(state, 0);
  const after = metricSnapshot(candidate, cashOutlay);
  const delta = metricDelta(before, after);
  const staffingBefore = calculateImpact(state);
  const staffingAfter = calculateImpact(candidate);
  const affectedInventoryItemIds = [...new Set(changes.filter((change) => change.type === "purchase").map((change) => change.inventoryItemId))];
  const taskChanges = changes.filter((change) => change.type === "task").length;
  const prepChanges = changes.filter((change) => change.type === "prep").length;
  const scheduleChanges = changes.filter((change) => change.type === "staffing" || change.type === "shift_release").length;
  const reviewFlags = [
    ...staffingAfter.warnings.filter((warning) => warning.severity === "warning").map((warning) => warning.message),
    ...changes.filter((change) => change.type === "purchase" && change.estimatedUnitCost === undefined && !(state.inventory ?? []).find((item) => item.id === change.inventoryItemId)?.lastPurchaseUnitCost)
      .map((change) => `Purchase cost for ${change.inventoryItemId} requires review.`),
  ];

  return {
    before,
    after,
    delta,
    domains: {
      ...(scheduleChanges > 0 ? {
        people: {
          scheduleChanges,
          laborCostDelta: staffingAfter.projectedLaborCost - staffingBefore.projectedLaborCost,
          uncoveredPeakMinutesDelta: staffingAfter.uncoveredPeakMinutes - staffingBefore.uncoveredPeakMinutes,
        },
      } : {}),
      ...(affectedInventoryItemIds.length > 0 ? {
        stock: {
          purchaseCashOutlay: cashOutlay,
          affectedInventoryItemIds,
          estimatedWasteCostDelta: delta.estimatedWasteCost,
        },
      } : {}),
      ...(taskChanges > 0 || prepChanges > 0 ? { operations: { taskChanges, prepChanges } } : {}),
      costs: {
        foodCostDelta: delta.foodCost,
        variableOperatingCostDelta: delta.variableOperatingCost,
        fixedOperatingCostDelta: delta.fixedOperatingCost,
        breakEvenSalesDelta: delta.breakEvenSales,
      },
    },
    reviewFlags,
  };
}

export function createStorePlan(state: AppState, title: string, changes: StorePlanChange[], id = `store-plan-${Date.now()}`): StorePlan {
  if (changes.length === 0) throw new Error("A store plan needs at least one change.");
  return {
    id,
    version: 1,
    title,
    changes,
    impact: evaluateStorePlan(state, changes),
    state: "preview",
  };
}
