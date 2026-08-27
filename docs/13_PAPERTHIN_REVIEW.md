# 13 — Paperthin / Clean-v0 Review Rules

## Review question
For any important subsystem ask:
> If we had known the current requirements from day one, would we have built it this way?

If no, mark a bounded RE0 candidate instead of piling another patch layer on top.

## Classifications
- **KEEP** — odd-looking but justified by actual behavior/evidence.
- **REMOVE** — confirmed unused or no longer valuable.
- **MERGE** — duplicate responsibility or duplicate truth.
- **RE0** — working area whose current structure mainly expresses patch history rather than current requirements.

## Priorities
- **P0** correctness/data/security/runtime failure.
- **P1** structural problems that raise future change cost.
- **P2** safe cleanup.

## Audit targets
- duplicate files/helpers,
- `new/v2/final/refactored` parallel implementations,
- duplicated constants/rules,
- stale code/config/docs,
- wrapper-on-wrapper abstraction,
- unused dependencies,
- tests that assert implementation trivia instead of user behavior,
- WebMCP business logic duplicated from UI logic,
- snapshot becoming independent state,
- avatar animation state leaking into business state,
- unnecessary compatibility layers.

## Codex end-of-task cleanup
Before final response:
1. inspect `git diff`,
2. remove accidental files/deps,
3. search for dead code/TODOs created by the task,
4. confirm docs still match code,
5. run verification commands,
6. update only `IMPLEMENTATION_STATUS.md` and decision log when appropriate.
