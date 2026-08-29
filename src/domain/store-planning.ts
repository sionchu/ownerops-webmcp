import { getResponseOptions } from "./actions";
import { inventoryAtRisk } from "./store-ops";
import { createStorePlan } from "./store-plan";
import type { AppState, StorePlan, StorePlanChange } from "./model";

export type StorePlanObjective =
  | "prepare_today"
  | "staff_recovery"
  | "rebuild_week"
  | "reduce_labor_cost"
  | "inventory_reorder"
  | "reduce_waste"
  | "respond_to_weather"
  | "occupancy_pressure"
  | "closing_tasks";

export type StorePlanningRequest = {
  objective: StorePlanObjective;
  maxWeeklyHours?: number;
  prioritize?: "cost" | "balance" | "minimal_changes";
  inventoryItemId?: string;
  maxItems?: number;
};

export type StorePlanningResult = {
  objective: StorePlanObjective;
  summary: string;
  plans: StorePlan[];
  unsupportedReason?: string;
};

function staffingPlanChanges(state: AppState, objective: "incident_recovery" | "rebuild_week", request: StorePlanningRequest): StorePlan[] {
  const options = getResponseOptions(state, objective === "incident_recovery"
    ? { objective }
    : {
        objective,
        maxWeeklyHours: request.maxWeeklyHours,
        prioritize: request.prioritize,
        allowCapacityGap: true,
      });
  return options.map((option) => createStorePlan(
    state,
    option.title,
    option.changes.map((change) => ({ type: "staffing", shiftId: change.shiftId, workerId: change.workerId, start: change.start, end: change.end })),
    `store-${option.id}`,
  ));
}

function purchaseChange(state: AppState, itemId: string): StorePlanChange | null {
  const risk = inventoryAtRisk(state).find(({ item }) => item.id === itemId);
  if (!risk || risk.reorderQuantity <= 0) return null;
  return {
    type: "purchase",
    inventoryItemId: risk.item.id,
    supplierId: risk.item.supplierId,
    quantity: risk.reorderQuantity,
    unit: risk.item.unit,
    estimatedUnitCost: risk.item.lastPurchaseUnitCost,
  };
}

function inventoryPlans(state: AppState, request: StorePlanningRequest): StorePlan[] {
  const risks = inventoryAtRisk(state)
    .filter(({ item }) => request.inventoryItemId === undefined || item.id === request.inventoryItemId)
    .slice(0, Math.max(1, Math.min(request.maxItems ?? 3, 5)));
  if (risks.length === 0) return [];
  const changes = risks.flatMap(({ item }) => {
    const change = purchaseChange(state, item.id);
    return change ? [change] : [];
  });
  if (changes.length === 0) return [];

  const plans: StorePlan[] = [createStorePlan(state, `Reorder ${changes.length} at-risk item${changes.length > 1 ? "s" : ""} to par`, changes, "store-inventory-reorder")];
  if (changes.length > 1) {
    plans.push(createStorePlan(state, `Reorder only ${risks[0].item.name}`, [changes[0]], `store-inventory-${risks[0].item.id}`));
  }
  return plans;
}

export function planStoreActions(state: AppState, request: StorePlanningRequest): StorePlanningResult {
  switch (request.objective) {
    case "staff_recovery": {
      const plans = staffingPlanChanges(state, "incident_recovery", request);
      return {
        objective: request.objective,
        summary: plans.length > 0 ? `${plans.length} staffing recovery plans are ready.` : "No viable staffing recovery plan is available from the current live state.",
        plans,
      };
    }
    case "rebuild_week":
    case "reduce_labor_cost": {
      const plans = staffingPlanChanges(state, "rebuild_week", {
        ...request,
        prioritize: request.objective === "reduce_labor_cost" ? "cost" : request.prioritize,
      });
      return {
        objective: request.objective,
        summary: plans.length > 0 ? `${plans.length} full-week staffing plans are ready.` : "No compliant week rebuild is available with the current worker constraints.",
        plans,
      };
    }
    case "inventory_reorder": {
      const plans = inventoryPlans(state, request);
      return {
        objective: request.objective,
        summary: plans.length > 0 ? `${plans.length} inventory reorder plan${plans.length > 1 ? "s are" : " is"} ready.` : "No inventory item currently needs a deterministic reorder-to-par plan.",
        plans,
      };
    }
    case "prepare_today": {
      const changes: StorePlanChange[] = [];
      const staffing = staffingPlanChanges(state, "incident_recovery", request)[0];
      if (staffing) changes.push(...staffing.changes);
      const stock = inventoryPlans(state, { ...request, objective: "inventory_reorder", maxItems: 2 })[0];
      if (stock) changes.push(...stock.changes);
      if (changes.length === 0) {
        return { objective: request.objective, summary: "No supported consequential changes are required from the current brief.", plans: [] };
      }
      return {
        objective: request.objective,
        summary: `Prepared one cross-domain operating plan with ${changes.length} changes.`,
        plans: [createStorePlan(state, "Prepare today", changes, "store-prepare-today")],
      };
    }
    case "closing_tasks":
      return {
        objective: request.objective,
        summary: `${(state.tasks ?? []).filter((task) => task.status === "open").length} closing tasks are currently open.`,
        plans: [],
        unsupportedReason: "Task creation from a reusable checklist is not yet a planning mutation; existing task state can be inspected and completed.",
      };
    case "reduce_waste":
      return {
        objective: request.objective,
        summary: "Waste evidence can be diagnosed, but automatic prep-target changes are not commit-ready yet.",
        plans: [],
        unsupportedReason: "A canonical prep-target state must exist before the agent can safely commit prep reductions.",
      };
    case "respond_to_weather":
      return {
        objective: request.objective,
        summary: "Weather context is available, but OwnerOps will not invent a demand elasticity or staffing reduction without a calibrated rule.",
        plans: [],
        unsupportedReason: "Weather-to-demand effects need a configured store rule or historical model before generating consequential changes.",
      };
    case "occupancy_pressure":
      return {
        objective: request.objective,
        summary: "Occupancy and break-even pressure can be calculated, but price or menu changes require an explicit model before they become commit-ready actions.",
        plans: [],
        unsupportedReason: "No fabricated price elasticity or sales uplift is used.",
      };
  }
}
