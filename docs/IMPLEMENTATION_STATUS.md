# Implementation Status

## Current phase
OwnerOps completed the **RE0 from staffing workbench → AI Store Manager** on release candidate `f1395941e9b8699add3fff1f05e85c69e1fc2e14`. PR #15 was squash-merged into `master` as the public hackathon release.

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

PostgreSQL/Supabase is the durable persistence/reference-cache target. Deterministic seed remains the DB/provider failure fallback.

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
- KAMIS normalized connector path implemented but live credentials are not yet available;
- runtime `/api/references` DB-cache hydration with seed fallback.

### Database / persistence
- `001_ownerops_store_ssot.sql`: normalized store truth + reference cache;
- `002_working_store_projection_rpc.sql`: transactional server-only working-store load/replace RPC;
- `003_fnb_template_catalog.sql`: benchmark/template catalog;
- server-only Supabase REST/RPC adapter;
- store and reference repositories;
- read-only `/api/store-state` persisted-store hydration;
- persistence projection explicitly excludes preview/StorePlan/references.

Public unauthenticated browser writes are intentionally **not** persisted with the service-role key. Owner-level write persistence waits for authenticated identity/RLS.

## Persistence verification
The SQL migrations have been exercised against a Supabase-backed preview environment. A seeded working StoreProjection and cached reference reads completed through the server-side routes. Server-only credentials remain outside browser bundles, and deterministic seed data remains the fallback when database or provider configuration is absent.

## F&B master integration
The supplied master workbook is benchmark/template data, not merchant truth.

Canonical extracted scope:
- 5 markets;
- 196 ingredient benchmark rows;
- 19 yield benchmarks;
- 18 Prep items;
- 85 Prep BOM rows;
- 60 menu benchmarks;
- 318 Menu BOM rows;
- 80 labor-template rows;
- 31 supplementary reference menus with arithmetic QA.

`npm run data:import-master` imports one canonical market JSON into template tables only.

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

## Verification baseline
The release candidate is verified through the data-source registry, master-template importer dry-run, test suite, lint, typecheck, production build, and database projection round-trip. The deterministic browser harness also exercises DB-backed and late-injection WebMCP paths. Fresh local verification results are recorded with each release-hygiene change.

## Release-hygiene verification
- `npm run data:sources` and the master-template importer dry-run passed;
- `npm test` passed: 97 tests across 18 files;
- `npm run lint` completed with 0 errors and 6 existing warnings;
- `npm run typecheck`, `npm run build`, and `npm audit` passed;
- the late-injection/resume WebMCP browser harness passed against the preview URL;
- the DB-backed browser harness stopped because the current preview did not render its expected `DEMO · 실적` control. This requires deployment/harness alignment and is not a substitute for the real ChatGPT acceptance run;
- local database verification was not run because no local PostgreSQL service was available.

## Live acceptance
- Authentic ChatGPT/WebMCP acceptance completed in take `rc-proof-09` against the nine-tool release candidate.
- The accepted sequence demonstrated real Site Tools → Agent StorePlan preview → human direct edit → Review required → `evaluate_current_plan` → exact edited candidate retained → `REVIEWED` → human Apply.
- The accepted proof remains in the private `ownerops-film` production repository; it is not reconstructed product UI.

## Remaining non-release enhancements
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
- PR: #15 `RE0: expand OwnerOps into AI store manager`
- Base branch: `master`
- Release-candidate verification and authentic WebMCP acceptance are complete.
- Final integration should squash the RE0 working history before merging to master.

## Next best action
**Squash-merge PR #15, verify the merged `master`, then align the canonical public deployment.**
