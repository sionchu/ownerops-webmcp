# 00 — Project Charter

## Product
**OwnerOps** — an AI operations copilot for small-business owners with hourly staff.

## Canonical problem
An owner already has a working weekly schedule. A last-minute absence occurs. The owner must quickly decide how to recover while balancing staffing coverage, labor cost, work-hour warnings, and expected business demand.

## Canonical user
Owner/manager of a café or small restaurant with roughly 5–15 hourly staff.

## Why WebMCP
The owner wants a visual schedule they can manipulate directly. The agent should not guess rows, cells, and drag targets from a screenshot. The page exposes structured, stateful operations through WebMCP while reusing the exact same application logic as the human UI.

## Hackathon success statement
A judge should understand within 30 seconds that:
- a human changed the schedule directly,
- the agent understood the exact updated state,
- the agent compared concrete alternatives,
- the user retained control through preview/apply,
- the experience would be slower and less reliable with screenshot-driven browser automation.

## Product vision, not MVP scope
OwnerOps can later become a broader small-business operations layer for demand changes, reservations, staffing disruptions, and labor-cost pressure. That vision belongs in the pitch, not in the implementation backlog for this hackathon.

## Frozen MVP boundaries
### In
- Weekly schedule grid.
- Chat/agent-created rough schedule draft.
- Manual drag/drop editing.
- Worker unavailability/absence.
- Exactly three staffing response scenarios for the canonical incident.
- Estimated labor-cost delta.
- Weekly hours and a small set of rule warnings.
- Expected sales context and labor-cost ratio.
- Candidate preview before commit.
- Apply/reject flow.
- Assistant activity rail with functional avatar/status.
- One canonical app state.
- `localStorage` persistence.
- Portable text schedule snapshot import/export.
- WebMCP tool surface defined in `07_WEBMCP_CONTRACT.md`.

### Out
- Payroll statements.
- Attendance/time clock.
- Tax/accounting/bookkeeping.
- Inventory.
- POS integration.
- External replacement-worker marketplace.
- Notifications/Kakao/SMS/email.
- Authentication/multi-tenant accounts.
- Nurse/manufacturing/airline modes.
- Full labor-law compliance engine.
- AI sales forecasting.
- External LLM inside the web app.
- Backend MCP server.
- Database.
- Constraint optimization solver.
