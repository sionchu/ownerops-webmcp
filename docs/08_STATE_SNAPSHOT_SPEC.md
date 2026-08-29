# 08 — Portable Store Snapshot Spec

## Purpose
Provide explicit backup/restore and portable handoff for OwnerOps StoreState. Snapshot is **not** a live planning transport between normal agent steps.

## SSOT rule
A snapshot is a serialized representation of canonical StoreState truth and is never maintained independently. Transient candidates/activity are not portable truth.

## Version
Portable format: `OWNEROPS_SNAPSHOT v2` with `snapshotVersion: 2`.

During the StoreState RE0 the application model remains `schemaVersion: 1`; snapshot format version and application schema version are intentionally separate. Do not bump the whole application schema merely to change the portable envelope.

The v2 snapshot includes store-operating truth needed to restore the demo:
- store profile/market/occupancy/cost policy inputs;
- people and availability;
- shifts/time entries/incidents;
- sales fixtures;
- menu/recipes;
- inventory/suppliers/received purchases/planned purchase orders/waste;
- tasks/log;
- context/reference observations.

It does **not** persist:
- current staffing preview;
- current multi-domain StorePlan;
- assistant activity;
- derived impact, BEP totals or Daily Brief output.

Those values are recalculated from restored truth.

## Requirements
- version marker required;
- stable IDs required across related entities;
- validation occurs before mutation;
- import is transactional;
- unsupported versions or broken worker/shift references are rejected;
- computed impact/brief is recalculated after restore;
- external reference observations preserve provider/geography/time/unit/freshness and are never upgraded to `live` merely because they were restored;
- secrets/API keys are never serialized.

## v1 migration
Legacy `OWNEROPS_SNAPSHOT v1` is supported through one bounded migration path:
1. parse and validate the legacy business/workers/shifts/demand/incident truth;
2. create the matching deterministic market/industry StoreState seed;
3. overlay the legacy portable truth onto that seed;
4. clear preview/StorePlan and recompute derived state.

A legacy snapshot missing industry/market metadata migrates to the historical legacy defaults (`coffee`, `kr-seoul`). This is compatibility only, not a parallel v1 business model.

## UI
Snapshot controls are visually secondary/admin-like:
- `Copy backup`
- `Restore backup`

Do not position Snapshot as a primary navigation/action competing with the daily operating workspace.

## WebMCP routing
`restore_store_snapshot` is used only when the user explicitly asks to restore/import or provides a snapshot document. Normal analysis/planning uses `get_store_state`, `get_daily_brief`, `plan_store_actions`, and StorePlan preview/review/apply.
