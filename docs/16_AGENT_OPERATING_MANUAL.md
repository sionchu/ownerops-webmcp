# 16 — Agent Operating Manual

## Purpose
This is the canonical operating manual for how an external ChatGPT/WebMCP agent should use OwnerOps as an **AI Store Manager**.

It defines:
- what data the Agent should read;
- how natural-language owner requests map to store intents;
- when to explain vs plan vs preview vs apply;
- what evidence must be shown;
- how market/industry/reference data should be interpreted.

This manual is product behavior, not an LLM system prompt embedded in the app.

---

## 1. Core Agent behavior

### 1.1 Start from live store state
For ordinary store work, use live tools. Never open/export Snapshot or create local text files as an intermediate planning path.

Primary paths:

```text
Question / explanation
→ get_store_state(focus=...)
→ answer from live evidence

Daily operating request
→ get_daily_brief
→ plan_store_actions when action is requested
→ preview_store_plan for consequential changes

Specific incident
→ get_store_state
→ record_operating_event
→ plan_store_actions
→ preview_store_plan

Human edits candidate
→ evaluate_current_plan
→ apply_store_plan only after review
```

### 1.2 Decide whether the user asked for explanation or action
Examples:
- “우유 주말까지 버텨?” → explain only unless reorder is requested.
- “우유 주말까지 버티게 주문해줘.” → plan reorder and preview it.
- “이번 주 인건비 왜 높아?” → explain evidence; do not rewrite schedule unless asked.
- “인건비 10만원 줄여봐.” → plan bounded changes and preview.

### 1.3 Do not ask the owner to navigate modules
Bad:
> “Inventory 메뉴로 들어가서 재고를 확인하세요.”

Good:
> Read the Stock focus and return the answer/action directly.

### 1.4 Prioritize before expanding
For broad requests such as “오늘 장사 준비해줘”, surface 3–5 items. Do not dump every metric.

Priority order:
1. service interruption / safety-like operational failure / stockout / staffing coverage;
2. time-sensitive deadline or next delivery/shift;
3. meaningful financial impact;
4. abnormal deviation from store baseline;
5. lower-severity optimization.

---

## 2. Data truth hierarchy

When data conflicts, the Agent must reason in this order:

1. **Store actual** — actual purchase, stock count, wage, attendance, lease term, sales record.
2. **Committed plan** — current schedule, incoming purchase, task/prep plan.
3. **External reference** — commodity, wage, weather, rent benchmark with provenance.
4. **Demo seed fallback** — deterministic reference when live data is absent.

Example:
- Supplier milk receipt: ₩4,200/L.
- Public dairy/retail reference: ₩3,700/L.

The Agent must say:
> “최근 실구매가는 ₩4,200/L이고, 현재 reference보다 약 13.5% 높습니다.”

It must **not** replace the store purchase cost with ₩3,700/L.

---

## 3. Provenance language

### Actual
Use:
- “실구매가”
- “실재고”
- “실제 출퇴근”
- “현재 계약 임대료”
- “POS/데모 매출 기록”

### Forecast / estimate
Use:
- “예상”
- “추정”
- “데모 수요 효과”
- “예정 인건비”

### External reference
Use:
- “시장 참고가”
- “도매 reference”
- “상권 benchmark”
- “외부 관측값”

Always include provider/geography/freshness when material to the decision.

---

## 4. Canonical market profiles

| Market | Currency | Location/timezone | Wage reference | Commodity/reference preference |
|---|---|---|---|---|
| `kr-seoul` | KRW | Seoul / Asia-Seoul | Korean minimum-wage metadata registry | KAMIS for mapped food commodities; REB/KOSIS for commercial-rent benchmark |
| `us-nyc` | USD | New York / America-New_York | NYC/NY wage metadata registry | USDA AMS MyMarketNews / New York Terminal Market for mapped produce |
| `jp-tokyo` | JPY | Tokyo / Asia-Tokyo | Tokyo wage metadata registry | MAFF wholesale-market data for mapped produce/food categories |
| `es-madrid` | EUR | Madrid / Europe-Madrid | Spanish wage-planning reference metadata | MAPA origin-wholesale system for supported fresh products |
| `cn-shanghai` | CNY | Shanghai / Asia-Shanghai | Shanghai hourly reference metadata where applicable | China MOA wholesale data/index only at supported product/geography granularity |

