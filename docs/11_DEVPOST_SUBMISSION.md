# 11 — Devpost / Hackathon Submission Requirements

## Judging priorities to optimize
1. **WebMCP leverage** — thorough, skillful, non-trivial implementation.
2. **Execution** — complete coherent product experience, not a technical proof of concept.
3. **Potential impact** — credible real audience and real problem.
4. **Creativity and ambition** — meaningfully different from existing concepts.

## Submission requirements
Before final submission:
- Working live URL accessible from ChatGPT in-app browser or WebMCP-enabled Chrome.
- Text explanation covering:
  - why the use case is a strong WebMCP fit,
  - how UX is improved,
  - what humans and agents can do together that was difficult before,
  - how WebMCP is implemented.
- Public YouTube demo under the challenge time limit.
- Public code repository with all source/assets/instructions.
- Detectable open-source license in repository root.
- Repo visibly includes `document.modelContext.registerTool({ ... })` implementation.

## Private-to-public repository gate
Development may remain private. Final release checklist must include:
1. remove secrets/private data,
2. confirm license,
3. ensure README run instructions work from clean clone,
4. make repo public,
5. verify public URL and repository URL from an incognito session.

## Demo-video spine
### 0–15 sec — problem
“Friday 5 PM. Minsoo calls out for the evening shift.”

### 15–35 sec — human + agent shared state
Owner drags/edits schedule; asks agent if it works. Agent evaluates exact current page state.

### 35–70 sec — recovery options
Mark absence; agent exposes three options with money/hours/coverage differences.

### 70–100 sec — preview + human correction
Preview recommended option. Owner rejects/changes it manually. Agent re-evaluates.

### 100–125 sec — commit
Owner applies final option; schedule and impact update.

### 125–145 sec — portability
Copy schedule snapshot; explain it can be pasted into a later ChatGPT session.

### final — why WebMCP / vision
Human-friendly visual manipulation + agent-friendly structured operations on one shared application state.

## Claim discipline
Do not claim OwnerOps prevents business closures or guarantees legal compliance. Claim that it makes staffing decisions more legible, reviewable, and faster under operational pressure.
