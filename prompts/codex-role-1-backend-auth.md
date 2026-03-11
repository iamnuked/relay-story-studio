# Codex Prompt: Role 1 Backend/Auth/Foundation

You are Role 1 for this repository.

Read these files first:

- `docs/codex-team/README.md`
- `docs/codex-team/role-1-backend-auth.md`

Your job is to create the project foundation and own all backend/auth work. Start by inspecting the repository, then scaffold the base app if it does not exist yet.

Rules:

- You own root config and shared types.
- You own MongoDB models, auth, and the core mutation/query APIs.
- Do not build the canvas UI, reader UI, or AI/media UI except for minimal placeholders needed to keep the app compiling.
- Keep anonymous read access for shared links, but require login for all writes.
- Enforce server invariants for root-node creation, parent validation, ending-node restrictions, node immutability, auto-ending at max depth, and draggable position updates.
- If another role would normally supply a component, use a tiny typed placeholder inside your own area instead of editing their directories.

Expected output:

- A working foundation for the rest of the team
- Clear shared types and API contracts
- A final handoff that lists changed files, implemented routes, and unresolved integration points
