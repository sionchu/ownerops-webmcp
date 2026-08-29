# 00 — Project Charter

## Product
**OwnerOps — AI Store Manager for independent small businesses.**

## Canonical problem
An owner does not need another dashboard full of reports. They need to know **what changed, what matters, and what to do next** across the store: people, sales, stock, operating tasks, external context, and fixed cost.

The owner should be able to say things such as:
- “오늘 장사 준비해줘.”
- “민수 못 나온대. 알아서 처리해.”
- “우유 주말까지 버텨?”
- “이번 주 인건비 왜 높아?”
- “월세 10% 오르면 어떻게 메우지?”
- “내일 비 많이 온다는데 준비 바꿔야 돼?”

OwnerOps converts that intent into a reviewable store plan on the exact live application state.

## Canonical user
Owner/manager of one independent café, restaurant, salon, or similar hourly-team business, typically 5–20 workers, without a dedicated analyst or operations department.

## Why WebMCP
The store already has a visual operating workspace that is better for humans than a chat transcript. The agent needs structured access to the same workers, shifts, inventory, purchase cost, sales, tasks, and context rather than reconstructing them from screenshots or copied JSON. WebMCP lets the agent act through explicit store-level capabilities while the human sees and edits the materialized result.

## Hackathon success statement
A judge should understand quickly that:
1. the agent reads the same live store state the owner sees;
2. one natural-language request can combine multiple operating domains;
3. OwnerOps prioritizes issues rather than requiring the owner to know which menu/report to open;
4. consequential actions appear as a visible candidate plan before commit;
5. a human edit is re-read and re-evaluated from exact live state;
6. this shared-state loop is materially better than screenshot-driven browser automation or a generic chatbot.

## Canonical demo spine
### “오늘 장사 준비해줘”
OwnerOps should surface a short daily brief with a small number of prioritized issues, for example:
- staffing: one call-out / peak coverage risk;
- inventory: milk projected to stock out before weekend;
- waste/prep: pastry waste above recent baseline;
- context: rain forecast affecting demand mix;
- cost: labor/occupancy pressure when relevant.

The agent can then prepare a coordinated plan such as:
- staff reassignment,
- purchase quantity,
- prep quantity,
- shift/task adjustment.

The owner may ask to apply low-risk items while keeping staffing/purchase changes in preview.

## Product scope
### In
- One canonical store state spanning People, Sales, Stock, Operations, Context, and fixed costs.
- Country/market seed profiles: Seoul, New York City, Tokyo, Madrid, Shanghai.
- Industry seed profiles: diner, pizza, coffee, salon, sushi, curry.
- Worker profile with wage, role/skills, regular availability, exceptions, weekly limits.
- Schedule, absence/availability exceptions, shift swaps, attendance/time-entry seed, scheduled/actual wage estimates.
- Inventory items, recipe usage, stock counts, par/reorder, waste, supplier/recent purchase price.
- Industry-specific realistic purchased-item seed catalogs.
- External commodity/wholesale reference values with source/freshness metadata and deterministic fallback fixtures.
- Sales/item-mix/demand fixtures sufficient for operational reasoning.
- Weather/event context with deterministic fallback and optional live adapter.
- Occupancy cost: rent, recurring fees, lease dates/escalation and benchmark context.
- Daily brief / issue prioritization.
- Tasks and manager-log events needed by the demo.
- Generic multi-domain candidate plan with preview/review/apply.
- Snapshot/local persistence as portability/fallback, not the live planning path.

### Explicit non-goals
- payroll filing, tax withholding, social-insurance filing, bank transfers;
- full accounting/general ledger or tax returns;
- full labor-law compliance guarantee;
- autonomous real-money purchasing without explicit review;
- enterprise procurement, warehouse, ATS, LMS, CRM, or ERP completeness;
- pretending external market/rent reference prices are the store's actual purchase/lease terms.

## Product principle
**Capability broad, UI surface narrow.** OwnerOps may understand staffing, stock, wages, sales, rent, weather, tasks, and vendor prices, but the owner should not have to navigate a separate SaaS module for each one. Current operating problems and recommended actions should materialize where they are relevant.
