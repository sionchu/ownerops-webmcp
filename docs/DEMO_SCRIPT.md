# OwnerOps Demo Script

Target duration: 2:20–2:25. Keep the recording under 3:00.

Run the script on the verified production URL after the live WebMCP gate is complete. Until then, the local production build is the rehearsal surface; do not present it as the public submission URL.

## 0:00–0:15 — Problem

**On screen:** OwnerOps weekly schedule, Friday evening highlighted.

**Narration:** “Friday evening is the diner's peak window. Minsoo calls out for the 18:00–22:00 shift after the schedule is already published. I need a decision that is fast, visible, and cost-aware.”

## 0:15–0:30 — Product thesis

**On screen:** Move a shift with the schedule UI, then show the impact panel.

**Narration:** “The owner works visually in the schedule. The agent works structurally across workers, shifts, coverage, hours, cost, and warnings. WebMCP gives both sides access to the same live application state. If needed, the agent can also switch the generic demo context without creating a second app.”

## 0:30–1:30 — Actual demo

1. **0:30–0:40 — Show the schedule.** Point out Good Shift Diner, the five workers, hourly rates, and Friday peak window. If demonstrating adaptation, call `create_schedule_draft` with `{ "preset": "demo", "industry": "pizza" }`, show Slice House and the chef-cap accessory, then reset to diner for the staffing sequence.
2. **0:40–0:50 — Create the incident.** Click “Mark Minsoo unavailable.” The Friday shift becomes uncovered; no replacement is silently committed.
3. **0:50–1:00 — Request options.** Ask the agent for recovery options. Show exactly three deterministic cards.
4. **1:00–1:10 — Preview the recommendation.** Preview Jiyoung. Point out the candidate styling and the unchanged committed schedule.
5. **1:10–1:20 — Edit as the human.** Open the proposed 18:00–22:00 shift and change the team member from Jiyoung to Hana in the UI.
6. **1:20–1:30 — Re-evaluate as the agent.** Call `evaluate_current_plan`. Show that the result now reflects Hana's hours, estimated payroll, coverage, and warnings rather than the old Jiyoung candidate.

## 1:30–1:50 — WebMCP proof

**On screen:** Tool inspector or browser developer view, then the source file.

**Narration:** “The page registers eight bounded user-intent tools. `evaluate_current_plan` reads the same canonical state that the human just edited. The UI and tool handlers share application actions; there is no agent-only schedule copy.”

Briefly show the eight names in `src/webmcp/register-tools.ts`. Do not spend the segment reading implementation details.

## 1:50–2:10 — Impact

**On screen:** Apply the reviewed change, then show the impact summary.

**Narration:** “The owner applies only the reviewed preview. The candidate clears, Friday coverage is restored, and the impact updates consistently. In this fixture, Jiyoung's preview adds ₩48,000, while the human-edited Hana option recalculates to ₩50,000. The owner can see the labor ratio, peak gap, warnings, and affected weekly hours together.”

## 2:10–2:25 — Vision

**On screen:** Final schedule, then copy the portable snapshot.

**Narration:** “OwnerOps makes a stressful staffing disruption more legible and reviewable. The same workspace can be re-contextualized for other generic shift-based businesses while this MVP keeps one shared staffing model. A versioned snapshot keeps the reviewed schedule portable across sessions.”
