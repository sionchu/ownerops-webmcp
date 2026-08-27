# 14 — Codex Execution Plan

## Runtime strategy
Use the highest-quality coding/reasoning model available. If GPT-5.6 Sol with high reasoning is available in the Codex environment, use it. Do not lower quality to save tokens during the initial overnight build.

## Operating style
Work autonomously through the milestones. Do not stop for cosmetic choices that can be resolved from the design docs. If a true blocker exists (missing permission/authentication for an external action), complete all local work first and record the blocker precisely.

## Milestone 0 — repository/bootstrap
- Read all docs.
- Initialize app in repository root without deleting docs.
- Configure scripts: dev, test, lint, typecheck, build.
- Ensure `.gitignore` is correct.
- Initialize git if needed.
- If GitHub CLI is authenticated, create/push private repo `ownerops-webmcp` (or use `REPO_NAME` env override). If not authenticated, keep local git clean and report exact push command.
- Commit spec/bootstrap separately.

## Milestone 1 — canonical state/domain
- Implement types and demo fixture.
- Implement deterministic hours/payroll/labor-ratio/coverage/warning calculations.
- Implement state provider/reducer/actions.
- Implement localStorage.
- Add domain tests.

## Milestone 2 — operational UI
- Implement schedule grid.
- Implement drag/drop or equivalent clear manual reassignment.
- Implement business context summary.
- Implement absence/uncovered state.
- Apply visual rules from `03_UX_DESIGN_SYSTEM.md`.

## Milestone 3 — scenario/preview flow
- Generate exactly three demo response options.
- Scenario comparison UI.
- Preview state/diff.
- Apply/reject.
- Ensure manual edits and preview share same calculations.

## Milestone 4 — assistant rail/avatar
- Implement Tier-1 2.5D SVG/CSS assistant first.
- Semantic states from `04_ASSISTANT_AVATAR.md`.
- Add Rive only if it can be done without threatening milestones 5–7.
- Do not add full 3D unless the core product is already complete and verified.

## Milestone 5 — snapshot portability
- Serialize/parse.
- Copy/import UI.
- localStorage persistence.
- Round-trip tests.

## Milestone 6 — WebMCP
- Implement 8-tool contract.
- Use current `document.modelContext.registerTool` imperative API.
- WebMCP handlers call shared application actions/domain functions.
- Add graceful unsupported-browser path.
- Verify tool definitions in source and in a capable browser if available.

## Milestone 7 — polish and verification
- Responsive desktop judging view.
- Empty/error/loading states.
- `prefers-reduced-motion`.
- Test/lint/typecheck/build.
- Manual canonical demo.
- Remove dead code/deps.
- Review against all ACs.

## Milestone 8 — documentation/deployment prep
- Complete README run/test/WebMCP instructions.
- Add screenshots only if generated from actual app.
- Keep GitHub private for development.
- Prepare deployment instructions and final public-repo gate.
- Update `IMPLEMENTATION_STATUS.md`.

## Commit discipline
Use coherent commits by milestone. Avoid a single giant “done” commit if possible.

## Stop condition
The task is complete when all feasible acceptance criteria pass and the repository is in a clean, documented state. Do not add future-vision features to fill remaining time.
