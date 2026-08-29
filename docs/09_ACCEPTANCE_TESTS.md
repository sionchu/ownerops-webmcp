# 09 — Acceptance Criteria and Tests

## Product acceptance criteria
### AC1 — credible StoreState
The app loads a coherent store with linked people, schedule, sales, menu/recipe, stock, purchases/waste, tasks, occupancy, and context data.

### AC2 — realistic worker constraints
Each demo worker has employment type, role/skills, regular availability, exceptions, wage, preferred/max weekly hours. Week rebuild never schedules outside hard availability/skill constraints.

### AC3 — realistic industry stock
Changing industry loads a bounded realistic purchased-item catalog and menu/service fixture rather than re-labeling the same generic inventory.

### AC4 — market-aware reference context
Changing market changes currency/location/wage reference and available external-reference provider mapping. Language remains independent from market.

### AC5 — daily brief
`get_daily_brief` surfaces 3–5 prioritized, evidence-backed items from the exact live StoreState.

### AC6 — natural-language daily prep
In a WebMCP-capable agent, a request equivalent to “오늘 장사 준비해줘” routes through live StoreState/brief/planning tools and can materialize a coordinated candidate plan without Snapshot/file handoff.

### AC7 — incident lifecycle
A worker call-out creates an availability exception plus incident. Recovery can become resolved/mitigated without deleting the historical unavailability fact or showing the same fresh call-out CTA incorrectly.

### AC8 — whole-week scheduling
A full-week rebuild respects availability, skills, overlap, weekly limits, peak coverage, and published-schedule stability. Cost is an optimization objective only after hard constraints.

### AC9 — scheduled vs actual wage
Scheduled shift wage and actual time-entry wage estimate are distinguishable and derived from the same worker rate truth.

### AC10 — stockout/reorder
OwnerOps can calculate days-of-cover/stockout risk and a deterministic reorder-to-par proposal using on-hand, usage, lead time, and incoming/purchase context.

### AC11 — recipe / Prep / theoretical usage
For food profiles, menu sales can expand ingredient → Prep → menu BOM into theoretical ingredient usage. Already trimmed/prepped procurement must not silently receive a whole/raw yield benchmark.

### AC12 — purchase price vs external reference
When a mapped reference exists, OwnerOps can compare the store's actual recent unit purchase cost to the normalized external reference with provider, geography, unit, observation time, and freshness shown. Unmatched SKUs must not receive fabricated benchmarks.

### AC13 — waste/prep
A seeded waste anomaly can produce a bounded prep/waste-reduction recommendation with visible evidence.

### AC14 — weather context
A weather observation/forecast can influence a demo recommendation while clearly separating the weather source from the store's own historical/demo demand effect. Seed fallback works when no live provider is available.

### AC15 — occupancy cost
The store has base rent/recurring fees and OwnerOps can compute occupancy-to-sales and a simple break-even/rent-escalation scenario without claiming audited accounting.

### AC16 — multi-domain candidate plan
One plan may contain staffing + purchase + prep + task changes. The UI visibly shows candidate vs committed state with Before / After / Delta.

### AC17 — human edit and re-review
A human edit to the candidate is stored in canonical preview state. `evaluate_current_plan` re-reads that exact live candidate and updates review status/impact.

### AC18 — reviewed apply guard
A consequential plan cannot be applied until reviewed and matching current preview id/version. Applying commits the supported changes and clears the preview. Hard availability/role violations cannot be bypassed by review status.

### AC19 — tasks/log
Opening/closing or manager tasks can be created/completed and appear in a concise log suitable for “어제 무슨 일 있었어?” summaries.

### AC20 — snapshot boundary
Snapshot v2 can backup/restore supported StoreState transactionally, but ordinary live planning never requires Snapshot UI, raw snapshot JSON, local files, or manual copy/paste.

### AC21 — source failure tolerance
External reference/weather provider failure does not break the product. The relevant observation is marked cached/stale/seed and deterministic fallback remains available.

### AC22 — no hidden second state
Equivalent UI and WebMCP actions produce equivalent live StoreState. Public reference cache, store actuals and preview candidates remain distinct responsibilities.

### AC23 — DB-optional hydration
Without Supabase configuration, the app boots and operates entirely from deterministic seed. With a persisted matching store projection, store-owned facts hydrate from DB while preview/StorePlan remain cleared and live external references are retained separately.

### AC24 — cache-first references
Runtime store questions read `/api/references` / database cache rather than fetching KAMIS/USDA/e-Stat directly from the browser. A missing DB/cache leaves seed reference values intact.

### AC25 — master template import boundary
The supplied F&B master data imports into benchmark/template tables only. It must not overwrite merchant purchase receipts, stock counts, actual lease terms or other store-owned truth. The importer supports a DB-free `--dry-run` validation path.

### AC26 — public-write security boundary
The unauthenticated public hackathon browser has no service-role write endpoint. Admin/provider ingestion may write server-side; per-owner browser persistence waits for authenticated RLS/session ownership.

## Domain tests
At minimum cover:
- regular availability and exception validation;
- skills/role eligibility;
- weekly hours and schedule stability ranking;
- incident lifecycle;
- scheduled/actual wage calculations;
- inventory days-of-cover and reorder;
- ingredient → Prep → menu costing/theoretical usage;
- procurement-form/yield behavior;
- waste variance;
- purchase/reference normalization and unmatched behavior;
- occupancy/break-even estimate;
- daily brief prioritization;
- generic plan preview/review/apply;
- provider fallback/freshness;
- persistence projection boundaries;
- snapshot v2 round-trip/transactionality.

## Integration tests
At minimum cover:
- UI and equivalent WebMCP operating event share the same action path;
- full-week candidate preserves hard worker constraints;
- multi-domain preview remains uncommitted until reviewed apply;
- human edit is re-read by `evaluate_current_plan`;
- live tools do not depend on snapshot transport;
- industry/market configuration swaps the correct seed registries without creating duplicate state;
- DB-unconfigured API paths fail soft to seed;
- cached references replace matching seed references without replacing store actual purchase cost;
- master template importer dry-run produces the expected table mapping.

## Manual demo script
1. Load `coffee + kr-seoul` demo.
2. Ask “오늘 장사 준비해줘.”
3. Confirm daily brief surfaces staffing + stock + waste/context issues.
4. Ask Agent to prepare actions; verify coordinated preview appears.
5. Edit the staffing candidate manually.
6. Ask Agent to re-review exact current plan.
7. Apply reviewed plan.
8. Ask “우유 주말까지 버텨?” and inspect stock evidence.
9. Ask “원두 비싸게 사고 있어?” and inspect actual-vs-reference provenance/freshness.
10. Ask “월세 10% 오르면 어떻게 메우지?” and inspect bounded scenario assumptions.
11. Switch market/language independently and verify units/currency/copy.
12. Verify snapshot remains secondary backup/restore only.
13. Run once with DB env absent; confirm seed fallback.
14. Run once with a seeded Supabase project; confirm persisted store/reference hydration.

## Verification commands
The repository must continue exposing runnable checks for:
- data source registry;
- master-template importer dry-run;
- test;
- lint;
- typecheck;
- production build.

Do not declare this RE0 complete while old staffing-only acceptance tests/docs contradict the new StoreState behavior or while DB/provider failure breaks the demo.
