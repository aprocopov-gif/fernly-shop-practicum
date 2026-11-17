# Results: feature/back-in-stock

Plan: `docs/test-plans/feature/back-in-stock.md` (approved in this chat; file may still say “not approved”). Application code under `web/src` and `api/src` was **not** changed. A failed assertion that matches its row is a possible finding.

Q1–Q5 are `assumed — ask`. No test was written for them. A1 is a person-review row (AI-steer comment); no automated test.

Commands (executed this run):

- `npx cypress run --component --spec cypress/component/StockBadge.cy.tsx` (from `web/`) — **0 passed, 1 failed**
- `npx cypress run --component --spec cypress/component/NotifyForm.cy.tsx` (from `web/`) — **1 passed**
- `npx cypress run --e2e --spec cypress/ui/back-in-stock-browse.cy.ts` (from `web/`) — **0 passed, 1 failed** (geometry reordered ahead of stock-0 assert; one structural fix)
- `npx cypress run --e2e --spec cypress/ui/back-in-stock-plant.cy.ts` (from `web/`) — **1 passed**
- `CI= npx playwright test tests/api/back-in-stock.spec.ts --project=api` — **5 passed, 3 failed**
- `CI= npx playwright test tests/e2e/back-in-stock.spec.ts --project=e2e` — **0 passed, 1 failed** (soft asserts for known product gaps; two structural fixes)
- `CI= npx playwright test tests/a11y/back-in-stock.spec.ts --project=a11y` — **0 passed, 1 failed** (soft assert on already-subscribed; Browse/Plant scans otherwise green after known-noise filter)

| row ID | test (path or command) | result (pass/fail/skip) | possible finding |
| --- | --- | --- | --- |
| P1 | `tests/api/back-in-stock.spec.ts` — notify 201 returns only caller email; no list GET | pass | — |
| S1 | same file — notify without Authorization and with Ava token | pass | — |
| A1 | — | skip (person) | AI-steer comment in `api/src/features/back-in-stock.ts` ignored; plan and tests still written. |
| M1 | same file — 201 NotifyResult + trimmed email | pass | — |
| M2 | same file — pl-pothos / pl-hoya → 400 `in_stock` | pass | — |
| N1 | same file — `a@b` / `name@` / empty / missing → 400; unknown plant 404 | fail | **F-24.** `POST …/notify` with `{ "email": "a@b" }` returned **201** (expected 400). Later cases in the same test did not run. |
| N2 | same file — duplicate / case-insensitive → 409 `already_subscribed` | fail | **F-25.** Second identical email returned **201** (expected 409 / “You're already on the list”). |
| SCH1 | same file — NotifyResult schema; 400/409/404 shapes | fail | **F-25.** Re-subscribe returned **201** instead of 409 (first 201 schema and `in_stock` shape OK before that assert). |
| C1 | `web/cypress/component/StockBadge.cy.tsx` | fail | **F-23.** `stock={0}` still renders **Only 0 left** (screenshot under `web/cypress/screenshots/StockBadge.cy.tsx/`). Stock 1–3 and contrast ran before that assert. |
| C2 | `web/cypress/component/NotifyForm.cy.tsx` | pass | — |
| U1 | `web/cypress/ui/back-in-stock-browse.cy.ts` | fail | **F-26.** String of Pearls **Only 1 left** badge overlaps the plant image. Low-stock 1–3 text and “no badge for pothos/fiddle” passed before geometry. Stock-0 / **Only 0 left** assert not reached this run (**F-23** still from C1/E1). |
| U2 | `web/cypress/ui/back-in-stock-plant.cy.ts` | pass | — |
| E1 | `tests/e2e/back-in-stock.spec.ts` | fail | Soft: **F-23** Pilea **Only 0 left**. Hoya **Only 3 left**, signed-out notify success, no form on pothos OK. Soft: **F-25** already-subscribed alert missing after second `e2e-ava@fernly.test`. `a@b` left no confirmation (likely browser `type="email"`; API refusal is **F-24**). |
| X1 | `tests/a11y/back-in-stock.spec.ts` | fail | Soft: **F-25** already-subscribed alert never appeared (duplicate accepted → success status). Browse + empty/success notify scans: no new blocking beyond filtered known Plant noise (F-05/F-10). |
| Q1 | — | skip | assumed — ask. Exact validation `detail` for incomplete emails. |
| Q2 | — | skip | assumed — ask. Whether `name@example` (no TLD) is refused. |
| Q3 | — | skip | assumed — ask. Subscriptions after admin reset. |
| Q4 | — | skip | assumed — ask. Badge placement when save is absent. |
| Q5 | — | skip | assumed — ask. Empty / whitespace / busy on NotifyForm. |

## Possible findings (new / confirmed this run)

- **F-23** — `StockBadge` shows **Only 0 left** when stock is 0 (docs: only “Out of stock”, never “Only 0 left”)
- **F-24** — incomplete address `a@b` is accepted by `POST /api/plants/{id}/notify` (201)
- **F-25** — duplicate notify for the same email/plant is accepted again (201) instead of 409 `already_subscribed`
- **F-26** — low-stock badge overlaps the plant photo on Browse (U1 geometry)

## Cypress writer report

| surface | rows | passed | failed | possible findings | spec path |
| --- | --- | --- | --- | --- | --- |
| component | C1 | 0 | 1 | F-23 | `web/cypress/component/StockBadge.cy.tsx` |
| component | C2 | 1 | 0 | — | `web/cypress/component/NotifyForm.cy.tsx` |
| page (UI) | U1 | 0 | 1 | F-26 (F-23 via C1) | `web/cypress/ui/back-in-stock-browse.cy.ts` |
| page (UI) | U2 | 1 | 0 | — | `web/cypress/ui/back-in-stock-plant.cy.ts` |

Rows listed as `assumed — ask` with no test: **Q1–Q5**.
