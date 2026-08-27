# OwnerOps

**OwnerOps** is a WebMCP-powered operations copilot for small-business owners who manage hourly staff.

The hackathon MVP focuses on one high-value incident: **a worker becomes unavailable for an already-published shift**. The owner and their agent collaboratively evaluate replacements using the same live schedule state, compare labor-cost and operating impact, preview alternatives, and only then apply a change.

## Product thesis
People are good at visually editing a schedule. Agents are good at structured reasoning across workers, shifts, costs, and constraints. WebMCP lets both operate on the same web application without forcing the agent to infer the UI from screenshots.

## Canonical demo
1. Ask the agent to create a rough weekly schedule from a small staff description.
2. The schedule appears in the web app.
3. The owner manually drags a shift.
4. Ask: “Is this okay?” The agent evaluates the **current UI state**.
5. Mark Minsoo unavailable for Friday 18:00–22:00.
6. Compare three response scenarios with cost, weekly hours, warnings, and coverage impact.
7. Manually adjust a proposed replacement and ask again.
8. Preview and apply the chosen scenario.
9. Copy a portable text schedule snapshot for a future ChatGPT conversation or another browser session.

## Repository governance
Start with `AGENTS.md`. Product and technical truth lives in `docs/`; implementation must follow those specs.

## Development status
This handoff repository contains the frozen product/architecture/WebMCP/design specification for Codex. Codex should implement the application against the acceptance criteria before expanding scope.

## Hackathon repository visibility
Develop privately during the build. Before Devpost submission, the final repository must be made public and include a detectable open-source license and complete run instructions.
