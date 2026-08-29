# 06 — Data Model and Rules

## Canonical StoreState
The implementation may keep the TypeScript name `AppState` during migration, but the conceptual SSOT is now a **StoreState**.

```ts
type StoreState = {
  schemaVersion: 2;
  store: Store;
  people: Worker[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
  incidents: OperationalIncident[];
  sales: SalesSnapshot[];
  menu: MenuItem[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  waste: WasteRecord[];
  tasks: StoreTask[];
  log: StoreLogEntry[];
  references: ReferenceObservation[];
  context: OperatingContext;
  preview: StorePlanPreview | null;
  activity: Activity;
};
```

Do not persist derived totals as authoritative truth when they can be recomputed from the underlying records.

## Store
```ts
type Store = {
  id: string;
  name: string;
  industry: IndustryId;
  market: MarketId;
  currency: CurrencyCode;
  timezone: string;
  employeeCount: number;
  openingHours: Record<string, { open: string; close: string } | null>;
  targets: {
    weeklyHourReviewThreshold: number;
    laborRatio?: number;
    foodCostRatio?: number;
  };
  occupancy: OccupancyCost;
};

type OccupancyCost = {
  baseRentMonthly: number;
  recurringFeesMonthly: number;
  deposit?: number;
  leaseStart?: string;
  leaseEnd?: string;
  nextEscalationDate?: string;
  nextEscalationRate?: number;
};
```

`baseRentMonthly` and actual recurring fees are store truth. External commercial-rent values are benchmark/reference observations only.

## Worker / People
```ts
type EmploymentType = 'hourly_part_time' | 'hourly_full_time' | 'manager';

type AvailabilityRule = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string;
  end: string;
  available: boolean;
};

type AvailabilityException = {
  id: string;
  start: string;
  end: string;
  available: boolean;
  reason?: string;
  source: 'owner' | 'worker' | 'incident';
};

type Worker = {
  id: string;
  name: string;
  displayName?: string;
  employmentType: EmploymentType;
  role: WorkerRole;
  skills: string[];
  hourlyRate: number;
  regularAvailability: AvailabilityRule[];
  availabilityExceptions: AvailabilityException[];
  preferredWeeklyHours?: number;
  maxWeeklyHours: number;
};
```

### Worker scheduling rules
Hard constraints:
1. explicit unavailability/exception;
2. role/required skill;
3. overlap with another assignment;
4. configured max weekly hours;
5. closed-store interval.

Soft constraints/ranking:
1. preserve the already-published assignment when possible;
2. stay near preferred/normal weekly hours;
3. minimize number of employee disruptions;
4. maintain peak coverage;
5. then optimize wage cost/balance according to owner intent.

A cheaper plan that violates regular availability is invalid. A small cost saving that requires many unnecessary published-schedule changes should generally rank below a stable plan.

## Shift and attendance
```ts
type Shift = {
  id: string;
  workerId: string | null;
  start: string;
  end: string;
  role: WorkerRole;
  requiredSkills?: string[];
  status: 'scheduled' | 'uncovered' | 'completed';
};

type TimeEntry = {
  id: string;
  workerId: string;
  shiftId?: string;
  clockIn: string;
  clockOut?: string;
  source: 'demo' | 'manual' | 'timeclock';
};
```

OwnerOps calculates **scheduled wage estimate** from scheduled hours and **actual wage estimate** from time entries. These are not statutory payroll statements.

## Incident lifecycle
```ts
type OperationalIncident = {
  id: string;
  type: 'worker_unavailable' | 'stockout_risk' | 'equipment_issue' | 'abnormal_waste' | 'other';
  status: 'open' | 'mitigated' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  workerId?: string;
  shiftId?: string;
  inventoryItemId?: string;
  reason?: string;
};
```

A worker call-out creates both:
- an `availabilityException(available:false)` for the relevant interval;
- an incident record.

Applying replacement coverage may mark the incident `mitigated/resolved`; it must **not delete the worker's unavailability fact** or make the UI offer the same call-out action as though it never happened.

## Sales
```ts
type SalesSnapshot = {
  id: string;
  date: string;
  hour?: number;
  grossSales: number;
  netSales: number;
  orderCount: number;
  itemSales: Array<{ menuItemId: string; quantity: number; netSales: number }>;
  source: 'demo' | 'pos';
};
```

Sales fixtures should support:
- day/hour demand;
- item mix;
- simple recent baseline comparison;
- labor and inventory usage analysis.

Do not build accounting journal entries.

## Menu / recipe
```ts
type RecipeLine = {
  inventoryItemId: string;
  quantity: number;
  unit: InventoryUnit;
};

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  recipe: RecipeLine[];
  active: boolean;
};
```

Recipe cost uses the store's current/last defensible purchase unit cost, not an external commodity reference unless no store purchase history exists and the UI clearly labels the fallback estimate.

## Inventory
```ts
type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'ea' | 'pack' | 'box';

type InventoryItem = {
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

type Supplier = {
  id: string;
  name: string;
  contactLabel?: string;
  defaultLeadTimeDays: number;
};

type PurchaseRecord = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  receivedAt: string;
  quantity: number;
  unit: InventoryUnit;
  totalCost: number;
};

type WasteRecord = {
  id: string;
  inventoryItemId: string;
  recordedAt: string;
  quantity: number;
  unit: InventoryUnit;
  reason: 'expired' | 'prep' | 'remake' | 'damage' | 'count_variance' | 'other';
};
```

### Inventory calculations
At minimum support:
- recent consumption velocity;
- theoretical usage from menu sales/recipes;
- actual usage/count variance when fixture data exists;
- days of cover;
- stockout risk before lead-time delivery;
- suggested reorder to par;
- waste rate/trend;
- store purchase price vs normalized market reference where a defensible match exists.

