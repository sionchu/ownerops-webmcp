# 12 — ChatGPT ↔ Codex Handoff Protocol

## Goal
Future changes are made against canonical repository truth, not fading chat memory.

## Authoritative artifacts
- Product truth: `00_PROJECT_CHARTER.md`, `01_PRODUCT_SPEC.md`
- User/JTBD truth: `02_STAKEHOLDERS_AND_JTBD.md`
- Visual truth: `03_UX_DESIGN_SYSTEM.md`, `04_ASSISTANT_AVATAR.md`
- Architecture/data truth: `05_ARCHITECTURE.md`, `06_DATA_MODEL_AND_RULES.md`
- WebMCP truth: `07_WEBMCP_CONTRACT.md`
- Portability truth: `08_STATE_SNAPSHOT_SPEC.md`
- Done definition: `09_ACCEPTANCE_TESTS.md`
- Research: `10_REFERENCE_RESEARCH.md`
- Submission: `11_DEVPOST_SUBMISSION.md`
- Review rules: `13_PAPERTHIN_REVIEW.md`
- Execution: `14_CODEX_EXECUTION_PLAN.md`
- Decisions: `15_DECISION_LOG.md`
- **Natural-language Agent behavior and seed interpretation: `16_AGENT_OPERATING_MANUAL.md`**

## When the user changes a requirement
1. Update the relevant canonical MD first.
2. Update `15_DECISION_LOG.md` when the change affects product/architecture boundaries.
3. Update `16_AGENT_OPERATING_MANUAL.md` if natural-language routing/evidence/review behavior changes.
4. Then implement code changes.
5. Do not create `*_v2.md`, `new_*`, `final_*`, or a parallel product spec.

## When adding external data
Document first:
- what is store truth vs reference;
- provider/source;
- geography/unit/freshness;
- fallback behavior;
- unsupported mappings.

Then implement the provider adapter. Do not let HTTP/provider code calculate recommendations independently.

## When asking ChatGPT for review
Provide repository/files. Review should:
- read canonical docs first;
- inspect actual code;
- compare behavior to acceptance criteria;
- classify KEEP/REMOVE/MERGE/RE0 and P0/P1/P2;
- identify one Next Best Action.

## When asking Codex for a change
Reference exact milestone/acceptance criteria, e.g.:
> “Implement Milestone 1 from `docs/14_CODEX_EXECUTION_PLAN.md` and AC1–AC4 from `docs/09_ACCEPTANCE_TESTS.md`. Preserve the StoreState/actual-vs-reference rules in `docs/06_DATA_MODEL_AND_RULES.md`.”

## Progress file
`docs/IMPLEMENTATION_STATUS.md` may contain:
- completed ACs/milestones;
- current failing checks;
- real blockers;
- latest commit SHA.

It is status only, never a second product spec.
