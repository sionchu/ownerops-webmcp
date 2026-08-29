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
- `reviewNeeded`
- `reviewed`
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
- human changes a candidate preview → `reviewNeeded`
- `evaluate_current_plan` reviews the current candidate → `reviewed`
- current plan has work-rule warning → `warning`
- apply completed → `applied` briefly, then `idle`

## Activity rail copy
Use short operational messages:
- “Checking the current schedule…”
- “Agent proposal ready.”
- “Human edit detected. Agent review pending.”
- “Agent reviewed live plan. Ready to apply.”
- “Plan applied.”

The rail presents the timeline `Agent proposal → Human edit → Agent reviewed → Apply` without introducing an in-app chat history. Local deterministic impact can update immediately after a human edit, but the reviewed state is set only by the shared `evaluate_current_plan` action.

Avoid personality-heavy chatter, emojis, or fake human emotions.

## Current local implementation
The shipped Tier 1 avatar is an inline SVG with semantic groups for shadow, body, head/face/eyes/mouth, accessory, and signal. CSS supplies a barely visible breathing/blink rhythm and state signal; the component uses the native Web Animations API for one-shot attentive, scan, notice, review, warning, and apply gestures. `prefers-reduced-motion` disables ambient and semantic motion. The same base assistant receives a small registry-driven work-context detail: diner cap/name tag, pizza chef cap, coffee apron, salon apron/tool mark, sushi headband, or curry apron/badge.

The rail is a contained operational surface rather than a chatbot: it shows connection evidence, the current activity, a short timeline, candidate impact, and the next allowed action. The avatar keeps its stable face/body colors; only the accessory, one trim detail, and a low-opacity profile `agentGlow` change. In an active Friday incident it uses the existing checking/warning signal, scans before review, and gives its restrained approval gesture only after a reviewed plan is applied. Reduced-motion users receive the same state labels without ambient or one-shot movement.

## WebMCP linkage
A tool execution may set a transient activity status before/after calling the shared domain action. This visual status is UI feedback only; the tool must not modify business state through an avatar-specific path.
