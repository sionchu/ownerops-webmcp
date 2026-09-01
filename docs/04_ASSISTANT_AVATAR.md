# 04 — Assistant Avatar and Activity Model

## Purpose
The assistant visual is a functional state indicator for the **AI Store Manager**. It makes live-store analysis, planning, human review and apply status legible without becoming a mascot or duplicate chat client.

## Visual implementation
Keep the current local SVG/CSS assistant as the required fallback. Rive or other animation remains optional and must not block store logic.

## Semantic activity states
The current state set may remain during migration:
- `idle`
- `listening`
- `checking`
- `proposalReady`
- `reviewNeeded`
- `reviewed`
- `warning`
- `applied`
- `error`

If the generic StorePlan requires clearer naming later, migrate coherently rather than adding a second avatar state model.

## Activity source
Avatar/activity derives from canonical application activity only. It never owns business truth.

Examples:
- reading StoreState / building Daily Brief → `checking`;
- actionable store risk without candidate → `warning`;
- Agent StorePlan materialized → `proposalReady`;
- human edits candidate → `reviewNeeded`;
- `evaluate_current_plan` re-reads exact candidate → `reviewed`;
- reviewed StorePlan committed → `applied` briefly, then idle/ready.

## Generic activity timeline
The rail no longer hardcodes the staffing-only sequence.

Canonical action flow:
```text
Read live store
→ Prioritized issues
→ Planned actions
→ Candidate preview
→ Human review/edit
→ Agent re-review
→ Apply reviewed plan
```

Read-only flow:
```text
Read live store
→ Checked relevant evidence
→ Answer ready
```

## Domain evidence
The activity rail may show compact checked-domain evidence when useful:
- People
- Sales
- Stock
- Operations
- Context
- Costs

Only mark a domain as checked when the current operation actually used that data.

## Activity copy
Use short operational language:
- “Reading the live store…”
- “Three issues need attention.”
- “Store plan ready. Nothing committed.”
- “Human edit detected. Review needed.”
- “Current candidate re-checked.”
- “Reviewed plan applied.”
- “External reference unavailable; using seeded context.”

Avoid personality-heavy chatter, emojis and fake human emotion.

## Candidate attribution
When a StorePlan exists, preserve clear labels:
- `AGENT PLAN`
- `HUMAN EDIT`
- `REVIEWED`

The rail may summarize multi-domain changes rather than pretend the first worker/shift represents the whole plan.

Example:
```text
AGENT PLAN
3 changes
People · Stock · Prep

Coverage    restored
Stock cover through Monday
Review flags 0
```

## External reference status
The rail may show data-source state when material:
- `LIVE REFERENCE`
- `RECENT REFERENCE`
- `SEEDED FALLBACK`
- `STALE`

This is functional trust feedback, not decoration.

## Motion
Use short one-shot gestures for:
- issue found;
- candidate ready;
- review needed;
- reviewed;
- applied;
- provider/fallback warning.

Ambient motion stays subtle and is disabled by `prefers-reduced-motion`.

## WebMCP linkage
Tool execution may set transient activity before/after shared application actions. The tool must never mutate store truth through an avatar-specific path.
