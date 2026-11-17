# Pipeline gates

Each row is a risk stated in testing terms, the gate that mitigates it, and how we prove the gate offline in CI.

| Risk (testing words) | Gate | Kind | Where it lives | Proof |
| --- | --- | --- | --- | --- |
| The agent pushes or comments on the PR by itself | Plan/tests agent steps must not receive `GH_TOKEN` / `GITHUB_TOKEN`; agent prompts forbid `gh`, commit, and push; only `publish-*` jobs use `github.token` | workflow + prompt | `.github/workflows/pr-triage.yml`; `.cursor/agents/change-triage.md` | `workflow: agent steps omit GH_TOKEN and GITHUB_TOKEN` |
| The agent changes app code, workflows, or baselines | `agent-guard.sh` forbids `web/src`, `api/src`, `.github`, snapshots, and other protected paths before a patch is applied | code: guard | `scripts/agent-guard.sh` | `agent-guard: web/src change blocked`; `agent-guard: workflow change blocked`; `agent-guard: screenshot baseline blocked` |
| The agent approves its own plan | `plan-approved` label alone is not enough — sender must be a human `User`; local hook blocks `gh pr review --approve`, merge, and labels | code: workflow + hook | `.github/workflows/pr-triage.yml`; `.cursor/hooks/guard-approvals.sh` | `workflow: tests job requires human plan-approved label`; `hook-approvals: gh pr review --approve denied` |
| Text in the diff or PR steers the agent | Untrusted-input rule: diff/PR/comments are data; steering text becomes a high-risk plan row for a person | prompt: rule the agent reads | `.cursor/agents/change-triage.md`; `.cursor/skills/diff-to-test-plan/SKILL.md` | not proven |
| A secret leaks into agent logs or shell | Agent jobs use `persist-credentials: false` on checkout; hooks block `printenv`, bare `env`, and echo of token env vars | code: workflow + hook | `.github/workflows/pr-triage.yml`; `.cursor/hooks/guard-approvals.sh` | `workflow: agent jobs checkout persist-credentials false`; `hook-approvals: printenv denied` |
| A run burns money on irrelevant diffs | Budget gate skips the plan agent unless app/docs paths changed or the latest commit is `replan*` | code: workflow | `.github/workflows/pr-triage.yml` (`plan_gate` step) | not proven |
| Code from a fork runs with write secrets | Workflows use `pull_request`, not `pull_request_target`; least-privilege `permissions` on triage | code: workflow | `.github/workflows/*.yml` | `workflow: no pull_request_target` |
| A Playwright baseline changes without review | Baseline hook blocks local `--update-snapshots` / `-u`; baselines refresh only via `visual-baselines` workflow on Linux | code: hook + workflow | `.cursor/hooks/guard-baselines.sh`; `.github/workflows/visual-baselines.yml` | `hook-baselines: --update-snapshots denied`; `hook-baselines: -u denied` |

Allowed agent outputs are also bounded: plan stage may only land `docs/test-plans/*`; tests stage may add tests, Cypress specs, plan results, and `FINDINGS.md` (`agent-guard: plan-only allowed`; `agent-guard: tests and FINDINGS allowed`).