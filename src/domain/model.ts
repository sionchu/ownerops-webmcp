export type WorkerRole = "barista" | "manager";

export type IndustryId = "diner" | "pizza" | "coffee" | "salon" | "sushi" | "curry";

export type MarketId = "kr-seoul" | "us-nyc" | "jp-tokyo" | "es-madrid" | "cn-shanghai";
export type CurrencyCode = "KRW" | "USD" | "JPY" | "EUR" | "CNY";
export type PlanKind = "incident_recovery" | "week_rebuild" | "custom";

export type AvailabilityWindow = {
  start: string;
  end: string;
  available: boolean;
};

export type EmploymentType = "hourly_part_time" | "hourly_full_time" | "manager";

export type AvailabilityRule = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string;
  end: string;
  available: boolean;
};

export type AvailabilityException = {
  id: string;
  start: string;
  end: string;
  available: boolean;
  reason?: string;
  source: "owner" | "worker" | "incident";
};

export type Worker = {
  id: string;
  name: string;
  displayName?: string;
  contactLabel?: string;
  role: WorkerRole;
  hourlyRate: number;
  /** Legacy one-off availability exceptions kept during StoreState migration. */
  availability?: AvailabilityWindow[];
  employmentType?: EmploymentType;
  skills?: string[];
  regularAvailability?: AvailabilityRule[];
  availabilityExceptions?: AvailabilityException[];
  preferredWeeklyHours?: number;
  maxWeeklyHours?: number;
};

export type Shift = {
  id: string;
  workerId: string | null;
  start: string;
  end: string;
  role: WorkerRole;
  requiredSkills?: string[];
  status: "scheduled" | "uncovered" | "completed";
};

export type TimeEntry = {
  id: string;
  workerId: string;
  shiftId?: string;
  clockIn: string;
  clockOut?: string;
  source: "demo" | "manual" | "timeclock";
};

export type PeakWindow = {
  day: string;
  start: string;
  end: string;
  minCoverage: number;
};

export type OccupancyCost = {
  baseRentMonthly: number;
  recurringFeesMonthly: number;
  deposit?: number;
  leaseStart?: string;
  leaseEnd?: string;
  nextEscalationDate?: string;
  nextEscalationRate?: number;
};

/**
 * Operating-cost inputs intentionally stop short of bookkeeping/tax accounting.
 * Variable rates support operational what-if analysis; fixed monthly costs support BEP.
 */
export type StoreOperatingCosts = {
  variableRates: {
    packagingAndConsumables: number;
    paymentProcessing: number;
    deliveryAndMarketplace: number;
  };
  fixedMonthly: {
    utilities: number;
    softwareSecurityRentals: number;
    marketing: number;
    other: number;
  };
};

export type CalloutPayPolicy = "unpaid_hours" | "paid_scheduled_hours" | "manual_review";

export type StorePolicies = {
  calloutPayPolicy: CalloutPayPolicy;
  externalContactMode: "draft_only";
  complianceMode: "review_flags_only";
};

export type Business = {
  industry: IndustryId;
  market: MarketId;
  currency: CurrencyCode;
  name: string;
  employeeCount: number;
  targetLaborRatio: number;
  weeklyHourWarningThreshold: number;
  expectedSalesByDay: Record<string, number>;
  peakWindows: PeakWindow[];
  timezone?: string;
  openingHours?: Record<string, { open: string; close: string } | null>;
  occupancy?: OccupancyCost;
  operatingCosts?: StoreOperatingCosts;
  targetFoodCostRatio?: number;
  policies?: StorePolicies;
};

export type DemandWindow = {
  day: string;
  expectedSales: number;
  start: string;
  end: string;
  minCoverage: number;
};

export type StaffingIncident = {
  type: "worker_unavailable";
  workerId: string;
  shiftId: string;
  reason?: string;
};

export type OperationalIncidentType = "worker_unavailable" | "stockout_risk" | "equipment_issue" | "abnormal_waste" | "other";
export type OperationalIncident = {
  id: string;
  type: OperationalIncidentType;
  status: "open" | "mitigated" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  workerId?: string;
  shiftId?: string;
  inventoryItemId?: string;
  reason?: string;
};

export type StaffingChange = {
  shiftId: string;
  workerId: string;
  start?: string;
  end?: string;
};

export type CapacityGap = {
  role: WorkerRole;
  hoursPerWeek: number;
  shiftIds: string[];
  reason: string;
};

export type RuleWarning = {
  code: "weekly_hours" | "night_work" | "availability" | "role_mismatch" | "peak_coverage";
  severity: "info" | "warning";
  message: string;
  workerId?: string;
  shiftId?: string;
};

export type PlanImpact = {
  payrollDelta: number;
  projectedLaborCost: number;
  laborRatio: number;
  workerWeeklyHours: Record<string, number>;
  warnings: RuleWarning[];
  uncoveredPeakMinutes: number;
  scheduleChangeCount: number;
};

export type StaffingScenario = {
  id: string;
  kind: PlanKind;
  title: string;
  summary: string;
  rationale: string;
  changes: StaffingChange[];
  impact: PlanImpact;
  capacityGap?: CapacityGap | null;
};

export type StaffingPreview = {
  id: string;
  version: number;
  scenarioId: string;
  kind: PlanKind;
  title: string;
  changes: StaffingChange[];
  impact: PlanImpact;
  capacityGap?: CapacityGap | null;
};

export type SalesSnapshot = {
  id: string;
  date: string;
  hour?: number;
  grossSales: number;
  netSales: number;
  orderCount: number;
  itemSales: Array<{ menuItemId: string; quantity: number; netSales: number }>;
  source: "demo" | "pos";
};

