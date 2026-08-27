# 09 — Acceptance Criteria and Tests

## Product acceptance criteria
### AC1 — schedule exists
User can see a credible weekly staff schedule with the canonical demo fixture.

### AC2 — schedule draft via WebMCP
Agent can call `create_schedule_draft` and the real schedule UI changes.

### AC3 — human edit
User can manually move/assign a worker shift through the UI.

### AC4 — same-state evaluation
After a human edit, `evaluate_current_plan` returns values derived from that edited live state.

### AC5 — incident
Minsoo can be marked unavailable for Friday 18:00–22:00; the shift becomes visibly uncovered.

### AC6 — scenarios
The product returns exactly three meaningful recovery scenarios for the canonical incident.

### AC7 — impact
Each scenario displays payroll delta, affected weekly hours, warnings, coverage impact, and change count.

### AC8 — preview
A scenario can be previewed in the schedule UI without committing it.

### AC9 — human correction
User can modify the preview/current plan manually and computed impact updates.

### AC10 — apply
An explicitly reviewed preview can be committed and preview state clears.

### AC11 — persistence
Refresh restores valid state from localStorage.

### AC12 — portable snapshot
Export/import round-trips schedule/business state without duplicating computed truth.

### AC13 — assistant rail
Assistant rail visibly changes state during inspect/proposal/apply flows and never blocks the schedule workspace.

### AC14 — WebMCP source
Repo contains clear `document.modelContext.registerTool` implementation with JSON Schemas and shared actions.

### AC15 — no hidden backend requirement
A fresh local clone can run the demo without API secrets.

## Baseline commands
Codex must define and run repo-appropriate commands for:
- test,
- lint,
- typecheck,
- build.

Expose them in `package.json` and README.

## Domain tests
At minimum test:
- weekly hours,
- payroll estimate,
- labor ratio,
- role mismatch,
- unavailability rejection,
- peak coverage warning,
- scenario ranking,
- preview/apply semantics,
- snapshot round-trip,
- malformed snapshot does not mutate state.

## Integration tests
At minimum test shared-path behavior:
- a UI action and equivalent WebMCP action produce equivalent canonical state.
- evaluate reads human-edited state.

## Manual test script
1. Reset demo.
2. Create/load schedule.
3. Drag one shift.
4. Inspect impact.
5. Mark Minsoo absent Friday evening.
6. Load three scenarios.
7. Preview scenario A.
8. Change choice manually.
9. Evaluate again.
10. Apply.
11. Refresh.
12. Copy snapshot, reset, import snapshot.
13. Confirm restored result.
14. Exercise tools in WebMCP-capable browser if available.
