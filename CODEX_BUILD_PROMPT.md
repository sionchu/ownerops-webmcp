# Codex Build Prompt — OwnerOps WebMCP Challenge

Use this as the primary Codex task prompt after opening the repository.

---

You are the implementation engineer for **OwnerOps**, a WebMCP Challenge project.

## Model / effort
Use GPT-5.6 Sol with **high reasoning** if that option is available in this Codex environment. Otherwise use the strongest available coding model with high/xhigh reasoning. Optimize for correctness, product coherence, and frontend quality rather than token economy.

## First action
Read `AGENTS.md`, then read every document in `docs/` in the required order. Do not begin implementation before understanding the frozen scope, acceptance criteria, visual rules, and WebMCP contract.

## Mission
Implement the complete hackathon MVP described in the repository docs. This is a real working web app, not a static mockup.

## Critical constraints
- The product scope is frozen.
- Do not invent “helpful” features outside the docs.
- Do not build a backend, database, authentication, external LLM call, RAG, vector DB, external MCP server, payroll integration, POS integration, notification system, or optimization solver.
- Maintain exactly one canonical `AppState`.
- Human UI and WebMCP must use the same domain/application actions.
- WebMCP must use actual `document.modelContext.registerTool` code and current official API behavior.
- Deliver a credible, restrained operations UI. Avoid AI-slop aesthetics.
- Assistant avatar is a functional state surface. Ship local SVG/CSS 2.5D first; Rive only as optional enhancement after core acceptance criteria pass.
- Prefer existing files over parallel helpers. Never create `v2`, `new`, `final`, or “temporary compatibility” implementations unless genuinely required.

## Design quality bar
Use `docs/03_UX_DESIGN_SYSTEM.md` and `docs/10_REFERENCE_RESEARCH.md` as the visual brief.
Target the calm density/hierarchy of Linear and the schedule clarity of Homebase without copying branding.
The schedule is the dominant workspace. The assistant rail is secondary.
Do not use giant KPI cards, glassmorphism, purple gradients, sparkle icons, neon AI orbs, or a landing-page-like app shell.

## Implementation order
Follow `docs/14_CODEX_EXECUTION_PLAN.md` milestone by milestone.
After each milestone:
1. run relevant tests/checks,
2. inspect diff,
3. remove accidental bloat,
4. make a coherent git commit when possible,
5. update `docs/IMPLEMENTATION_STATUS.md` concisely.

## Git / private remote
- Initialize git if this handoff folder is not already a repository.
- Commit the initial spec before large code changes.
- If `gh auth status` succeeds and there is no remote, create a **private** repository named `ownerops-webmcp` (or `$REPO_NAME` if provided), set `origin`, and push.
- Do not make the repo public during this build.
- If GitHub auth is unavailable, continue all local work and write exact commands needed to push later. Do not stop implementation.

## WebMCP verification
Use the current official references listed in the docs if internet access is available. Ensure source contains explicit `document.modelContext.registerTool` registrations and tool handlers reuse shared logic.
Where WebMCP is unsupported, the normal human UI must still work and the page should fail gracefully.

## Completion
Do not stop after scaffolding or a pretty first screen. Continue until feasible acceptance criteria in `docs/09_ACCEPTANCE_TESTS.md` pass.
Then run:
- tests,
- lint,
- typecheck,
- production build,
- final diff review,
- dead-code/dependency cleanup.

Perform the canonical demo manually if browser/computer-use access is available.

## Final report
Update `docs/IMPLEMENTATION_STATUS.md` with:
- completed ACs,
- checks and exact results,
- live/private repo status,
- any real blocker,
- latest commit SHA.

Then give a concise final Codex response with what was built, verification results, and only genuine remaining blockers. Do not propose additional features.
