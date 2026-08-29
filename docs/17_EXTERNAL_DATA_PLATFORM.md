# 17 — External Data Platform Contract

## Purpose
OwnerOps may ingest live/public/store-connected data from multiple countries and POS/workforce systems, but the application must not couple product logic to one ETL tool, database, or provider.

The canonical boundary is:

```text
provider API / POS / public page
        ↓
raw observation
        ↓
normalization + unit/currency/geography mapping
        ↓
normalized observation
        ↓
Reference Resolver / store connector reconciliation
        ↓
StoreState truth or reference
        ↓
Daily Brief / StorePlan / WebMCP
```

A Supabase/dlt/FastAPI implementation is a valid backend for this contract, not the contract itself.

## Truth rule
Do not overwrite store truth with external reference data.

Priority:
1. store actual receipt/purchase/count/POS/attendance/lease data;
2. connected store-system data with source identity;
3. fresh public/external reference;
4. cached reference;
5. deterministic seed;
6. stale reference for directional context only.

External price data answers **"am I paying high/low relative to a reference?"**. It does not silently become the store's paid cost.

## Canonical price pipeline
### `raw_price_observation`
Provider-specific observation exactly as received.

Recommended fields:
- `id`
- `provider`
- `provider_record_id`
- `market_id`
- `ingredient_key`
- `geography`
- `raw_item_name`
- `raw_price`
- `currency`
- `purchase_quantity`
- `purchase_uom`
- `raw_unit_label`
- `observed_at`
- `fetched_at`
- `source_url`
- `payload_hash`

Keep raw payloads/audit metadata outside browser StoreState if large.

### `normalized_price_observation`
Normalized, comparable representation.

Recommended fields:
- `id`
- `raw_observation_id`
- `market_id`
- `ingredient_key`
- `price_per_base_unit`
- `base_unit` (`kg`, `l`, `ea`, etc.)
- `currency`
- `geography`
- `observed_at`
- `provider`
- `freshness`
- `confidence`
- `normalization_note`

### `effective_ingredient_price`
A resolved costing input for one store/ingredient/time.

Recommended fields:
- `store_id`
- `ingredient_id`
- `value`
- `unit`
- `currency`
- `basis`: `store_actual | supplier_history | external_reference | seed`
- `source_observation_id`
- `confidence`
- `observed_at`

For menu costing, prefer store actual/supplier history. External reference may be used as an **explicit estimate** only when no store actual exists.

## Yield-aware costing
OwnerOps recipe cost uses:

```text
purchased quantity required
= usable recipe quantity / yield rate

ingredient cost
= purchased quantity required × price per purchase/base unit
```

Yield is recipe/ingredient-preparation context, not a property of the public price observation.

Examples from the user-supplied operating guide—flounder 48%, salmon 62%, jamon slicing 60%, Dongpo pork 80%—are benchmark/reference inputs, not universal yield truth.

## Verified public/reference providers
### Korea
**KAMIS Open API**
- use: mapped agricultural/livestock/fisheries wholesale/retail reference prices;
- supports JSON/XML and current/prior/month/year comparison fields;
- requires certification key/id;
- recommended OwnerOps role: high-priority commodity reference for Seoul.

### Japan
**e-Stat API**
- use: official statistical tables, including retail-price/statistics datasets where a defensible table mapping exists;
- requires e-Stat user registration/application ID;
- recommended role: official retail/statistical reference and index data.

### United States
**USDA AMS MyMarketNews API**
- use: raw market-news/wholesale observations;
- requires API authentication;
- recommended role: mapped commodity/terminal-market reference for NYC.

**BLS Public Data API**
- use: CPI/food/economic time series;
- recommended role: macro/index adjustment or context, not supplier quote.

**USDA FoodData Central API**
- use: ingredient/product identity, weights, branded food metadata, nutrition;
- requires data.gov API key for normal use;
- not a price source.

