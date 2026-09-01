# 17 — External Data Platform Contract

## Purpose
OwnerOps uses a database-backed, cache-first data layer so the external Agent reasons over **stored operating facts and references**, not fresh web search for every question.

The user-facing contract remains store-intent WebMCP. Provider names, SQL and ETL mechanics stay behind the application boundary.

## Current architecture

```text
Official APIs / approved datasets / merchant connectors
                │
                ▼
       offline / scheduled ingestion
                │
        ┌───────┴─────────┐
        ▼                 ▼
 raw observations    merchant/store actuals
        │                 │
        ▼                 │
 normalized prices        │
        │                 │
        └───────┬─────────┘
                ▼
       PostgreSQL / Supabase
                │
       ┌────────┴────────┐
       ▼                 ▼
 Store Repository   Reference Repository
       │                 │
       └────────┬────────┘
                ▼
        live StoreState projection
                │
      Daily Brief / StorePlan / WebMCP
```

### Persistence roles
- **Store actual tables**: merchant-owned facts such as wage, availability, shift, purchase receipt, inventory, sales and lease terms.
- **Reference cache**: public/third-party observations such as KAMIS/USDA/e-Stat benchmarks.
- **Template catalog**: market/industry planning and menu/BOM benchmarks imported from the supplied master workbook.
- **Seed fallback**: deterministic browser fixture used when DB/provider data is unavailable.

These roles are deliberately separate.

## Database boundary
Migrations live under `supabase/migrations/`.

### Store-owned SSOT
`001_ownerops_store_ssot.sql` contains normalized `oo_*` tables for:
- store/cost settings;
- workers/availability/shifts/time entries/incidents;
- sales/tasks/log;
- ingredient/inventory/supplier/purchase/waste;
- Prep/BOM/menu;
- raw and normalized external reference observations.

### Working projection RPC
`002_working_store_projection_rpc.sql` defines server-only RPCs:
- `oo_get_working_store_projection(store_id)`;
- `oo_replace_working_store_projection(projection)`.

The replace RPC is transactional and service-role only. It is **not exposed through a public browser write route** until authenticated owner-level RLS exists.

Current public runtime supports **DB → browser hydration**. Browser edits remain session-local in the unauthenticated hackathon deployment.

### Benchmark/template catalog
`003_fnb_template_catalog.sql` keeps planning/reference templates separate from real stores:
- market planning assumptions;
- ingredient procurement/yield benchmarks;
- Prep templates and BOM;
- menu benchmarks and BOM;
- labor templates;
- the 31-menu QA reference dataset.

## Truth hierarchy
When values conflict:
1. store actual receipt/count/POS/attendance/lease data;
2. committed store-system data;
3. fresh/recent external reference;
4. cached external reference;
5. deterministic seed;
6. stale reference for directional context only.

Never overwrite a store invoice with a KAMIS/USDA/e-Stat value.

## Three-tier external price pipeline
### Tier 1 — raw
Source-faithful provider payload, request URL/provenance, fetched time and parser version.

### Tier 2 — normalized
Comparable contract:
- market/reference key;
- geography;
- price level;
- original price/currency/quantity/unit;
- normalized price per base unit;
- observed/fetched time;
- confidence and source URL.

### Tier 3 — effective/reference usable cost
For a specific procurement form/yield:

```text
price per base unit = purchase price / normalized purchase quantity
usable reference cost = price per base unit / edible yield
```

This remains a **reference** unless the source is a real store purchase receipt.

## Procurement form and yield
Yield belongs to a transformation, not just an ingredient name.

Examples:
- whole fish → sashimi;
- trimmed salmon loin → sashimi;
- whole jamón leg → sliced product;
- raw pork → braised served product.

The supplied F&B master is especially useful here because it distinguishes procurement form from use form. A whole-salmon yield benchmark must not be applied to an already trimmed loin.

## Ingredient → Prep → Menu
The imported master model uses:

```text
Ingredient
   ↓
Prep BOM / batch output
   ↓
Prep unit cost
   ↓
Menu BOM
   ↓
Menu portion cost / food-cost ratio / margin
```

OwnerOps mirrors this rather than flattening every menu into direct ingredient constants.

