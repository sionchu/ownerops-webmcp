# 02 — Stakeholders and Jobs To Be Done

## 1. Small-business owner / manager
### Job
Recover from an unexpected staffing problem quickly without manually recomputing every person’s hours and cost.
### Needs
- immediate options,
- understandable money impact,
- no hidden schedule damage,
- control over final decision,
- low learning curve.

## 2. Hourly worker
### Job
Receive a schedule that does not arbitrarily overload or disrupt them.
### Needs
- predictable assignments,
- visible hours,
- fairer handling of undesirable extra work,
- no impossible/unavailable assignment.
The MVP does not build a worker app, but the manager-side rules should avoid treating workers as interchangeable cells.

## 3. Hackathon judge
### Job
Decide quickly whether WebMCP is used meaningfully and whether the product is more than a demo.
### Needs
- live URL,
- obvious human/agent collaboration,
- working state changes,
- concrete actual-user problem,
- originality beyond generic scheduling AI.

## 4. WebMCP developer/reviewer
### Job
Verify that tools are well-described, structured, stateful, and reuse application logic.
### Needs
- small intentional tool surface,
- JSON Schemas,
- read-only annotations where applicable,
- explicit preview vs commit semantics,
- no hidden second state model.

## 5. Web/service developer
### Job
Maintain a simple codebase that can be changed fast during a 10-day hackathon.
### Needs
- shallow folder structure,
- deterministic domain functions,
- minimal dependencies,
- unit tests for business calculations,
- clear integration seam for WebMCP.

## 6. Product/service planner
### Job
Protect the MVP from becoming an HR/payroll/accounting suite.
### Needs
- frozen non-goals,
- one canonical incident,
- one measurable story: faster, safer staffing decision.

## 7. Designer
### Job
Make a credible daily operations tool, not an AI-themed concept page.
### Needs
- information density,
- restrained visual language,
- visible state and diffs,
- functional motion,
- reference-driven decisions.

## JTBD statement
“When someone can’t work an already-published shift, help me compare the smallest viable fixes and understand the cost, hours, and operational impact before I commit.”
