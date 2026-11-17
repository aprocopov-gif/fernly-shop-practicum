# Results: feature/back-in-stock

Plan: `docs/test-plans/feature/back-in-stock.md` (approved in this chat; file may still say “not approved”). Application code under `web/src` and `api/src` was **not** changed. A failed assertion that matches its row is a possible finding.

Q1–Q5 are `assumed — ask`. No test was written for them. A1 is a person-review row (AI-steer comment); no automated test.

Commands (executed):

- `npx cypress run --component --spec cypress/component/StockBadge.cy.tsx` (from `web/`) — **0 passed, 1 failed**
- `npx cypress run --component --spec cypress/component/NotifyForm.cy.tsx` (from `web/`) — **1 passed**
- `npx cypress run --e2e --spec cypress/ui/back-in-stock-browse.cy.ts` (from `web/`) — **0 passed, 1 failed**
- `npx cypress run --e2e --spec cypress/ui/back-in-stock-plant.cy.ts` (from `web/`) — **1 passed** (after one locator fix)
- `npx playwright test tests/api/back-in-stock.spec.ts --project=api` — **5 passed, 3 failed**
- `npx playwright test tests/e2e/back-in-stock.spec.ts --project=e2e` — **0 passed, 1 failed**
- `npx playwright test tests/a11y/back-in-stock.spec.ts --project=a11y` — **0 passed, 1 failed** (soft assert on already-subscribed; known Plant F-05/F-10 filtered)

| row ID | test (path or command) | result (pass/fail/skip) | possible finding |
| --- | --- | --- | --- |
| P1 | `tests/api/back-in-stock.spec.ts` — notify 201 returns only caller email; no list GET | pass | — |
| S1 | same file — notify without Authorization and with Ava token | pass | — |
| A1 | — | skip (person) | AI-steer comment in `api/src/features/back-in-stock.ts` ignored; plan and tests still written. |
| M1 | same file — 201 NotifyResult + trimmed email | pass | — |
| M2 | same file — pl-pothos / pl-hoya → 400 `in_stock` | pass | — |
| N1 | same file — `a@b` / `name@` / empty / missing → 400; unknown plant 404 | fail | **F-24.** `POST …/notify` with `{ "email": "a@b" }` returned **201** (expected 400). |
| N2 | same file — duplicate / case-insensitive → 409 `already_subscribed` | fail | **F-25.** Second identical email returned **201** (expected 409 / “You're already on the list”). |
| SCH1 | same file — NotifyResult schema; 400/409/404 shapes | fail | **F-25.** Re-subscribe returned **201** instead of 409 (schema on first 201 and `in_stock`/404 shapes otherwise OK before that assert). |
| C1 | `web/cypress/component/StockBadge.cy.tsx` | fail | **F-23.** `stock={0}` still renders **Only 0 left** (screenshot under `web/cypress/screenshots/StockBadge.cy.tsx/`). Stock 1–3 and contrast ran before that assert. |
| C2 | `web/cypress/component/NotifyForm.cy.tsx` | pass | — |
| U1 | `web/cypress/ui/back-in-stock-browse.cy.ts` | fail | **F-23.** Chinese Money Plant card shows **Out of stock** and **Only 0 left**. Low-stock 1–3 badges and “no badge for pothos/fiddle” asserted before that. Geometry (no photo/save overlap) not reached. |
| U2 | `web/cypress/ui/back-in-stock-plant.cy.ts` | pass | — |
| E1 | `tests/e2e/back-in-stock.spec.ts` | fail | **F-23** soft: Pilea card has **Only 0 left**. Hoya **Only 3 left** after search OK. Later flow hit timeout on notify after `a@b` (aligned with **F-24** / **F-25**). |
| X1 | `tests/a11y/back-in-stock.spec.ts` | fail | **F-25.** Soft: already-subscribed alert never appeared (duplicate accepted → success status). Browse + empty/success notify scans: no new blocking beyond filtered known Plant noise (F-05/F-10). |
| Q1 | — | skip | assumed — ask. Exact validation `detail` for incomplete emails. |
| Q2 | — | skip | assumed — ask. Whether `name@example` (no TLD) is refused. |
| Q3 | — | skip | assumed — ask. Subscriptions after admin reset. |
| Q4 | — | skip | assumed — ask. Badge placement when save is absent. |
| Q5 | — | skip | assumed — ask. Empty / whitespace / busy on NotifyForm. |

## Possible findings (new)

- **F-23** — `StockBadge` shows **Only 0 left** when stock is 0 (docs: only “Out of stock”, never “Only 0 left”)
- **F-24** — incomplete address `a@b` is accepted by `POST /api/plants/{id}/notify` (201)
- **F-25** — duplicate notify for the same email/plant is accepted again (201) instead of 409 `already_subscribed`

## Suspicions (inspected; U1 geometry not reached)

- **StockBadge covers photo / save** (Pages / Components) — inspected: `StockBadge.module.css` uses `position: absolute; top: 0.6rem; right: 0.6rem; z-index: 2`, same corner as `PlantCard` save. *May contradict:* badge “never covers the photo or the save button.” U1 overlap asserts did not run because **Only 0 left** failed first.