## Master workbook import contract
The supplied `global_fnb_cost_operations_master_2026` workbook is treated as a **template/reference source**, not a set of real merchant transactions.

Canonical import inputs:
- City Assumptions;
- Ingredient Master;
- Yield Benchmarks;
- Prep Master / Prep BOM;
- Menu Master / Menu BOM;
- Labor Model;
- Reference 31 Data with QA flags.

Derived workbook surfaces such as Prep Costing, Menu Costing and Dashboard are not imported as truth because OwnerOps recalculates them.

Current extracted scope:
- 5 markets;
- 196 ingredient benchmark rows;
- 19 yield benchmarks;
- 18 Prep items;
- 85 Prep BOM rows;
- 60 menu benchmarks;
- 318 Menu BOM rows;
- 80 labor-template rows;
- 31 supplementary reference menus with arithmetic QA.

### Import command
The workbook is first exported to one canonical JSON document per market, then imported by an admin process:

```bash
npm run data:import-master -- --file <market-template.json> --dry-run
npm run data:import-master -- --file <market-template.json>
```

The importer only replaces benchmark/template rows for that market. It never touches store actual tables.

## Provider ingestion
`src/cost-data/` is the one provider/normalization contract.

`scripts/fnb-data-sync.mjs` currently supports:
- KAMIS;
- Japan e-Stat fetch;
- USDA MyMarketNews fetch;
- Eurostat;
- Open Prices;
- pinned Shanghai official pages/files;
- Mercamadrid and Square as explicit non-direct-sync entries.

### KAMIS first normalized connector
KAMIS is the first end-to-end normalized provider:

```text
KAMIS API
  ↓
raw local snapshot
  ↓
exact ingredient alias + defensible unit mapping
  ↓
normalized price observation
  ↓
optional Supabase persistence
```

Unmatched/ambiguous KAMIS rows remain raw evidence and are not promoted to an OwnerOps reference.

## Runtime cache behavior
Normal owner questions do not trigger arbitrary provider search.

```text
DB/reference cache
   ↓ available
use cached observation

   ↓ unavailable
retain deterministic seed
```

Provider refresh is an ingestion responsibility. Runtime references carry provider, geography, unit/currency, observed/fetched timestamps and freshness (`live`, `recent`, `cached`, `seed`, `stale`).

## Current server adapters
- `src/server/supabase-rest.ts`: server-only PostgREST/RPC adapter;
- `src/server/reference-repository.ts`: cached public reference read path;
- `src/server/store-repository.ts`: persisted working-store projection read/admin-write path;
- `/api/references`: read-only runtime cache endpoint;
- `/api/store-state`: read-only persisted-store hydration endpoint.

Service-role credentials never enter client components.

## Public-write security boundary
The hackathon app has no per-owner authentication yet. Therefore:
- provider/admin scripts may write using service role;
- server may read persisted data for the browser;
- public browser mutation is **not** forwarded to service-role DB writes.

When authenticated owner sessions/RLS are implemented, `apply_store_plan` can persist committed changes through the same repository without changing WebMCP intent tools.

## Verified source roles
- **KAMIS** — Seoul/Korea mapped food commodity reference.
- **Japan e-Stat / MAFF** — Tokyo retail/statistical/wholesale references where mapping is defensible.
- **USDA AMS MyMarketNews** — U.S. wholesale/market reports with explicit report mapping.
- **Eurostat** — macro food-price/index context, not supplier invoice.
- **Mercamadrid / MAPA** — Spain product/wholesale context through supported downloads/datasets.
- **Shanghai public monitoring** — pinned official page/file observations with actual published geography.
- **Open Prices** — supplemental crowdsourced product prices.
- **Square/Toast/etc.** — future merchant actuals after authorization; these outrank public references for that store.

## OwnerOps integration rule
The Agent does not receive `query_supabase`, `fetch_kamis` or `run_sql` end-user tools.

The owner still says:
- “우유 주말까지 버텨?”
- “원두 비싸게 사고 있어?”
- “오늘 뭐 발주해야 돼?”
- “라떼 원가 왜 올랐어?”
- “월세 10% 오르면?”

OwnerOps internally chooses the DB/reference/domain path and returns evidence plus reviewable action.
