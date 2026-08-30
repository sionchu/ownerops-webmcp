import { hoursBetween, estimatedPayroll } from "./impact";
import { resolveCommodityReference } from "./reference-resolver";
import { convertInventoryQuantity, isInventoryUnit } from "./units";
import type { AppState, InventoryItem, InventoryRecipeLine, InventoryUnit, MenuItem, PrepItem, RecipeLine, ReferenceObservation } from "./model";

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

function safeYield(value: number | undefined): number | null {
  if (value === undefined) return 1;
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : null;
}

function isInventoryRecipeLine(line: RecipeLine): line is InventoryRecipeLine {
  return typeof line.inventoryItemId === "string";
}

export type CostingDiagnosticCode = "unit_issue" | "missing_inventory_item" | "missing_purchase_cost" | "missing_prep_item" | "invalid_yield" | "invalid_price";

export type CostingDiagnostic = {
  code: CostingDiagnosticCode;
  scope: "menu" | "prep" | "usage" | "inventory";
  message: string;
  menuItemId?: string;
  prepItemId?: string;
  inventoryItemId?: string;
  fromUnit?: InventoryUnit;
  toUnit?: InventoryUnit;
};

export type MenuCostAnalysis = {
  item: MenuItem;
  sellingPrice: number;
  unitFoodCost: number | null;
  foodCostRatio: number | null;
  foodCostOnlyMargin: number | null;
  targetFoodCostRatio: number | null;
  varianceVsTarget: number | null;
  status: "complete" | "unit_issue" | "data_issue";
  diagnostics: CostingDiagnostic[];
};

export type InventoryCostAnalysis = {
  item: InventoryItem;
  daysOfCover: number | null;
  reorderQuantity: number;
  actualPurchaseUnitCost: number | null;
  reference: ReferenceObservation | null;
  referenceUnitCost: number | null;
  differenceRate: number | null;
  status: "ok" | "attention" | "urgent" | "unit_issue" | "data_issue";
  diagnostics: CostingDiagnostic[];
};

type CostResult = { value: number | null; diagnostics: CostingDiagnostic[] };

function prepOutputQuantity(prep: PrepItem): number | null {
  const yieldRate = safeYield(prep.batchYieldRate);
  if (!Number.isFinite(prep.outputQuantity) || prep.outputQuantity <= 0 || yieldRate === null) return null;
  return prep.outputQuantity * yieldRate;
}

function inventoryLineCostResult(state: AppState, line: InventoryRecipeLine, scope: CostingDiagnostic["scope"] = "menu"): CostResult {
  const item = (state.inventory ?? []).find((candidate) => candidate.id === line.inventoryItemId);
  if (!item) return {
    value: null,
    diagnostics: [{ code: "missing_inventory_item", scope, inventoryItemId: line.inventoryItemId, message: `Inventory item ${line.inventoryItemId} is missing.` }],
  };
  const quantity = convertInventoryQuantity(line.quantity, line.unit, item.unit);
  if (quantity === null) return {
    value: null,
    diagnostics: [{ code: "unit_issue", scope, inventoryItemId: item.id, fromUnit: line.unit, toUnit: item.unit, message: `Cannot convert ${line.unit} to ${item.unit} for ${item.name}.` }],
  };
  const yieldRate = safeYield(line.yieldRate);
  if (yieldRate === null) return {
    value: null,
    diagnostics: [{ code: "invalid_yield", scope, inventoryItemId: item.id, message: `Yield for ${item.name} must be greater than 0 and no more than 1.` }],
  };
  const unitCost = item.lastPurchaseUnitCost;
  if (unitCost === undefined || unitCost === null || !Number.isFinite(unitCost) || unitCost < 0) return {
    value: null,
    diagnostics: [{ code: "missing_purchase_cost", scope, inventoryItemId: item.id, message: `Purchase cost for ${item.name} is unavailable.` }],
  };
  return { value: (quantity / yieldRate) * unitCost, diagnostics: [] };
}

