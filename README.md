# OwnerOps

**OwnerOps** is a WebMCP-powered staffing decision workbench for small-business owners with hourly teams. A human can edit the weekly schedule directly while an agent reads and acts on the same live application state. Every recovery option is compared on coverage, weekly hours, estimated payroll, labor ratio, warnings, and schedule-change count before the owner applies it.

The MVP is intentionally focused on one operational incident: Minsoo becomes unavailable for the Friday 18:00–22:00 shift at Paperthin Cafe.

## Problem

A small business can publish a credible weekly schedule and still lose coverage when a worker calls out at the last minute. The owner needs to compare who can cover the shift, what the change costs, and whether any coverage or work-rule warning remains before committing it.

## Why WebMCP

Humans are effective at visually manipulating a schedule. Agents are effective at reasoning across exact workers, shifts, labor cost, coverage, and constraints. WebMCP lets both operate on the same live application state: the owner edits the visible grid, and the agent reads or changes that canonical state through structured tools without reconstructing the UI from a screenshot.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No API key, backend, database, authentication, or external service is required.

## Verification commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

`npm run start` serves the production build after `npm run build`.

## Canonical demo

1. Reset the demo fixture.
2. Move a shift by drag/drop or press a shift to use the accessible reassignment dialog.
3. Mark Minsoo unavailable for Friday 18:00–22:00.
4. Compare the three deterministic recovery scenarios.
5. Preview the recommended option; the committed schedule remains unchanged.
6. Manually change the candidate replacement and review the recalculated impact.
7. Ask the agent to evaluate the current plan; it reads the exact human-edited candidate.
8. Apply the reviewed preview.
9. Refresh to confirm `localStorage` persistence.
10. Copy a portable snapshot, reset, and import it to restore the schedule.

## WebMCP

The client registers these eight user-intent tools through `document.modelContext.registerTool`:

- `get_business_state`
- `create_schedule_draft`
- `mark_worker_unavailable`
- `get_response_options`
- `preview_staffing_change`
- `evaluate_current_plan`
- `apply_staffing_change`
- `import_schedule_snapshot`

Tool handlers and human UI controls call the same deterministic application actions. The page remains fully functional when `document.modelContext` is absent.

Implementation entry point: [`src/webmcp/register-tools.ts`](src/webmcp/register-tools.ts). The eight tools are intentionally bounded to state inspection, schedule drafting, incident handling, recovery comparison, preview, evaluation, apply, and snapshot restore.

For local Chrome testing, enable `chrome://flags/#enable-webmcp-testing`, relaunch Chrome, open the app, and inspect/call the registered tools with a WebMCP-capable agent or the Model Context Tool Inspector. WebMCP requires an origin-isolated context; the app sends `Origin-Agent-Cluster: ?1`.

## Live application

No production URL has been verified in this release-preparation pass. The repository is ready for an authenticated HTTPS deployment; complete the deferred manual Chrome/WebMCP check first, then deploy and use the verified URL for submission.

## Architecture

- `src/domain/` — canonical model, fixture, calculations, scenarios, and shared actions
- `src/state/` — the single React-owned `AppState` and `localStorage` persistence
- `src/components/` — schedule, scenario comparison, preview/apply flow, and assistant rail
- `src/snapshot/` — strict versioned text serialization and transactional parsing
- `src/webmcp/` — imperative WebMCP registration and the shared state bridge
- `tests/` — deterministic domain, snapshot, and UI/WebMCP shared-path tests

Product scope and acceptance criteria remain governed by `AGENTS.md` and `docs/`.

## Release gate

Development uses the private repository. Before Devpost submission, run the verification commands from a clean clone, review the repository for secrets/private data, publish a production URL, make the repository public, and confirm that the root `LICENSE` is detected.
