# 15 — Decision Log

## Historical decisions retained
### D001 — Product category (superseded in scope, retained in principle)
OwnerOps began as an operational decision workbench/copilot rather than a generic scheduler. The “decision workbench” principle remains, but the domain is now broader store operations.

### D004 — Human-agent model — KEEP
Human edits visually; external agent uses WebMCP structured tools; both share one canonical application state.

### D005 — Preview before apply — KEEP
Consequential recommendations are previewed before explicit commit.

### D010 — Assistant visual — KEEP
Assistant rail/avatar remains functional/status-driven rather than a duplicate chat client.

### D011 — Design references — KEEP
Calm information density and contextual actions remain preferred over AI-dashboard tropes.

### D013 — Development governance — KEEP
Canonical MD files are SSOT. Requirement changes update docs first, then code. No parallel specs.

### D015 — Reviewed apply guard — KEEP / GENERALIZE
The human-edit → exact agent review → explicit apply guard extends from staffing previews to generic StorePlan previews.

## RE0 decisions — 2026-08-30
### D017 — Product RE0: AI Store Manager
OwnerOps is now an **AI Store Manager for independent small businesses**, not a staffing-only product. The primary job is to tell the owner what matters now and coordinate reviewable operating actions across People, Sales, Stock, Operations, Context and Costs.

### D018 — Staffing-only AppState is a RE0 candidate
The current single-incident staffing model is not extended by adding side modules. Replace it coherently with StoreState v2 while preserving the one-state/one-action invariant.

### D019 — Capability broad, UI surface narrow
Do not build separate Payroll, Recruiting, Compliance, Inventory, Messaging and Tasks applications merely because the capabilities exist. Surface evidence/actions in the current operating context; add history/admin views only when necessary.

### D020 — Store actuals outrank external references
Actual worker wage, availability, time entry, inventory count, supplier purchase cost, sales and lease terms are authoritative. External commodity/rent/weather data is contextual evidence with provenance/freshness and never silently overwrites store truth.

### D021 — Realistic industry seed catalogs
Each industry has realistic bounded staff roles/skills, menu/service fixture, inventory purchased items, tasks and operating vocabulary. Use one industry registry plus one market registry, not 30 duplicated full-store fixtures.

### D022 — Worker profile is canonical scheduling constraint
Worker profile includes employment type, skills/role, hourly rate, regular availability, one-time exceptions, preferred weekly hours and max weekly hours. Full-week plans must respect hard constraints and penalize needless published-schedule disruption.

### D023 — Incident is history + current resolution
A call-out creates a durable availability exception and operational incident record. Recovering coverage may resolve the incident; it does not erase the fact or make the UI offer the same fresh incident action again.

### D024 — Scheduled wage vs actual wage estimate
OwnerOps distinguishes scheduled shift wage estimate from attendance/time-entry-based actual wage estimate. Neither is positioned as a statutory payroll statement.

### D025 — Inventory economics
Inventory state includes on-hand/par/reorder/lead time, supplier and purchase history, recipe linkage and waste. Agent may compute days-of-cover, theoretical usage, variance, reorder and purchase-price evidence.

### D026 — External commodity source registry
Preferred public sources include KAMIS (Korea), USDA AMS MyMarketNews (US), MAFF wholesale statistics (Japan), MAPA origin-wholesale system (Spain) and China MOA agricultural wholesale data. Use only defensible item/unit/geography mappings; unmatched SKUs receive no fake benchmark.

### D027 — Weather is context with deterministic fallback
A live weather adapter is allowed, but the demo must remain deterministic when unavailable. Weather can inform a recommendation but is not treated as a guaranteed demand forecast.

### D028 — Occupancy cost is fixed-cost truth
Store lease base rent/recurring fees are stored as operating truth. External rent data is benchmark/trend only. OwnerOps may provide occupancy ratio and simple break-even/rent-escalation planning, not audited accounting or lease valuation.

### D029 — Generic StorePlan
Replace staffing-only preview with a small discriminated union of supported store changes. Initial changes: staffing, shift release, purchase, prep and task. Avoid a generic workflow engine.

### D030 — Daily Brief is the primary proactive experience
The canonical natural-language entry is “오늘 장사 준비해줘” / “오늘 내가 알아야 할 것만 말해줘.” OwnerOps returns 3–5 prioritized evidence-backed issues and can prepare a coordinated plan.

### D031 — WebMCP contract may change
The prior exact eight-tool count is not a product requirement. Target nine store-intent tools from `07_WEBMCP_CONTRACT.md`, migrated coherently without duplicate old/new business logic.

### D032 — Snapshot demoted to backup/restore
Snapshot remains useful for portability/recovery but is not a primary live planning path or prominent operating action.

### D033 — Prototype persistence remains replaceable
A mandatory backend/database is not required for the hackathon. In-browser canonical persistence is acceptable as an embedded prototype database if the StoreState model is backend-ready and external adapters are cleanly separated.

### D034 — External integration honesty
The prototype must not claim a real supplier order, message, payroll transfer, tax filing or other external side effect unless that integration actually exists. `Apply` commits supported OwnerOps StoreState changes only.
