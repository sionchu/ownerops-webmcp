# OwnerOps

**OwnerOps** is a WebMCP-powered **AI Store Manager** for independent businesses. The owner speaks in operating intent—“오늘 장사 준비해줘”, “민수 못 나온대”, “우유 주말까지 버텨?”, “이번 주 인건비 왜 높아?”—and the agent reads the same canonical store state as the visible application, composes the required capabilities, previews consequential changes, re-reads human edits, and applies only reviewed plans.

The RE0 keeps the strongest part of the original staffing demo—human and agent collaboration on one live state—but expands that state across **People · Sales · Stock · Operations · Context · Costs**.

## What OwnerOps understands

### People
- worker role/skills,
- regular availability and one-off exceptions,
- weekly-hour limits,
- published shifts,
- actual time entries,
- call-outs and incident history,
- scheduled/actual wage context.

### Sales and menu
- daily/item sales fixtures,
- menu prices,
- recipe quantities,
- preparation yield rates,
- per-serving food cost and food-cost ratio.

### Stock
- industry-specific inventory,
- on-hand/par/reorder point,
- lead time and supplier,
- recent actual purchase cost,
- received purchases and planned purchase orders,
- waste records,
- mapped commodity-price references with provenance.

### Costs
- food cost,
- scheduled labor,
- packaging/consumables,
- payment and delivery/marketplace rates,
- base rent and recurring occupancy fees,
- utilities/software/security/rentals/marketing/other fixed costs,
- FL Cost and short-horizon break-even sales.

### Context and operations
- seeded or externally refreshed weather references,
- rent/commodity reference observations,
- opening/closing tasks,
- manager log and incidents.

Store-entered/seeded **actual store data is authoritative**. External commodity, rent and weather observations are reference/context only and always preserve provider, geography, timestamp and freshness (`live`, `recent`, `cached`, `seed`, `stale`).

## Why WebMCP

Existing business software makes the owner translate intent into menus, reports and forms. OwnerOps exposes structured user-intent tools from the live application instead:

```text
owner intent
    ↓
ChatGPT agent
    ↓
focused StoreState read
    ↓
Daily Brief / deterministic planning
    ↓
StorePlan Before → After → Delta
    ↓
human edit
    ↓
agent re-review
    ↓
explicit apply
```

The agent never reconstructs the operating state from a screenshot or Snapshot text during normal work.

## Canonical demo

### 1. Daily operating brief
Ask:

> 오늘 장사 준비해줘.

The agent should read `get_daily_brief`, surface the top few store issues, and—when supported evidence exists—prepare one cross-domain StorePlan. In the seeded coffee demo this can combine a staffing recovery with inventory reorder recommendations.

### 2. Staffing incident
Tell the agent:

> 민수 금요일 저녁 못 나온대. 알아서 처리해.

OwnerOps records the call-out as an availability exception + incident history, finds replacements that actually satisfy role/skill/regular-availability/hour limits, and previews the recovery. Once resolved, the call-out remains historical truth but no longer appears as an unresolved incident.

### 3. Full-week rebuild
Ask:

> 이번 주 전체 근무표 다시 짜줘. 40시간 안에서 피크 공백 최소화해.

The planner preserves employee availability/hours/skills and peak coverage rather than treating workers as interchangeable cells.

### 4. Inventory/cost question
Ask:

> 우유 주말까지 버텨? 지금 사는 가격도 비싼지 봐줘.

OwnerOps can compare current on-hand/usage/lead time to par and compare the store's recent actual purchase cost with a mapped external reference. If a provider is unavailable, the Reference Resolver falls back through recent/cached/seed/stale data and explicitly reports degraded freshness.

### 5. Multi-domain review
A StorePlan may contain staffing + purchase + task changes at once. The UI/agent keeps a shared:

```text
Before → After → Delta
```

for labor, food cost, purchase cash outlay, waste exposure, review flags and break-even sales. Purchase actions become **planned purchase orders** when applied; OwnerOps never pretends goods were received or a supplier was contacted without a real integration.