function prepCostResult(state: AppState, prep: PrepItem): CostResult {
  const outputQuantity = prepOutputQuantity(prep);
  const diagnostics: CostingDiagnostic[] = [];
  if (outputQuantity === null) diagnostics.push({ code: "invalid_yield", scope: "prep", prepItemId: prep.id, message: `Prep output for ${prep.name} is invalid.` });
  const componentResults = prep.recipe.map((line) => inventoryLineCostResult(state, line, "prep"));
  for (const result of componentResults) diagnostics.push(...result.diagnostics);
  if (outputQuantity === null || diagnostics.length > 0) return { value: null, diagnostics };
  return { value: sum(componentResults.map((result) => result.value ?? 0)), diagnostics };
}

export function prepUnitFoodCost(state: AppState, prep: PrepItem): number {
  const outputQuantity = prepOutputQuantity(prep);
  const batchCost = prepCostResult(state, prep);
  return outputQuantity && batchCost.value !== null ? batchCost.value / outputQuantity : 0;
}

function addRecipeLineUsage(
  state: AppState,
  line: RecipeLine,
  multiplier: number,
  usage: Record<string, number>,
  diagnostics: CostingDiagnostic[],
  menuItemId?: string,
): void {
  if (isInventoryRecipeLine(line)) {
    const item = (state.inventory ?? []).find((candidate) => candidate.id === line.inventoryItemId);
    if (!item) {
      diagnostics.push({ code: "missing_inventory_item", scope: "usage", inventoryItemId: line.inventoryItemId, menuItemId, message: `Inventory item ${line.inventoryItemId} is missing.` });
      return;
    }
    const quantity = convertInventoryQuantity(line.quantity, line.unit, item.unit);
    const yieldRate = safeYield(line.yieldRate);
    if (quantity === null) {
      diagnostics.push({ code: "unit_issue", scope: "usage", inventoryItemId: item.id, menuItemId, fromUnit: line.unit, toUnit: item.unit, message: `Cannot convert ${line.unit} to ${item.unit} for ${item.name}.` });
      return;
    }
    if (yieldRate === null) {
      diagnostics.push({ code: "invalid_yield", scope: "usage", inventoryItemId: item.id, menuItemId, message: `Yield for ${item.name} is invalid.` });
      return;
    }
    usage[item.id] = (usage[item.id] ?? 0) + multiplier * quantity / yieldRate;
    return;
  }
  const prep = (state.prepItems ?? []).find((candidate) => candidate.id === line.prepItemId);
  if (!prep) {
    diagnostics.push({ code: "missing_prep_item", scope: "usage", prepItemId: line.prepItemId, menuItemId, message: `Prep item ${line.prepItemId} is missing.` });
    return;
  }
  const outputQuantity = prepOutputQuantity(prep);
  const quantity = convertInventoryQuantity(line.quantity, line.unit, prep.outputUnit);
  if (outputQuantity === null) {
    diagnostics.push({ code: "invalid_yield", scope: "usage", prepItemId: prep.id, menuItemId, message: `Prep output for ${prep.name} is invalid.` });
    return;
  }
  if (quantity === null) {
    diagnostics.push({ code: "unit_issue", scope: "usage", prepItemId: prep.id, menuItemId, fromUnit: line.unit, toUnit: prep.outputUnit, message: `Cannot convert ${line.unit} to ${prep.outputUnit} for ${prep.name}.` });
    return;
  }
  const batchFraction = quantity / outputQuantity;
  for (const component of prep.recipe) {
    const item = (state.inventory ?? []).find((candidate) => candidate.id === component.inventoryItemId);
    const componentQuantity = item ? convertInventoryQuantity(component.quantity, component.unit, item.unit) : null;
    const yieldRate = safeYield(component.yieldRate);
    if (!item) {
      diagnostics.push({ code: "missing_inventory_item", scope: "usage", inventoryItemId: component.inventoryItemId, prepItemId: prep.id, menuItemId, message: `Inventory item ${component.inventoryItemId} is missing.` });
    } else if (componentQuantity === null) {
      diagnostics.push({ code: "unit_issue", scope: "usage", inventoryItemId: item.id, prepItemId: prep.id, menuItemId, fromUnit: component.unit, toUnit: item.unit, message: `Cannot convert ${component.unit} to ${item.unit} for ${item.name}.` });
    } else if (yieldRate === null) {
      diagnostics.push({ code: "invalid_yield", scope: "usage", inventoryItemId: item.id, prepItemId: prep.id, menuItemId, message: `Yield for ${item.name} is invalid.` });
    } else {
      usage[item.id] = (usage[item.id] ?? 0) + multiplier * batchFraction * componentQuantity / yieldRate;
    }
  }
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

/** Purchased/raw inventory required by recorded sales, expanding Prep BOM into ingredient usage. */
export function analyzeTheoreticalInventoryUsage(state: AppState): { usage: Record<string, number>; diagnostics: CostingDiagnostic[] } {
  const menu = new Map((state.menu ?? []).map((item) => [item.id, item]));
  const usage: Record<string, number> = {};
  const diagnostics: CostingDiagnostic[] = [];
  for (const snapshot of state.sales ?? []) {
    for (const sold of snapshot.itemSales) {
      const item = menu.get(sold.menuItemId);
      if (!item) continue;
      for (const recipeLine of item.recipe) addRecipeLineUsage(state, recipeLine, sold.quantity, usage, diagnostics, item.id);
    }
  }
  return { usage, diagnostics };
}

export function theoreticalInventoryUsage(state: AppState): Record<string, number> {
  return analyzeTheoreticalInventoryUsage(state).usage;
}

function menuCostResult(state: AppState, menuItem: MenuItem): CostResult {
  const diagnostics: CostingDiagnostic[] = [];
  if (!Number.isFinite(menuItem.price) || menuItem.price < 0) diagnostics.push({ code: "invalid_price", scope: "menu", menuItemId: menuItem.id, message: `Selling price for ${menuItem.name} is invalid.` });
  const values: number[] = [];
  for (const line of menuItem.recipe) {
    if (isInventoryRecipeLine(line)) {
      const result = inventoryLineCostResult(state, line, "menu");
      diagnostics.push(...result.diagnostics.map((diagnostic) => ({ ...diagnostic, menuItemId: menuItem.id })));
      if (result.value !== null) values.push(result.value);
      continue;
    }
    const prep = (state.prepItems ?? []).find((candidate) => candidate.id === line.prepItemId);
    if (!prep) {
      diagnostics.push({ code: "missing_prep_item", scope: "menu", prepItemId: line.prepItemId, menuItemId: menuItem.id, message: `Prep item ${line.prepItemId} is missing.` });
      continue;
    }
    const outputQuantity = prepOutputQuantity(prep);
    const quantity = convertInventoryQuantity(line.quantity, line.unit, prep.outputUnit);
    if (outputQuantity === null) diagnostics.push({ code: "invalid_yield", scope: "menu", prepItemId: prep.id, menuItemId: menuItem.id, message: `Prep output for ${prep.name} is invalid.` });
    if (quantity === null) diagnostics.push({ code: "unit_issue", scope: "menu", prepItemId: prep.id, menuItemId: menuItem.id, fromUnit: line.unit, toUnit: prep.outputUnit, message: `Cannot convert ${line.unit} to ${prep.outputUnit} for ${prep.name}.` });
    const prepCost = prepCostResult(state, prep);
    diagnostics.push(...prepCost.diagnostics.map((diagnostic) => ({ ...diagnostic, menuItemId: menuItem.id })));
    if (outputQuantity !== null && quantity !== null && prepCost.value !== null) values.push(quantity / outputQuantity * prepCost.value);
  }
  return { value: diagnostics.length === 0 ? sum(values) : null, diagnostics };
}

export function analyzeMenuCosts(state: AppState): MenuCostAnalysis[] {
  const target = state.business.targetFoodCostRatio;
  return (state.menu ?? [])
    .filter((item) => item.active)
    .map((item) => {
      const result = menuCostResult(state, item);
      const unitFoodCost = result.value;
      const ratio = unitFoodCost !== null && item.price > 0 ? unitFoodCost / item.price : null;
      const validPrice = Number.isFinite(item.price) && item.price > 0;
      const targetRatio = target !== undefined && Number.isFinite(target) ? target : null;
      const status: MenuCostAnalysis["status"] = result.diagnostics.some((diagnostic) => diagnostic.code === "unit_issue")
        ? "unit_issue"
        : result.diagnostics.length > 0 || !validPrice
          ? "data_issue"
          : "complete";
      return {
        item,
        sellingPrice: item.price,
        unitFoodCost,
        foodCostRatio: ratio !== null && Number.isFinite(ratio) ? ratio : null,
        foodCostOnlyMargin: ratio !== null && Number.isFinite(ratio) ? item.price - unitFoodCost! : null,
        targetFoodCostRatio: targetRatio,
        varianceVsTarget: ratio !== null && targetRatio !== null ? ratio - targetRatio : null,
        status,
        diagnostics: result.diagnostics,
      };
    })
    .sort((a, b) => {
      const rank = (value: MenuCostAnalysis) => value.status === "unit_issue" ? 0 : value.status === "data_issue" ? 1 : 2;
      return rank(a) - rank(b) || (b.foodCostRatio ?? -1) - (a.foodCostRatio ?? -1);
    });
}

export function menuUnitFoodCost(state: AppState, menuItem: MenuItem): number {
  return menuCostResult(state, menuItem).value ?? 0;
}

export function estimatedFoodCost(state: AppState): number {
  const menu = new Map((state.menu ?? []).map((item) => [item.id, item]));
  let total = 0;
  for (const snapshot of state.sales ?? []) {
    for (const sold of snapshot.itemSales) {
      const item = menu.get(sold.menuItemId);
      if (item) total += sold.quantity * menuUnitFoodCost(state, item);
    }
  }
  return total;
}

export function estimatedWasteCost(state: AppState): number {
  const inventory = new Map((state.inventory ?? []).map((item) => [item.id, item]));
  return sum((state.waste ?? []).map((record) => {
    const item = inventory.get(record.inventoryItemId);
    if (!item || item.lastPurchaseUnitCost === undefined || item.lastPurchaseUnitCost === null) return 0;
    const quantity = convertInventoryQuantity(record.quantity, record.unit, item.unit);
    return quantity === null ? 0 : quantity * item.lastPurchaseUnitCost;
  }));
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
  return resolveCommodityReference(state, item.marketReferenceKey).observation;
}

export function purchaseReferenceComparison(state: AppState, item: InventoryItem): {
  actualUnitCost: number;
  reference: ReferenceObservation;
  referenceUnitCost: number;
  difference: number;
  differenceRate: number;
  degraded: boolean;
  fallbackReason?: string;
} | null {
  if (item.lastPurchaseUnitCost === undefined || item.lastPurchaseUnitCost === null || !Number.isFinite(item.lastPurchaseUnitCost) || !item.marketReferenceKey) return null;
  const resolved = resolveCommodityReference(state, item.marketReferenceKey);
  const reference = resolved.observation;
  if (!reference || typeof reference.value !== "number" || reference.value <= 0) return null;
  const referenceUnit = isInventoryUnit(reference.unit) ? reference.unit : item.unit;
  const normalizedReference = convertInventoryQuantity(reference.value, referenceUnit, item.unit);
  if (normalizedReference === null) return null;
  const difference = item.lastPurchaseUnitCost - normalizedReference;
  return {
    actualUnitCost: item.lastPurchaseUnitCost,
    reference,
    referenceUnitCost: normalizedReference,
    difference,
    differenceRate: difference / normalizedReference,
    degraded: resolved.degraded,
    fallbackReason: resolved.reason,
  };
}

export function analyzeInventoryCosts(state: AppState): InventoryCostAnalysis[] {
  const usageAnalysis = analyzeTheoreticalInventoryUsage(state);
  const usageDiagnosticsByItem = new Map<string, CostingDiagnostic[]>();
  for (const diagnostic of usageAnalysis.diagnostics) {
    if (!diagnostic.inventoryItemId) continue;
    usageDiagnosticsByItem.set(diagnostic.inventoryItemId, [...(usageDiagnosticsByItem.get(diagnostic.inventoryItemId) ?? []), diagnostic]);
  }
  for (const analysis of analyzeMenuCosts(state)) {
    for (const diagnostic of analysis.diagnostics) {
      if (!diagnostic.inventoryItemId) continue;
      if (diagnostic.code !== "unit_issue") continue;
      usageDiagnosticsByItem.set(diagnostic.inventoryItemId, [...(usageDiagnosticsByItem.get(diagnostic.inventoryItemId) ?? []), { ...diagnostic, scope: "inventory" }]);
    }
  }
  return (state.inventory ?? []).map((item) => {
    const diagnostics = [...(usageDiagnosticsByItem.get(item.id) ?? [])];
    const reference = commodityReferenceForItem(state, item);
    const comparison = purchaseReferenceComparison(state, item);
    const referenceUnit = reference && isInventoryUnit(reference.unit) ? reference.unit : item.unit;
    if (reference && isInventoryUnit(reference.unit) && convertInventoryQuantity(1, referenceUnit, item.unit) === null) {
      diagnostics.push({ code: "unit_issue", scope: "inventory", inventoryItemId: item.id, fromUnit: referenceUnit, toUnit: item.unit, message: `Cannot compare ${referenceUnit} reference with ${item.unit} purchase cost.` });
    }
    if (item.lastPurchaseUnitCost === undefined || item.lastPurchaseUnitCost === null || !Number.isFinite(item.lastPurchaseUnitCost)) {
      diagnostics.push({ code: "missing_purchase_cost", scope: "inventory", inventoryItemId: item.id, message: `Purchase cost for ${item.name} is unavailable.` });
    }
    const daysOfCover = inventoryDaysOfCover(state, item);
    const unitIssue = diagnostics.some((diagnostic) => diagnostic.code === "unit_issue");
    const dataIssue = diagnostics.some((diagnostic) => diagnostic.code === "missing_purchase_cost" || diagnostic.code === "missing_inventory_item" || diagnostic.code === "invalid_yield");
    const urgent = item.onHand <= item.reorderPoint || (daysOfCover !== null && daysOfCover <= item.leadTimeDays);
    const attention = item.onHand <= item.parLevel || (daysOfCover !== null && daysOfCover <= item.leadTimeDays + 1);
    const status: InventoryCostAnalysis["status"] = unitIssue ? "unit_issue" : dataIssue ? "data_issue" : urgent ? "urgent" : attention ? "attention" : "ok";
    return {
      item,
      daysOfCover,
      reorderQuantity: reorderQuantityToPar(item),
      actualPurchaseUnitCost: item.lastPurchaseUnitCost ?? null,
      reference,
      referenceUnitCost: comparison?.referenceUnitCost ?? null,
      differenceRate: comparison?.differenceRate ?? null,
      status,
      diagnostics,
    };
  }).sort((a, b) => {
    const rank = (value: InventoryCostAnalysis) => value.status === "unit_issue" ? 0 : value.status === "data_issue" ? 1 : value.status === "urgent" ? 2 : value.status === "attention" ? 3 : 4;
    return rank(a) - rank(b) || (a.daysOfCover ?? Number.POSITIVE_INFINITY) - (b.daysOfCover ?? Number.POSITIVE_INFINITY);
  });
}

export function highestPurchasePremium(state: AppState) {
  return (state.inventory ?? [])
    .map((item) => ({ item, comparison: purchaseReferenceComparison(state, item) }))
    .filter((value): value is { item: InventoryItem; comparison: NonNullable<ReturnType<typeof purchaseReferenceComparison>> } => value.comparison !== null)
    .sort((a, b) => b.comparison.differenceRate - a.comparison.differenceRate)[0] ?? null;
}

export function storeCostMetrics(state: AppState) {
  const weeklySales = sum((state.sales ?? []).map((snapshot) => snapshot.netSales));
  const monthlySales = weeklySales * 4.345;
  const foodCost = estimatedFoodCost(state);
  const laborCost = scheduledWageEstimate(state);
  const variableRates = state.business.operatingCosts?.variableRates;
  const variableOperatingCost = weeklySales * (
    (variableRates?.packagingAndConsumables ?? 0)
    + (variableRates?.paymentProcessing ?? 0)
    + (variableRates?.deliveryAndMarketplace ?? 0)
  );
  const occupancyMonthly = state.business.occupancy
    ? state.business.occupancy.baseRentMonthly + state.business.occupancy.recurringFeesMonthly
    : 0;
  const fixedOps = state.business.operatingCosts?.fixedMonthly;
  const fixedOperatingMonthly = (fixedOps?.utilities ?? 0)
    + (fixedOps?.softwareSecurityRentals ?? 0)
    + (fixedOps?.marketing ?? 0)
    + (fixedOps?.other ?? 0);

  // Matches the uploaded operating model: food + other variable costs form contribution margin;
  // labor is treated as fixed/semi-fixed for the short-horizon BEP view.
  const monthlyVariableCost = (foodCost + variableOperatingCost) * 4.345;
  const variableCostRatio = monthlySales > 0 ? monthlyVariableCost / monthlySales : 0;
  const contributionRatio = Math.max(0.05, 1 - variableCostRatio);
  const monthlyFixedCost = laborCost * 4.345 + occupancyMonthly + fixedOperatingMonthly;
  const monthlyBreakEvenSales = monthlyFixedCost > 0 ? monthlyFixedCost / contributionRatio : 0;
  const foodCostRatio = weeklySales > 0 ? foodCost / weeklySales : 0;
  const laborCostRatio = weeklySales > 0 ? laborCost / weeklySales : 0;
  const flCostRatio = foodCostRatio + laborCostRatio;

  return {
    weeklySales,
    monthlySales,
    foodCost,
    foodCostRatio,
    laborCost,
    laborCostRatio,
    flCostRatio,
    variableOperatingCost,
    occupancyMonthly,
    occupancyWeekly: occupancyMonthly / 4.345,
    fixedOperatingMonthly,
    fixedOperatingWeekly: fixedOperatingMonthly / 4.345,
    monthlyBreakEvenSales,
    weeklyBreakEvenSales: monthlyBreakEvenSales / 4.345,
  };
}

export function occupancyMetrics(state: AppState) {
  const costs = storeCostMetrics(state);
  const occupancyToSales = costs.monthlySales > 0 ? costs.occupancyMonthly / costs.monthlySales : 0;
  return {
    monthlyOccupancyCost: costs.occupancyMonthly,
    estimatedMonthlySales: costs.monthlySales,
    occupancyToSales,
    monthlyBreakEvenSales: costs.monthlyBreakEvenSales,
  };
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
  const fallback = comparison.degraded ? ` · ${comparison.fallbackReason ?? "fallback reference"}` : "";
  return {
    id: `brief-reference-${item.id}`,
    domain: "costs",
    severity: "attention",
    title: `${item.name} purchase cost is above reference`,
    evidence: `Store actual ${comparison.actualUnitCost.toFixed(2)}/${item.unit} vs ${comparison.reference.provider} reference ${Number(comparison.reference.value).toFixed(2)}/${item.unit} (+${(comparison.differenceRate * 100).toFixed(1)}%)${fallback}.`,
    nextIntent: "review_purchase_cost",
    sourceType: comparison.reference.freshness === "live" || comparison.reference.freshness === "recent" ? "external_reference" : "seed",
    score: 62,
  };
}

function costStructureRisk(state: AppState): DailyBriefItem | null {
  const costs = storeCostMetrics(state);
  if (costs.weeklySales <= 0) return null;
  if (costs.flCostRatio < 0.55) return null;
  return {
    id: "brief-fl-cost",
    domain: "costs",
    severity: costs.flCostRatio > 0.6 ? "attention" : "info",
    title: "Food + labor cost needs review",
    evidence: `FL Cost ${(costs.flCostRatio * 100).toFixed(1)}% · food ${(costs.foodCostRatio * 100).toFixed(1)}% · labor ${(costs.laborCostRatio * 100).toFixed(1)}%.`,
    estimatedImpact: `Weekly break-even sales ${costs.weeklyBreakEvenSales.toFixed(0)} ${state.business.currency}`,
    nextIntent: "review_cost_structure",
    sourceType: "actual",
    score: costs.flCostRatio > 0.6 ? 68 : 45,
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
    estimatedImpact: `Monthly break-even sales: ${metrics.monthlyBreakEvenSales.toFixed(0)} ${state.business.currency}`,
    nextIntent: "occupancy_pressure",
    sourceType: "actual",
    score: 35,
  };
}

export function getDailyBrief(state: AppState, limit = 5): DailyBriefItem[] {
  return [openStaffingRisk(state), stockRisk(state), wasteRisk(state), purchasePremiumRisk(state), costStructureRisk(state), weatherRisk(state), occupancyRisk(state)]
    .filter((item): item is DailyBriefItem => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 5)));
}
