#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${REPO_NAME:-ownerops-webmcp}"

if [ ! -d .git ]; then
  git init
fi

if ! git config user.name >/dev/null 2>&1; then
  echo "Git user.name is not configured; configure it before committing."
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if ! git remote get-url origin >/dev/null 2>&1; then
    gh repo create "$REPO_NAME" --private --source=. --remote=origin
  fi
  echo "Private GitHub remote ready: $(git remote get-url origin)"
else
  echo "GitHub CLI is missing or not authenticated. Local repository is ready."
  echo "Later run: gh repo create $REPO_NAME --private --source=. --remote=origin --push"
fi
