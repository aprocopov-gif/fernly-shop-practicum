# Plant page reviews slot — test design

Page slot: `web/src/slots/plant-page/reviews.tsx` on `/plants/:plantId` (`PlantPage`).

API (stub only `/api/*`):
- `GET /api/plants/{plantId}` — plant detail
- `GET /api/plants/{plantId}/reviews` — ReviewList
- `POST /api/plants/{plantId}/reviews` — create review (signed-in)
- When signed in: `GET /api/auth/me`, usually `GET /api/cart`

Status: **approved** — human approved `docs/test-plans/feature/plant-reviews.md` row U1. Spec: `web/cypress/ui/plant-reviews.cy.ts` (or similar under `web/cypress/ui/`). One test per row. Title starts with the row ID. Tag `{ tags: '@ui' }`. One fixture file per scenario under `web/cypress/fixtures/reviews/` (and reuse plant fixtures where practical).

Do not assert the exact empty-state sentence (Q1) or exact thanks toast wording (Q2). Assert invitation empty state without pinning Q1 copy; assert a thanks toast via `role="status"` (or equivalent) without requiring a fixed Q2 string—matching `/thank/i` is fine if needed.

| ID | kind | given (API answer) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| U1-01 | positive | Stub `GET /api/plants/pl-snake` and `GET /api/plants/pl-snake/reviews` with average 4.7, count 3, three reviews newest-first (Ben Moss, Omar K., Grace L.). Signed in optional for this assertion set; if signed in, also stub me/cart. | opens `/plants/pl-snake` | Section **Reviews**. Summary **4.7 out of 5 · 3 reviews**. Newest author **Ben Moss** appears before Omar then Grace. | feature Reviews section | positive |
| U1-02 | positive | Signed in (`fernly_token`, stub me + cart). Reviews stub as U1-01. `POST …/reviews` returns 201 Review. After POST, next GET reviews includes the new review (refetch / invalidate). | opens plant, writes a valid review (stars + ≥10 chars), submits | Waits on POST alias. A thanks toast (`role="status"` or equivalent; do not require exact Q2 wording). List refetch shows the new review. | feature: appears right away; thanks the customer | interaction + alias |
| U1-03 | negative | No token. Reviews stub as U1-01. | opens `/plants/pl-snake` | **Sign in** link to `/login?next=/plants/pl-snake` and copy about writing a review. No **Write a review** form. | feature: everyone else sees sign-in to write | signed out |
| U1-04 | negative | Stub plant OK. `GET …/reviews` returns 500. | opens `/plants/pl-snake` | **Reviews couldn't be loaded.** and **Try again**. | APP-MAP error + retry | error 500 |
| U1-05 | negative | Signed in. Reviews stub. `POST …/reviews` returns 409 `{ detail: "…", rule: "already_reviewed" }`. | submits a valid review | Error is visible in `role="alert"` (or assertive live region). No thanks toast. | feature: one review per customer | API refusal |
| U1-06 | edge | Stub reviews `average` 0, `count` 0, `reviews` `[]`. | opens plant | Empty invitation (no average line). Do not assert exact Q1 sentence. | feature empty section | empty |
| U1-07 | edge | Stub reviews with delay (e.g. 1s). | opens plant | Shows **Loading reviews…** until the reviews response, then content. No fixed `cy.wait(ms)` for the assertion alone. | loading state | slow answer |
| U1-08 | accessibility | Signed in; reviews + form as U1-02 happy path setup | inspects | Section labelled by **Reviews** heading. Star group keyboard as C3. Form errors use alert. Toast uses `role="status"` (or equivalent). | PRODUCT WCAG; feature stars | accessibility |

## Fixtures

`reviews/snake-list.json`: `plantId` `pl-snake`, `average` 4.7, `count` 3, `reviews` newest-first Ben Moss / Omar K. / Grace L. with ids, ratings, text, `createdAt`.

`reviews/snake-list-after-post.json`: same plant, includes the newly posted review first (count/average updated for the scenario).

`reviews/empty.json`: `average` 0, `count` 0, `reviews` [].

Reuse an existing plant detail fixture for `pl-snake` (or add `reviews/plant-snake.json`). Reuse `cart/me-user.json` for `GET /api/auth/me`.

## Out of scope

Component-only ReviewList / ReviewForm / StarRatingInput (C1–C3). Real API e2e (E1). Exact empty / toast strings (Q1–Q2).
