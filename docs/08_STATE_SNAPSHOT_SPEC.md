# 08 — Portable Store Snapshot Spec

## Purpose
Provide explicit backup/restore and portable handoff for OwnerOps StoreState. Snapshot is **not** a live planning transport between normal agent steps.

## SSOT rule
A snapshot is a serialized subset of canonical StoreState and is never maintained independently.

## Version
New RE0 target: `OWNEROPS_SNAPSHOT v2` / `schemaVersion: 2`.

The v2 snapshot may include store-operating truth needed to restore the demo:
- store profile/market/occupancy;
- people and availability;
- shifts/time entries/incidents;
- sales fixtures;
- menu/recipes;
- inventory/suppliers/purchases/waste;
- tasks/log;
- context/reference observations where portability is useful.

Do **not** treat computed totals or current WebMCP tool output as authoritative snapshot fields when they can be recalculated.

## Requirements
- version marker required;
- stable IDs required across related entities;
- validation occurs before mutation;
- import is transactional;
- unsupported versions or broken references are rejected;
- computed impact/brief is recalculated after restore;
- current candidate preview is normally cleared after restore unless v2 explicitly defines safe preview persistence;
- external reference observations preserve provenance/freshness labels but are never upgraded to `live` on restore;
- secrets/API keys are never serialized.

## UI
Snapshot controls should be visually secondary/admin-like:
- `Copy backup`
- `Restore backup`

Do not position Snapshot as a primary navigation/action competing with the daily operating workspace.

## WebMCP routing
`restore_store_snapshot` is used only when the user explicitly asks to restore/import or provides a snapshot document. Normal analysis/planning uses `get_store_state`, `get_daily_brief`, and planning tools.

## Migration
During RE0, either:
1. provide one explicit v1 staffing-snapshot migration into the new StoreState seed shape; or
2. reject v1 with a clear message if migration would add disproportionate compatibility code.

Choose the smaller coherent path and test it. Do not maintain parallel v1/v2 business models.
