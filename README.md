# OwnerOps

**OwnerOps** is a WebMCP-powered staffing decision workbench for small-business owners with hourly teams. A human can edit the weekly schedule directly while an agent reads and acts on the same live application state. Every recovery option is compared on coverage, weekly hours, estimated payroll, labor ratio, warnings, and schedule-change count before the owner applies it.

The MVP supports two bounded operational workflows on the same canonical schedule: a last-minute staffing incident and a deterministic full-week staffing rebuild. The default demo context is **Good Shift Diner** in Seoul; the same staffing fixture can be re-contextualized as a generic diner, pizza shop, coffee shop, salon, sushi restaurant, or curry house.

## Problem

A small business can publish a credible weekly schedule and still lose coverage when a worker calls out at the last minute. The owner needs to compare who can cover the shift, what the change costs, and whether any coverage or work-rule warning remains before committing it. The same live state can also be rebalanced across the full week when the owner asks to control weekly hours, reduce cost, preserve peak coverage, or expose missing qualified capacity.

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

### Incident recovery

1. Reset the demo fixture.
2. Mark Minsoo unavailable for Friday 18:00–22:00.
3. Compare the three deterministic recovery scenarios.
4. Preview the recommended option; the committed schedule remains unchanged.
5. Manually change the candidate replacement and review the recalculated impact.
6. Ask the agent to evaluate the current plan; it reads the exact human-edited candidate.
7. Apply the reviewed preview.
8. Refresh to confirm `localStorage` persistence.

### Full-week rebuild

1. Ask the agent to rebuild or rebalance the current week, optionally with a weekly-hour ceiling or cost/balance priority.
2. The agent reads the live OwnerOps state, generates deterministic `rebuild_week` plans, and previews the recommended multi-shift candidate directly in the UI.
3. If the current team cannot satisfy the requested ceiling, OwnerOps surfaces an explicit qualified-role capacity gap instead of hiding the shortage.
4. The owner can edit the candidate in the schedule, then ask the agent to evaluate the exact live edit before applying it.

Portable snapshots remain available for explicit backup/restore or handoff, but they are not an intermediate planning path for live schedule work.

Industry profiles change only the business identity, operational labels, restrained accent palette, suggested prompt, and assistant accessory. Staffing IDs, hours, rates, calculations, and the canonical workflow remain shared.

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

For live schedule analysis, rebuilds, optimization, review, or changes, the primary route is `get_business_state` → `get_response_options` → `preview_staffing_change`. `import_schedule_snapshot` is reserved for explicit restore/import requests when the user provides or asks to restore a portable snapshot; agents should not open or export the Snapshot UI to understand the current schedule.

`create_schedule_draft` accepts the required `preset: "demo"` plus an optional generic `industry` enum: `diner`, `pizza`, `coffee`, `salon`, `sushi`, or `curry`. Branded requests should be mapped by the external agent to the nearest generic category; OwnerOps does not reproduce branded identities.

Implementation entry point: [`src/webmcp/register-tools.ts`](src/webmcp/register-tools.ts). The eight tools are intentionally bounded to state inspection, schedule drafting, incident handling, staffing-plan generation, preview, evaluation, apply, and explicit snapshot restore.

For local Chrome testing, enable `chrome://flags/#enable-webmcp-testing`, relaunch Chrome, open the app, and inspect/call the registered tools with a WebMCP-capable agent or the Model Context Tool Inspector. WebMCP requires an origin-isolated context; the app sends `Origin-Agent-Cluster: ?1`.

## Live application

The current production deployment is [ownerops-webmcp.vercel.app](https://ownerops-webmcp.vercel.app). The HTTPS page and origin-isolation header are verified; live tool invocation still requires a WebMCP-capable Chrome/ChatGPT browser.

## Architecture

- `src/domain/` — canonical model, fixture, calculations, scenarios, and shared actions
- `src/industry/` — one registry for the six lightweight generic industry profiles
- `src/state/` — the single React-owned `AppState` and `localStorage` persistence
- `src/components/` — schedule, scenario comparison, preview/apply flow, and assistant rail
- `src/snapshot/` — strict versioned text serialization and transactional parsing
- `src/webmcp/` — imperative WebMCP registration and the shared state bridge
- `tests/` — deterministic domain, snapshot, and UI/WebMCP shared-path tests

Product scope and acceptance criteria remain governed by `AGENTS.md` and `docs/`.

## Release gate

Development uses the private repository. Before Devpost submission, run the verification commands from a clean clone, complete live WebMCP validation in a compatible browser, review the repository for secrets/private data, then make the repository public and confirm that the root `LICENSE` is detected.
