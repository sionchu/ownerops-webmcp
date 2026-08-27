# 03 — UX and Design System

## Design intent
OwnerOps should look like a serious operational web product that a café manager could keep open all day. It should not look like a generic AI dashboard or hackathon landing page.

## Reference blend
### Linear — information hierarchy and calm density
Reference: https://linear.app/changelog/2026-03-12-ui-refresh
Borrow:
- consistent headers/navigation controls,
- scan-friendly density,
- restrained/dim secondary chrome,
- main content visually dominant,
- contextual actions near the object being edited.
Do not copy branding, proprietary icons, or exact layouts.

### Homebase — workforce scheduling interaction
References:
- https://www.joinhomebase.com/employee-scheduling
- https://www.joinhomebase.com/employee-scheduling/auto-scheduling
- https://www.joinhomebase.com/employee-scheduling/labor-forecasting
Borrow:
- people × time grid mental model,
- drag/drop shifts,
- visible hours and labor-cost feedback,
- coverage and overtime warnings close to the schedule.
Do not reproduce the full HR/product suite.

## Layout
Desktop-first for judging; responsive enough for narrower windows.

Preferred frame:
- Top bar: product, demo date, reset/import/export.
- Main content: schedule grid (dominant, ~65–72% width).
- Right rail: Assistant Activity Rail (~280–320px).
- Bottom/secondary area: scenario comparison / impact diff; avoid giant detached cards.

## Visual language
### Typography
- Use a neutral modern sans-serif available through normal web packages/system fonts.
- Favor tabular numerals for money, hours, and schedule times.
- Strong hierarchy via weight/size, not colored labels everywhere.

### Color
- Neutral base (warm or cool gray/near-white).
- One primary operational accent.
- Warning/error colors only for real state meaning.
- No purple/blue gradient AI identity.

### Surfaces
- Reduce number of “cards.” Prefer table/grid/panel boundaries.
- Corners modest, not pill-shaped everywhere.
- Avoid glassmorphism and blur-heavy surfaces.

### Icons
- Use one coherent icon set if needed.
- No sparkle/wand/brain icons as generic “AI” decoration.

### Motion
- Motion must communicate status, focus, preview, or state transition.
- 120–240ms for normal UI transitions.
- Avatar idle motion may be slower/subtle.
- Respect `prefers-reduced-motion`.

## Schedule grid
- Rows: workers.
- Columns/time bands: days and/or hour ranges; optimize for the canonical week demo.
- Shift blocks must show start/end and role or worker via context.
- Unavailable/absence state must be obvious.
- Drag/drop target affordance should be precise, not playful.
- Candidate preview must visually differ from committed shift.
- Maintain keyboard-accessible fallback where practical.

## Assistant Activity Rail
This is not a duplicate ChatGPT client.
It shows:
- avatar/status,
- current activity (“Checking current schedule…”),
- latest concise conclusion,
- active preview summary,
- optionally a compact local demo input if useful outside ChatGPT.

Natural-language conversation primarily happens in the external ChatGPT browser agent. The app rail explains what the app/agent is doing and what changed.

## Anti-AI-slop checklist
Reject a design if it has several of these:
- giant hero greeting inside the app,
- 4+ KPI cards across the top,
- large glowing orb,
- excessive “AI” labels,
- sparkle icons,
- gradient borders,
- decorative generated illustration dominating the workspace,
- fake charts unrelated to the workflow,
- overuse of badges/chips,
- every region inside a rounded rectangle.

## Asset separation
- `public/assistant/` — avatar/assistant visual assets only.
- `public/icons/` — product-specific static icons only if not from an icon package.
- App code must not embed huge base64 images.
- Keep CSS/design tokens separate from business logic.
