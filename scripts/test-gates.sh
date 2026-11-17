#!/usr/bin/env bash
# Offline negative tests for pipeline gates. No API keys or GitHub calls.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILURES=0
GUARD_WT_ROOT=""
GUARD_WT=""

cleanup_worktree() {
  if [[ -n "${GUARD_WT:-}" ]]; then
    git worktree remove -f "$GUARD_WT" 2>/dev/null || true
  fi
  if [[ -n "${GUARD_WT_ROOT:-}" ]]; then
    rm -rf "$GUARD_WT_ROOT"
  fi
  git worktree prune 2>/dev/null || true
}

trap cleanup_worktree EXIT

pass() {
  echo "PASS $1"
}

fail() {
  echo "FAIL $1"
  FAILURES=$((FAILURES + 1))
}

run_check() {
  local name="$1"
  shift
  if "$@"; then
    pass "$name"
  else
    fail "$name"
  fi
}

reset_worktree() {
  git -C "$GUARD_WT" reset -q HEAD
  git -C "$GUARD_WT" clean -fdq
  git -C "$GUARD_WT" checkout -q .
}

worktree_patch() {
  reset_worktree
  local old_pwd
  old_pwd="$(pwd)"
  cd "$GUARD_WT" || return 1
  "$@" || {
    cd "$old_pwd" || exit 1
    return 1
  }
  git add -A
  AGENT_GUARD_PATCH_FILE="$(mktemp "${TMPDIR:-/tmp}/fernly-agent-patch.XXXXXX")"
  git diff --cached --binary >"$AGENT_GUARD_PATCH_FILE"
  cd "$old_pwd" || exit 1
  [[ -s "$AGENT_GUARD_PATCH_FILE" ]] || {
    rm -f "$AGENT_GUARD_PATCH_FILE"
    AGENT_GUARD_PATCH_FILE=""
    return 1
  }
}

agent_guard_expect() {
  local expect_rc="$1"
  shift
  local rc=0
  set -f
  bash "$ROOT/scripts/agent-guard.sh" "$AGENT_GUARD_PATCH_FILE" "$@" 2>/dev/null || rc=$?
  set +f
  [[ "$rc" -eq "$expect_rc" ]]
}

