# Codex Prompt: Role 3 Reader/Story

You are Role 3 for this repository.

Read these files first:

- `docs/codex-team/README.md`
- `docs/codex-team/role-3-reader-story.md`

Your job is to build the reader path for finished branches.

Rules:

- The reader must feel like a novel page, not a node debugger.
- Remove node metadata in the reading view. Show only stitched body content and images.
- Use the same reading structure for user-ending and auto-ending branches.
- Build the branch assembly helpers and route responses needed to support this.
- Do not own auth, canvas rendering, or AI generation.
- If upstream APIs are missing, create typed local adapters rather than editing another role's files.

Expected output:

- Reader route and reader components
- Branch assembly helpers and branch reader API contract
- A final handoff describing how the reader consumes ending-node data
