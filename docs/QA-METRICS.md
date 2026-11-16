# QA pipeline metrics

**Totals (1 plan-approved PR):** routing accuracy **—** (— plan rows right); false-alarm rate **0%** (0/0 findings). Agent time **11.6** min across PRs. Spend is not in GitHub — see the [Cursor dashboard](https://cursor.com/dashboard?tab=usage).

| PR | Rows right | Rows reviewed | Min to plan | Min to QA report | Agent min | Findings | False alarms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [#1](https://github.com/aprocopov-gif/fernly-shop-practicum/pull/1) | — | — | — | — | 11.6 | 0 | 0 |

## How each number is measured

- **Population:** open and closed pull requests that have the `plan-approved` label.
- **Rows right / reviewed:** the last PR comment by a non-bot author whose body starts with `Plan review: N/M` (`N` = rows judged correct, `M` = rows reviewed).
- **Min to plan:** minutes from PR creation to the first plan comment by `github-actions[bot]` — excluding QA reports (`<!-- fernly-qa-report -->`) and test-run result comments (e.g. “Approved plan executed”).
- **Min to QA report:** minutes from PR creation to the first comment containing `<!-- fernly-qa-report -->`.
- **Agent min:** sum of wall-clock minutes for **completed** [`pr-triage.yml`](.github/workflows/pr-triage.yml) workflow runs on the PR head branch (`updatedAt − createdAt` per run).
- **Findings:** issues labeled `qa-finding` whose body links to the pull request (PR URL or `/pull/<number>`).
- **False alarms:** subset of those findings closed with GitHub state reason `not_planned`.
- **Money / API spend:** not available from `gh`; use the [Cursor dashboard](https://cursor.com/dashboard?tab=usage) for agent usage and billing.

_Note: Issues are disabled on `aprocopov-gif/fernly-shop-practicum`, so findings and false-alarm counts are 0 until issues are enabled._

_Generated at 2026-11-16T05:08:46.971Z by `node scripts/qa-metrics.mjs`._
