# OwnerOps — Codex Operating Contract

This repository is governed by the documents in `docs/`. Read this file first, then read the documents in the order listed below before making code changes.

## Mission
Build a polished WebMCP hackathon product called **OwnerOps**: an operations copilot for small-business owners who manage hourly staff. The canonical demo is a last-minute staffing disruption in a café. The human edits a real schedule UI; the agent reads and acts on the same application state through WebMCP; the product compares operational and labor-cost impact before the human commits a change.

## Required reading order
1. `docs/00_PROJECT_CHARTER.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_STAKEHOLDERS_AND_JTBD.md`
4. `docs/03_UX_DESIGN_SYSTEM.md`
5. `docs/04_ASSISTANT_AVATAR.md`
6. `docs/05_ARCHITECTURE.md`
7. `docs/06_DATA_MODEL_AND_RULES.md`
8. `docs/07_WEBMCP_CONTRACT.md`
9. `docs/08_STATE_SNAPSHOT_SPEC.md`
10. `docs/09_ACCEPTANCE_TESTS.md`
11. `docs/10_REFERENCE_RESEARCH.md`
12. `docs/11_DEVPOST_SUBMISSION.md`
13. `docs/12_HANDOFF_PROTOCOL.md`
14. `docs/13_PAPERTHIN_REVIEW.md`
15. `docs/14_CODEX_EXECUTION_PLAN.md`
16. `docs/15_DECISION_LOG.md`
17. `docs/16_FNB_COST_DATA_FOUNDATION.md`

## Non-negotiable engineering rules
- **Scope is frozen.** Do not invent features because they look useful.
- Prefer editing an existing canonical artifact over adding another helper, wrapper, manager, service, `v2`, `new`, `final`, or parallel implementation.
- One canonical `AppState` is the source of truth for UI, calculations, persistence, snapshot serialization, and WebMCP tools.
- Human UI actions and WebMCP actions must call the **same domain actions**. Never implement a second agent-only business-logic path.
- Domain calculations must be deterministic TypeScript. Do not use an LLM API inside the app.
- Do not add a backend, database, auth, RAG, vector DB, external MCP server, OR solver, POS integration, payroll provider, weather API, or messaging integration for the hackathon MVP.
- `localStorage` is allowed for convenience; the portable schedule snapshot is the cross-session/cross-chat handoff mechanism.
- WebMCP tools are user-intent tools, not micro-helpers. Do not expose `calculateFoo` for every calculation.
- Treat labor-rule results as **warnings/estimates**, not legal compliance guarantees.
- Avoid “AI SaaS” visual tropes: excessive gradients, glassmorphism, giant KPI cards, sparkle icons, floating neon orbs, mascot-first layouts, and gratuitous rounded cards.
- The assistant avatar is a functional activity/status surface, not a decorative character.
- If an external animated avatar asset would block progress, ship a high-quality local SVG/CSS 2.5D avatar first. Rive is an enhancement, not a dependency on the critical path.
- Use real sample values and visible before/after outcomes so the demo feels operational, not conceptual.

## Verification discipline
Before declaring completion:
1. Run tests.
2. Run lint.
3. Run type check.
4. Run production build.
5. Re-read the final diff.
6. Remove unused files, dependencies, duplicate constants, stale comments, and temporary workarounds.
7. Test the canonical demo manually in browser.
8. Test WebMCP with the supported browser environment if available.

Do not claim a check passed unless it was actually run.
