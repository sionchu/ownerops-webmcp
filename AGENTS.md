# OwnerOps — Codex Operating Contract

This repository is governed by the canonical documents in `docs/`. Read this file first, then the documents below before changing product behavior.

## Mission
Build **OwnerOps — an AI Store Manager for independent small businesses**. The owner speaks naturally; an external ChatGPT/WebMCP agent reads the exact live store state, identifies what matters, prepares coordinated actions, and materializes those actions in the same visual workspace the owner uses.

The canonical café/restaurant demo connects:
- **People** — staff, skills, availability, schedule, attendance, wages.
- **Sales** — sales/orders/item mix and operating demand.
- **Stock** — ingredients, Prep/BOM, inventory, purchase cost, waste, suppliers.
- **Operations** — incidents, tasks, opening/closing checks, manager log.
- **Context & Costs** — weather/events, occupancy, market price references, BEP/FL Cost.

Signature flow: **read live store → prioritize issues → plan actions → preview → human edit/review → apply**.

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
17. `docs/16_AGENT_OPERATING_MANUAL.md`

## Non-negotiable engineering rules
- Preserve **one business truth**. PostgreSQL/Supabase is durable canonical persistence; browser `StoreState` is a working projection used by UI/WebMCP.
- Do not create separate agent truth, chat truth, inventory truth, payroll truth, snapshot truth, or external-price truth.
- Human UI actions and WebMCP actions use the same deterministic domain/application-action path.
- Preview `StorePlan` is not committed truth until reviewed/applied.
- Natural-language reasoning belongs to the external agent. Validation, calculations, planning impact, materialization, and state transitions belong in deterministic TypeScript.
- WebMCP tools are store-level user intents, not DB/calculator micro-tools.
- Store actuals outrank all references: supplier invoice, stock count, wage, attendance, lease, sales and availability are authoritative.
- External data is cached **reference/context**. Every observation carries provider, geography, unit, observed/fetched time, confidence/freshness and source provenance.
- Runtime is **cache-first**. Do not make arbitrary web/API calls for every owner question. Provider sync writes raw/normalized observations; runtime reads DB cache and falls back to deterministic seed when unavailable.
- Preserve the three-tier external price pipeline: `raw → normalized → effective/reference`. Never mix it with store purchase truth.
- Procurement form matters. Whole/raw, trimmed/fillet, cooked/prepped and packaged forms can have different yields.
- Support `ingredient → Prep → Menu BOM`; do not flatten intermediate prep costs into magic menu constants.
- Backend/service credentials stay server-side. Browser code must not receive Supabase service-role keys or provider secrets.
- Stateful changes use preview/review/apply when they materially affect staffing, purchasing, prep or tasks.
- Do not turn OwnerOps into payroll filing, tax, bookkeeping, ATS, LMS, or legal-compliance software.
- Avoid menu-per-feature SaaS bloat. Capabilities broaden while the primary UI remains an operating command center.
- Prefer editing canonical artifacts over adding `v2`, `new`, `final`, duplicate registries, or wrapper-on-wrapper abstractions.

## Execution authorization / setup permissions
The owner prefers execution to continue through ordinary setup instead of stopping on conservative permission assumptions.

- **Do not invent blockers or approval gates the owner did not request.** Once a task is approved, treat ordinary setup required to complete that task as authorized.
- If a required third-party organization, project, database, development environment, branch, preview resource, or equivalent task-scoped resource does not exist, create the **minimum necessary** resource under the user's authorized account instead of stopping solely because it is absent.
- It is acceptable to install required CLIs/dependencies, link an authenticated account, create a task-scoped project, choose a reasonable non-destructive region/name/default, initialize schemas, and grant the **minimum permissions/scopes necessary** to finish the approved task.
- If interactive login, MFA, CAPTCHA, passkey, device confirmation, or another human-only authentication step is required, start/open that flow and ask the user to complete **only that step**. After authentication succeeds, resume the original task automatically; do not ask for permission again to continue the already-approved work.
- Prefer using an existing suitable organization/project/resource when clearly available. If none exists, creating a new task-scoped one is allowed unless the user explicitly prohibited creation.
- Never request that secrets be pasted into chat when they can be entered through the provider UI, environment variables, secret manager, CLI login, or another protected input path.
- Never expose service-role keys, API secrets, passwords, recovery codes, or private tokens in commits, logs, screenshots, browser bundles, or user-visible output.
- **Do stop** before actions that create an unapproved financial charge or paid-plan upgrade, delete or irreversibly overwrite unrelated user data, transfer ownership, weaken security beyond the minimum required scope, publish/private-share resources contrary to the user's stated intent, or require accepting materially consequential legal/commercial terms on the user's behalf.
- Free-tier/task-scoped resource creation, normal authentication, schema initialization, and minimal configuration are **setup actions, not reasons to stop**.
- When an external environment genuinely makes progress impossible, report the precise blocker only after attempting the reasonable authorized setup path.

## Backend/data boundary
Current persistence target:
- Supabase/PostgreSQL tables under `oo_*` from `supabase/migrations/`.
- Next.js server repositories/routes are the application backend.
- `scripts/fnb-data-sync.mjs` performs offline/scheduled provider ingestion and can persist raw/normalized observations when DB credentials exist.
- Deterministic seed data remains a demo/failure fallback, not the production source of truth.

Future extraction is allowed only when evidence justifies it: Python/dlt/FastAPI may become a separate ingestion platform, but do not duplicate the current TypeScript domain or WebMCP business logic.

## Verification discipline
Before declaring completion:
1. run tests;
2. run lint;
3. run typecheck;
4. run production build;
5. re-read the final diff;
6. remove dead/duplicate artifacts;
7. verify DB-unconfigured and reference-provider-failure fallbacks;
8. verify DB-cached reference hydration when configured;
9. manually run the canonical natural-language demo in a WebMCP-capable browser when available.

Do not claim a check passed unless it was actually run.