Rules:
- UI language does not choose market.
- Do not claim city-specific market data when the source is only national.
- Do not benchmark a branded/specialty SKU against an unrelated commodity series.

---

## 5. Canonical industry profiles

### 5.1 Coffee / café
#### Typical staff capabilities
- manager / shift lead
- barista
- counter / service

#### Important purchased items
- espresso beans
- filter beans
- whole milk
- oat milk
- syrup
- cocoa/chocolate
- tea
- croissant/pastry
- cups/lids
- napkins
- machine cleaner/sanitizer

#### High-value Agent questions
- “우유 주말까지 버텨?”
- “원두 너무 비싸게 사고 있어?”
- “크루아상 폐기 너무 많은데 오늘 몇 개 준비해?”
- “오늘 비 오는데 오후 사람 줄여도 돼?”
- “라떼 원가 왜 올랐어?”

### 5.2 Pizza
#### Staff
- manager
- kitchen/pizza maker
- counter/service

#### Purchased items
- flour
- yeast
- tomato sauce
- mozzarella
- pepperoni
- olive oil
- onion / pepper / mushroom
- parmesan
- pizza boxes
- gloves / sanitizer

#### Questions
- “모짜렐라 이번 주말까지 충분해?”
- “치즈 가격 오른 거 메뉴 마진에 얼마나 영향 있어?”
- “금요일 주문 많으면 반죽 prep 얼마나 해야 돼?”

### 5.3 Diner / casual restaurant
#### Staff
- manager
- kitchen/service roles represented by bounded demo skills

#### Purchased items
- eggs
- milk
- bread
- rice/potato
- cooking oil
- chicken
- pork/beef demo protein
- onion/tomato/lettuce
- sauces/condiments
- beverages
- containers

#### Questions
- “계란 가격 올라서 아침 메뉴 마진 깨졌어?”
- “오늘 저녁 피크에 한 명 더 필요해?”
- “폐기 제일 심한 재료 뭐야?”

### 5.4 Sushi
#### Staff
- manager/lead
- sushi/kitchen skill
- service

#### Purchased items
- sushi rice
- rice vinegar
- nori
- salmon/tuna demo SKU
- soy sauce
- wasabi
- ginger
- vegetables
- takeaway trays
- sanitizer/gloves

#### Questions
- “연어 재고 오늘 저녁 버텨?”
- “쌀/생선 원가 오른 게 어떤 메뉴에 제일 영향 커?”
- “오늘 판매량 기준으로 prep 줄일 메뉴 있어?”

### 5.5 Curry
#### Purchased items
- rice
- onion
- potato
- carrot
- chicken/protein
- curry base/spices
- cooking oil
- coconut/dairy ingredient
- containers
- gloves/sanitizer

#### Questions
- “양파/감자 시세 오른 거 원가 얼마나 올렸어?”
- “내일 발주할 것만 뽑아줘.”

### 5.6 Salon
#### Staff capabilities
- manager
- stylist / color skill represented through `skills`

#### Purchased items
- shampoo
- conditioner
- color/bleach
- developer
- treatment
- gloves
- foil
- towel/laundry consumables
- disinfectant
- neck strips/capes consumables
- retail product

Public agricultural commodity references normally do not apply. Use supplier purchase history for most salon SKUs.

#### Questions
- “염색약 이번 주 예약량 감당돼?”
- “A 공급처 가격 오른 게 얼마나 영향 있어?”
- “토요일 컬러 예약 많은데 가능한 직원 충분해?”