export type InventoryUnit = "g" | "kg" | "ml" | "l" | "ea" | "pack" | "box";

export type RecipeLine = {
  inventoryItemId: string;
  quantity: number;
  unit: InventoryUnit;
  /** Usable output / purchased input. 1 means no preparation loss. */
  yieldRate?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  recipe: RecipeLine[];
  active: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: InventoryUnit;
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplierId?: string;
  lastPurchaseUnitCost?: number;
  marketReferenceKey?: string;
  perishable?: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contactLabel?: string;
  defaultLeadTimeDays: number;
};

export type PurchaseRecord = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  receivedAt: string;
  quantity: number;
  unit: InventoryUnit;
  totalCost: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  createdAt: string;
  expectedAt?: string;
  quantity: number;
  unit: InventoryUnit;
  estimatedUnitCost?: number;
  status: "planned" | "ordered" | "received" | "cancelled";
};

export type WasteRecord = {
  id: string;
  inventoryItemId: string;
  recordedAt: string;
  quantity: number;
  unit: InventoryUnit;
  reason: "expired" | "prep" | "remake" | "damage" | "count_variance" | "other";
};

export type StoreTask = {
  id: string;
  title: string;
  dueAt?: string;
  shiftId?: string;
  workerId?: string;
  status: "open" | "done";
};

export type StoreLogEntry = {
  id: string;
  createdAt: string;
  type: "incident" | "stock" | "task" | "attendance" | "note";
  summary: string;
  relatedIds?: string[];
};

export type ReferenceFreshness = "live" | "recent" | "cached" | "seed" | "stale";
export type ReferenceObservation = {
  id: string;
  kind: "commodity_price" | "wage_reference" | "rent_benchmark" | "weather" | "event";
  provider: string;
  referenceKey: string;
  geography: string;
  observedAt: string;
  fetchedAt: string;
  value: number | string;
  unit?: string;
  currency?: CurrencyCode;
  sourceUrl?: string;
  freshness: ReferenceFreshness;
};

export type OperatingContext = {
  businessDate: string;
  weather?: {
    provider: string;
    summary: string;
    temperatureC?: number;
    precipitationProbability?: number;
    observedAt: string;
    freshness: ReferenceFreshness;
  };
  localEvents?: Array<{ id: string; name: string; start: string; end: string; expectedEffect?: string }>;
};

export type StorePlanChange =
  | { type: "staffing"; shiftId: string; workerId: string; start?: string; end?: string }
  | { type: "purchase"; inventoryItemId: string; supplierId?: string; quantity: number; unit: InventoryUnit; estimatedUnitCost?: number }
  | { type: "prep"; menuItemId: string; targetQuantity: number }
  | { type: "task"; task: StoreTask }
  | { type: "shift_release"; shiftId: string; newEnd: string };

export type StoreMetricSnapshot = {
  netSales: number;
  foodCost: number;
  laborCost: number;
  variableOperatingCost: number;
  occupancyCost: number;
  fixedOperatingCost: number;
  purchaseCashOutlay: number;
  estimatedWasteCost: number;
  uncoveredPeakMinutes: number;
  reviewFlagCount: number;
  breakEvenSales: number;
};

export type StoreMetricDelta = {
  [K in keyof StoreMetricSnapshot]: number;
};

export type StorePlanDomainImpact = {
  people?: {
    scheduleChanges: number;
    laborCostDelta: number;
    uncoveredPeakMinutesDelta: number;
  };
  stock?: {
    purchaseCashOutlay: number;
    affectedInventoryItemIds: string[];
    estimatedWasteCostDelta: number;
  };
  sales?: {
    netSalesDelta: number;
  };
  operations?: {
    taskChanges: number;
    prepChanges: number;
  };
  costs?: {
    foodCostDelta: number;
    variableOperatingCostDelta: number;
    fixedOperatingCostDelta: number;
    breakEvenSalesDelta: number;
  };
};

export type StorePlanImpact = {
  before: StoreMetricSnapshot;
  after: StoreMetricSnapshot;
  delta: StoreMetricDelta;
  domains: StorePlanDomainImpact;
  reviewFlags: string[];
};

export type StorePlan = {
  id: string;
  version: number;
  title: string;
  changes: StorePlanChange[];
  impact: StorePlanImpact;
  state: "preview" | "reviewed";
};

export type AssistantState = "idle" | "listening" | "checking" | "proposalReady" | "reviewNeeded" | "reviewed" | "warning" | "applied" | "error";

export type Activity = {
  state: AssistantState;
  message: string;
  detail?: string;
  context?: PlanKind;
};

export type AppState = {
  schemaVersion: 1;
  business: Business;
  workers: Worker[];
  shifts: Shift[];
  demand: DemandWindow[];
  preview: StaffingPreview | null;
  incident: StaffingIncident | null;
  activity: Activity;
  /** StoreState migration domains. Optional until snapshot/WebMCP/UI migration is complete. */
  timeEntries?: TimeEntry[];
  incidents?: OperationalIncident[];
  sales?: SalesSnapshot[];
  menu?: MenuItem[];
  inventory?: InventoryItem[];
  suppliers?: Supplier[];
  purchases?: PurchaseRecord[];
  purchaseOrders?: PurchaseOrder[];
  waste?: WasteRecord[];
  tasks?: StoreTask[];
  log?: StoreLogEntry[];
  references?: ReferenceObservation[];
  context?: OperatingContext;
  storePlan?: StorePlan | null;
};

export type StoreState = AppState;

export type SnapshotState = Pick<AppState, "schemaVersion" | "business" | "workers" | "shifts" | "demand" | "incident">;
