#!/usr/bin/env bash
set -euo pipefail

role="${1:-}"

case "$role" in
  1|backend-auth|backend)
    file="prompts/codex-role-1-backend-auth.md"
    ;;
  2|canvas-ui|canvas)
    file="prompts/codex-role-2-canvas-ui.md"
    ;;
  3|reader-story|reader|story)
    file="prompts/codex-role-3-reader-story.md"
    ;;
  4|ai-media|ai|media)
    file="prompts/codex-role-4-ai-media.md"
    ;;
  *)
    echo "Usage: $0 {1|2|3|4|backend-auth|canvas-ui|reader-story|ai-media}" >&2
    exit 1
    ;;
esac

cat "$file"
