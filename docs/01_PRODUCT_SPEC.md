# 01 — Product Spec

## Product promise
When a staffing disruption happens, OwnerOps helps the owner answer: **“What should I do now, and what will each choice cost or break?”**

## Primary workflow
### A. Start / create
The app may start with demo data or an empty/demo-reset state. The agent can create a rough weekly schedule from a structured instruction. This is onboarding, not an “optimal schedule generator.”

### B. Human edit
The owner edits shifts directly in the schedule grid. The impact panel updates from the canonical state.

### C. Ask / evaluate
The owner asks the agent whether the current edited plan is acceptable. WebMCP reads the exact current state and returns concise operational impact.

### D. Incident
Minsoo becomes unavailable Friday 18:00–22:00. The UI visibly marks the uncovered shift.

### E. Options
The application can produce exactly three deterministic response scenarios. Each scenario shows:
- staffing/coverage outcome,
- estimated payroll delta,
- affected worker weekly hours,
- warning status,
- labor-cost ratio or demand trade-off,
- number of schedule changes.

### F. Preview
A scenario can be shown as a candidate change without committing it. Visual differentiation must be obvious and restrained: ghost/outlined shift, diff row, or “Preview” state.

### G. Human correction
The owner can alter the candidate manually, e.g. reject Younghee as unavailable or drag another worker into the slot.

### H. Re-evaluate
The agent evaluates the owner’s manual edit using the same state/domain logic.

### I. Apply
Only an explicit apply action commits a previewed staffing change.

### J. Preserve
The current schedule/business context can be serialized to a portable text snapshot. A later conversation can paste it back to reconstruct the application state. The snapshot is transport, not a second source of truth.

## Required demo fixture
Use a believable Korean café/restaurant sample with 4–6 named workers and explicit hourly rates. Keep names and numbers stable so the video and tests can assert outcomes.

Suggested workers:
- Minsoo — Barista — ₩13,000/h
- Jiyoung — Barista — ₩12,000/h
- Younghee — Manager — ₩15,000/h
- Chulsoo — Barista — ₩12,000/h
- Hana — Barista — ₩12,500/h

Suggested incident:
- Friday 18:00–22:00 Minsoo becomes unavailable.

Suggested business context:
- Friday expected sales: ₩2,400,000
- Target labor-cost ratio: 22%
- Peak window: 19:00–21:00

## Product copy principles
- Speak like an operations tool, not a chatbot toy.
- Prefer “Preview staffing change” over “AI magic suggestion.”
- Prefer “Estimated labor cost” over “Savings guaranteed.”
- Prefer “Work-rule warning” over “Legal violation.”
- Explain why a scenario is recommended in one or two concrete sentences.

## Empty / error states
- Missing browser WebMCP support: show a quiet developer/test notice, not a broken app.
- No valid replacement: return a useful operational explanation, do not fabricate a worker.
- Invalid snapshot: show the exact parse problem and leave current state unchanged.
