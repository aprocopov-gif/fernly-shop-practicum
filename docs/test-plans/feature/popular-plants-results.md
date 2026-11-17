# Results: feature/popular-plants

Plan: `docs/test-plans/feature/popular-plants.md` (approved). Application code was not changed. A failed assertion that matches its row is a possible finding.

Q1–Q6 are `assumed — ask`. No test was written for them. L1 and L2 wait on Q5 (load tool and profile).

Commands (executed):

- `npx cypress run --component --spec cypress/component/PopularList.cy.tsx` (from `web/`) — 1 passed.
- `npx playwright test tests/api/popular.spec.ts --project=api` — 5 passed, 2 failed (A2, SCH1). SCH1 was a test bug (validated a truncated parse); fixed once and re-run: passed. A2 left failing as a finding (no assertion weaken).
- `npx playwright test tests/e2e/popular-plants.spec.ts --project=e2e` — 1 failed (Chinese Money Plant present).
- `npx playwright test tests/a11y/popular-plants.spec.ts --project=a11y` — 1 passed (known Plant `image-alt` / PriceTag contrast filtered).
- `npx cypress run --e2e --spec cypress/ui/popular-plants.cy.ts` (from `web/`) — 1 passed.

| row ID | test (path or command) | result (pass/fail/skip) | possible finding |
| --- | --- | --- | --- |
| S1 | `tests/api/popular.spec.ts` — signed out + Ava bearer | pass | — |
| P1 | same file — keys are PlantSummary + `unitsSold`; no `ord-` / `@` | pass | — |
| A1 | same file — `limit=12` non-increasing `unitsSold`, distinct ids; `limit=4` equals first 4 | pass | Tie A–Z check: no neighbouring equal `unitsSold` pair in this seed (check ran on no pair; not recorded as a pass). Units-vs-orders / 30-day oracle still **Q3**. |
| A2 | same file — every item `stock` ≥ 1; `pl-pilea` absent at limits 1/4/5/12 | fail | **F-23.** `pl-pilea` is returned with `stock` 0. Expected: out-of-stock plants left out. |
| A3 | same file — default 4; limits 1/5/12; invalid limits → 400 `validation_error` | pass | — |
| SCH1 | same file — OpenAPI path + `expectSchema` PopularList / PopularPlant / Error | pass | After one test fix (schema on full item bodies). |
| C1 | `web/cypress/component/PopularList.cy.tsx` — C1 four links, sold counts, contrast | pass | — |
| U1 | `web/cypress/ui/popular-plants.cy.ts` — U1 plant page list from `limit=5` | pass | — |
| E1 | `tests/e2e/popular-plants.spec.ts` — UI matches API excluding current; no Chinese Money Plant | fail | **F-23.** List shows Chinese Money Plant. Names/sold counts matched the API for the four slots before that check. |
| X1 | `tests/a11y/popular-plants.spec.ts` — scan `/plants/pl-monstera` with list visible | pass | No new blocking violations after filtering known Plant `image-alt` / PriceTag contrast. |
| L1 | — | skip | waits on Q5 |
| L2 | — | skip | waits on Q5 |
| Q1 | — | skip | assumed — ask |
| Q2 | — | skip | assumed — ask |
| Q3 | — | skip | assumed — ask |
| Q4 | — | skip | assumed — ask |
| Q5 | — | skip | assumed — ask |
| Q6 | — | skip | assumed — ask |
