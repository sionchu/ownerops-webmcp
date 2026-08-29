# 07 — WebMCP Contract

## Objective
Expose meaningful **store-operating intents** from the live OwnerOps page so an external agent can inspect, explain, plan, and materialize actions across the same StoreState the human sees.

Tool descriptions are part of product behavior. They must route the agent toward live structured state, not screenshot parsing, snapshot export, or file handoff.

## Global rules
- Register tools only after the shared StoreState/action bridge is available.
- Human UI and WebMCP state changes call the same application actions.
- Read-only tools use `readOnlyHint: true`.
- A tool returns concise structured evidence, not huge raw JSON dumps when a focused view can answer the intent.
- Store actuals must be labeled separately from forecasts and external references.
- Snapshot is restore/portability only, never the primary read path.
- Consequential multi-domain changes should become a visible preview rather than silently commit.
- Tool outputs may help the external agent reason; deterministic domain functions remain the calculation truth.

## Tool surface
Target **nine user-intent tools** for the RE0. This is a replacement target for the previous staffing-only eight-tool contract; migrate coherently instead of keeping duplicate old/new tool families.

### Tool 1 — `configure_demo_store`
Configure the deterministic demo market/industry profile.

Input:
- `industry`: diner | pizza | coffee | salon | sushi | curry
- optional `market`: kr-seoul | us-nyc | jp-tokyo | es-madrid | cn-shanghai
- required `uiLocale`

Market is never inferred from language.

State-changing. A market change loads matching currency/location/wage/reference seeds. An industry change loads realistic roles/menu/inventory/tasks for that industry.

### Tool 2 — `get_store_state`
**PRIMARY READ PATH.** Inspect exact current StoreState without opening Snapshot UI.

Input may include `focus`:
- `overview`
- `people`
- `sales`
- `stock`
- `operations`
- `costs`
- `context`

Output always includes a concise summary and enough IDs/evidence for the next action. Focus prevents the agent from receiving a giant unfiltered state dump.

Read-only.

### Tool 3 — `get_daily_brief`
Generate the deterministic issue-prioritized operating brief for the current business date.

Output normally includes 3–5 ranked items with:
- issue type/severity;
- evidence;
- estimated operational/financial impact where calculable;
- suggested next intent;
- whether the action requires preview/review.

Read-only. This is the preferred first tool for requests such as:
- “오늘 장사 준비해줘.”
- “오늘 내가 알아야 할 것만 말해줘.”
- “오늘 뭐가 위험해?”

### Tool 4 — `record_operating_event`
Record a bounded store fact that the owner explicitly tells the agent.

Initial supported event types:
- worker unavailable / availability exception;
- stock count adjustment;
- attendance clock-in/out correction;
- task completion;
- manager note / equipment issue.

This tool records truth/event state; it does not automatically decide the recovery plan.

State-changing.

### Tool 5 — `plan_store_actions`
**PRIMARY PLANNING PATH.** Generate deterministic candidate plans from current live state.

Input:
- `objective`, initially one of:
  - `prepare_today`
  - `staff_recovery`
  - `rebuild_week`
  - `reduce_labor_cost`
  - `inventory_reorder`
  - `reduce_waste`
  - `respond_to_weather`
  - `occupancy_pressure`
  - `closing_tasks`
- optional bounded objective parameters, e.g. weekly-hour ceiling, target stock date, priority.

Output:
- up to 3 useful candidate plans;
- recommended preview payload;
- evidence and assumptions;
- review flags.

Read-only with respect to committed store state.

The planning tool must respect worker availability/skills, store actual purchase costs, inventory lead times, and other hard constraints rather than optimize against incomplete generic assumptions.

### Tool 6 — `preview_store_plan`
Materialize a candidate plan directly in the OwnerOps UI without committing it.

Input:
- plan id or explicit bounded `StorePlanChange[]` returned from planning;
- `uiLocale`.

Result:
- sets canonical preview;
- affected schedule/stock/task/prep surfaces show candidate state;
- returns deterministic impact.

State-changing, non-committing.

### Tool 7 — `evaluate_current_plan`
Re-read the exact currently visible candidate after human edits and evaluate it from canonical state.

Read-only with respect to committed store state, but may set canonical activity/preview review status to `reviewed`.

Critical behavior:
- uses live candidate, not the original agent proposal;
- checks staffing constraints, stock/lead-time consequences, cost effects, and relevant review flags;
- does not reconstruct from chat text or Snapshot.

### Tool 8 — `apply_store_plan`
Commit the current reviewed preview only when preview id/version still match and review state is valid.

State-changing.

A future integration may require additional confirmation for real external actions. In the prototype, applying updates canonical StoreState only; it must not pretend to place a real supplier order, send money, or file payroll unless such an integration actually exists.

### Tool 9 — `restore_store_snapshot`
**BACKUP/RESTORE ONLY.** Restore a complete portable OwnerOps snapshot when the user explicitly provides one or asks to restore it.

Never use this tool or Snapshot UI to inspect, analyze, optimize, plan, or pass the current store between agent steps.

## Natural-language routing examples
### “오늘 장사 준비해줘.”
`get_daily_brief` → `plan_store_actions(objective=prepare_today)` → `preview_store_plan` for requested consequential actions.

### “민수 오늘 못 나온대. 알아서 처리해.”
`get_store_state(focus=people)` → `record_operating_event(worker_unavailable)` → `plan_store_actions(staff_recovery)` → `preview_store_plan`.

### “이번 주 40시간 안으로 다시 짜줘.”
`get_store_state(focus=people)` → `plan_store_actions(rebuild_week,maxWeeklyHours=40)` → `preview_store_plan`.

### “우유 주말까지 버텨?”
`get_store_state(focus=stock)`; answer read-only if no action requested. If the owner asks to order, use `plan_store_actions(inventory_reorder)` → preview.

### “원두를 너무 비싸게 사고 있는 거 아니야?”
`get_store_state(focus=stock)` and compare store purchase truth to the normalized external reference already present in StoreState. Clearly label provider/unit/freshness.

### “월세 10% 오르면 어떻게 메우지?”
`get_store_state(focus=costs)` → `plan_store_actions(occupancy_pressure, escalation=0.10)`. Candidate options may combine staffing stability, waste reduction, prep or price-impact analysis, but must expose assumptions.

### “내일 비 많이 온다는데 준비 바꿔야 돼?”
`get_store_state(focus=context)` → `plan_store_actions(respond_to_weather)`; preview only if the owner asked to change staffing/prep/order.

## Tool anti-bloat
Do not expose separate tools for:
- calculate labor cost;
- calculate food cost;
- calculate break-even;
- check stockout;
- check availability;
- fetch KAMIS/USDA/MAFF directly;
- calculate rent ratio;
- serialize state.

Those are internal domain/provider functions used by the store-level tools.

## External reference behavior
WebMCP returns reference provenance with any market/weather/rent claim:
- provider;
- geography;
- observed/fetched time;
- unit/currency;
- freshness;
- source URL/key when available.

If a live adapter is unavailable, return the seeded reference marked `seed` or `stale`; do not fabricate freshness.

## Browser testing
Test the natural-language spine in a fresh WebMCP-capable session. A test fails if the agent routes ordinary live work through Snapshot text, a local file, or manual copy/paste instead of the live tools.
