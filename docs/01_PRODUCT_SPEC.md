# 01 — Product Spec

## Product promise
**OwnerOps tells a small-business owner what matters now and turns natural-language intent into a reviewable operating plan.**

The product is not a chat replacement for existing SaaS menus. It is a shared operational workspace where an external agent can combine staffing, stock, sales, tasks, weather/context, and cost data on the same live state.

## Primary natural-language workflows
### A. Daily brief
User: **“오늘 장사 준비해줘.”**

OwnerOps reads the live store and returns a short prioritized brief, not a report dump. Typical findings:
- staffing gap or excessive hours;
- predicted stockout before the next delivery;
- unusual waste or purchase-price increase;
- sales/demand shift;
- weather/event impact;
- occupancy or labor pressure when operationally relevant.

A brief should normally produce no more than 3–5 actionable items.

### B. Staffing incident
User: **“민수 오늘 못 나온대. 알아서 처리해.”**

Flow:
1. record a one-time availability exception/incident;
2. preserve the worker's regular availability profile;
3. identify eligible replacements using role/skills, availability, overlap, weekly limit, and existing schedule;
4. compare wage/coverage impact;
5. preview the proposed staffing change;
6. human may edit;
7. agent re-reads exact candidate;
8. apply explicitly.

Resolved incidents remain visible as operational history; they do not silently revert to a fresh “mark absent” state.

### C. Whole-week plan
User: **“이번 주 전체 근무표 다시 짜줘. 40시간 안에서 피크 공백 최소화해.”**

The plan must treat employee availability and required skills as hard constraints, and treat published schedule stability as a preference/penalty. A cheaper plan that arbitrarily destroys employees' normal patterns is not a valid recommendation.

### D. Stock/reorder
User examples:
- “우유 주말까지 버텨?”
- “오늘 발주할 것만 골라줘.”
- “원두를 너무 비싸게 사고 있는 거 아니야?”

OwnerOps connects:
`on-hand + recipe usage + sales velocity + waste + incoming PO + supplier price + external reference price`.

Store purchase history is authoritative. External commodity/wholesale data is contextual evidence only.

### E. Menu/prep economics
Examples:
- “크루아상 너무 많이 버리는데 오늘 몇 개만 준비할까?”
- “라떼 원가가 왜 올랐어?”
- “원두값 8% 오르면 가격을 얼마나 올려야 돼?”

The prototype may use deterministic recipe/menu fixtures; it must show which inventory inputs drive a margin/prep recommendation.

### F. Labor / attendance / wages
Examples:
- “이번 주 인건비 왜 높아?”
- “지금 한 명 일찍 보내도 돼?”
- “예정 인건비보다 실제가 왜 많이 나왔어?”

OwnerOps distinguishes scheduled shifts from actual time entries. `scheduled wage` and `actual wage estimate` are separate concepts.

### G. Occupancy / break-even
Examples:
- “이번 달 월세 내고 남는 돈 얼마야?”
- “월세 10% 오르면 어떻게 메우지?”
- “하루에 최소 얼마 팔아야 월세랑 인건비가 나와?”

Occupancy cost is a fixed-cost context, not a daily variable. Store lease terms are authoritative. External rent benchmarks are contextual only.

### H. Weather/event context
Examples:
- “내일 비 많이 온다는데 준비 바꿔야 돼?”
- “근처 행사 있는데 사람 더 넣어야 해?”

Weather/event data may adjust demand, staffing, prep, or inventory recommendations. The app always has a deterministic seeded context; a live adapter may replace the reference observation when available.

### I. Tasks / manager log
Examples:
- “오늘 마감조 할 일 정리해줘.”
- “어제 무슨 일 있었어?”

Task and log data should remain operationally light: assignee/shift, due time, completion, note, measurement/photo placeholder metadata if needed. Do not build a full project-management system.

## Supported demo profiles
### Markets
- `kr-seoul`
- `us-nyc`
- `jp-tokyo`
- `es-madrid`
- `cn-shanghai`

Each market profile defines currency, locale, wage-reference metadata, default cost scale, timezone/location, and allowed external reference providers. Language is independent from market.

### Industries
- `diner`
- `pizza`
- `coffee`
- `salon`
- `sushi`
- `curry`

An industry profile controls role/skill labels, realistic inventory catalog, menu/service fixture, default tasks, operating vocabulary, and restrained visual context. It must not create a separate application or second state store.

## Realistic purchased-item seeds
The seed catalog must reflect what the business actually buys.

Examples:
- **coffee**: espresso beans, filter beans, whole milk, oat milk, syrups, cocoa, tea, pastries, cups/lids, napkins, cleaning chemicals.
- **pizza**: flour, tomato sauce, mozzarella, pepperoni, olive oil, yeast, vegetables, pizza boxes, gloves, cleaning supplies.
- **diner**: eggs, milk, bread, rice/potatoes, cooking oil, beef/pork/chicken, vegetables, sauces, beverages, disposables.
- **sushi**: rice, rice vinegar, nori, salmon/tuna or demo fish SKUs, soy sauce, wasabi, ginger, vegetables, takeaway containers.
- **curry**: rice, onions, potatoes, carrots, protein, curry base/spices, cooking oil, dairy/coconut product where relevant, containers.
- **salon**: shampoo, conditioner, color/bleach, developer, gloves, foil, towels/laundry consumables, disinfectant, capes/neck strips, retail products.

Food commodity references may be mapped to official wholesale/public market sources when a defensible product/unit match exists. Branded consumables normally use supplier purchase history rather than pretending a public commodity index is equivalent.

## Data-truth hierarchy
For any operating fact, use this order:
1. store actual/entered/connected data;
2. current committed store plan;
3. external reference with provenance and freshness;
4. deterministic demo seed fallback.

Never overwrite store actuals with an external benchmark.

## Plan semantics
A plan can contain multiple typed changes, such as:
- staffing assignment/time change;
- purchase/reorder quantity;
- prep quantity;
- task creation/update;
- inventory adjustment proposal;
- operating-hours or shift release proposal.

Consequential changes remain a candidate until reviewed/applied. Read-only explanation does not create a plan.

## Product copy principles
- Speak like an operating manager, not an AI toy.
- Lead with the decision and evidence.
- Separate actual, forecast, estimate, and external reference explicitly.
- Prefer “market reference” over “market price” when the source is not the owner's exact transaction.
- Prefer “wage estimate” over statutory payroll claim.
- Prefer “review flag” over “legal violation.”
- Keep daily brief concise; detailed evidence should be inspectable on demand.
