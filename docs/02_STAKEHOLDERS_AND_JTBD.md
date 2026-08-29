# 02 — Stakeholders and Jobs To Be Done

## 1. Small-business owner / manager
### Job
Keep the store profitable and operational without spending the day switching among schedule, POS, inventory, spreadsheets, supplier messages, weather apps, and notebooks.

### Needs
- a short answer to “what matters now?”;
- actions, not report navigation;
- evidence for money/staff/stock decisions;
- predictable employees rather than interchangeable labor cells;
- visibility into what is actual vs forecast/reference;
- final control over consequential changes.

### Core JTBD
**“When the store changes faster than I can manually recompute everything, tell me what matters, explain why, and prepare the smallest useful actions for me to review.”**

## 2. Hourly worker
### Job
Receive a workable schedule and clear shift expectations.

### Needs
- regular availability and one-time exceptions respected;
- role/skill compatibility;
- reasonable weekly hours;
- fewer arbitrary schedule changes;
- clear shift swap/replacement semantics;
- tasks attached to the relevant shift rather than scattered management messages.

The prototype remains owner-facing; worker requirements are constraints in the owner plan, not a separate worker app.

## 3. Store operator / shift lead
### Job
Execute opening/closing, prep, stock checks, and incident handoff reliably.

### Needs
- short shift tasks;
- current stock/issue context;
- visible unresolved incidents;
- concise previous-shift log.

## 4. Hackathon judge
### Job
Understand quickly why WebMCP is materially useful.

### Needs
- one natural-language request touching multiple real store domains;
- live UI materialization, not a generated text report;
- obvious shared-state human/agent loop;
- concrete operating and financial effects;
- bounded, reviewable autonomy.

## 5. WebMCP developer/reviewer
### Job
Verify that the browser exposes meaningful store-level capabilities.

### Needs
- small intentional tool surface;
- strong descriptions/schemas;
- explicit read vs preview vs commit semantics;
- no duplicate agent state;
- current live state instead of snapshot/screenshot reconstruction.

## 6. Product/service planner
### Job
Expand enough to feel like an operating manager without becoming an unfinished ERP.

### Needs
- data-truth hierarchy;
- explicit external-reference boundaries;
- realistic industry seeds;
- one coherent workspace;
- a prioritized implementation sequence.

## 7. Designer
### Job
Make broad capability feel simpler, not heavier.

### Needs
- issue-first hierarchy;
- daily brief and action surface before deep data;
- contextual People/Stock/Cost detail on demand;
- no top-level menu for every capability unless history/admin genuinely requires it.

## 8. Future data/integration owner
### Job
Replace demo seeds with live providers without rewriting business logic.

### Needs
- provider/source metadata;
- unit/geography/freshness normalization;
- seed fallback;
- store actuals always winning over benchmarks.
