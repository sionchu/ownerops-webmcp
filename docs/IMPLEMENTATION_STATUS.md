# Implementation Status

## Current phase
OwnerOps is in a **RE0 from staffing workbench → AI Store Manager** on branch `re0/ai-store-manager` / Draft PR #15.

The current product connects one live working store projection across:
- People / availability / schedule / attendance / wages;
- Sales;
- Ingredient → Prep → Menu BOM;
- Inventory / suppliers / purchase receipts / planned purchase orders / waste;
- Tasks / incidents / manager log;
- Occupancy / variable + fixed operating costs / FL Cost / BEP;
- Weather and cached external market references;
- multi-domain StorePlan Before → After → Delta;
- nine intent-level WebMCP tools.

PostgreSQL/Supabase is the durable persistence/reference-cache target. The public hackathon browser remains safe without DB configuration through deterministic seed fallback.

## Implemented
### StoreState / Agent
- worker regular availability, one-off exceptions, skills, preferred/max weekly hours;
- availability-aware incident recovery and full-week rebuild;
- durable call-out incident history;
- scheduled vs time-entry wage estimates;
- Daily Brief prioritization;
- multi-domain StorePlan preview/review/apply;
- hard availability/role guards at apply;
- nine registered WebMCP intents;
- Snapshot v2 backup/restore with legacy v1 migration.

### Cost / inventory
- industry-specific inventory/menu/task seeds;
- supplier/purchase/waste and days-of-cover/reorder logic;
- procurement-form/yield-aware recipe costing;
- Ingredient → Prep → Menu BOM expansion;
- FL Cost / contribution-margin BEP / occupancy context;
- actual purchase price vs normalized reference comparison with freshness/provenance.

### External data
- one `src/cost-data/` provider/normalization SSOT;
- provider registry for KAMIS, e-Stat, USDA MMN, Eurostat, Mercamadrid, Shanghai public monitoring, Open Prices and future Square merchant truth;
- `scripts/fnb-data-sync.mjs` raw fetch pipeline;
- KAMIS first end-to-end normalized connector;
- optional raw/normalized Supabase cache persistence;
- runtime `/api/references` cache hydration with seed fallback.

### Database / persistence
- `001_ownerops_store_ssot.sql`: normalized store truth + reference cache;
- `002_working_store_projection_rpc.sql`: transactional server-only working-store load/replace RPC;
- `003_fnb_template_catalog.sql`: benchmark/template catalog;
- server-only Supabase REST/RPC adapter;
- store and reference repositories;
- read-only `/api/store-state` persisted-store hydration;
- persistence projection explicitly excludes preview/StorePlan/references.

Public unauthenticated browser writes are intentionally **not** persisted with the service-role key. Owner-level write persistence waits for authenticated identity/RLS.

### Supplied global F&B master integration
The supplied master workbook is treated as benchmark/template data, not merchant truth.

Current extracted source scope:
- 5 markets;
- 196 ingredient benchmark rows;
- 19 yield benchmarks;
- 18 Prep items;
- 85 Prep BOM rows;
- 60 menu benchmarks;
- 318 Menu BOM rows;
- 80 labor-template rows;
- 31 supplementary reference menus with arithmetic QA.

`npm run data:import-master` imports one canonical market JSON into template tables only. CI runs a DB-free `--dry-run` fixture.

## WebMCP registered tools
1. `configure_demo_store`
2. `get_store_state`
3. `get_daily_brief`
4. `record_operating_event`
5. `plan_store_actions`
6. `preview_store_plan`
7. `evaluate_current_plan`
8. `apply_store_plan`
9. `restore_store_snapshot`

Primary route:
`live read / brief → plan → preview → human edit → evaluate exact live candidate → apply`.

Snapshot is backup/restore only.

## Latest verified baseline
Verified by GitHub Actions on the PR merge ref for source head:

`ae17ba19e4d885e0492716421242bf1f1912e891`

Workflow run: `33275367937`

Results:
- `npm run data:sources` — PASS
- Master template importer `--dry-run` — PASS
- `npm test` — PASS: **57/57 tests, 7 files**
- `npm run lint` — PASS with 6 warnings / 0 errors
- `npm run typecheck` — PASS
- `npm run build` — PASS
- npm install audit in CI — 0 vulnerabilities

Build routes include:
- `/`
- `/api/references`
- `/api/store-state`

Lint warnings are non-blocking: one data-sync unused parameter and five legacy i18n unused `_ratio` parameters.

## Not yet live-verified
Do **not** claim these are complete yet:
1. Supabase migrations applied to a real connected project;
2. all five master-market JSON templates imported into a live DB;
3. KAMIS sync run with real `KAMIS_CERT_KEY` / `KAMIS_CERT_ID` and DB persistence;
4. normalized e-Stat / USDA item mapping beyond their current raw-fetch foundation;
5. current RE0 deployed to the production Vercel URL;
6. current nine-tool WebMCP natural-language flow tested end-to-end in a capable browser;
7. authenticated per-owner RLS/write persistence.

## Current release blockers
### P0
- Live Supabase migration/seed/cache verification.
- Fresh WebMCP browser E2E for the new nine-tool contract.

### P1
- Real KAMIS credential sync and normalized reference verification.
- Authenticated owner identity/RLS before enabling browser → DB writes.
- e-Stat / USDA normalized mapping after KAMIS proves the ingestion pattern.

### P2
- remove remaining lint warnings;
- replace remaining staffing-centric UI copy/legacy visual surfaces where they no longer fit the AI Store Manager narrative.

## Git / release state
- Repository: `sionchu/ownerops-webmcp`
- RE0 branch: `re0/ai-store-manager`
- Draft PR: #15 `RE0: expand OwnerOps into AI store manager`
- Base branch: `master`
- PR stays Draft until live DB + WebMCP gates are verified.
- Final integration should squash the RE0 working history before merging to master.

## Next best action
**Apply the three Supabase migrations to a real project, import one Seoul benchmark template, and verify `/api/store-state` + `/api/references` against that live DB before adding more product features.**
