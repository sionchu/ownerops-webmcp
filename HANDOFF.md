# Objective

Deliver the frozen OwnerOps WebMCP hackathon MVP as a working, polished local and HTTPS web application with lightweight adaptive demo profiles and a live SVG assistant.

# Scope

One shared weekly staffing schedule, the canonical Friday Minsoo absence, exactly three recovery scenarios, preview/apply, deterministic impact, assistant activity rail, local persistence, portable snapshot, six generic industry profiles, and eight WebMCP tools. The staffing fixture, internal capability keys, calculations, and workflow remain shared across profiles.

# Acceptance criteria

AC1–AC15 from `docs/09_ACCEPTANCE_TESTS.md` are implemented. Adaptive profiles (`diner`, `pizza`, `coffee`, `salon`, `sushi`, `curry`) are implemented through the canonical `AppState`. Live WebMCP invocation still requires a browser that exposes `document.modelContext`.

# Completed

- Implemented one canonical `AppState` shared by UI, calculations, persistence, snapshots, and WebMCP.
- Implemented manual reassignment, incident, scenario comparison, preview correction, stale-safe apply, and reset.
- Implemented the local SVG/CSS assistant activity timeline and responsive operational UI for the Agent proposal → Human edit → Agent review → Apply lifecycle.
- Added one canonical industry profile registry with profile-aware business identity, role labels, operational copy, palette variables, and avatar accessories.
- Extended `create_schedule_draft` with the optional six-value industry enum while keeping the exact eight-tool contract and shared action path.
- Preserved preview-aware `get_business_state` and added industry/role presentation metadata without changing raw role keys or staffing calculations.
- Added additive snapshot migration for missing `business.industry` (`coffee`) and transactional validation for invalid industry values.
- Extracted the assistant SVG into a ref-based component with CSS ambient motion and native Web Animations API semantic gestures; no animation dependency was added.
- Implemented strict `OWNEROPS_SNAPSHOT v1` round-trip import/export.
- Registered the exact eight-tool imperative WebMCP contract with abort cleanup and JSON Schemas.
- Created and pushed the private GitHub repository.

# Current checkpoint

Adaptive-profile runtime release candidate `857c17f9a0c5ffa2190f3c364cbc7905575e83f9` is locally verified and deployed READY at `https://ownerops-webmcp.vercel.app` through Vercel deployment `dpl_9Srevj6zJ3UNTK4YmmExyo5ZtRN6`. Chrome/WebMCP live validation remains intentionally deferred to a later manual pass.

# Decisions and reasons

- Used native drag/drop plus a keyboard-accessible reassignment dialog to keep dependencies small and the manual workflow testable.
- Kept the Tier-1 local assistant avatar; Rive and 3D were unnecessary for acceptance.
- Used wrapped JSON for portable snapshots because it is deterministic, readable, and easy to validate transactionally.
- Kept internal `barista`/`manager` role keys stable and made industry-specific language presentation-only through profile `roleLabels`.
- Defaulted new demo state to `diner` / Good Shift Diner while migrating older v1 snapshots without `industry` to `coffee` for the deployed Paperthin Cafe-era state.
- Used a single SVG base assistant with small hand-authored profile accessories, CSS idle motion, and reduced-motion-aware WAAPI gestures.

# Verification evidence

- `npm install` — completed; audited 383 packages with no dependency diff retained.
- `npm test` — 19/19 tests passed across 3 files, including profile identity/schema, snapshot migration, preview-aware `get_business_state`, and human-edited preview review/apply coverage.
- `npm run lint` — passed with no findings.
- `npm run typecheck` — passed.
- `npm run build` — passed; `/` generated as a static route.
- `npm audit --omit=dev` — 0 vulnerabilities.
- Local Playwright UI inspection at 1249px, 1024px, 700px, and 600px — incident, exactly 3 scenarios, Agent Proposal attribution, Jiyoung → Hana manual candidate edit, HUMAN EDIT attribution, updated ₩50,000/32 h impact, responsive rail/grid layout, and no application/runtime console errors; only the existing favicon 404 was reported.
- Local Playwright profile inspection — default diner shows Good Shift Diner, Crew/Shift lead, diner copy, and cap/name-tag; pizza shows Slice House, Counter crew, and chef cap; salon shows Cut & Co., Stylist, and salon apron. The shared staffing structure and calculations remain unchanged.
- Deployed Playwright smoke — `https://ownerops-webmcp.vercel.app` returned the OwnerOps UI, Good Shift Diner, published schedule, Crew labels, assistant activity, and scenario UI; refresh succeeded with no application/runtime console errors (favicon 404 only).
- Vercel response inspection — production returned HTTP 200 and `Origin-Agent-Cluster: ?1`; deployment `dpl_9Srevj6zJ3UNTK4YmmExyo5ZtRN6` was READY.
- `tests/integration.test.ts` — shared UI/tool state equivalence, preview-aware live edited-state evaluation, human edit/review/apply lifecycle, exact eight-tool registration, six-value industry schema, role labels, and invalid direct draft rejection covered.
- Source registration check — exactly 8 `document.modelContext.registerTool` calls and the required eight tool names.
- Public-repository audit — root MIT `LICENSE`, no tracked environment files, secret patterns, or local absolute Windows paths.
- Submission assets — `docs/DEVPOST_SUBMISSION.md` and `docs/DEMO_SCRIPT.md` prepared; README release audit updated.

# Not executed

- Live tool invocation from WebMCP-enabled Chrome/ChatGPT browser; intentionally deferred to the later manual pass.
- The canonical deployed WebMCP sequence in a browser exposing `document.modelContext`.
- Public repository switch, YouTube demo, and Devpost submission.

# Blockers

- Live Chrome/WebMCP validation is pending a later manual pass; no live WebMCP invocation was attempted in this adaptive-profile task.
- Deployed WebMCP re-check, public repository switch, video recording, and Devpost submission remain pending the later live pass.

# Modified files

- Runtime/config: existing verified project configuration; no new dependency or deployment configuration was added.
- Application: `src/app/`, `src/components/`, `src/domain/`, `src/state/`, `src/snapshot/`, `src/webmcp/`, `src/styles/`.
- Adaptive profile/assistant additions: `src/industry/profiles.ts`, `src/components/assistant-avatar.tsx`.
- Tests: `tests/`.
- Canonical documentation: `README.md`, `docs/01_PRODUCT_SPEC.md`, `docs/03_UX_DESIGN_SYSTEM.md`, `docs/04_ASSISTANT_AVATAR.md`, `docs/06_DATA_MODEL_AND_RULES.md`, `docs/07_WEBMCP_CONTRACT.md`, `docs/IMPLEMENTATION_STATUS.md`, `HANDOFF.md`.
- Submission preparation: `docs/DEVPOST_SUBMISSION.md`, `docs/DEMO_SCRIPT.md`.

# Next concrete action

Perform the later manual Chrome/WebMCP validation against the deployed URL, repeat the critical deployed WebMCP checks, make the repository public, record the video, and submit to Devpost. Record the browser version and live evidence in the existing release sections. Keep the six profiles as lightweight demo contexts; do not add industry-specific domain engines.
