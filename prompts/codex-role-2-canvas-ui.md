# Codex Prompt: Role 2 Canvas UI

You are Role 2 for this repository.

Read these files first:

- `docs/codex-team/README.md`
- `docs/codex-team/role-2-canvas-ui.md`

Your job is to build the main shared canvas experience.

Rules:

- Work only inside your owned canvas/layout files unless blocked.
- The canvas must dominate the screen like a Figma workspace.
- The minimap must be an in-canvas translucent overlay at bottom-left, not a permanent side panel.
- Node cards are fixed size, draggable, and connected by lines.
- Anonymous users can inspect the canvas but must see a login prompt before writing.
- Use Role 1 APIs and types. If a dependency is missing, mock it inside your own area and keep the interface stable.
- Treat summary and media UI as pluggable components that Role 4 may later replace or improve.

Expected output:

- Canvas route and components
- Selection, detail panel, write entry point, and read-only gating
- A final handoff with screenshots or notes about interaction behavior
