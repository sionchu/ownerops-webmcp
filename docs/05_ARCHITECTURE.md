# 05 — Architecture

## Core principle
**One durable store truth, one deterministic domain layer, one live working projection, multiple adapters.**

```text
External providers ──> ingestion adapters ──> PostgreSQL / Supabase
                                              │
Merchant/store truth ─────────────────────────┤
                                              │
                                      Store Repository
                                              │
                                              ▼
Human UI ───────────────┐              live StoreState projection
                        │                       │
WebMCP tools ───────────┼──> application actions│
                        │                       ▼
Snapshot restore ───────┘             deterministic domain
                                         │  ├─ calculations
                                         │  ├─ Daily Brief
                                         │  ├─ StorePlan impact
                                         │  └─ validation
                                         ▼
                                  preview / review / apply
```

PostgreSQL/Supabase is the persistent canonical store truth. Browser `StoreState` is the exact **working projection** currently visible to the human and readable by WebMCP. It must not evolve into a second independent database.

The external ChatGPT agent reasons over structured WebMCP outputs. It does not own business state, provider credentials, or a private copy of the store.

## Persistence and projection
### Durable truth
Persist store-owned facts such as:
- store profile, market, policies, occupancy and operating costs;
- workers, availability, shifts, attendance and incidents;
- menu, Prep/BOM, inventory, suppliers, purchases and waste;
- sales snapshots, tasks and log;
- cached external reference observations.

### Working projection
The browser loads a bounded StoreState projection for the current store/week. Human edits and Agent previews operate on that projection. A `StorePlan` remains non-canonical until reviewed/applied.

During RE0, some store domains may still originate from deterministic seed while DB persistence is migrated. That is a migration/fallback condition, not the final ownership model.

## StoreState domains
```text
StoreState
├─ store / costs
├─ people / availability
├─ shifts / attendance / incidents
├─ sales
├─ ingredients / Prep / menu BOM
├─ inventory / suppliers / purchases / waste
├─ operations / tasks / log
├─ context / references
├─ StorePlan candidate
└─ activity
```

Derived metrics are recomputed; do not persist them as competing truth merely for convenience.

## External price pipeline
Public/third-party values are evidence, not store truth.

```text
Provider response
   ↓
raw observation          immutable/source-faithful
   ↓
normalized observation   comparable currency/quantity/unit/market
   ↓
reference resolver       freshness/confidence/fallback
   ↓
StoreState.references
```

Store invoices follow a separate path:

```text
supplier receipt
   ↓
store purchase truth
   ↓
actual unit cost
   ↓
procurement-form yield
   ↓
effective usable store cost
```

Never overwrite a receipt with KAMIS/USDA/e-Stat market data.

## Cache-first behavior
Provider calls are not made for every natural-language question.

1. scheduled/manual sync writes raw + normalized observations;
2. runtime reads DB cache;
3. fresh/recent cache is used directly;
4. stale/missing data may be refreshed by an adapter outside the core Agent path;
5. provider/DB failure falls back to deterministic seed with degraded freshness;
6. Agent language must disclose degraded/stale reference status when material.

`src/cost-data/` is the single source registry/normalization contract. `scripts/fnb-data-sync.mjs` is the first ingestion adapter. Do not create another price-normalization subsystem elsewhere.

## Database boundary
Schema lives in `supabase/migrations/` using `oo_*` tables.

Important separation:
- `oo_purchase_receipts` = merchant/store actual purchase truth;
- `oo_raw_price_observations` = unmodified provider landing evidence;
- `oo_normalized_price_observations` = comparable market observations;
- `oo_latest_reference_prices` = read projection for current cached reference;
- `oo_yield_benchmarks` = procurement/use transformation reference, not universal ingredient yield.

RLS is enabled; prototype browser code never receives service-role credentials. Next.js server routes/repositories access the DB.

## Ingredient → Prep → Menu
The cost graph supports intermediate preparation:

```text
Ingredient purchases
      ↓
Prep BOM + batch output
      ↓
Prep unit cost
      ↓
Menu BOM (ingredient or Prep components)
      ↓
Menu portion cost / margin
```

This matches the supplied operational master workbook and prevents raw/cooked quantity mistakes such as treating cooked rice weight as raw-rice input.

## Procurement-form yield
Yield belongs to a transformation such as:
- whole fish → sashimi;
- trimmed loin → sashimi;
- raw pork → braised served product;
- keg volume → sold beverage volume.

Whole/raw benchmark yields must not be applied to already trimmed/prepped purchases.

## StorePlan architecture
```text
StorePlan
├─ id / version / title
├─ changes[]
├─ Before / After / Delta
├─ domain impacts
├─ review flags
└─ preview | reviewed
```

Changes are a bounded discriminated union: staffing, shift release, purchase, prep and task. Purchase apply records a purchase order/plan; it does not fake physical receipt.

## Layer responsibilities
### `domain/`
Pure/deterministic validation, calculations, prioritization, plan generation/materialization. No provider HTTP or DB credentials.

### `cost-data/`
External source catalog, aliases and normalization contracts. No business recommendation logic.

### `server/`
DB/repository adapters. Credentials stay here/server routes only.

### `state/`
Owns the current live projection in React and applies shared application actions. Seed fallback and DB-hydrated reference observations converge here.

### `components/`
Presentation and human interaction. No duplicated calculations.

### `webmcp/`
Store-level intent tools over the exact live projection. Never expose raw SQL/provider-fetch micro-tools to the Agent.

### `snapshot/`
Backup/restore portability. Not a normal planning transport.

## Runtime choice
The first backend is **Next.js server + Supabase/PostgreSQL**. The supplied FastAPI/dlt work is useful evidence and may become a future extracted ingestion platform, but introducing a second runtime now would duplicate calculation/API responsibilities.

## Security / claims
- service-role/provider secrets are server-only;
- external reference values preserve provenance/freshness;
- StorePlan apply must not claim a supplier order/message/payroll transfer unless the real integration exists;
- wage, tax, legal and accounting outputs remain planning estimates unless a dedicated compliant integration is explicitly added.