check_agent_guard() {
  local name="$1" expect_rc="$2"
  shift 2
  local patterns=()
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    patterns+=("$1")
    shift
  done
  [[ $# -gt 0 ]] && shift
  if ! worktree_patch "$@"; then
    fail "agent-guard: $name"
    return
  fi
  if agent_guard_expect "$expect_rc" "${patterns[@]}"; then
    pass "agent-guard: $name"
  else
    fail "agent-guard: $name"
  fi
  rm -f "${AGENT_GUARD_PATCH_FILE:-}"
  AGENT_GUARD_PATCH_FILE=""
}

AGENT_GUARD_PATCH_FILE=""

setup_worktree() {
  GUARD_WT_ROOT="$ROOT/.tmp/gate-wt-$$"
  mkdir -p "$ROOT/.tmp"
  GUARD_WT="$GUARD_WT_ROOT/repo"
  git worktree add -q "$GUARD_WT" HEAD
  [[ -d "$GUARD_WT" ]] || return 1
}

apply_plan_only() {
  mkdir -p docs/test-plans
  printf '%s\n' gate-plan >docs/test-plans/gate-probe.md
}

apply_plan_and_web() {
  apply_plan_only
  mkdir -p web/src/components
  printf '%s\n' 'export {}' >web/src/components/GateProbe.tsx
}

apply_plan_and_workflow() {
  apply_plan_only
  mkdir -p .github/workflows
  printf '%s\n' 'name: gate-evil' >.github/workflows/gate-evil.yml
}

apply_plan_and_snapshot() {
  apply_plan_only
  mkdir -p tests/visual/gate.spec.ts-snapshots
  printf '%s\n' PNG >tests/visual/gate.spec.ts-snapshots/gate-linux.png
}

apply_plan_and_guard_touch() {
  apply_plan_only
  printf '%s\n' '# gate probe' >>scripts/agent-guard.sh
}

apply_plan_tests_findings() {
  apply_plan_only
  mkdir -p tests/e2e
  printf '%s\n' \
    'import { test, expect } from "@playwright/test";' \
    'test("gate", () => { expect(1).toBe(1); });' \
    >tests/e2e/gate-probe.spec.ts
  printf '%s\n' '| G1 | gate | probe |' >>FINDINGS.md
}

run_agent_guard_checks() {
  setup_worktree || {
    fail "agent-guard: worktree setup"
    return
  }

  check_agent_guard "plan-only allowed" 0 'docs/test-plans/*' -- apply_plan_only
  check_agent_guard "web/src change blocked" 1 'docs/test-plans/*' -- apply_plan_and_web
  check_agent_guard "workflow change blocked" 1 'docs/test-plans/*' -- apply_plan_and_workflow
  check_agent_guard "screenshot baseline blocked" 1 'docs/test-plans/*' -- apply_plan_and_snapshot
  check_agent_guard "agent-guard.sh blocked despite scripts allow" 1 'scripts/*' 'docs/test-plans/*' -- apply_plan_and_guard_touch
  check_agent_guard "tests and FINDINGS allowed" 0 \
    'tests/*' 'web/cypress/*' 'docs/test-plans/*' 'FINDINGS.md' -- apply_plan_tests_findings
}

hook_permission() {
  local hook="$1" cmd="$2"
  python3 - "$hook" "$cmd" <<'PY'
import json
import subprocess
import sys

hook, cmd = sys.argv[1], sys.argv[2]
payload = json.dumps({"command": cmd})
proc = subprocess.run([hook], input=payload, text=True, capture_output=True)
if proc.returncode != 0:
    sys.exit(2)
body = json.loads(proc.stdout)
print(body.get("permission", ""))
PY
}

hook_expect() {
  local hook="$1" expect="$2" cmd="$3"
  local got
  got="$(hook_permission "$hook" "$cmd" 2>/dev/null)" || return 1
  [[ "$got" == "$expect" ]]
}

run_hook_checks() {
  local baselines=".cursor/hooks/guard-baselines.sh"
  local approvals=".cursor/hooks/guard-approvals.sh"

  run_check "hook-baselines: --update-snapshots denied" \
    hook_expect "$baselines" deny 'npx playwright test --project=visual --update-snapshots'
  run_check "hook-baselines: -u denied" \
    hook_expect "$baselines" deny 'npx playwright test tests/visual/catalog.spec.ts -u'
  run_check "hook-baselines: visual compare allowed" \
    hook_expect "$baselines" allow 'npx playwright test --project=visual'
  run_check "hook-baselines: non-playwright allowed" \
    hook_expect "$baselines" allow 'git diff origin/init...HEAD'

  run_check "hook-approvals: gh pr merge denied" \
    hook_expect "$approvals" deny 'gh pr merge'
  run_check "hook-approvals: gh pr review --approve denied" \
    hook_expect "$approvals" deny 'gh pr review --approve'
  run_check "hook-approvals: gh pr edit --add-label denied" \
    hook_expect "$approvals" deny 'gh pr edit 7 --add-label bug'
  run_check "hook-approvals: printenv denied" \
    hook_expect "$approvals" deny 'printenv'
  run_check "hook-approvals: gh pr view allowed" \
    hook_expect "$approvals" allow 'gh pr view 7'
  run_check "hook-approvals: git diff allowed" \
    hook_expect "$approvals" allow 'git diff origin/init...HEAD'
}

check_no_pull_request_target() {
  local f
  for f in .github/workflows/*.yml; do
    if grep -vE '^[[:space:]]*#' "$f" | grep -qE 'pull_request_target'; then
      return 1
    fi
  done
  return 0
}

check_pr_triage_job_timeouts() {
  awk '
    BEGIN { in_jobs = 0; job = ""; timeout = 0; ok = 1 }
    /^jobs:/ { in_jobs = 1; next }
    in_jobs && /^[^ ]/ { in_jobs = 0 }
    in_jobs && /^  [a-zA-Z0-9_.-]+:$/ {
      if (job != "" && !timeout) {
        printf "missing timeout-minutes on job %s\n", job > "/dev/stderr"
        ok = 0
      }
      job = $1
      sub(/:$/, "", job)
      timeout = 0
      next
    }
    in_jobs && job != "" && /^    timeout-minutes:/ { timeout = 1; next }
    END {
      if (job != "" && !timeout) {
        printf "missing timeout-minutes on job %s\n", job > "/dev/stderr"
        ok = 0
      }
      exit ok ? 0 : 1
    }
  ' .github/workflows/pr-triage.yml >/dev/null
}

check_agent_steps_no_gh_token() {
  awk '
    BEGIN { in_step = 0; bad = 0 }
    /^      - name: Run (plan|tests) agent/ {
      if (in_step && bad) { exit 1 }
      in_step = 1
      bad = 0
      next
    }
    in_step && /^      - (name|uses):/ {
      if (bad) { exit 1 }
      in_step = 0
      next
    }
    in_step && /(^[[:space:]]*GH_TOKEN:|^[[:space:]]*GITHUB_TOKEN:)/ { bad = 1 }
    END {
      if (in_step && bad) exit 1
      exit 0
    }
  ' .github/workflows/pr-triage.yml
}

job_checkout_persist_false() {
  local job="$1"
  awk -v job="$job" '
    $0 ~ "^  " job ":$" { in_job = 1; found = 0; next }
    in_job && /^  [a-zA-Z0-9_.-]+:/ { exit found ? 0 : 1 }
    in_job && /persist-credentials: false/ { found = 1 }
    END { exit (in_job && !found) ? 1 : (found ? 0 : 1) }
  ' .github/workflows/pr-triage.yml
}

check_agent_jobs_checkout_persist_false() {
  job_checkout_persist_false plan && job_checkout_persist_false tests
}

check_tests_job_human_label_gate() {
  awk '
    BEGIN { in_tests = 0; in_if = 0; found = 0 }
    /^  tests:/ { in_tests = 1; next }
    in_tests && /^  [a-zA-Z0-9_.-]+:/ { exit (found ? 0 : 1) }
    in_tests && /^    if:/ { in_if = 1; next }
    in_if && /github\.event\.sender\.type == .User./ { found = 1 }
    in_if && /^    [a-zA-Z]/ && !/^    if:/ { in_if = 0 }
    END { exit (found ? 0 : 1) }
  ' .github/workflows/pr-triage.yml
}

run_workflow_checks() {
  run_check "workflow: no pull_request_target" check_no_pull_request_target
  run_check "workflow: pr-triage jobs have timeout-minutes" check_pr_triage_job_timeouts
  run_check "workflow: agent steps omit GH_TOKEN and GITHUB_TOKEN" check_agent_steps_no_gh_token
  run_check "workflow: agent jobs checkout persist-credentials false" check_agent_jobs_checkout_persist_false
  run_check "workflow: tests job requires human plan-approved label" check_tests_job_human_label_gate
}

run_agent_guard_checks
run_hook_checks
run_workflow_checks

if [[ "$FAILURES" -gt 0 ]]; then
  echo "$FAILURES gate check(s) failed" >&2
  exit 1
fi
exit 0