# OwnerOps

**OwnerOps** is a WebMCP-powered **AI Store Manager** for independent businesses. The owner speaks in operating intent—“오늘 장사 준비해줘”, “민수 못 나온대”, “우유 주말까지 버텨?”, “이번 주 인건비 왜 높아?”—and the agent reads the same live store projection as the visible application, composes the required capabilities, previews consequential changes, re-reads human edits, and applies only reviewed plans.

The RE0 keeps the strongest part of the original staffing demo—human and agent collaboration on one live state—but expands across **People · Sales · Stock · Operations · Context · Costs**.

## Product model

```text
PostgreSQL / Supabase
  store-owned facts + cached references
             │
             ▼
       Store Repository
             │
             ▼
 live StoreState working projection
             │
    Daily Brief / StorePlan
             │
             ▼
          WebMCP
             │
             ▼
       ChatGPT Agent
```

The public hackathon deployment remains safe when no database is configured: deterministic seed data boots the complete demo. When Supabase contains a matching store projection/reference cache, the app hydrates from it server-side.

**Store actuals are authoritative.** Supplier receipts, stock counts, wages, attendance, leases and connected POS data outrank commodity/rent/weather benchmarks. Public references always preserve provider, geography, timestamps and freshness (`live`, `recent`, `cached`, `seed`, `stale`).

## What OwnerOps understands

### People
- role/skills and employment type;
- regular availability and one-off exceptions;
- weekly-hour limits;
- published shifts and actual time entries;
- call-outs and incident history;
- scheduled vs actual wage context.

### Sales / menu / Prep
- daily/item sales;
- menu prices;
- ingredient → Prep → menu BOM;
- procurement-form/yield-aware costing;
- food-cost ratio and menu margin.

### Stock
- industry-specific purchased items;
- on-hand/par/reorder/lead time;
- suppliers, receipts and planned purchase orders;
- waste/count variance;
- actual purchase cost vs cached external reference.

### Costs / context
- food/labor/variable operating cost;
- occupancy and other fixed cost;
- FL Cost and short-horizon BEP;
- weather/events and public market/rent reference context.

### Operations
- incidents;
- opening/closing tasks;
- manager log;
- coordinated multi-domain StorePlan.

## Why WebMCP

Existing business software makes the owner translate intent into modules. OwnerOps exposes store-level intent tools from the live application instead:

```text
owner intent
    ↓
focused StoreState / Daily Brief
    ↓
deterministic planning
    ↓
StorePlan Before → After → Delta
    ↓
human edit
    ↓
agent re-review
    ↓
explicit apply
```

The agent never reconstructs ordinary operating state from screenshots, snapshot files, raw SQL or provider-specific APIs.

## Canonical demo prompts

### Daily operating brief
> 오늘 장사 준비해줘.

### Staffing incident
> 민수 금요일 저녁 못 나온대. 알아서 처리해.

### Full-week rebuild
> 이번 주 전체 근무표 다시 짜줘. 40시간 안에서 피크 공백 최소화해.

### Inventory / market reference
> 우유 주말까지 버텨? 지금 사는 가격도 비싼지 봐줘.

### Occupancy pressure
> 월세 10% 오르면 어떻게 메우지?

## WebMCP contract

The client registers exactly nine intent-level tools:

1. `configure_demo_store`
2. `get_store_state`
3. `get_daily_brief`
4. `record_operating_event`
5. `plan_store_actions`
6. `preview_store_plan`
7. `evaluate_current_plan`
8. `apply_store_plan`
9. `restore_store_snapshot`

Normal live path:

```text
get_store_state / get_daily_brief
        ↓
plan_store_actions
        ↓
preview_store_plan
        ↓
human edit
        ↓
evaluate_current_plan
        ↓
apply_store_plan
```

`restore_store_snapshot` is backup/restore only.

## Markets and industry profiles

Markets:
- Seoul (`kr-seoul`)
- New York City (`us-nyc`)
- Tokyo (`jp-tokyo`)
- Madrid (`es-madrid`)
- Shanghai (`cn-shanghai`)

Industries:
- diner
- pizza
- coffee
- salon
- sushi
- curry

Market and UI language are independent. Industry profiles contain genuinely different purchased items/menu/skills/tasks rather than relabeling one generic fixture.

## Database / cache setup

The app has **no required database dependency** for the deterministic demo. To enable persisted store/template/reference reads, apply the SQL migrations under `supabase/migrations/` and set server-only environment variables:

```bash
OWNEROPS_SUPABASE_URL=
OWNEROPS_SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose the service-role key to client code.

Current migrations:
- `001_ownerops_store_ssot.sql` — normalized store truth + external reference cache;
- `002_working_store_projection_rpc.sql` — transactional server-only working projection load/replace RPC;
- `003_fnb_template_catalog.sql` — market/industry benchmark template catalog.

Runtime endpoints are read-only:
- `/api/store-state?storeId=...` — persisted store hydration;
- `/api/references?market=...` — cached public reference hydration.

The unauthenticated public browser does **not** receive a service-role write endpoint. Per-owner write persistence waits for authenticated RLS/session ownership.

## External price sync

List providers:

```bash
npm run data:sources
```

Sync one provider:

```bash
npm run data:sync -- --source kamis
```

Sync configured providers:

```bash
npm run data:sync:all
```

KAMIS is the first normalized end-to-end connector: fetch → raw snapshot → exact alias/unit mapping → normalized observation → optional Supabase cache. Ambiguous/unmatched rows stay raw and are not promoted to reference truth.

See `.env.example` for provider variables.

## Global F&B master workbook

The supplied global workbook is treated as **template/reference data**, not merchant truth. It covers five markets and contains approximately:
- 196 ingredient benchmark rows;
- 19 yield benchmarks;
- 18 Prep items;
- 85 Prep BOM rows;
- 60 menu benchmarks;
- 318 Menu BOM rows;
- 80 labor template rows;
- 31 supplementary menu references with arithmetic QA.

Derived workbook surfaces (Prep Costing, Menu Costing, Dashboard) are not imported as truth because OwnerOps recalculates them.

Import one canonical market JSON:

```bash
npm run data:import-master -- --file <market-template.json> --dry-run
npm run data:import-master -- --file <market-template.json>
```

The importer replaces only benchmark/template rows for that market. It never overwrites actual store receipts, counts, lease terms or other store-owned facts.

## Snapshot

Portable backup uses:

```text
OWNEROPS_SNAPSHOT v2
```

Snapshot remains a secondary backup/restore mechanism, not a normal Agent planning transport.

## Run locally

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No API/database credentials are needed for the deterministic demo.

## Verification

GitHub Actions and local verification run:

```bash
npm run data:sources
npm run data:import-master -- --file tests/fixtures/fnb-master-mini.json --dry-run
npm test
npm run lint
npm run typecheck
npm run build
```

## Key architecture paths

- `src/domain/` — StoreState, deterministic calculations/planning/validation
- `src/persistence/` — store persistence projection boundary
- `src/cost-data/` — external source catalog, aliases and normalization contract
- `src/server/` — server-only Supabase repositories/adapters
- `src/state/` — live React working projection + DB/seed hydration
- `src/webmcp/` — nine store-intent tools
- `src/snapshot/` — v2 backup/restore
- `scripts/fnb-data-sync.mjs` — provider ingestion
- `scripts/import-fnb-master.mjs` — benchmark/template admin import
- `supabase/migrations/` — normalized database schema/RPC/template catalog

Product/implementation truth is governed by `AGENTS.md` and `docs/`. The major RE0 remains on `re0/ai-store-manager` / Draft PR #15 until the remaining live DB/provider/browser gates are verified.
