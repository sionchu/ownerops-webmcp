import { hoursBetween, estimatedPayroll } from "./impact";
import type { AppState, InventoryItem, ReferenceObservation } from "./model";

export type DailyBriefDomain = "people" | "stock" | "sales" | "operations" | "context" | "costs";

export type DailyBriefItem = {
  id: string;
  domain: DailyBriefDomain;
  severity: "info" | "attention" | "urgent";
  title: string;
  evidence: string;
  estimatedImpact?: string;
  nextIntent?: string;
  sourceType: "actual" | "plan" | "external_reference" | "seed";
  score: number;
};

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function scheduledWageEstimate(state: AppState): number {
  return estimatedPayroll(state.workers, state.shifts);
}

export function actualWageEstimate(state: AppState): number {
  const workerRates = new Map(state.workers.map((worker) => [worker.id, worker.hourlyRate]));
  return sum((state.timeEntries ?? []).map((entry) => {
    if (!entry.clockOut) return 0;
    return Math.max(0, hoursBetween(entry.clockIn, entry.clockOut)) * (workerRates.get(entry.workerId) ?? 0);
  }));
}

export function theoreticalInventoryUsage(state: AppState): Record<string, number> {
  const menu = new Map((state.menu ?? []).map((item) => [item.id, item]));
  const usage: Record<string, number> = {};
  for (const snapshot of state.sales ?? []) {
    for (const sold of snapshot.itemSales) {
      const item = menu.get(sold.menuItemId);
      if (!item) continue;
      for (const recipeLine of item.recipe) {
        usage[recipeLine.inventoryItemId] = (usage[recipeLine.inventoryItemId] ?? 0) + sold.quantity * recipeLine.quantity;
      }
    }
  }
  return usage;
}

export function inventoryDaysOfCover(state: AppState, item: InventoryItem): number | null {
  const dates = new Set((state.sales ?? []).map((snapshot) => snapshot.date));
  if (dates.size === 0) return null;
  const totalUsage = theoreticalInventoryUsage(state)[item.id] ?? 0;
  if (totalUsage <= 0) return null;
  const dailyUsage = totalUsage / dates.size;
  return item.onHand / dailyUsage;
}

export function reorderQuantityToPar(item: InventoryItem): number {
  return Math.max(0, item.parLevel - item.onHand);
}

export function inventoryAtRisk(state: AppState): Array<{ item: InventoryItem; daysOfCover: number | null; reorderQuantity: number }> {
  return (state.inventory ?? [])
    .map((item) => ({ item, daysOfCover: inventoryDaysOfCover(state, item), reorderQuantity: reorderQuantityToPar(item) }))
    .filter(({ item, daysOfCover }) => item.onHand <= item.reorderPoint || (daysOfCover !== null && daysOfCover <= item.leadTimeDays + 1))
    .sort((a, b) => {
      const aCover = a.daysOfCover ?? Number.POSITIVE_INFINITY;
      const bCover = b.daysOfCover ?? Number.POSITIVE_INFINITY;
      return aCover - bCover || a.item.onHand - b.item.onHand;
    });
}

export function commodityReferenceForItem(state: AppState, item: InventoryItem): ReferenceObservation | null {
  if (!item.marketReferenceKey) return null;
  return (state.references ?? []).find((reference) => reference.kind === "commodity_price" && reference.referenceKey === item.marketReferenceKey) ?? null;
}

export function purchaseReferenceComparison(state: AppState, item: InventoryItem): {
  actualUnitCost: number;
  reference: ReferenceObservation;
  difference: number;
  differenceRate: number;
} | null {
  if (!item.lastPurchaseUnitCost) return null;
  const reference = commodityReferenceForItem(state, item);
  if (!reference || typeof reference.value !== "number" || reference.value <= 0) return null;
  const difference = item.lastPurchaseUnitCost - reference.value;
  return {
    actualUnitCost: item.lastPurchaseUnitCost,
    reference,
    difference,
    differenceRate: difference / reference.value,
  };
}

