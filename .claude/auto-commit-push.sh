#!/usr/bin/env bash
# Auto-checkpoint: stage all changes, commit, and push.
# Triggered by Claude Code Stop hook.

set -e

REPO_DIR="/Users/jayden/Developer/db-project"
cd "$REPO_DIR"

# Stage all changes (respects .gitignore)
git add -A

# Exit silently if there is nothing to commit
if git diff --cached --quiet; then
  exit 0
fi

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "chore: auto-checkpoint ${TIMESTAMP}" --no-verify

# Push; set upstream on first push
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u origin HEAD
fi
