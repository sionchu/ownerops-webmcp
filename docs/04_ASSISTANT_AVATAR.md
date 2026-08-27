# 04 — Assistant Avatar and Activity Model

## Purpose
The assistant visual is a functional state indicator for the operations copilot. It should make agent activity legible without turning the product into a mascot experience.

## Preferred implementation order
### Tier 1 — required fallback: local 2.5D SVG/CSS avatar
Ship this first so the critical path never depends on an external design tool.
Design a simple bust/orb-person hybrid with modest dimensional cues (shadow, layered shapes, small head/eye motion). It should feel like a product assistant, not a cartoon employee.

States:
- `idle`
- `listening`
- `checking`
- `proposalReady`
- `warning`
- `applied`
- `error`

Implementation can use CSS transforms/opacity and SVG groups. Keep motion subtle and deterministic.

### Tier 2 — optional enhancement: Rive
References:
- https://rive.app/docs/editor/state-machine/state-machine
- https://rive.app/docs/runtimes/react/react
Rive state machines are appropriate because the avatar has explicit semantic states and can be driven from app state. If a `.riv` asset can be created without blocking delivery, wire a single state machine to the states above.

Do not make Rive a blocker. If the runtime or asset increases build risk, keep Tier 1.

### Tier 3 — optional experiment: Spline 3D
References:
- https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer
- https://docs.spline.design/exporting-your-scene/web/code-api-for-web
Spline can embed an interactive 3D scene and expose code-controlled interactions. Use only if performance, visual quality, and implementation time are clearly better than the 2.5D/Rive path.

For this product, 2.5D/Rive is preferred over full 3D because the avatar is secondary to the schedule.

## Avatar state source
The avatar state derives from canonical UI/application activity, never from its own independent state machine of business truth.

Example mapping:
- no active operation → `idle`
- WebMCP/read evaluation in progress → `checking`
- preview scenario available → `proposalReady`
- current plan has work-rule warning → `warning`
- apply completed → `applied` briefly, then `idle`

## Activity rail copy
Use short operational messages:
- “Checking the current schedule…”
- “Three recovery options are ready.”
- “This edit adds 4 weekly hours.”
- “Preview only — nothing has been committed.”
- “Schedule updated.”

Avoid personality-heavy chatter, emojis, or fake human emotions.

## WebMCP linkage
A tool execution may set a transient activity status before/after calling the shared domain action. This visual status is UI feedback only; the tool must not modify business state through an avatar-specific path.