export function highestPurchasePremium(state: AppState) {
  return (state.inventory ?? [])
    .map((item) => ({ item, comparison: purchaseReferenceComparison(state, item) }))
    .filter((value): value is { item: InventoryItem; comparison: NonNullable<ReturnType<typeof purchaseReferenceComparison>> } => value.comparison !== null)
    .sort((a, b) => b.comparison.differenceRate - a.comparison.differenceRate)[0] ?? null;
}

export function occupancyMetrics(state: AppState) {
  const occupancy = state.business.occupancy;
  const monthlyOccupancyCost = occupancy ? occupancy.baseRentMonthly + occupancy.recurringFeesMonthly : 0;
  const weeklySales = sum((state.sales ?? []).map((snapshot) => snapshot.netSales));
  const estimatedMonthlySales = weeklySales * 4.345;
  const occupancyToSales = estimatedMonthlySales > 0 ? monthlyOccupancyCost / estimatedMonthlySales : 0;
  const targetVariableCostRatio = (state.business.targetFoodCostRatio ?? 0.3) + state.business.targetLaborRatio;
  const contributionRatio = Math.max(0.05, 1 - targetVariableCostRatio);
  const monthlyBreakEvenSales = monthlyOccupancyCost > 0 ? monthlyOccupancyCost / contributionRatio : 0;
  return { monthlyOccupancyCost, estimatedMonthlySales, occupancyToSales, monthlyBreakEvenSales };
}

export function calloutPolicyLabel(state: AppState): string {
  const policy = state.business.policies?.calloutPayPolicy ?? "manual_review";
  if (policy === "unpaid_hours") return "Unpaid call-out hours (demo store policy)";
  if (policy === "paid_scheduled_hours") return "Scheduled call-out hours remain paid";
  return "Call-out pay requires manual review";
}

function openStaffingRisk(state: AppState): DailyBriefItem | null {
  const open = (state.incidents ?? []).find((incident) => incident.type === "worker_unavailable" && incident.status === "open");
  if (!open) return null;
  const worker = state.workers.find((item) => item.id === open.workerId);
  const shift = state.shifts.find((item) => item.id === open.shiftId);
  return {
    id: `brief-${open.id}`,
    domain: "people",
    severity: "urgent",
    title: `${worker?.name ?? "Worker"} unavailable`,
    evidence: shift ? `${shift.start.slice(0, 10)} ${shift.start.slice(11, 16)}–${shift.end.slice(11, 16)} is uncovered.` : "A staffing incident is still open.",
    nextIntent: "staff_recovery",
    sourceType: "actual",
    score: 100,
  };
}

function stockRisk(state: AppState): DailyBriefItem | null {
  const risk = inventoryAtRisk(state)[0];
  if (!risk) return null;
  const cover = risk.daysOfCover === null ? "usage history is limited" : `${risk.daysOfCover.toFixed(1)} days of cover`;
  return {
    id: `brief-stock-${risk.item.id}`,
    domain: "stock",
    severity: risk.daysOfCover !== null && risk.daysOfCover <= risk.item.leadTimeDays ? "urgent" : "attention",
    title: `${risk.item.name} needs attention`,
    evidence: `${risk.item.onHand} ${risk.item.unit} on hand · ${cover} · ${risk.item.leadTimeDays} day lead time.`,
    estimatedImpact: risk.reorderQuantity > 0 ? `Reorder-to-par: ${risk.reorderQuantity.toFixed(1)} ${risk.item.unit}` : undefined,
    nextIntent: "inventory_reorder",
    sourceType: "actual",
    score: risk.daysOfCover !== null && risk.daysOfCover <= risk.item.leadTimeDays ? 95 : 78,
  };
}

