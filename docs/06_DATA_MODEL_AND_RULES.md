# 06 — Data Model and Rules

## Ownership model
- **PostgreSQL/Supabase** stores durable canonical facts.
- **StoreState/AppState** is the current live working projection used by UI and WebMCP.
- **StorePlan** is a non-committed candidate until reviewed/applied.
- **Seed data** is deterministic fallback/demo evidence, not higher-priority truth.

Do not persist derived totals as competing truth when they can be recomputed.

## Truth hierarchy
1. store actual/connected data: invoice, stock count, wage, attendance, lease, sales, availability;
2. committed operating records/plans;
3. normalized external reference observations;
4. deterministic seed fallback.

External market data never overwrites store actuals.

## Store / costs
Store includes identity, industry, market, currency, timezone, opening hours, targets and policy settings.

Occupancy truth:
- base rent;
- recurring fees;
- deposit/lease dates;
- escalation metadata.

Operating-cost planning inputs:
- packaging/consumables rate;
- card/payment rate;
- delivery/marketplace rate;
- utilities;
- software/security/rentals;
- marketing;
- other fixed cost.

These support BEP/FL Cost planning, not audited accounting.

## Worker / availability
Worker profile contains:
- employment type;
- role/skills;
- hourly rate;
- regular availability;
- one-time exceptions;
- preferred/max weekly hours.

Hard scheduling constraints:
1. explicit unavailability;
2. role/skill mismatch;
3. overlapping assignment;
4. configured max weekly hours;
5. closed-store interval.

Soft ranking:
1. preserve published assignment;
2. remain near normal hours;
3. minimize disruption;
4. protect peak coverage;
5. then optimize requested cost/balance objective.

A cheap shift assignment outside a part-timer’s available time is invalid.

## Incident lifecycle
A worker call-out creates both an availability exception and a durable incident record. Recovery resolves/mitigates the incident but does not delete the unavailability fact.

The same distinction applies to stock/equipment/waste/task exceptions: historical fact and current resolution are separate.

## Scheduled vs actual labor
- scheduled wage estimate derives from shifts;
- actual wage estimate derives from time entries.

Neither is a statutory payroll statement. Country-specific tax/social-insurance filing remains outside current product scope.

## Ingredient master
A canonical ingredient has stable identity/category/base unit. Store inventory items may reference that canonical ingredient but also carry store-specific procurement details.

Important fields:
- base unit;
- supplier;
- purchase form (`whole_raw`, `trimmed`, `fillet`, `prepped`, `packaged`, etc.);
- store-specific yield if known;
- on-hand/par/reorder/lead time;
- optional market reference key.

## Yield
Yield belongs to a **procurement form → use form transformation**, not merely to an ingredient name.

Examples:
- whole flounder → sashimi: low yield;
- salmon loin → sashimi: much higher yield;
- whole jamón leg → sliced served product;
- raw pork belly → braised served product.

Do not apply whole/raw benchmarks to already trimmed purchases. Yield benchmarks are reference evidence and may be overridden by actual store yield.

## External price pipeline
### Tier 1 — Raw
Provider payload + request/source provenance, kept source-faithful.

### Tier 2 — Normalized
One market/reference contract:
- source/provider;
- canonical/reference key;
- geography;
- price level;
- original price/currency/quantity/unit;
- price per base unit;
- observed/fetched timestamps;
- confidence;
- source URL/metadata.

### Tier 3 — Effective/reference usable cost
For a specific procurement form/yield:

```text
price per base unit = purchase price / normalized purchase quantity
usable reference cost = price per base unit / yield
```

This tier remains **reference** unless derived from a real store purchase receipt.

## Store purchase truth
A purchase receipt stores:
- supplier/invoice;
- item/ingredient;
- quantity/unit;
- total cost/currency;
- procurement form;
- store/receipt-specific yield when available;
- received time/source.

Actual usable store cost is derived from the latest defensible receipt and the relevant store yield. Public references are used only for comparison/fallback.

## Ingredient → Prep → Menu BOM
The canonical recipe graph is three-level:

```text
Inventory ingredient
    ↓
Prep item / batch BOM
    ↓
Menu item BOM
```

A Prep item has output quantity/unit and component lines. A menu BOM line may reference an ingredient or Prep item.

This supports structures such as:
`raw rice + vinegar + sugar + salt → seasoned sushi rice → nigiri`.

Do not flatten Prep into arbitrary fixed menu cost constants when component data exists.

## Menu economics
Menu item stores selling price, category/concept, source/price basis, waste buffer and active state.

Derived metrics may include:
- portion food cost;
- food cost %;
- gross margin;
- ingredient contribution;
- menu-engineering signals.

Benchmark menu prices and the supplied 31-menu reference dataset are context only. Source totals that fail arithmetic QA must stay flagged rather than silently corrected.

## Inventory / purchase / waste
Support:
- on-hand/par/reorder;
- lead time;
- pending purchase orders;
- actual purchase receipts;
- inventory count history;
- theoretical usage from BOM/sales;
- actual usage/count variance;
- waste quantity/reason/cost;
- days of cover and stockout risk.

Applying a purchase StorePlan creates a planned order record. It must not increase physical on-hand inventory until receipt/count truth exists.

## Sales
Sales snapshots support day/hour/item summaries and source provenance (`demo`, future POS connector). Item mix links to menu BOM for theoretical consumption.

Do not build a bookkeeping ledger here.

## External reference cache
Runtime reads cached normalized references from the DB. Freshness labels:
- `live`;
- `recent`;
- `cached`;
- `seed`;
- `stale`.

When the cache is unavailable, existing deterministic seed remains in StoreState. Agent language must disclose degraded/stale reference status when it affects a recommendation.

## Reference sources
Initial source registry:
- Seoul: KAMIS;
- Tokyo: e-Stat / MAFF where defensible;
- NYC: USDA MyMarketNews;
- Spain: Eurostat + Mercamadrid/MAPA context;
- Shanghai: pinned official public monitoring pages/files;
- global supplement: Open Prices;
- future merchant truth: Square/Toast/etc. via merchant authorization.

A source may be unsuitable for a specific SKU. No match is better than fake comparability.

## Occupancy / BEP / FL Cost
Planning calculations separate:
- food cost;
- labor cost;
- variable operating cost;
- occupancy;
- other fixed operating cost.

BEP uses contribution margin and fixed/semi-fixed costs. FL Cost = food + labor as a planning ratio. These are operational estimates, not audited P&L.

## StorePlan
Supported change types stay bounded:
- staffing assignment;
- shift release;
- purchase;
- Prep target;
- task.

Impact always exposes Before / After / Delta and keeps labor, purchase cash, waste and other operating-cost effects distinct.

Hard-constraint violations such as availability/role mismatch cannot be bypassed merely because a plan was marked reviewed.

## Database mapping
The first migration is `supabase/migrations/001_ownerops_store_ssot.sql`.

Key tables/views:
- `oo_stores`, `oo_workers`, availability, shifts, attendance, incidents;
- `oo_ingredients`, aliases, yield benchmarks;
- `oo_inventory_items`, suppliers, receipts, orders, counts, waste;
- `oo_prep_items`, `oo_prep_bom`, `oo_menu_items`, `oo_menu_bom`;
- sales/tasks/log/cost tables;
- `oo_price_sources`, `oo_raw_price_observations`, `oo_normalized_price_observations`;
- `oo_latest_reference_prices` and `oo_latest_store_purchase_costs` read projections.

RLS is enabled and browser code does not receive service-role credentials.
