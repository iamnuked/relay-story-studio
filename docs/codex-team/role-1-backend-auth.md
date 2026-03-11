# Role 1: Backend, Auth, and Foundation

## Mission

Own the repository foundation, authentication, MongoDB models, and the core write/read APIs that other roles depend on.

## You own

- Project bootstrap and root config
- Shared domain types
- Auth setup, signup, login, logout
- Home page data for participated canvases
- Canvas creation API
- Node creation API
- Node position update API
- MongoDB connection and models

## Primary deliverables

- Working Next.js app foundation with lintable structure
- MongoDB model definitions for users, canvases, nodes, drafts, participations, assets, summaries
- Auth routes and auth helpers
- `GET /api/canvases/me`
- `POST /api/canvases`
- `GET /api/canvases/[shareKey]`
- `POST /api/nodes`
- `PATCH /api/nodes/[nodeId]/position`
- Initial `app/home` page

## Hard requirements

- Anonymous view access by `shareKey`
- Login required for all mutations
- Root node creation and canvas creation happen atomically
- Auto-ending logic runs on publish when max node count is reached
- Content immutability is enforced server-side
- Position updates do not alter story content

## Out of scope

- Canvas rendering details
- Branch reader page composition
- AI summary generation
- Image generation UX

## Integration contracts for other roles

- Export shared TypeScript types for `Canvas`, `Node`, `ReaderBranch`, `SummarySnapshot`, and auth session shape
- Provide stable JSON shapes for canvas detail and node creation responses
- Keep `shareKey` lookup and access control simple and documented

## Done checklist

- Another role can fetch a canvas by share link without login
- Another role can post a node while logged in
- Another role can move node position with a patch call
- Models and routes are documented in code or README comments
