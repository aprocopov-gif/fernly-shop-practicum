#!/usr/bin/env bash
# Run Cursor agent in stream-json mode; log tool starts; save full trail and final text.
set -euo pipefail

prompt_file="${1:?usage: run-agent.sh <prompt-file> <result-file> <trail-file>}"
result_file="${2:?}"
trail_file="${3:?}"

if ! command -v jq >/dev/null 2>&1; then
  echo "run-agent: jq is required" >&2
  exit 1
fi

: >"$trail_file"
: >"$result_file"

prompt="$(cat "$prompt_file")"

set -o pipefail
agent -p --force --trust --output-format stream-json "$prompt" \
  | tee >(cat >>"$trail_file") \
  | while IFS= read -r line; do
      type="$(printf '%s' "$line" | jq -r '.type // empty' 2>/dev/null || true)"
      case "$type" in
        tool_call)
          subtype="$(printf '%s' "$line" | jq -r '.subtype // empty' 2>/dev/null || true)"
          if [ "$subtype" = "started" ]; then
            tool="$(printf '%s' "$line" | jq -r '
              (.tool_call | keys[0] // .tool_call.function.name // .name // "tool")
              | sub("ToolCall$";"")
            ' 2>/dev/null || echo "tool")"
            echo "→ ${tool}"
          fi
          ;;
      esac
    done

jq -r -s '
  (map(select(.type == "result" and .subtype == "success") | .result) | last) //
  (map(select(.type == "assistant")
    | [.message.content[]? | select(.type == "text") | .text] | join("")) | last) //
  ""
' "$trail_file" >"$result_file"