### Spain / EU
**Eurostat Statistics API**
- REST / JSON-stat 2.0;
- use: HICP/food/economic indices and EU statistical context;
- not a city-level ingredient quote.

**MAPA**
- use: supported origin/wholesale agricultural-food price observations where item mapping is defensible;
- API/file availability varies by dataset.

### China
**China Ministry of Agriculture and Rural Affairs public wholesale data**
- use: monitored agricultural wholesale/index context;
- preserve actual published geography; do not label national data as Shanghai-specific.

## Connected store-system providers
### Square
Square Catalog, Orders and Inventory APIs can provide seller-owned catalog/menu, order/sales and inventory truth. Square also publishes an official Square MCP server. Connected seller data should outrank public price references for the store's own operations.

### Toast
Toast Orders and Labor APIs expose restaurant orders/checks/menu-price context and employee/job/shift/time-entry data. Treat Toast-connected data as store-system truth with explicit source timestamps.

### Other connectors
7shifts/Clover or future POS/workforce connectors may map into the same StoreState domains. They must not create duplicate parallel domain models.

## MCP / ingestion tooling
These are implementation options behind the contract:

### Supabase MCP
Useful when canonical normalized/store tables live in Postgres/Supabase. Keep agent access scoped and prefer read-only access for analytics/research paths. Browser OwnerOps should not require Supabase MCP to function.

### dlt + dlt MCP
Useful for API → Postgres/Supabase/DuckDB ingestion, incremental state and schema evolution. `dlt-mcp` is primarily an engineering/operations interface to pipelines and loaded datasets; OwnerOps WebMCP remains the end-user operating interface.

### Playwright MCP / Apify MCP
Fallback for public pages that lack usable APIs. Only collect public/authorized data within applicable terms. DOM extraction must retain source URL/time and should never masquerade as an official API feed.

## Recommended backend shape
A pragmatic production path:

```text
KAMIS / e-Stat / USDA / Eurostat / MAPA / MOA
Square / Toast
approved public pages
        ↓
Python + dlt ingestion
        ↓
Supabase/Postgres
        ↓
FastAPI or server-side TypeScript adapter
        ↓
OwnerOps normalized provider contract
        ↓
Reference Resolver + StoreState
        ↓
WebMCP Agent
```

This is a **future integration path**, not a hackathon runtime dependency. The deterministic local seed remains mandatory so external provider failure cannot break the demo.

## Suggested relational tables
Minimum useful backend tables:
- `stores`
- `workers`
- `availability_rules`
- `availability_exceptions`
- `shifts`
- `time_entries`
- `menu_items`
- `recipe_lines`
- `ingredients`
- `inventory_counts`
- `suppliers`
- `purchase_receipts`
- `purchase_orders`
- `sales_orders` / aggregated `sales_snapshots`
- `waste_records`
- `store_costs`
- `raw_price_observations`
- `normalized_price_observations`
- `external_reference_cache`
- `tasks`
- `operating_incidents`
- `operating_log`

Do not persist derived Daily Brief cards or StorePlan impact totals as primary truth when they can be recalculated.

## API failure / cache behavior
Provider adapter result resolution:

```text
fresh live provider result
    ↓ unavailable
recent persisted observation
    ↓ unavailable
cached normalized observation
    ↓ unavailable
seed ReferenceObservation
    ↓ unavailable
no reference
```

Every result returned to the agent includes provider, geography, observed/fetched timestamps, unit/currency and freshness. Never fabricate a fresh value.

## OwnerOps integration rule
The external-data platform must feed OwnerOps through stable normalized contracts. It must not expose KAMIS/USDA/e-Stat/Supabase as separate end-user menu concepts.

The owner still asks:
- “우유 주말까지 버텨?”
- “원두 비싸게 사고 있어?”
- “오늘 뭐 발주해야 돼?”
- “라떼 원가 왜 올랐어?”

The Agent selects the provider/data path internally.
