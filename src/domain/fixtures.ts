import { getIndustryProfile, isIndustryId } from "@/industry/profiles";
import { createMarketSales, createMarketWorkers, getMarketCostScale, getMarketProfile, isMarketId } from "@/market/profiles";
import type { AppState, IndustryId, InventoryItem, MarketId, MenuItem, PurchaseRecord, ReferenceObservation, SalesSnapshot, Shift, StoreOperatingCosts, StoreTask, Supplier, TimeEntry, WasteRecord, Worker } from "./model";

export const DEMO_WEEK = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"];

export const DEMO_WORKERS: Worker[] = createMarketWorkers("kr-seoul");

const shift = (id: string, workerId: string, day: string, start: string, end: string, role: "barista" | "manager" = "barista"): Shift => ({
  id,
  workerId,
  start: `${day}T${start}:00`,
  end: `${day}T${end}:00`,
  role,
  status: "scheduled",
});

export const DEMO_SHIFTS: Shift[] = [
  shift("mon-minsoo-open", "minsoo", DEMO_WEEK[0], "08:00", "14:00"),
  shift("mon-jiyoung-close", "jiyoung", DEMO_WEEK[0], "14:00", "20:00"),
  shift("mon-younghee", "younghee", DEMO_WEEK[0], "10:00", "18:00", "manager"),
  shift("tue-chulsoo-open", "chulsoo", DEMO_WEEK[1], "08:00", "14:00"),
  shift("tue-hana-close", "hana", DEMO_WEEK[1], "14:00", "20:00"),
  shift("tue-younghee", "younghee", DEMO_WEEK[1], "10:00", "18:00", "manager"),
  shift("wed-minsoo-open", "minsoo", DEMO_WEEK[2], "08:00", "14:00"),
  shift("wed-jiyoung-close", "jiyoung", DEMO_WEEK[2], "14:00", "20:00"),
  shift("wed-younghee", "younghee", DEMO_WEEK[2], "10:00", "18:00", "manager"),
  shift("thu-chulsoo-open", "chulsoo", DEMO_WEEK[3], "08:00", "14:00"),
  shift("thu-hana-close", "hana", DEMO_WEEK[3], "14:00", "20:00"),
  shift("thu-younghee", "younghee", DEMO_WEEK[3], "10:00", "18:00", "manager"),
  shift("fri-jiyoung-day", "jiyoung", DEMO_WEEK[4], "10:00", "18:00"),
  shift("fri-chulsoo-day", "chulsoo", DEMO_WEEK[4], "12:00", "18:00"),
  shift("fri-minsoo-18", "minsoo", DEMO_WEEK[4], "18:00", "22:00"),
  shift("fri-younghee", "younghee", DEMO_WEEK[4], "14:00", "22:00", "manager"),
  shift("sat-hana-open", "hana", DEMO_WEEK[5], "08:00", "16:00"),
  shift("sat-chulsoo-close", "chulsoo", DEMO_WEEK[5], "14:00", "22:00"),
  shift("sat-younghee", "younghee", DEMO_WEEK[5], "12:00", "20:00", "manager"),
  shift("sun-minsoo", "minsoo", DEMO_WEEK[6], "09:00", "17:00"),
  shift("sun-jiyoung", "jiyoung", DEMO_WEEK[6], "12:00", "20:00"),
  shift("sun-hana", "hana", DEMO_WEEK[6], "14:00", "22:00"),
];

const SUPPLIERS: Record<string, Omit<Supplier, "name"> & { nameSuffix: string }> = {
  food: { id: "supplier-food", nameSuffix: "Fresh & Food Supply", defaultLeadTimeDays: 2 },
  packaging: { id: "supplier-packaging", nameSuffix: "Packaging Supply", defaultLeadTimeDays: 4 },
  sanitation: { id: "supplier-sanitation", nameSuffix: "Sanitation Supply", defaultLeadTimeDays: 4 },
  beauty: { id: "supplier-beauty", nameSuffix: "Professional Beauty Supply", defaultLeadTimeDays: 5 },
};

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function createSuppliers(): Supplier[] {
  return Object.values(SUPPLIERS).map((supplier) => ({ id: supplier.id, name: supplier.nameSuffix, defaultLeadTimeDays: supplier.defaultLeadTimeDays }));
}

