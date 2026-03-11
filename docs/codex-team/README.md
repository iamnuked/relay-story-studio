# Codex Collaboration Plan

This repository is intended to be worked on by four separate Codex instances in parallel.

## Product decisions frozen for implementation

- The product is a branching relay-novel platform built on a freeform canvas.
- Each canvas is created only after the first node is written.
- Every node after the root must have exactly one parent node.
- One parent can have many child nodes, so the story expands as a tree.
- Node body content is immutable after publish.
- Node position is mutable and stored separately as layout metadata.
- Viewing is possible through a shareable canvas link without login.
- Creating canvases, writing nodes, saving drafts, uploading images, and using AI features require login.
- The writing flow shows direct parent context by default.
- AI summaries are collapsed by default and open only on demand.
- Branch reader pages must render as continuous fiction, not as node cards. Node metadata is hidden there.
- When a branch reaches the maximum allowed user-written node count, the server auto-creates a terminal ending node. The reader experience should feel the same as a normal ending branch.
- The canvas view should behave like a Figma-style full-screen canvas with a translucent minimap overlay at bottom-left.

## Technical baseline

- Framework: Next.js App Router + TypeScript
- Database: MongoDB + Mongoose
- Auth: Auth.js or equivalent session-based auth with email/password signup and login
- Canvas UI: React Flow
- Styling: CSS modules or Tailwind are acceptable, but the team should keep one approach once chosen by Role 1
- File upload: local abstraction first, cloud provider later
- AI integration: summary generation and image generation live behind server-side routes

## Visual reference

- Primary visual reference: `wireframes/relay-novel-wireframes-board.png`
- Source board for import/editing: `wireframes/relay-novel-wireframes-board.svg`

## Proposed route map

- `/` landing or auth redirect owned by Role 1
- `/login` owned by Role 1
- `/signup` owned by Role 1
- `/home` participated canvas list owned by Role 1
- `/canvas/[shareKey]` shared canvas view owned by Role 2
- `/read/[shareKey]/[endingNodeId]` branch reader owned by Role 3
- `/api/auth/*` owned by Role 1
- `/api/canvases/*` owned by Role 1
- `/api/nodes/*` owned by Role 1
- `/api/branches/*` owned by Role 3
- `/api/assets/*` owned by Role 4
- `/api/ai/*` owned by Role 4

## Proposed folder ownership

- Role 1 owns: root config, `package.json`, `tsconfig.json`, `next.config.*`, `.env.example`, `app/layout.*`, `app/page.*`, `app/login/**`, `app/signup/**`, `app/home/**`, `app/api/auth/**`, `app/api/canvases/**`, `app/api/nodes/**`, `lib/db/**`, `lib/auth/**`, `models/**`, shared domain types
- Role 2 owns: `app/canvas/**`, `components/canvas/**`, `components/layout/**`, canvas-specific hooks and view state
- Role 3 owns: `app/read/**`, `components/reader/**`, `lib/story/**`, `app/api/branches/**`
- Role 4 owns: `app/api/ai/**`, `app/api/assets/**`, `components/ai/**`, `components/media/**`, `lib/ai/**`, `lib/media/**`, `jobs/**`

## Shared contracts

### MongoDB collections

- `users`: email, passwordHash, nickname, createdAt
- `canvases`: title, rootNodeId, maxUserNodesPerBranch, creatorId, shareKey, createdAt, updatedAt
- `nodes`: canvasId, parentNodeId, ancestorIds, depth, userNodeCountInPath, content, isEnding, endingType, nodeKind, imageAssetIds, position, createdBy, createdAt
- `participations`: canvasId, userId, lastVisitedAt, lastContributedAt
- `drafts`: canvasId, parentNodeId, userId, content, selectedImageIds, isEndingDraft, updatedAt
- `assets`: canvasId, nodeId, type, url, prompt, createdBy, createdAt
- `summaries`: canvasId, baseNodeId, summaryText, sourceNodeIds, estimatedTokenCount, createdAt

### Core server invariants

- Canvas creation must create a root node in the same operation.
- A non-root node must reference an existing parent node in the same canvas.
- A node cannot be added under an ending node.
- If `userNodeCountInPath` reaches the canvas max after publish, append an automatic ending node.
- Node content cannot be edited after publish.
- Position updates are allowed without changing node content.
- Anonymous users can fetch shared canvas data and reader pages, but cannot create or mutate anything.

### Minimum API contracts

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/canvases/me`
- `POST /api/canvases`
- `GET /api/canvases/[shareKey]`
- `POST /api/nodes`
- `PATCH /api/nodes/[nodeId]/position`
- `GET /api/branches/[endingNodeId]/reader`
- `POST /api/assets/upload`
- `POST /api/ai/summary`
- `POST /api/ai/image`

## Working rules for all four Codex instances

- Read this file and your role file before editing anything.
- Stay inside your owned directories unless an integration issue requires coordination.
- Do not rename shared routes or shared types without updating this document.
- If another role has not delivered a dependency yet, create a typed mock or adapter inside your own area instead of editing their files.
- If you must touch a file owned by another role, keep the diff minimal and document it in your final handoff.
- Root dependency changes belong to Role 1. Other roles should document requested packages instead of editing `package.json` directly.

## Suggested implementation order

1. Role 1 creates the project foundation and base data/auth contracts.
2. Role 2 and Role 3 build the canvas and reader in parallel against the shared contracts.
3. Role 4 plugs in AI summary and media flows after the base routes and types exist.
4. Role 1 performs the final merge pass for root config conflicts if needed.

## What each role should hand back

- What was implemented
- Which files were changed
- What remains blocked
- Which integration points need another role to pick up
- What manual testing was performed