function wasteRisk(state: AppState): DailyBriefItem | null {
  const waste = state.waste ?? [];
  if (waste.length < 2) return null;
  const byItem = new Map<string, typeof waste>();
  for (const record of waste) byItem.set(record.inventoryItemId, [...(byItem.get(record.inventoryItemId) ?? []), record]);
  let candidate: { itemId: string; latest: number; previous: number } | null = null;
  for (const [itemId, records] of byItem) {
    const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    if (sorted.length < 2 || sorted[1].quantity <= 0) continue;
    const increase = sorted[0].quantity / sorted[1].quantity;
    if (increase >= 1.4 && (!candidate || increase > candidate.latest / candidate.previous)) candidate = { itemId, latest: sorted[0].quantity, previous: sorted[1].quantity };
  }
  if (!candidate) return null;
  const item = state.inventory?.find((value) => value.id === candidate!.itemId);
  const change = candidate.previous > 0 ? (candidate.latest / candidate.previous - 1) * 100 : 0;
  return {
    id: `brief-waste-${candidate.itemId}`,
    domain: "stock",
    severity: "attention",
    title: `${item?.name ?? "Inventory"} waste increased`,
    evidence: `${candidate.latest.toFixed(1)} vs ${candidate.previous.toFixed(1)} ${item?.unit ?? "units"} in the previous record (+${change.toFixed(0)}%).`,
    nextIntent: "reduce_waste",
    sourceType: "actual",
    score: 70,
  };
}

function purchasePremiumRisk(state: AppState): DailyBriefItem | null {
  const premium = highestPurchasePremium(state);
  if (!premium || premium.comparison.differenceRate < 0.08) return null;
  const { comparison, item } = premium;
  return {
    id: `brief-reference-${item.id}`,
    domain: "costs",
    severity: "attention",
    title: `${item.name} purchase cost is above reference`,
    evidence: `Store actual ${comparison.actualUnitCost.toFixed(2)}/${item.unit} vs ${comparison.reference.provider} reference ${Number(comparison.reference.value).toFixed(2)}/${item.unit} (+${(comparison.differenceRate * 100).toFixed(1)}%).`,
    nextIntent: "review_purchase_cost",
    sourceType: comparison.reference.freshness === "live" || comparison.reference.freshness === "recent" ? "external_reference" : "seed",
    score: 62,
  };
}

function weatherRisk(state: AppState): DailyBriefItem | null {
  const weather = state.context?.weather;
  if (!weather || (weather.precipitationProbability ?? 0) < 0.6) return null;
  return {
    id: "brief-weather",
    domain: "context",
    severity: "info",
    title: "Rain may change the operating mix",
    evidence: `${weather.summary} · ${(weather.precipitationProbability! * 100).toFixed(0)}% precipitation probability · ${weather.provider}.`,
    nextIntent: "respond_to_weather",
    sourceType: weather.freshness === "live" || weather.freshness === "recent" ? "external_reference" : "seed",
    score: 42,
  };
}

function occupancyRisk(state: AppState): DailyBriefItem | null {
  const metrics = occupancyMetrics(state);
  if (metrics.monthlyOccupancyCost <= 0 || metrics.occupancyToSales < 0.1) return null;
  return {
    id: "brief-occupancy",
    domain: "costs",
    severity: "info",
    title: "Occupancy cost is a meaningful fixed-cost load",
    evidence: `Estimated occupancy-to-sales ${(metrics.occupancyToSales * 100).toFixed(1)}% using the current weekly sales run-rate.`,
    estimatedImpact: `Simple monthly break-even sales: ${metrics.monthlyBreakEvenSales.toFixed(0)} ${state.business.currency}`,
    nextIntent: "occupancy_pressure",
    sourceType: "actual",
    score: 35,
  };
}

export function getDailyBrief(state: AppState, limit = 5): DailyBriefItem[] {
  return [openStaffingRisk(state), stockRisk(state), wasteRisk(state), purchasePremiumRisk(state), weatherRisk(state), occupancyRisk(state)]
    .filter((item): item is DailyBriefItem => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 5)));
}