## WebMCP tool contract

The client registers exactly nine intent-level tools through `document.modelContext.registerTool`:

1. `configure_demo_store`
2. `get_store_state`
3. `get_daily_brief`
4. `record_operating_event`
5. `plan_store_actions`
6. `preview_store_plan`
7. `evaluate_current_plan`
8. `apply_store_plan`
9. `restore_store_snapshot`

Primary live path:

```text
get_store_state / get_daily_brief
        ↓
plan_store_actions
        ↓
preview_store_plan
        ↓
human edit
        ↓
evaluate_current_plan
        ↓
apply_store_plan
```

`restore_store_snapshot` is backup/restore only. Do not use Snapshot UI/export as an intermediate planning transport.

## Demo profiles

Industries:
- diner
- pizza
- coffee
- salon
- sushi
- curry

Markets:
- Seoul (`kr-seoul`)
- New York City (`us-nyc`)
- Tokyo (`jp-tokyo`)
- Madrid (`es-madrid`)
- Shanghai (`cn-shanghai`)

Markets provide currency, wage-reference metadata, localized worker names, timezone, regular worker availability, occupancy seed and external-reference provider metadata. Industries provide actual differentiated inventory/menu/skill/task seeds rather than merely changing labels.

A user-supplied 31-menu global restaurant-cost guide is kept as a **benchmark registry**, not live/store truth. It supplies examples of yield-aware costing and menu-cost ratios across Tokyo, New York, Seoul, Barcelona-oriented Spain and Shanghai. The Barcelona references remain labeled as such even when the configured OwnerOps Spanish market is Madrid.

## Snapshot

Portable export now uses:

```text
OWNEROPS_SNAPSHOT v2
```

It preserves StoreState operating truth while excluding transient preview/StorePlan/activity. Legacy v1 staffing snapshots are migrated into the matching deterministic StoreState seed and then overlaid with their original staffing truth.

## Boundaries

OwnerOps deliberately does **not** claim to be:
- tax/accounting/bookkeeping software,
- statutory payroll filing,
- a full labor-law compliance engine,
- a real supplier ordering/payment integration unless one is connected,
- a messaging provider unless one is connected,
- a source of guaranteed commodity/rent/weather truth.

Wage/labor/legal outputs are operational estimates/review flags. The demo call-out policy is explicitly `unpaid_hours`; real deployments would use the store's actual leave/pay policy.

## Run locally

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The deterministic demo does not require API keys. Live external-reference adapters are optional enhancements; seeded references keep the demo reproducible when providers are unavailable.

## Verification commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

Do not treat a Vercel deployment blocked by account build-rate limits as a code verification pass or failure; run the local verification commands or a successful Preview build before merge.

## Architecture

- `src/domain/model.ts` — canonical StoreState and StorePlan types
- `src/domain/actions.ts` — shared human/WebMCP state mutations
- `src/domain/availability.ts` — worker hard constraints
- `src/domain/rebuild.ts` — deterministic staffing rebuild
- `src/domain/store-ops.ts` — yield-aware store metrics, Daily Brief and BEP/FL Cost
- `src/domain/reference-resolver.ts` — live/recent/cached/seed/stale fallback semantics
- `src/domain/store-plan.ts` — multi-domain Before/After/Delta and reviewed apply
- `src/domain/store-planning.ts` — intent-level deterministic planning
- `src/industry/` — industry operating seeds + user-supplied menu-cost benchmark registry
- `src/market/` — market/wage/rent/reference-provider seeds
- `src/state/` — one React-owned canonical state
- `src/webmcp/` — nine-tool WebMCP registration/bridge
- `src/snapshot/` — v2 StoreState portability + legacy migration
- `tests/` — deterministic domain, StorePlan, snapshot and shared WebMCP path tests

Product and implementation truth is governed by `AGENTS.md` and `docs/`. The current major expansion is developed on the `re0/ai-store-manager` branch until the draft PR verification gates pass.