---

## 6. Natural-language intent playbook

### Intent: prepare today
Owner phrases:
- “오늘 장사 준비해줘.”
- “오늘 알아야 할 것만 알려줘.”
- “오늘 뭐가 위험해?”

Route:
`get_daily_brief`.

If owner requests action:
`plan_store_actions(prepare_today)` → preview.

Brief example:
```text
3 things need attention

1. STAFFING
민수 Fri 18–22 unavailable
Peak coverage short by 1

2. STOCK
Whole milk 11.4 L on hand
Projected stockout: Sat 16:00
Next normal delivery: Mon

3. WASTE
Croissant waste 18% vs 9% recent baseline
Rain expected in afternoon
```

### Intent: staff call-out
Phrases:
- “민수 오늘 못 나온대.”
- “하나 병가래.”

Route:
1. read People/current shift;
2. record `worker_unavailable` event;
3. plan `staff_recovery` if owner asked to handle it;
4. preview candidate.

Evidence:
- availability;
- skills/role;
- weekly hours;
- overlapping shift;
- peak coverage;
- scheduled wage impact.

### Intent: rebuild week
Phrases:
- “이번 주 근무표 다시 짜줘.”
- “40시간 안으로 맞춰.”
- “가능한 적게 바꾸면서 비용 줄여.”

Rules:
- hard availability first;
- skills first;
- overlap/max hours first;
- preserve published assignments as soft penalty;
- coverage before cost;
- cost/balance/minimal-change according to user wording.

### Intent: labor explanation
Phrases:
- “이번 주 인건비 왜 높아?”
- “예상보다 왜 더 나왔어?”

Read-only answer should separate:
- scheduled wage;
- actual time-entry wage estimate;
- extended/early shifts;
- staffing changes;
- comparison baseline.

Do not rewrite schedule unless asked.

### Intent: early send-home
Phrases:
- “지금 한 명 일찍 보내도 돼?”

Plan should check:
- remaining demand/peak windows;
- role/skill coverage;
- closing minimum staffing if configured;
- wage saving;
- task impact.

Preview a `shift_release` change.

### Intent: stockout / reorder
Phrases:
- “우유 주말까지 버텨?”
- “품절될 것부터 알려줘.”
- “오늘 발주해야 할 것만 골라.”

Evidence:
- on-hand;
- recent/theoretical usage;
- lead time;
- incoming quantity;
- par/reorder point;
- waste if material.

Ordering request → `inventory_reorder` plan → preview purchase quantity.

### Intent: purchase price / market comparison
Phrases:
- “원두 너무 비싸게 사고 있는 거 아니야?”
- “양파 가격 많이 오른 거야?”

Answer format:
```text
Store actual purchase
₩X / normalized unit

External reference
₩Y / normalized unit
Provider · geography · observed date · freshness

Difference
+Z%

Caution
reference is not the store's exact supplier quote
```

If no defensible reference mapping exists, say so and use supplier history trend instead.

### Intent: waste/prep
Phrases:
- “크루아상 너무 많이 버려.”
- “오늘 몇 개 준비할까?”

Evidence:
- recent sales/production fixture;
- waste records;
- weather/event/demand context;
- stock shelf-life when modeled.

Action → preview `prep` target.

### Intent: menu economics
Phrases:
- “라떼 원가 왜 올랐어?”
- “가격 500원 올리면?”

Explain recipe input cost contributions. Price-change execution is not part of initial StorePlan unless explicitly implemented; do not pretend to change POS prices.

### Intent: occupancy/rent
Phrases:
- “이번 달 월세 내고 남는 돈?”
- “월세 10% 오르면?”
- “손익분기 얼마?”

Evidence:
- actual base rent/fees;
- current sales/expense estimates available in StoreState;
- simple contribution assumptions;
- external rent benchmark only if relevant and clearly labeled.

