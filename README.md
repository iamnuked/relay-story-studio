# Relay Story Studio

Role 1 foundation for the branching relay-novel platform.

## Stack

- Next.js App Router + TypeScript
- MongoDB + Mongoose
- Session-cookie auth with email/password signup and login
- CSS Modules with a small global base stylesheet

## Role 1 scope implemented

- App bootstrap and root config
- Shared domain and API contract types
- MongoDB models for `users`, `canvases`, `nodes`, `participations`, `drafts`, `assets`, `summaries`
- Auth routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`
- Canvas routes: `GET /api/canvases/me`, `POST /api/canvases`, `GET /api/canvases/[shareKey]`
- Node routes: `POST /api/nodes`, `PATCH /api/nodes/[nodeId]/position`
- Initial pages for `/`, `/login`, `/signup`, `/home`

## Environment

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

Required values:

- `MONGODB_URI`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Run

```bash
npm install
npm run dev
```

## Shared contracts

Shared TypeScript contracts live in [lib/types/domain.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/types/domain.ts) and [lib/types/api.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/types/api.ts).

Key exports for other roles:

- `Canvas`
- `Node`
- `ReaderBranch`
- `SummarySnapshot`
- `AuthSession`

## Server invariants enforced

- Anonymous users can fetch canvas detail by `shareKey`.
- All write routes require a valid session cookie.
- Canvas creation writes the canvas and root node in one transaction.
- Non-root nodes must reference an existing parent in the same canvas.
- Children cannot be created under ending nodes.
- Node content is publish-only; no content edit route exists.
- Position updates only mutate `position`.
- When a branch hits `maxUserNodesPerBranch`, the server auto-creates a terminal ending node unless the submitted node is already an explicit ending.

## Integration notes for other roles

- Canvas JSON contract is available at `GET /api/canvases/[shareKey]`.
- The home page currently links to the JSON contract because canvas and reader pages are owned by other roles.
- Role 2 can build against the `nodes` array plus `canvas.shareKey`.
- Role 3 can build branch assembly against the node ancestry fields and ending flags.
- Role 4 can attach media and summary flows to the existing `assets` and `summaries` models.
