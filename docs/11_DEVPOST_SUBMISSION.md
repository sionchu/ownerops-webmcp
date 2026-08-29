# 11 — Devpost / Hackathon Submission Requirements

## Judging priorities
1. **WebMCP leverage** — structured, stateful, non-trivial browser-agent integration.
2. **Execution** — one coherent product, not a collection of mock dashboards.
3. **Potential impact** — obvious value for real independent-business operators.
4. **Creativity and ambition** — Agent coordinates multiple store domains through one live UI.

## Core pitch
**OwnerOps is an AI Store Manager.** Instead of forcing an owner to navigate scheduling, inventory, supplier cost, sales, weather and tasks separately, the owner says what they need in natural language. The Agent reads the exact live store, prioritizes issues, and materializes a reviewable operating plan through WebMCP.

## Demo-video spine
### 0–15 sec — owner problem
Show a live café workspace, not a landing page.

Owner asks:
> “오늘 장사 준비해줘.”

### 15–40 sec — Agent reads one live store
Daily Brief appears with three concrete issues, for example:
1. Minsoo call-out threatens Friday peak coverage.
2. Milk stock will not last to the next delivery/weekend.
3. Pastry waste is above recent baseline; rain is expected later.

Emphasize that People, Stock, Sales, Context and Cost came from the same StoreState.

### 40–75 sec — coordinated Agent plan
Owner:
> “알아서 정리해. 직원 변경은 적용 전에 보여줘.”

Agent plans:
- replacement staffing candidate;
- milk reorder quantity;
- pastry prep reduction;
- optional closing task.

The changes materialize in OwnerOps as one candidate plan, not a text-only recommendation.

### 75–100 sec — human edit + exact re-read
Owner manually changes one staffing choice or quantity in the visual UI.

Owner:
> “내가 바꾼 상태 다시 검토해.”

Agent uses `evaluate_current_plan` on exact live candidate and shows updated coverage/cost/stock evidence.

### 100–120 sec — apply reviewed plan
Apply the reviewed plan. Committed StoreState updates; preview clears; incident remains historically resolved rather than disappearing as though it never happened.

### 120–140 sec — natural-language breadth
Rapid examples without opening new SaaS modules:
- “원두 너무 비싸게 사고 있어?” → store purchase cost vs sourced market reference.
- “월세 10% 오르면 어떻게 메우지?” → occupancy pressure scenario.
- “이번 주 40시간 안으로 다시 짜줘.” → availability-aware full-week plan.

### final — why WebMCP
Human-friendly operational UI + agent-friendly structured store capabilities on the same live state. The agent does not need screenshot reconstruction, raw snapshot JSON, or a separate backend assistant state.

## Submission checklist
- working live URL;
- public YouTube demo within time limit;
- public repository and detected open-source license;
- source visibly contains current `document.modelContext.registerTool` implementation;
- README explains StoreState, natural-language demo, data provenance/fallback and how to run locally;
- no secrets/API keys committed;
- demo does not depend on a live external provider being healthy.

## Claim discipline
Allowed claims:
- helps owners prioritize store issues;
- coordinates staffing/stock/operating decisions on one live state;
- compares purchase/reference, wage and occupancy estimates;
- makes changes reviewable through preview/apply;
- can use external market/weather context when available.

Do not claim:
- audited profitability/accounting;
- legal payroll/compliance guarantee;
- guaranteed demand forecast;
- exact market value from a broad benchmark;
- real supplier order/message/payment when the prototype only updates StoreState.