function createOperatingCosts(market: MarketId): StoreOperatingCosts {
  const profile = getMarketProfile(market);
  const scale = getMarketCostScale(market);
  const fixed = (krw: number) => roundTo(krw * scale, profile.wageRounding);
  return {
    variableRates: {
      packagingAndConsumables: 0.03,
      paymentProcessing: 0.015,
      deliveryAndMarketplace: 0.05,
    },
    fixedMonthly: {
      utilities: fixed(2_200_000),
      softwareSecurityRentals: fixed(450_000),
      marketing: fixed(1_000_000),
      other: fixed(600_000),
    },
  };
}

function createInventory(industry: IndustryId, market: MarketId): InventoryItem[] {
  const industryProfile = getIndustryProfile(industry);
  const marketProfile = getMarketProfile(market);
  const costScale = getMarketCostScale(market);
  return industryProfile.operations.inventory.map((seed, index) => {
    const scaledCost = roundTo(seed.baseUnitCostKrw * costScale, marketProfile.wageRounding);
    const purchasePremium = index === 0 ? 1.10 : index === 2 ? 1.06 : 1;
    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      unit: seed.unit,
      onHand: seed.onHand,
      parLevel: seed.parLevel,
      reorderPoint: seed.reorderPoint,
      leadTimeDays: seed.leadTimeDays,
      supplierId: SUPPLIERS[seed.supplierKind].id,
      lastPurchaseUnitCost: roundTo(scaledCost * purchasePremium, marketProfile.wageRounding),
      marketReferenceKey: seed.marketReferenceKey,
      perishable: seed.perishable,
    };
  });
}

function createMenu(industry: IndustryId, market: MarketId): MenuItem[] {
  const industryProfile = getIndustryProfile(industry);
  const marketProfile = getMarketProfile(market);
  const scale = getMarketCostScale(market);
  return industryProfile.operations.menu.map((seed) => ({
    id: seed.id,
    name: seed.name,
    category: seed.category,
    price: roundTo(seed.basePriceKrw * scale, marketProfile.salesRounding),
    recipe: structuredClone(seed.recipe),
    active: true,
  }));
}

function createPurchases(inventory: InventoryItem[]): PurchaseRecord[] {
  return inventory.slice(0, Math.min(5, inventory.length)).map((item, index) => ({
    id: `purchase-${item.id}`,
    supplierId: item.supplierId ?? "supplier-food",
    inventoryItemId: item.id,
    receivedAt: `2026-08-${String(24 + index).padStart(2, "0")}T07:30:00`,
    quantity: Math.max(item.parLevel * 0.7, 1),
    unit: item.unit,
    totalCost: (item.lastPurchaseUnitCost ?? 0) * Math.max(item.parLevel * 0.7, 1),
  }));
}

function createWaste(industry: IndustryId, inventory: InventoryItem[]): WasteRecord[] {
  const preferred = industry === "coffee" ? inventory.find((item) => item.id === "croissant") : inventory.find((item) => item.perishable);
  if (!preferred) return [];
  const quantity = preferred.unit === "ea" ? 7 : Math.max(0.6, preferred.parLevel * 0.08);
  return [
    { id: `waste-${preferred.id}-1`, inventoryItemId: preferred.id, recordedAt: "2026-08-27T21:40:00", quantity, unit: preferred.unit, reason: "prep" },
    { id: `waste-${preferred.id}-2`, inventoryItemId: preferred.id, recordedAt: "2026-08-26T21:35:00", quantity: quantity * 0.55, unit: preferred.unit, reason: "prep" },
  ];
}

