import type { AppState, Business, InventoryItem, MenuItem, Supplier } from "./model";

export type StoreMasterDraft = {
  business: Business;
  menu: MenuItem[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
};

export function storeMasterDraft(state: AppState): StoreMasterDraft {
  return {
    business: structuredClone(state.business),
    menu: structuredClone(state.menu ?? []),
    inventory: structuredClone(state.inventory ?? []),
    suppliers: structuredClone(state.suppliers ?? []),
  };
}

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function ratio(value: number | undefined, fallback: number | undefined): number | undefined {
  if (value === undefined) return fallback;
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

function mergeBusiness(current: Business, incoming: Business): Business {
  const occupancy = current.occupancy && incoming.occupancy ? {
    ...current.occupancy,
    baseRentMonthly: finiteNonNegative(incoming.occupancy.baseRentMonthly, current.occupancy.baseRentMonthly),
    recurringFeesMonthly: finiteNonNegative(incoming.occupancy.recurringFeesMonthly, current.occupancy.recurringFeesMonthly),
    deposit: incoming.occupancy.deposit === undefined ? current.occupancy.deposit : finiteNonNegative(incoming.occupancy.deposit, current.occupancy.deposit ?? 0),
    leaseStart: incoming.occupancy.leaseStart,
    leaseEnd: incoming.occupancy.leaseEnd,
    nextEscalationDate: incoming.occupancy.nextEscalationDate,
    nextEscalationRate: ratio(incoming.occupancy.nextEscalationRate, current.occupancy.nextEscalationRate),
  } : current.occupancy;
  const operatingCosts = current.operatingCosts && incoming.operatingCosts ? {
    variableRates: {
      packagingAndConsumables: ratio(incoming.operatingCosts.variableRates.packagingAndConsumables, current.operatingCosts.variableRates.packagingAndConsumables)!,
      paymentProcessing: ratio(incoming.operatingCosts.variableRates.paymentProcessing, current.operatingCosts.variableRates.paymentProcessing)!,
      deliveryAndMarketplace: ratio(incoming.operatingCosts.variableRates.deliveryAndMarketplace, current.operatingCosts.variableRates.deliveryAndMarketplace)!,
    },
    fixedMonthly: {
      utilities: finiteNonNegative(incoming.operatingCosts.fixedMonthly.utilities, current.operatingCosts.fixedMonthly.utilities),
      softwareSecurityRentals: finiteNonNegative(incoming.operatingCosts.fixedMonthly.softwareSecurityRentals, current.operatingCosts.fixedMonthly.softwareSecurityRentals),
      marketing: finiteNonNegative(incoming.operatingCosts.fixedMonthly.marketing, current.operatingCosts.fixedMonthly.marketing),
      other: finiteNonNegative(incoming.operatingCosts.fixedMonthly.other, current.operatingCosts.fixedMonthly.other),
    },
  } : current.operatingCosts;
  return {
    ...current,
    name: incoming.name.trim() || current.name,
    openingHours: structuredClone(incoming.openingHours ?? current.openingHours),
    targetLaborRatio: ratio(incoming.targetLaborRatio, current.targetLaborRatio)!,
    targetFoodCostRatio: ratio(incoming.targetFoodCostRatio, current.targetFoodCostRatio),
    occupancy,
    operatingCosts,
  };
}

export function applyStoreMasterDraft(state: AppState, draft: StoreMasterDraft): AppState {
  const menus = new Map(draft.menu.map((item) => [item.id, item]));
  const inventory = new Map(draft.inventory.map((item) => [item.id, item]));
  return {
    ...state,
    business: mergeBusiness(state.business, draft.business),
    menu: (state.menu ?? []).map((current) => {
      const incoming = menus.get(current.id);
      if (!incoming) return current;
      return {
        ...current,
        name: incoming.name.trim() || current.name,
        category: incoming.category.trim() || current.category,
        price: finiteNonNegative(incoming.price, current.price),
        active: incoming.active,
        recipe: structuredClone(incoming.recipe),
      };
    }),
    inventory: (state.inventory ?? []).map((current) => {
      const incoming = inventory.get(current.id);
      if (!incoming) return current;
      return {
        ...current,
        name: incoming.name.trim() || current.name,
        category: incoming.category.trim() || current.category,
        purchaseForm: incoming.purchaseForm,
        parLevel: finiteNonNegative(incoming.parLevel, current.parLevel),
        reorderPoint: finiteNonNegative(incoming.reorderPoint, current.reorderPoint),
        leadTimeDays: finiteNonNegative(incoming.leadTimeDays, current.leadTimeDays),
        supplierId: incoming.supplierId,
      };
    }),
    suppliers: structuredClone(state.suppliers ?? []),
  };
}
