# OwnerOps — Devpost Submission

## Project name

OwnerOps

## One-line description

OwnerOps is a WebMCP-powered staffing decision workbench that helps small-business owners review and safely resolve last-minute shift disruptions.

## Inspiration / Problem

Small businesses often publish a workable schedule and then lose coverage when a team member calls out. The owner has to decide quickly who can cover the shift while balancing coverage, weekly hours, estimated labor cost, and work-rule warnings. A screenshot or chat transcript does not contain enough structure to make that decision reliably.

## What it does

OwnerOps presents a weekly Good Shift Diner schedule by default and a canonical Friday 18:00–22:00 Minsoo absence. The same staffing fixture can be re-contextualized as six generic profiles—diner, pizza, coffee, salon, sushi, or curry—without creating separate applications or changing the calculations. The owner can edit the visible schedule, mark the incident, compare exactly three deterministic recovery options, preview a candidate, change the proposed replacement manually, ask for a fresh evaluation, and apply only the reviewed result. A portable snapshot can restore the schedule in another session.

## Why WebMCP is essential

WebMCP connects two complementary ways of working on the same page. The owner is fastest when making a visual schedule edit. An agent is strongest when comparing exact workers, shifts, coverage windows, weekly hours, estimated payroll, and warnings. OwnerOps exposes structured user-intent tools from the live page so the agent can inspect and act on the canonical application state instead of inferring rows and cells from a screenshot.

The key interaction is preview-before-commit. A proposed staffing change is visible as a candidate and is not part of the committed schedule until the owner applies it. If the owner changes Jiyoung to Hana in the UI, the agent's next evaluation reads that exact edited state and returns the new hours, cost, and impact.

## Human + Agent collaboration

The central proof point is:

> The human changes the proposed replacement from Jiyoung to Hana in the schedule UI. The agent then evaluates the exact changed schedule through WebMCP.

This is difficult to express safely with ordinary screenshot/click automation because the agent would need to reconstruct the schedule and could evaluate stale or guessed data. In OwnerOps, the UI and tools share one state and one action path.

## WebMCP implementation

The client registers exactly eight imperative tools through `document.modelContext.registerTool` in [`src/webmcp/register-tools.ts`](../src/webmcp/register-tools.ts):

- `get_business_state`
- `create_schedule_draft`
- `mark_worker_unavailable`
- `get_response_options`
- `preview_staffing_change`
- `evaluate_current_plan`
- `apply_staffing_change`
- `import_schedule_snapshot`

Tool handlers call the same deterministic application actions used by the human UI. `evaluate_current_plan` reads the current `AppState`; it does not reconstruct a plan from rendered text. Preview and apply are separate operations, and snapshot parsing validates the complete document before replacing state.

## Impact

OwnerOps targets small-business owners managing hourly teams, beginning with a neighborhood-diner staffing disruption where a quick decision has visible coverage and labor-cost consequences. Lightweight generic profiles make the same workspace legible for pizza, coffee, salon, sushi, and curry operations; manufacturing, healthcare, and other shift-based domains are future potential, not implemented domain engines.

## Built with

- Next.js 16.3.3
- React 19.2.8
- TypeScript
- The imperative WebMCP API (`document.modelContext.registerTool`)
- Browser `localStorage` for persistence
- Vitest, ESLint, and TypeScript checks

## Challenges

WebMCP is an emerging browser capability, so the product had to remain useful when the API is unavailable while keeping the integration visible and testable. The main design challenge was preserving one canonical application path: visual human edits, deterministic impact calculations, persistence, snapshots, and agent tools all operate on the same state and actions.

## Accomplishments

- Built a coherent weekly staffing workbench instead of a collection of isolated tool demos.
- Made labor cost, coverage, weekly hours, warnings, and change counts deterministic and reviewable.
- Added preview/apply safety so the owner can inspect a change before committing it.
- Preserved the exact human edit for agent re-evaluation through a shared `AppState` bridge.
- Added a portable, versioned snapshot with transactional import validation.
- Added six lightweight industry contexts and a restrained SVG assistant that adapts its labels, palette, prompt, and accessory while keeping one shared staffing model.
- Verified the exact eight-tool source contract, shared-path integration tests, local production workflow, lint, typecheck, build, dependency audit, and the production HTTPS page. Live browser WebMCP invocation remains the environment-dependent release check and is not claimed here.

## What's next

Complete the deferred manual Chrome/WebMCP validation, repeat the WebMCP check against the deployed URL, then publish the reviewed repository, video, and Devpost submission.

## Judge Mapping

### WebMCP Leverage

The strongest evidence is the shared action/state path in `src/state/`, `src/domain/`, and `src/webmcp/register-tools.ts`, plus the integration test that evaluates a human-edited live state. The exact eight tools cover meaningful user intent without exposing calculation micro-tools. Live invocation evidence must be added after a WebMCP-capable browser check.

### Execution

The local production build and verified Vercel deployment render the complete workflow: weekly schedule, incident, three options, preview, manual correction, re-evaluation, apply, persistence, and snapshot restore. Automated tests (19/19), lint, typecheck, build, and production dependency audit pass. Live WebMCP invocation remains the explicit pending browser gate.

### Potential Impact

The problem is concrete: an owner needs a fast, explainable staffing decision after a published schedule changes. The impact view makes coverage and labor trade-offs legible without claiming legal compliance or guaranteed savings.

### Creativity & Ambition

OwnerOps is not another schedule generator. It is a live operational decision layer where human visual manipulation and agent reasoning operate on the same state, with an explicit review boundary before changes are committed.
