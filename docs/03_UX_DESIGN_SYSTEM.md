# 03 — UX and Design System

## Design intent
OwnerOps should feel like a serious operating workspace an independent-business owner can leave open all day. Broad capability must make the product feel **simpler**, not like a six-module ERP.

## UX principle
**Issue first, evidence second, module never required.**

The owner should not need to decide whether a question belongs to Schedule, Inventory, Payroll, Tasks, Analytics or Weather. Natural-language intent and the Daily Brief bring the relevant operating surface forward.

## Preferred desktop frame
1. **Context header** — store identity, business date, market/currency, live-state status.
2. **Today / Daily Brief** — 3–5 prioritized issues and concise recommended actions.
3. **Candidate plan bar/surface** — appears when Agent has materialized a multi-domain plan.
4. **Operational workspace** — schedule, stock, cost or task evidence according to current issue/focus.
5. **Assistant Activity Rail** — shared-state steps, evidence and next allowed action.

The schedule remains important but is no longer permanently 70% of the product identity.

## Daily Brief
A brief is not a KPI dashboard. It should answer:
- what changed;
- what is at risk;
- what has a deadline;
- what costs meaningful money;
- what action is recommended.

Example:
```text
TODAY · 3 things need attention

STAFFING
Minsoo unavailable Fri 18–22
Peak coverage short by 1
[Prepare recovery]

STOCK
Whole milk 11.4 L
Projected stockout Sat 16:00
[Prepare reorder]

WASTE
Croissant waste 18% vs 9% baseline
[Adjust prep]
```

Do not render four giant KPI cards across the top.

## Operational evidence surfaces
### People / schedule
- weekly schedule grid;
- worker hours;
- availability conflicts;
- call-out/resolution state;
- candidate shifts;
- scheduled vs actual attendance evidence where relevant.

### Stock / purchasing
Use a compact table/drawer, for example:
- item;
- on hand;
- days cover;
- reorder status;
- last actual purchase cost;
- market reference when mapped;
- supplier/lead time.

### Cost
Contextual cost surface may show:
- scheduled/actual wage estimate;
- food/material cost evidence;
- occupancy cost;
- simple break-even or scenario delta.

Avoid building an accounting dashboard.

### Tasks / log
Use concise timeline/checklist in the shift/day context. Do not recreate a project-management product.

## Candidate StorePlan
A multi-domain plan should be obvious as **candidate, not committed truth**.

Example plan summary:
```text
AGENT PLAN · 3 changes

People   Hana covers Fri 18–22
Stock    Order 12 L whole milk
Prep     Croissant target 24 → 19

Estimated effects
Peak coverage   restored
Scheduled wage  −₩2,000 vs original shift
Milk cover      through Mon delivery
Waste exposure  lower
```

A human edit changes the same candidate and moves status to `HUMAN EDIT · REVIEW NEEDED`. `evaluate_current_plan` moves it to `REVIEWED`.

## Contextual detail over top-level modules
Employee click/drawer may show:
- role/skills;
- hourly rate;
- regular availability;
- exceptions;
- scheduled/actual hours.

Inventory click/drawer may show:
- supplier;
- recent purchases;
- market reference provenance;
- recipe/menu links;
- waste history.

This is preferred over permanent `People | Payroll | Inventory | Tasks | Analytics` navigation for the hackathon.

## External reference visual language
Actual vs external reference must never look identical.

Example:
```text
Recent purchase        ₩24,000 / kg
Market reference       ₩21,800 / kg
                       KAMIS · Seoul · Aug 29 · recent
Difference             +10.1%
```

Use `Reference`/provider label and freshness. Stale/seed references are visually quieter and explicitly labeled.

## Occupancy
Rent is a fixed-cost context, not a day-to-day slider. Show actual lease cost and scenario impacts when asked; external area benchmark remains a secondary reference.

## Weather
Weather should appear only when it affects today's decision or the owner asks. Do not add a permanent weather-app panel.

## Assistant Activity Rail
The rail remains a functional status surface, not an in-app chat.

Generic timeline:
`Read live store → Prioritized issues → Planned actions → Candidate preview → Human review → Agent re-review → Apply`

For read-only requests, timeline may stop at `Read → Analyze → Answer`.

The rail can show which domains were checked:
- People ✓
- Stock ✓
- Sales ✓
- Context ✓
- Cost ✓

Do not imply a domain was checked if its data was unavailable.

## Visual language
Retain current calm density principles:
- neutral modern type;
- tabular numerals for money/quantity/hours;
- one restrained operational accent;
- warning colors only for state meaning;
- modest corners;
- no glassmorphism, sparkle/wand/brain decoration, giant hero, neon gradients or fake analytics charts.

## Industry adaptation
Industry profile may change:
- vocabulary;
- role labels;
- inventory/menu/task seed;
- restrained visual token motif.

It must not create a second UI architecture.

## Responsive behavior
Desktop judging view is primary. At narrower widths:
- Daily Brief stays above detail workspace;
- right rail may collapse below/into a compact activity panel;
- tables become horizontally scrollable or compact lists;
- evidence labels must remain legible across Korean, English, Japanese, Spanish and Chinese strings.

## Motion
120–240 ms for ordinary transitions. Use motion for candidate materialization, issue status and review/apply state only. Respect `prefers-reduced-motion`.

## Anti-bloat checklist
Reject a design if:
- every capability gets a top-level tab;
- Daily Brief becomes 10+ alerts;
- actual/reference values are visually indistinguishable;
- data evidence is duplicated in multiple cards;
- Agent rail repeats the same full text as main workspace;
- the product looks like separate SaaS products embedded on one page.
