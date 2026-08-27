# 10 — Reference Research

This file is implementation/design reference, not permission to expand scope.

## WebMCP
### Current community specification
https://webmachinelearning.github.io/webmcp/
Use for current `document.modelContext`, `registerTool`, schemas, annotations, execution/cancellation semantics.

### Chrome developer guide
https://developer.chrome.com/docs/ai/webmcp
Use for testing and current browser guidance.

## Hackathon product/design references
### OpenAI Showcase
https://developers.openai.com/showcase
Use to calibrate polish and avoid building a generic wrapper.

### Linear UI refresh
https://linear.app/changelog/2026-03-12-ui-refresh
Design lesson: calmer consistency, scanability, dimmer navigation chrome, focused primary workspace.

### Linear command/menu design
https://linear.app/changelog/2019-12-18-new-command-menu
Design lesson: contextual actions grouped around user focus rather than scattered controls.

## Workforce/small-business references
### Homebase scheduling
https://www.joinhomebase.com/employee-scheduling
Useful mental model: drag/drop schedule + coverage/conflict handling.

### Homebase auto-scheduling
https://www.joinhomebase.com/employee-scheduling/auto-scheduling
Useful mental model: suggestions and review rather than opaque automation.

### Homebase labor forecasting
https://www.joinhomebase.com/employee-scheduling/labor-forecasting
Useful mental model: labor cost and expected sales visible together in the schedule workflow.

## Assistant animation references
### Rive state machines
https://rive.app/docs/editor/state-machine/state-machine
Use if a state-driven 2D/2.5D assistant asset is available.

### Rive React runtime
https://rive.app/docs/runtimes/react/react
Use for React integration.

### Spline viewer
https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer
Use only for an optional lightweight 3D assistant experiment.

### Spline Code API
https://docs.spline.design/exporting-your-scene/web/code-api-for-web
Use only if interactive 3D state can be controlled without critical-path risk.

## Codex workflow references
### How OpenAI uses Codex
https://openai.com/business/guides-and-resources/how-openai-uses-codex/
Use for scoped tasks, GitHub-Issue-like prompts, environment setup, and persistent `AGENTS.md` context.

### Codex agent context / AGENTS.md behavior
https://openai.com/index/unrolling-the-codex-agent-loop/
Use to understand how repository instructions are loaded.

## Design synthesis
OwnerOps should combine:
- Linear’s calm information density,
- Homebase’s familiar staff scheduling grid,
- a restrained Rive/SVG-style assistant status surface,
- WebMCP’s structured shared-state actions.

It should **not** combine their entire feature sets.