function createSales(expectedSalesByDay: Record<string, number>, menu: MenuItem[]): SalesSnapshot[] {
  if (menu.length === 0) return [];
  return DEMO_WEEK.map((date, dayIndex) => {
    const netSales = expectedSalesByDay[date] ?? 0;
    const averagePrice = menu.reduce((sum, item) => sum + item.price, 0) / menu.length || 1;
    const estimatedOrders = Math.max(1, Math.round(netSales / Math.max(averagePrice * 1.35, 1)));
    const itemSales = menu.map((item, index) => {
      const share = index === 0 ? 0.55 : 0.45 / Math.max(menu.length - 1, 1);
      const quantity = Math.max(1, Math.round(estimatedOrders * share));
      return { menuItemId: item.id, quantity, netSales: quantity * item.price };
    });
    return {
      id: `sales-${date}`,
      date,
      grossSales: netSales * 1.05,
      netSales,
      orderCount: estimatedOrders,
      itemSales,
      source: "demo" as const,
      ...(dayIndex === 4 ? { hour: 19 } : {}),
    };
  });
}

function createTimeEntries(workers: Worker[]): TimeEntry[] {
  const exists = (id: string) => workers.some((worker) => worker.id === id);
  return [
    exists("minsoo") ? { id: "time-mon-minsoo", workerId: "minsoo", shiftId: "mon-minsoo-open", clockIn: "2026-08-24T08:05:00", clockOut: "2026-08-24T14:02:00", source: "demo" as const } : null,
    exists("jiyoung") ? { id: "time-mon-jiyoung", workerId: "jiyoung", shiftId: "mon-jiyoung-close", clockIn: "2026-08-24T13:58:00", clockOut: "2026-08-24T20:17:00", source: "demo" as const } : null,
    exists("younghee") ? { id: "time-mon-younghee", workerId: "younghee", shiftId: "mon-younghee", clockIn: "2026-08-24T09:54:00", clockOut: "2026-08-24T18:21:00", source: "demo" as const } : null,
  ].filter((entry): entry is TimeEntry => entry !== null);
}

function createTasks(industry: IndustryId): StoreTask[] {
  const profile = getIndustryProfile(industry);
  return profile.operations.closingTasks.map((title, index) => ({
    id: `closing-task-${index + 1}`,
    title,
    dueAt: `2026-08-28T${index < 2 ? "21:30" : "21:50"}:00`,
    workerId: index % 2 === 0 ? "jiyoung" : "younghee",
    status: index === profile.operations.closingTasks.length - 1 ? "open" : "done",
  }));
}

function createReferenceObservations(market: MarketId, inventory: InventoryItem[]): ReferenceObservation[] {
  const marketProfile = getMarketProfile(market);
  const itemRefs = inventory
    .filter((item) => item.marketReferenceKey && item.lastPurchaseUnitCost)
    .slice(0, 5)
    .map((item) => ({
      id: `reference-${item.id}`,
      kind: "commodity_price" as const,
      provider: marketProfile.referenceProviders.commodity,
      referenceKey: item.marketReferenceKey!,
      geography: marketProfile.locationLabels.en,
      observedAt: "2026-08-28T06:00:00",
      fetchedAt: "2026-08-28T07:00:00",
      value: roundTo((item.lastPurchaseUnitCost ?? 0) * 0.92, marketProfile.wageRounding),
      unit: item.unit,
      currency: marketProfile.currency,
      sourceUrl: marketProfile.referenceProviders.commoditySourceUrl,
      freshness: "seed" as const,
    }));
  const occupancy = marketProfile.defaultOccupancy;
  return [
    ...itemRefs,
    {
      id: "reference-rent",
      kind: "rent_benchmark" as const,
      provider: marketProfile.referenceProviders.rent,
      referenceKey: "commercial_rent_benchmark",
      geography: marketProfile.locationLabels.en,
      observedAt: "2026-07-01T00:00:00",
      fetchedAt: "2026-08-28T07:00:00",
      value: roundTo((occupancy.baseRentMonthly + occupancy.recurringFeesMonthly) * 0.96, marketProfile.wageRounding),
      unit: "monthly occupancy reference",
      currency: marketProfile.currency,
      sourceUrl: marketProfile.referenceProviders.rentSourceUrl,
      freshness: "seed" as const,
    },
  ];
}