## Industry seed catalogs
Seed catalogs should be realistic but bounded; 8–15 inventory SKUs per industry is enough for the hackathon.

### Coffee
- espresso beans
- filter beans
- whole milk
- oat milk
- vanilla/caramel syrup
- cocoa/chocolate
- tea
- croissant/pastry
- 12/16 oz cups and lids
- napkins
- espresso-machine cleaner / sanitizer

### Pizza
- flour
- yeast
- tomato sauce
- mozzarella
- pepperoni
- olive oil
- onion / bell pepper / mushroom
- parmesan
- pizza boxes
- gloves / sanitizer

### Diner
- eggs
- milk
- bread
- rice or potato
- cooking oil
- chicken
- pork/beef demo protein
- onion / tomato / lettuce
- sauce/condiment
- beverages
- takeaway containers

### Sushi
- sushi rice
- rice vinegar
- nori
- salmon / tuna demo SKU
- soy sauce
- wasabi
- ginger
- cucumber / avocado or local substitute seed
- takeaway tray/container
- gloves / sanitizer

### Curry
- rice
- onion
- potato
- carrot
- chicken/protein
- curry base/spice blend
- cooking oil
- coconut milk or dairy seed by profile
- takeaway container
- gloves / sanitizer

### Salon
- shampoo
- conditioner
- color/bleach
- developer
- treatment product
- gloves
- foil
- towels/laundry consumables
- disinfectant
- neck strips/capes consumables
- selected retail product

Food/commodity reference matching must be explicit by `marketReferenceKey`. Consumables such as branded cups, chemicals, color products, or packaging usually use supplier history only.

## External reference observation
```ts
type ReferenceObservation = {
  id: string;
  kind: 'commodity_price' | 'wage_reference' | 'rent_benchmark' | 'weather' | 'event';
  provider: string;
  referenceKey: string;
  geography: string;
  observedAt: string;
  fetchedAt: string;
  value: number | string;
  unit?: string;
  currency?: CurrencyCode;
  sourceUrl?: string;
  freshness: 'live' | 'recent' | 'seed' | 'stale';
};
```

### Reference-source registry
Preferred/verified public sources where practical:
- **Korea / Seoul commodity** — KAMIS agricultural/livestock/fisheries wholesale/retail price APIs; Seoul market/location filters supported.
- **Korea / commercial rent** — Korea Real Estate Board / KOSIS Commercial Real Estate Rental Trend Survey; quarterly benchmark only.
- **US / NYC produce** — USDA AMS MyMarketNews / New York Terminal Market reports/API for wholesale produce.
- **Japan / Tokyo produce** — MAFF fruit/vegetable wholesale market surveys, including Tokyo market/city datasets and daily/periodic prices.
- **Spain / Madrid fresh food** — MAPA Observatorio de la Cadena Alimentaria origin-wholesale price system for selected fresh products.
- **China / Shanghai/general agricultural context** — Ministry of Agriculture and Rural Affairs agricultural wholesale price data/index; use only the geography/item detail the source actually supports.
- **Weather** — provider adapter such as OpenWeather for current/forecast context, with deterministic seed fallback.

A source may be unsuitable for a specific SKU/unit. In that case set no market reference instead of fabricating comparability.

## Operating context
```ts
type OperatingContext = {
  businessDate: string;
  weather?: {
    provider: string;
    summary: string;
    temperatureC?: number;
    precipitationProbability?: number;
    observedAt: string;
    freshness: ReferenceObservation['freshness'];
  };
  localEvents?: Array<{ id: string; name: string; start: string; end: string; expectedEffect?: string }>;
};
```

Weather is context, not a deterministic demand oracle. Seed fixtures may encode a simple historical rainy-day effect for demo reasoning as long as it is labeled a demo/store estimate.

## Occupancy / break-even calculations
OwnerOps may calculate planning metrics such as:
- monthly occupancy cost = base rent + recurring fees;
- occupancy-to-sales ratio;
- simple contribution margin;
- daily/monthly break-even estimate;
- scenario impact of a rent escalation.

Do not present these as audited P&L or lease valuation.

## Tasks / log
```ts
type StoreTask = {
  id: string;
  title: string;
  dueAt?: string;
  shiftId?: string;
  workerId?: string;
  status: 'open' | 'done';
};

type StoreLogEntry = {
  id: string;
  createdAt: string;
  type: 'incident' | 'stock' | 'task' | 'attendance' | 'note';
  summary: string;
  relatedIds?: string[];
};
```

## Generic plan
```ts
type StorePlanChange =
  | { type: 'staffing'; shiftId: string; workerId: string; start?: string; end?: string }
  | { type: 'purchase'; inventoryItemId: string; supplierId?: string; quantity: number; unit: InventoryUnit }
  | { type: 'prep'; menuItemId: string; targetQuantity: number }
  | { type: 'task'; task: StoreTask }
  | { type: 'shift_release'; shiftId: string; newEnd: string };

type StorePlanPreview = {
  id: string;
  version: number;
  objective: string;
  title: string;
  changes: StorePlanChange[];
  evidence: string[];
  reviewFlags: string[];
  status: 'proposed' | 'human_edit' | 'reviewed';
};
```

## Daily brief prioritization
Rank issues by an explicit deterministic score using a small number of factors:
1. immediate service/coverage/stockout risk;
2. irreversible or time-sensitive action deadline;
3. estimated financial impact;
4. deviation from recent store baseline;
5. owner review requirement.

Show 3–5 items, not every warning.

## Calculation truth
All UI summaries, Agent/WebMCP responses, plan impacts, and briefs derive from the same domain functions and canonical state. External reference adapters provide normalized observations only; they do not independently calculate business recommendations.
