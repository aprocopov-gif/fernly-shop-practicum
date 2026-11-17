# Results: feature/plant-reviews

Plan: `docs/test-plans/feature/plant-reviews.md` (approved in chat; file may still say “not approved”). Application code under `web/src` and `api/src` was **not** changed. A failed assertion that matches its row is a possible finding.

Q1–Q5 are `assumed — ask`. No test was written for them.

Commands (executed):

- `npx playwright test tests/api/plant-reviews.spec.ts --project=api` — **14 passed, 2 failed**
- `npx playwright test tests/e2e/plant-reviews.spec.ts --project=e2e` — **4 passed, 3 failed**
- `npx playwright test tests/a11y/plant-reviews.spec.ts --project=a11y` — **2 passed, 3 failed** (known Plant F-10 / F-05 filtered; new `aria-required-attr` on stars)
- `npm run cy:component -- --spec web/cypress/component/ReviewList.cy.tsx` — **5/5 passed** (via cypress-test-writer)
- `npm run cy:component -- --spec web/cypress/component/ReviewForm.cy.tsx` — **8/8 passed** (via cypress-test-writer)
- `npx cypress run --component --project web --env grepTags=-@known-bug --spec web/cypress/component/StarRatingInput.cy.tsx` — **2 passed, 3 failed** (via cypress-test-writer)
- `npm run cy:ui -- --spec web/cypress/ui/plant-reviews.cy.ts` — **6 passed, 2 failed** (via cypress-test-writer)

| row ID | test (path or command) | result (pass/fail/skip) | possible finding |
| --- | --- | --- | --- |
| M1 | `tests/api/plant-reviews.spec.ts` — GET pl-snake average 4.7, newest first | fail | **F-19.** `average` is `4.6`, expected `4.7`. Author order Ben → Omar → Grace and schemas still matched. |
| M1 | same file — pl-pilea empty; pl-monstera 4.5 / 2 | pass | — |
| S1 | same file — GET public; POST/DELETE without token | pass | — |
| N1 | same file — validation_error bodies; unknown plant 404 | pass | — |
| N2 | same file — Ben already_reviewed; after delete can post; Ava may post while Ben has a review | pass | — |
| M2 | same file — Ava POST pl-fiddle; trimmed text on pl-zz | pass | — |
| M3 | same file — Ben deletes rv-seed-3 → count 2, average 4.5; unknown id 404 | pass | — |
| P1 | same file — Ava cannot delete Ben’s or guest reviews | fail | **F-20.** Ava `DELETE` returns `204` on Ben’s review and on guest `rv-seed-1` (expected `404` “Review not found”). |
| SCH1 | same file — Review/ReviewList schemas; 400/401/409/404 shapes | pass | Covered with M1/M2 + dedicated error-shape test. |
| C1 | `web/cypress/component/ReviewList.cy.tsx` C1-01…C1-05 | pass | — |
| C2 | `web/cypress/component/ReviewForm.cy.tsx` C2-01…C2-08 | pass | — |
| C3 | `web/cypress/component/StarRatingInput.cy.tsx` C3-01, C3-03 | pass | — |
| C3 | same file C3-02, C3-04, C3-05 | fail | **F-21.** No `aria-checked`; stars not keyboard-focusable / no arrow keys. |
| U1 | `web/cypress/ui/plant-reviews.cy.ts` U1-01, U1-03, U1-04, U1-05, U1-06, U1-07 | pass | — |
| U1 | same file U1-02 | fail | **F-22.** Thanks toast appears; list does not refetch (`['review']` vs `['reviews']` invalidate key). |
| U1 | same file U1-08 | fail | **F-21.** Star radios `tabIndex` −1 (not keyboard radios). |
| E1 | `tests/e2e/plant-reviews.spec.ts` — signed-out pl-snake average / order / sign-in | fail | **F-19.** UI shows `4.6 out of 5 · 3 reviews`. Author order and sign-in prompt otherwise OK. |
| E1 | same file — Ava posts on pl-fiddle, thanks + average 4.0 | fail | **F-22.** Thanks toast OK; list/average not updated without reload. |
| E1 | same file — second post refused; signed out cannot submit; pl-pilea empty | pass | — |
| E1 | same file — star group keyboard + Your review label | fail | **F-21.** Star radio not focusable after `.focus()`. Visible **Your review** label OK before that. |
| X1 | `tests/a11y/plant-reviews.spec.ts` — pl-snake signed out | pass | No new blocking beyond filtered known Plant noise. |
| X1 | same file — write form; after post; validation error | fail | **F-21.** New blocking axe `aria-required-attr` (missing `aria-checked`) on all five star radios. |
| Q1 | — | skip | assumed — ask. Exact empty-state sentence. |
| Q2 | — | skip | assumed — ask. Exact thanks / toast wording. |
| Q3 | — | skip | assumed — ask. Delete control on the plant page. |
| Q4 | — | skip | assumed — ask. Exact 409 / 404 `detail` beyond “Review not found”. |
| Q5 | — | skip | assumed — ask. Hide vs keep Write a review after already reviewed. |

## Possible findings (new)

- **F-19** — halves-up average 4.7 vs API/UI 4.6
- **F-20** — non-author (and guest) review deletes succeed with 204
- **F-21** — star radios missing `aria-checked` / keyboard behaviour (also axe `aria-required-attr`)
- **F-22** — post success does not refresh the reviews list
