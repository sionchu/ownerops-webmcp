# OwnerOps — Codex Operating Contract

This repository is governed by the canonical documents in `docs/`. Read this file first, then the documents below before changing product behavior.

## Mission
Build **OwnerOps — an AI Store Manager for independent small businesses**. The owner speaks naturally; an external ChatGPT/WebMCP agent reads the exact live store state, identifies what matters, prepares coordinated actions, and materializes those actions in the same visual workspace the owner uses.

The canonical café/restaurant demo connects five operating domains instead of treating staffing as a standalone app:
- **People** — staff, skills, availability, schedule, attendance, wages.
- **Sales** — sales/orders/item mix and operating demand.
- **Stock** — inventory, recipes, purchase cost, waste, reorder risk, suppliers.
- **Operations** — incidents, tasks, opening/closing checks, manager log.
- **Context & fixed cost** — weather/events, rent/occupancy cost, market reference prices.

The signature experience is: **read live store → prioritize issues → plan actions → preview → human edit/review → apply**.

## Required reading order
1. `docs/00_PROJECT_CHARTER.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_STAKEHOLDERS_AND_JTBD.md`
4. `docs/03_UX_DESIGN_SYSTEM.md`
5. `docs/04_ASSISTANT_AVATAR.md`
6. `docs/05_ARCHITECTURE.md`
7. `docs/06_DATA_MODEL_AND_RULES.md`
8. `docs/07_WEBMCP_CONTRACT.md`
9. `docs/08_STATE_SNAPSHOT_SPEC.md`
10. `docs/09_ACCEPTANCE_TESTS.md`
11. `docs/10_REFERENCE_RESEARCH.md`
12. `docs/11_DEVPOST_SUBMISSION.md`
13. `docs/12_HANDOFF_PROTOCOL.md`
14. `docs/13_PAPERTHIN_REVIEW.md`
15. `docs/14_CODEX_EXECUTION_PLAN.md`
16. `docs/15_DECISION_LOG.md`
17. `docs/16_AGENT_OPERATING_MANUAL.md`

## Non-negotiable engineering rules
- The previous staffing-only MVP is a **RE0 baseline**, not a constraint on the new product scope.
- Preserve the strongest existing invariant: **one canonical store state and one shared application-action path for UI and WebMCP**.
- Do not create separate agent truth, chat truth, inventory truth, payroll truth, or snapshot truth.
- Natural-language reasoning belongs to the external agent. Deterministic calculations, validation, plan materialization, and state transitions belong in TypeScript domain code.
- WebMCP tools are user-intent capabilities, not calculator micro-tools.
- Prefer a small number of broad store-operating tools over separate SaaS modules.
- Stateful changes use preview/review/apply when they can materially affect staffing, purchasing, prep, pricing, tasks, or other operating commitments.
- The store's own values are authoritative: actual wage, availability, stock count, supplier price, lease cost, actual attendance, and sales records override external references.
- External data is **reference/context**, never silently treated as store truth. Every external value carries provider, geography, unit, observation time, and freshness.
- The prototype must have deterministic seed fallbacks so the demo remains usable when an external API is unavailable. Live adapters are allowed when they fail soft and do not become a second business-logic path.
- Market/labor/rent reference data must be presented as planning context, not legal, tax, accounting, or valuation guarantees.
- Do not turn OwnerOps into a full payroll filing, tax, bookkeeping, ATS, LMS, or labor-law compliance suite.
- Avoid menu-per-feature SaaS bloat. Capabilities may broaden while the UI remains a narrow operating workspace.
- Prefer editing existing canonical artifacts over adding `v2`, `new`, `final`, wrapper-on-wrapper, or duplicate registries.

## Product data boundary
In-scope operational truth includes:
- worker profile, employment type, role/skills, hourly rate, regular availability, exceptions, weekly limits;
- shifts, attendance/time entries, incidents, swaps, scheduled/actual wage estimates;
- menu/catalog, recipe quantities, inventory on-hand/par/reorder, waste, supplier and recent purchase prices;
- sales/order/item-mix fixtures or connected summaries;
- daily tasks/log entries;
- occupancy cost: base rent, recurring fees, deposit metadata, lease dates/escalation;
- weather/event context and external commodity/rent benchmarks with provenance.

Out of scope unless explicitly re-approved:
- statutory payroll filing, tax withholding, social insurance calculation, bank payroll transfer;
- full accounting ledger and tax returns;
- legal-compliance guarantees;
- opaque autonomous purchasing or staffing commits without a reviewable plan.

## Verification discipline
Before declaring completion:
1. run tests;
2. run lint;
3. run typecheck;
4. run production build;
5. re-read the final diff;
6. remove dead/duplicate artifacts;
7. verify seed and live-reference fallback behavior;
8. manually run the canonical natural-language demo in a WebMCP-capable browser when available.

Do not claim a check passed unless it was actually run.
