# Role 4: AI Summary and Media

## Mission

Own the optional AI-assisted parts of the experience: summary generation, summary display support, image upload, and AI image generation.

## You own

- `app/api/ai/**`
- `app/api/assets/**`
- `components/ai/**`
- `components/media/**`
- `lib/ai/**`
- `lib/media/**`
- `jobs/**`

## Primary deliverables

- Summary generation route and helpers
- Summary threshold logic and reuse policy
- Collapsed summary panel component for the write flow
- Image upload API abstraction
- AI image generation API abstraction
- Media picker component for node writing

## Hard requirements

- Summary stays hidden by default and expands only on demand
- Summary generation follows the agreed thresholds from the product spec
- Image/media flows do not break anonymous read access
- AI features are optional; base writing should still work without them

## Dependencies

- Role 1 auth session and models
- Role 2 write panel integration point
- Role 3 reader image rendering hook if needed

## Out of scope

- Core auth and session handling
- Canvas layout and reader routing

## Done checklist

- Role 2 can mount a summary disclosure component without waiting on final AI polish
- Role 2 can mount an image picker component without owning media logic
- Summary route can be called with branch context and returns reusable structured output
