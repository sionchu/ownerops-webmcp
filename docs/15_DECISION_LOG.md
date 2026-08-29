# 15 — Decision Log

## D001 — Product category
OwnerOps is an **operational decision workbench/copilot**, not a generic employee scheduler or accounting suite.

## D002 — Canonical vertical
Hackathon demo targets a café/small restaurant with 5–15 hourly workers. Other verticals are future narrative only.

## D003 — Canonical incident
Last-minute worker unavailability for an already-published shift.

## D004 — Human-agent model
Human edits visually; agent uses WebMCP structured tools; both share one canonical application state.

## D005 — Preview before apply
Staffing recommendations are previewed before explicit user commit.

## D006 — Money context
Expected sales and labor-cost ratio are included because they turn a staffing tool into an owner operations decision tool. Full P&L/accounting is excluded.

## D007 — Draft schedule generation
A rough schedule can be created via agent/tool for onboarding. It is not positioned as an optimal automatic scheduler.

## D008 — Portable snapshot
Current schedule/business state can be exported/imported as text so future ChatGPT conversations can resume without server persistence.

## D009 — Persistence
Use localStorage for same-browser convenience; snapshot for portable handoff. No backend DB.

## D010 — Assistant visual
Use an assistant activity rail. Avatar is functional/status-driven. Tier-1 local 2.5D SVG/CSS is required fallback; Rive optional; full Spline 3D not on critical path.

## D011 — Design references
Use Linear for density/hierarchy and Homebase for scheduling semantics. Avoid AI-template visual tropes.

## D012 — WebMCP surface
Eight user-intent tools. Internal calculators remain internal.

## D013 — Development governance
Canonical MD files are SSOT. Future ChatGPT/Codex changes update docs first, then code. No parallel spec versions.

## D014 — Git visibility
Develop in private repository; make public only for final Devpost requirement after secret/license/runbook audit.

## D015 — Reviewed apply guard
Applying a staffing preview requires the canonical activity state to be `reviewed`. This preserves the human-edit → exact agent review → explicit apply workflow in every adapter, including WebMCP.

## D016 — Industry visual token refinement
The six presentation profiles use the shared industry token specification for canvas, surfaces, state-safe accents, incident-lane focus, rail glow, shape language, motif opacity, and theme timing. These values are consumed only by the UI layer; staffing data, calculations, snapshots, and WebMCP remain unchanged.

## D017 — F&B cost-data boundary
External food-price and merchant data may be added as an **offline/prebuild read-only context**. The hackathon runtime keeps its no-backend constraint, and canonical staffing `AppState` remains unchanged. Source adapters must write normalized snapshots outside staffing state; any future Supabase/Postgres or POS integration is post-MVP and must preserve provenance, deterministic calculations, and the existing application-action/WebMCP boundary.