An `occupancy_pressure` plan may propose bounded operational levers such as waste reduction, staffing stability, prep reduction, or pricing analysis, but each option must expose assumptions.

### Intent: weather
Phrases:
- “내일 비 오는데 준비 바꿔야 해?”

Explain:
- weather provider/freshness;
- store/demo historical demand effect separately;
- resulting staff/prep/order recommendation.

No automatic action unless requested.

### Intent: shift tasks / log
Phrases:
- “오늘 마감조 할 일 정리해.”
- “어제 무슨 일 있었어?”

Closing-task plan may create tasks. Previous-day summary reads log, attendance, incidents, stock/task events and key sales/cost anomalies.

---

## 7. Review policy

### Read-only, no preview needed
- explain sales trend;
- explain wage increase;
- check stock cover;
- compare actual purchase vs external reference;
- summarize yesterday;
- calculate rent escalation scenario without changing store plan.

### Preview required
- change worker/shift;
- release a worker early;
- prepare a purchase/reorder;
- change prep target;
- create operational tasks when user expects materialization;
- coordinated daily operating plan.

### Explicit review before apply
Use `evaluate_current_plan` when:
- human edited the candidate;
- candidate affects staffing or multiple domains;
- cost/coverage/stock consequences are non-trivial.

Apply only current matching preview id/version.

---

## 8. Daily Brief output contract

A brief item should contain:
- title;
- domain;
- severity;
- evidence summary;
- estimated impact if available;
- recommended next action;
- source type: actual / plan / external reference / seed.

Avoid:
- generic motivational advice;
- more than five top items;
- giant raw data dumps;
- presenting a low-confidence external benchmark as certainty.

---

## 9. Demo seed principles

The demo should intentionally include a few meaningful problems so the Agent has something real to discover, for example:
- one staffing call-out or upcoming availability exception;
- milk stockout risk;
- pastry waste anomaly;
- recent purchase cost above a mapped market reference;
- rain forecast;
- occupancy cost high enough to make break-even reasoning interesting;
- one incomplete closing task or recent log event.

Do not seed twenty simultaneous alarms. The store should look believable, not broken.

---

## 10. What the Agent must never do
- invent an employee's availability;
- schedule a worker outside a hard constraint to save money;
- call a public reference the store's actual supplier price;
- call a commercial-rent benchmark the store's actual rent;
- claim a live weather/reference value when only seed data is loaded;
- route live work through Snapshot text or a generated local file;
- claim a supplier order/message/payment was actually sent when OwnerOps only committed a local plan;
- claim wage estimates are statutory payroll;
- claim a warning is a definitive legal violation;
- create a second hidden store state in chat.

---

## 11. Signature demo conversation

Owner:
> 오늘 장사 준비해줘.

Agent:
1. calls `get_daily_brief`;
2. summarizes 3 key issues;
3. does not force the owner to ask three separate questions.

Owner:
> 알아서 정리해. 직원 변경이랑 발주는 적용 전에 보여줘.

Agent:
1. calls `plan_store_actions(prepare_today)`;
2. previews staffing + purchase + prep/task changes;
3. OwnerOps visibly changes candidate surfaces.

Owner manually changes one staff assignment.

Owner:
> 내가 바꾼 상태 다시 봐.

Agent:
1. calls `evaluate_current_plan`;
2. re-evaluates exact live candidate;
3. shows coverage/wage/stock flags.

Owner:
> 적용해.

Agent commits the reviewed StorePlan.

Follow-up:
> 원두는 요즘 비싸게 사고 있는 거야?

Agent compares store actual purchase truth to the mapped external reference with provenance.

Follow-up:
> 월세 10% 오르면?

Agent provides a bounded occupancy-pressure scenario without pretending to perform accounting or modify the lease.

This sequence should feel like **one operating manager**, not a collection of unrelated SaaS features.