export function createDemoState(industry: IndustryId = "diner", market: MarketId = "kr-seoul"): AppState {
  if (!isIndustryId(industry)) throw new Error(`Unsupported industry profile: ${String(industry)}.`);
  if (!isMarketId(market)) throw new Error(`Unsupported market profile: ${String(market)}.`);
  const profile = getIndustryProfile(industry);
  const marketProfile = getMarketProfile(market);
  const workers = createMarketWorkers(market).map((worker) => ({ ...worker, skills: profile.operations.workerSkills[worker.id] ?? [worker.role] }));
  const expectedSalesByDay = createMarketSales(market);
  const peakWindows = [
    { day: "2026-08-28", start: "19:00", end: "21:00", minCoverage: 2 },
    { day: "2026-08-29", start: "14:00", end: "18:00", minCoverage: 2 },
  ];
  const inventory = createInventory(industry, market);
  const menu = createMenu(industry, market);
  const suppliers = createSuppliers();
  const sales = createSales(expectedSalesByDay, menu);
  const purchases = createPurchases(inventory);
  const waste = createWaste(industry, inventory);
  const tasks = createTasks(industry);
  const references = createReferenceObservations(market, inventory);
  return {
    schemaVersion: 1,
    business: {
      industry: profile.id,
      market: marketProfile.id,
      currency: marketProfile.currency,
      name: profile.businessName,
      employeeCount: workers.length,
      targetLaborRatio: 0.22,
      targetFoodCostRatio: industry === "salon" ? 0.14 : 0.30,
      weeklyHourWarningThreshold: 40,
      expectedSalesByDay,
      peakWindows,
      timezone: marketProfile.timezone,
      openingHours: Object.fromEntries(DEMO_WEEK.map((day) => [day, { open: "08:00", close: "22:00" }])),
      occupancy: structuredClone(marketProfile.defaultOccupancy),
      operatingCosts: createOperatingCosts(market),
      policies: {
        calloutPayPolicy: "unpaid_hours",
        externalContactMode: "draft_only",
        complianceMode: "review_flags_only",
      },
    },
    workers,
    shifts: structuredClone(DEMO_SHIFTS),
    demand: peakWindows.map((peak) => ({ ...peak, expectedSales: expectedSalesByDay[peak.day] })),
    preview: null,
    incident: null,
    activity: { state: "idle", message: "Store ready for review." },
    timeEntries: createTimeEntries(workers),
    incidents: [],
    sales,
    menu,
    inventory,
    suppliers,
    purchases,
    purchaseOrders: [],
    waste,
    tasks,
    log: [
      { id: "log-1", createdAt: "2026-08-27T22:05:00", type: "task", summary: "Closing completed; one prep variance noted.", relatedIds: tasks.slice(0, 2).map((task) => task.id) },
      ...(waste[0] ? [{ id: "log-2", createdAt: waste[0].recordedAt, type: "stock" as const, summary: `${inventory.find((item) => item.id === waste[0].inventoryItemId)?.name ?? "Inventory"} waste above recent demo baseline.`, relatedIds: [waste[0].inventoryItemId] }] : []),
    ],
    references,
    context: {
      businessDate: "2026-08-28",
      weather: {
        provider: marketProfile.referenceProviders.weather,
        summary: "Rain likely after 15:00",
        temperatureC: market === "us-nyc" ? 24 : market === "es-madrid" ? 29 : 26,
        precipitationProbability: 0.72,
        observedAt: "2026-08-28T07:00:00",
        freshness: "seed",
      },
      localEvents: [],
    },
    storePlan: null,
  };
}
