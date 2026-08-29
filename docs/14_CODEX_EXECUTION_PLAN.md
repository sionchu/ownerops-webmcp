# 14 — Codex Execution Plan

## RE0 objective
Migrate the working staffing prototype into the new **AI Store Manager** without preserving obsolete staffing-only architecture merely for compatibility.

Keep:
- Next/React/TypeScript baseline;
- current visual quality where useful;
- one canonical state/action path;
- WebMCP imperative integration;
- preview → human edit → exact agent review → apply;
- market/language separation and existing wage-reference registry concepts.

RE0/remove/merge:
- staffing-only `AppState` assumptions;
- transient single `incident` field semantics;
- week rebuild that ignores regular worker availability;
- exact 8-tool contract as a frozen requirement;
- Snapshot as prominent agent handoff path;
- stale docs/tests that assert the old one-incident MVP.

## Milestone 0 — documentation and baseline
- Complete canonical docs for StoreState, WebMCP intent tools, acceptance criteria and Agent manual.
- Record the scope decision in `15_DECISION_LOG.md`.
- Re-audit current master against new docs before code migration.

## Milestone 1 — StoreState v2 + seed registries
Implement the canonical data model and deterministic seed generation.

Required:
- Store/occupancy;
- workers with regular availability/exceptions/skills/wage limits;
- shifts/time entries/incidents;
- sales/menu/recipes;
- industry inventory/suppliers/purchases/waste;
- tasks/log;
- context/reference observations.

Seed matrix:
- 5 markets × 6 industries generated from **one market registry + one industry registry**, not 30 hand-written store copies.

Add migration or explicit reset behavior for old localStorage state. Do not silently interpret v1 staffing data as complete v2 StoreState.

## Milestone 2 — deterministic store calculations
Implement/test:
- worker eligibility and availability-aware scheduling;
- published-schedule change penalty;
- scheduled vs actual wage estimates;
- inventory days-of-cover/reorder;
- recipe theoretical usage;
- purchase-unit-cost normalization;
- waste variance/trend;
- occupancy/break-even estimates;
- reference freshness/actual-vs-benchmark comparisons;
- daily brief prioritization.

## Milestone 3 — incident lifecycle fix
Replace the transient call-out model with event + availability exception + open/resolved status.

Acceptance:
- a recovered absence never reappears as a fresh unrecorded absence CTA;
- history remains visible;
- week rebuild respects the exception.

## Milestone 4 — generic StorePlan preview
Replace staffing-only preview with an explicit discriminated `StorePlanChange` union.

Initial supported changes:
- staffing;
- shift release;
- purchase quantity;
- prep quantity;
- task create/update.

Preserve versioned reviewed-apply guard and human-edit behavior.

## Milestone 5 — operational UI RE0
Do not build top-level People/Payroll/Inventory/Tasks SaaS modules unless needed for history/admin.

Desktop judging surface:
1. context header;
2. **Today / Daily Brief** issue-and-action surface;
3. current multi-domain candidate plan when present;
4. relevant operational workspace below (schedule / stock / cost evidence);
5. right Agent activity rail.

Add contextual drawers/tables for People, Stock and Cost evidence rather than five independent applications.

## Milestone 6 — WebMCP contract migration
Implement target nine-tool contract from `07_WEBMCP_CONTRACT.md` coherently.

Do not keep duplicate old/new tools solely to preserve an old test count. If temporary compatibility is unavoidable, document and remove it before final submission.

Regression tests must enforce:
- primary live route;
- no Snapshot planning detour;
- daily brief routing;
- generic plan preview/review/apply.

## Milestone 7 — external reference adapters
Start with provider-independent interfaces and deterministic seeds.

Priority live adapters:
1. Korea KAMIS commodity reference;
2. weather provider for demo city;
3. optional additional market reference adapter only if stable.

USDA/MAFF/MAPA/MOA sources may initially be seeded/provider metadata if browser/API integration would threaten the demo. Never invent live freshness.

Commercial-rent benchmark is lower priority than store occupancy truth; Korea REB/KOSIS may be seed/reference metadata before live ingestion.

## Milestone 8 — canonical natural-language demo
Verify at least:
- “오늘 장사 준비해줘.”
- “민수 못 나온대. 알아서 처리해.”
- “이번 주 40시간 안으로 다시 짜줘.”
- “우유 주말까지 버텨?”
- “원두 비싸게 사고 있어?”
- “월세 10% 오르면 어떻게 메우지?”
- “내일 비 많이 온다는데 준비 바꿔야 돼?”

The agent should not require the user to know tool names or module navigation.

## Milestone 9 — verification/release
- tests;
- lint;
- typecheck;
- build;
- audit where configured;
- manual fresh-session WebMCP demo;
- provider failure/fallback test;
- responsive UI;
- docs and README drift audit;
- public repository/license/deployment gate.

## Implementation discipline
- Use the smallest coherent migration per milestone.
- Modify canonical artifacts; delete old paths when their responsibility moves.
- No `v2` source folders or permanent bridge wrappers.
- After each milestone re-read diff and remove abstraction tax.
- Prefer deterministic demo realism over breadth that cannot be verified.

## Next Best Action after docs
**Milestone 1 only:** implement StoreState v2 and seed registries, with tests, before changing the visual workspace or WebMCP surface. This gives every later feature one canonical data foundation.
