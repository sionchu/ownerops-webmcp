# 05 — Architecture

## Core principle
**One canonical store state, one deterministic domain layer, multiple adapters.**

```text
Human UI ───────────────┐
                        │
WebMCP tools ───────────┼──> Application actions ──> canonical StoreState
                        │             │
Seed/live data adapters ┤             ├──> deterministic store calculations
                        │             ├──> issue prioritization
Snapshot restore ───────┘             ├──> candidate plan materialization
                                      ├──> UI render
                                      ├──> persistence
                                      └──> snapshot serializer
```

The external ChatGPT agent reasons over structured tool outputs. It does not own a private business state. OwnerOps owns validation, deterministic calculations, plan preview, and state transition.

## StoreState domains
The canonical state is conceptually one database with normalized subdomains:

```text
StoreState
├─ store           identity, market, industry, hours, occupancy
├─ people          workers, skills, availability, wage settings
├─ workforce       shifts, attendance, incidents
├─ sales           day/hour/item summaries
├─ catalog         menu/service items and recipes/BOM
├─ stock           inventory, suppliers, purchase history, waste
├─ operations      tasks, manager log, operational events
├─ context         weather, local-event and external reference observations
├─ preview         current multi-domain candidate plan
└─ activity        UI/agent activity state only
```

Computed metrics are derived, not duplicated as authoritative stored truth.

## Prototype persistence strategy
The hackathon prototype may continue using in-browser persistence for the canonical state so the demo has no mandatory backend. Treat it as an embedded prototype database, not as an excuse to mix persistence and domain logic.

The data model must be backend-ready: stable IDs, explicit timestamps, source/provenance fields, normalized units, and no dependence on React component shape.

A future hosted DB can replace the persistence adapter without changing domain actions or WebMCP intent semantics.

## External data adapter rule
External feeds are adapters into normalized **reference observations**, never direct mutations of store actuals.

Required normalized metadata:
- `provider`
- `sourceUrl` or provider key
- `market/geography`
- `observedAt`
- `fetchedAt`
- `unit`
- `value`
- `freshness/status`
- optional `itemReferenceKey`

Examples:
- commodity/wholesale references;
- wage reference;
- weather forecast;
- commercial-rent benchmark;
- local event/demand context.

Every live adapter must have a deterministic fixture fallback. If a provider fails, OwnerOps marks the reference stale/fallback and continues to operate.

## Store-truth hierarchy
Application logic must distinguish:
1. store actual/entered/connected data;
2. committed store plans and recent transactions;
3. external observations;
4. seeded demo fallback.

For example, a supplier receipt at ₩4,200/L is the store's purchase truth even if an external dairy benchmark is lower.

## Candidate plan architecture
The previous staffing-only `StaffingPreview` becomes a generic store plan.

```text
StorePlanPreview
├─ id / version / title / objective
├─ changes[]       typed cross-domain changes
├─ evidence[]      facts/references used
├─ impact          deterministic before/after summary
├─ reviewFlags[]
└─ status          proposed | human_edit | reviewed
```

Initial change types may include:
- staffing assignment/time;
- purchase/reorder quantity;
- prep quantity;
- task create/update;
- stock adjustment proposal;
- shift release/coverage change.

Do not introduce a generic event-sourcing framework. Use an explicit discriminated union of the small set of changes OwnerOps actually supports.

## Incident/event model
A staffing call-out is not a transient UI flag. It is an operational event plus an availability exception. Resolving coverage does not erase the historical fact that the worker was unavailable.

The same rule applies to stockouts, equipment issues, abnormal waste, or task exceptions: current resolution state and historical event are different concepts.

## Layer responsibilities
### `domain/`
Pure/deterministic store models, validation, impacts, prioritization, planning. No React, WebMCP, localStorage, or provider HTTP calls.

### `data/` or provider registries
Industry/market seeds and normalized external-reference adapters. Provider code may fetch data but cannot decide business actions.

### `state/`
Owns canonical StoreState and dispatches shared application actions.

### `components/`
Presentation and user interaction. No copied calculations.

### `webmcp/`
Registers store-level intent tools and translates inputs into the same domain/application actions as UI.

### `snapshot/`
Portable serialization/restore only; never the default live planning path.

## Anti-bloat rules
- Do not create `peopleService`, `inventoryService`, `payrollService`, etc. merely because there are multiple domains.
- Split files by real domain responsibility when a file becomes hard to reason about, not by SaaS menu name.
- One normalized provider registry for external reference sources.
- One industry registry for seed items/roles/tasks.
- One market registry for currency, wage reference, location/timezone, and provider mappings.
- One calculation truth for all UI and WebMCP outputs.

## Security/claim boundary
The prototype can display estimated wages, cost, margin, break-even, and market/rent references. It must not represent them as audited accounting, legal compliance, tax advice, or executable procurement unless a future explicit integration adds those guarantees.
