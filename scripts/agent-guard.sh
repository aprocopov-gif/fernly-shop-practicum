#!/usr/bin/env bash
# List paths in a git patch and reject anything outside allowed globs or on the deny list.
set -euo pipefail

patch="${1:?usage: agent-guard.sh <patch> <allowed pattern>...}"
shift

if [ "$#" -eq 0 ]; then
  echo "agent-guard: at least one allowed pattern required" >&2
  exit 2
fi

allowed_patterns=("$@")

if [ ! -f "$patch" ] || [ ! -s "$patch" ]; then
  exit 0
fi

path_matches_allowed() {
  local f="$1"
  local p prefix
  for p in "${allowed_patterns[@]}"; do
    case "$f" in
      $p) return 0 ;;
    esac
    case "$p" in
      *\*)
        prefix="${p%/*}"
        case "$f" in
          "${prefix}"/*) return 0 ;;
        esac
        ;;
    esac
  done
  return 1
}

path_is_forbidden() {
  local f="$1"
  case "$f" in
    web/src/*) return 0 ;;
    api/src/*) return 0 ;;
    .github/*) return 0 ;;
    .cursor/*) return 0 ;;
    scripts/*) return 0 ;;
    package.json | */package.json) return 0 ;;
    package-lock.json | */package-lock.json) return 0 ;;
    playwright.config.ts | */playwright.config.ts) return 0 ;;
    web/cypress.config.ts) return 0 ;;
    a11y-baseline.json | */a11y-baseline.json) return 0 ;;
    *-snapshots/*) return 0 ;;
    web/cypress/screenshots/*) return 0 ;;
    web/cypress/results/*) return 0 ;;
    .env | .env.* | */.env | */.env.*) return 0 ;;
  esac
  return 1
}

numstat="$(git apply --numstat "$patch" 2>&1)" || {
  echo "agent-guard: invalid patch: $numstat" >&2
  exit 1
}

if [ -z "$numstat" ]; then
  exit 0
fi

while IFS=$'\t' read -r add del path; do
  [ -z "$path" ] && continue

  if path_is_forbidden "$path"; then
    echo "agent-guard: agent must not change (person-only or protected): $path" >&2
    exit 1
  fi
  if ! path_matches_allowed "$path"; then
    echo "agent-guard: path not allowed by workflow patterns: $path" >&2
    exit 1
  fi
done <<<"$numstat"

exit 0