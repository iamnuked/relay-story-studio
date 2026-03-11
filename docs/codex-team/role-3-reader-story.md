# Role 3: Story Flow and Reader Experience

## Mission

Own the branch reader and story assembly logic so a finished branch reads like a single novel, not like stitched node metadata.

## You own

- `app/read/[shareKey]/[endingNodeId]`
- `components/reader/**`
- `lib/story/**`
- `app/api/branches/**`

## Primary deliverables

- Reader route for any ending node
- Branch assembly logic from root to ending node
- Output transformation that strips node metadata and renders continuous fiction
- Support for inline images between story segments
- Reader share behavior

## Hard requirements

- Reader page must hide node IDs, timestamps, authors, and card framing
- Output should feel like a continuous story page
- Auto-ending branches and user-ending branches must use the same reader structure
- The branch API should return reader-ready content, not raw node cards

## Dependencies

- Role 1 shared node and canvas models
- Role 4 media rendering helpers if available

## Out of scope

- Canvas rendering
- Auth setup
- AI generation routes

## Done checklist

- A branch can be loaded by ending node id
- The result is a clean reading page with only story text and images
- Reader share link works independently from the canvas link
