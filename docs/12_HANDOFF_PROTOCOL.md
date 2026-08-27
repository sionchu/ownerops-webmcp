# 12 — ChatGPT ↔ Codex Handoff Protocol

## Goal
Future changes should be made against repository documents, not against fading chat memory.

## Authoritative artifacts
- Product truth: `00_PROJECT_CHARTER.md`, `01_PRODUCT_SPEC.md`
- User/stakeholder truth: `02_STAKEHOLDERS_AND_JTBD.md`
- Visual truth: `03_UX_DESIGN_SYSTEM.md`, `04_ASSISTANT_AVATAR.md`
- Architecture/data truth: `05_ARCHITECTURE.md`, `06_DATA_MODEL_AND_RULES.md`
- WebMCP truth: `07_WEBMCP_CONTRACT.md`
- Portability truth: `08_STATE_SNAPSHOT_SPEC.md`
- Done definition: `09_ACCEPTANCE_TESTS.md`
- Research: `10_REFERENCE_RESEARCH.md`
- Submission truth: `11_DEVPOST_SUBMISSION.md`
- Review rules: `13_PAPERTHIN_REVIEW.md`
- Execution: `14_CODEX_EXECUTION_PLAN.md`
- Decisions: `15_DECISION_LOG.md`

## When the user changes a requirement
1. Update the relevant canonical MD first.
2. Update `15_DECISION_LOG.md` with what changed and why.
3. Then implement code changes.
4. Do not create `*_v2.md`, `new_*`, or parallel specs.

## When asking ChatGPT for review
Provide the repository or changed files. ChatGPT should:
- read canonical docs first,
- reconstruct actual implementation from code,
- compare behavior to acceptance criteria,
- report KEEP/REMOVE/MERGE/RE0 findings,
- recommend one next best action.

## When asking Codex for a change
Reference exact docs and acceptance criteria, e.g.:
“Implement AC8 from `docs/09_ACCEPTANCE_TESTS.md` according to preview semantics in `docs/07_WEBMCP_CONTRACT.md`. Do not change scope.”

## Progress file
Codex should maintain a short `docs/IMPLEMENTATION_STATUS.md` during the build with:
- completed acceptance criteria,
- current failing checks,
- unresolved blocker only if real,
- latest commit SHA.
This file is status, not a second product spec.
