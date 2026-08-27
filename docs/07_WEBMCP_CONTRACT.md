# 07 — WebMCP Contract

## Objective
Expose meaningful operations from the live OwnerOps page so the browser agent can inspect and manipulate the same schedule that the human sees.

Official references:
- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp

Use the current imperative API (`document.modelContext.registerTool`) supported by the challenge environment. Treat tool descriptions as part of the product/API design.

## Global rules
- Register tools from the client only after the application state/action bridge is available.
- Abort/unregister cleanly when components unmount or the registration context changes.
- Read-only tools should use `annotations.readOnlyHint: true` where supported.
- Tool output must be concise structured data plus a short human-readable summary when helpful.
- Tools must not silently commit stateful changes when a preview is appropriate.
- Reuse shared application actions and domain functions.
- Never place unrelated agent instructions in tool outputs.

## Tool 1 — `get_business_state`
Inspect the current live schedule, workers, incident, preview, and key business metrics.

Read-only.

Output includes:
- business summary,
- workers and weekly hours,
- shifts/uncovered shift,
- current incident,
- current preview if any,
- expected sales/labor ratio summary,
- active warnings.

## Tool 2 — `create_schedule_draft`
Create a rough weekly schedule from a bounded structured staff/business instruction for onboarding/demo use.

Accept a minimal set of worker availability/preferences or a `preset: 'demo'` path. Natural language is translated by the agent into structured input.

Modifies state.

## Tool 3 — `mark_worker_unavailable`
Mark a worker as unavailable for an existing shift and expose the resulting coverage incident.

Input:
- `workerId`
- `shiftId`
- optional `reason`

Must not auto-assign a replacement.

## Tool 4 — `get_response_options`
Compare bounded staffing-recovery options for the current incident.

Read-only with respect to committed schedule. It may compute options, but must not commit them.

Output up to exactly three demo scenarios with:
- scenario id/title,
- staffing change summary,
- payroll delta,
- affected weekly hours,
- warnings,
- coverage/peak impact,
- schedule change count,
- recommendation rationale.

## Tool 5 — `preview_staffing_change`
Show a candidate staffing change in the UI without committing it.

Input:
- `scenarioId` from current options, or
- an explicit bounded change set.

Result:
- sets canonical `preview`,
- UI visibly renders preview,
- returns impact.

## Tool 6 — `evaluate_current_plan`
Evaluate the exact schedule currently visible/edited by the human.

Read-only with respect to committed schedule.

This is critical: after manual drag/drop, the tool reads the same canonical state as the UI rather than reconstructing a schedule from text.

## Tool 7 — `apply_staffing_change`
Commit the current preview after user review.

Input identifies/confirms current preview version/id so a stale preview is not applied accidentally.

Result:
- commit preview to shifts,
- clear preview,
- recompute impact,
- persist state.

## Tool 8 — `import_schedule_snapshot`
Restore a portable OwnerOps text snapshot into the page.

Input:
- `snapshotText`

Behavior:
- parse/validate first,
- do not mutate on failure,
- on success replace only snapshot-governed state,
- clear stale preview/incidents if not represented.

## Tool surface anti-bloat
Do **not** add separate tools such as:
- `calculate_labor_cost`
- `calculate_weekly_hours`
- `check_overtime`
- `calculate_sales`
- `serialize_state`
unless a concrete user-agent interaction cannot be expressed through the tools above. Those are internal domain functions.

## Source verification
The shipped repo must visibly contain `document.modelContext.registerTool({ ... })` calls that Devpost reviewers can inspect.

## Browser testing
For local Chrome testing, follow current official WebMCP flag/origin-trial guidance. The challenge target is the ChatGPT in-app browser or WebMCP-enabled Chrome.
