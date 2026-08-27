# 08 — Portable State Snapshot Spec

## Purpose
Allow an owner to copy the current OwnerOps state into a future ChatGPT conversation or another browser session without requiring backend persistence.

## SSOT rule
The snapshot is a serialized representation of canonical AppState. It is never maintained independently.

## Format goals
- human-readable,
- agent-readable,
- deterministic,
- versioned,
- easy to paste,
- strict enough to round-trip safely.

## Recommended format
Use a plain-text versioned document or a compact JSON block wrapped in human labels. Example:

```text
OWNEROPS_SNAPSHOT v1
BUSINESS
name: Paperthin Cafe
employee_count: 6
target_labor_ratio: 0.22

WORKER
id: minsoo
name: Minsoo
role: barista
hourly_rate: 13000

SHIFT
id: fri-minsoo-18
worker_id: minsoo
start: 2026-08-28T18:00
end: 2026-08-28T22:00
role: barista
status: scheduled

DEMAND
2026-08-28 expected_sales: 2400000
peak: 19:00-21:00 min_coverage=2
END_OWNEROPS_SNAPSHOT
```

Choose the simplest robust format and document it.

## Requirements
- `schemaVersion`/version marker required.
- Stable worker and shift IDs required.
- Computed values do not need to be authoritative; recompute after import.
- Parser rejects unsupported versions and malformed required fields.
- Import is transactional: validate first, mutate second.
- Round-trip test: `parse(serialize(state))` preserves snapshot-governed state.

## UI
Provide:
- `Copy snapshot`
- `Import snapshot`

Local persistence and snapshot serve different purposes:
- localStorage = same-browser convenience.
- snapshot = portable handoff between chats/sessions/devices.
