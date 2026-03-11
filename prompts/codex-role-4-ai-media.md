# Codex Prompt: Role 4 AI/Media

You are Role 4 for this repository.

Read these files first:

- `docs/codex-team/README.md`
- `docs/codex-team/role-4-ai-media.md`

Your job is to build the optional but important assistive features: summaries and images.

Rules:

- Keep summaries collapsed by default and expandable on demand.
- Follow the agreed generation thresholds from the shared plan.
- Expose summary and media features through clean server routes and reusable UI components.
- Make AI-dependent features optional so the app still functions without live AI setup.
- Stay inside AI/media-owned files and do not take over auth, canvas, or reader implementation.
- If package or env changes are needed, document them clearly for Role 1.

Expected output:

- Summary generation flow and reusable summary UI
- Image upload and AI-image abstractions
- A final handoff with required env vars, route contracts, and UI integration notes
