# Role 2: Canvas UI and Interaction

## Mission

Build the main canvas screen so users can view branching stories in a Figma-like full-screen canvas and write the next node from there.

## You own

- `app/canvas/[shareKey]`
- `components/canvas/**`
- Canvas layout, toolbar, full-screen interaction, node cards, arrows, minimap overlay
- Node detail panel and write-entry points

## Primary deliverables

- Shared canvas page driven by `shareKey`
- Full-screen canvas layout that visually prioritizes the canvas itself
- Bottom-left translucent minimap overlay
- Fixed-size node cards with connection lines
- Detail panel for selected node
- Entry point to the write flow
- Read-only anonymous state with login CTA for writing

## Hard requirements

- Canvas should feel like a workspace, not a dashboard with side panels
- Minimap must be inside the canvas, bottom-left, semi-transparent
- Node movement should update position through the backend contract
- Clicking an ending node should still allow opening the reader page
- Writing UI must respect the collapsed summary behavior

## Dependencies

- Role 1 canvas fetch route and position patch route
- Role 4 summary and media components can be mocked if not ready

## Out of scope

- Auth implementation
- Reader page
- AI generation backend

## Done checklist

- Anonymous user can open a shared canvas and inspect nodes
- Logged-in user can open the write panel from a selected node
- Minimap overlay works and does not take a permanent layout column
- Dragging a node persists position through Role 1 API
