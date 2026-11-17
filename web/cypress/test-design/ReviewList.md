# ReviewList — test design

Component: `web/src/components/ReviewList.tsx`. Props include `average: number`, `count: number`, and `reviews` (each with `id`, `author`, `rating`, `text`, `createdAt`).

Status: **approved** — human approved `docs/test-plans/feature/plant-reviews.md` row C1. Spec: `web/cypress/component/ReviewList.cy.tsx`. One test per row. Title starts with the row ID. Tag `{ tags: '@component' }`.

Do not assert the exact empty-state sentence (plan Q1 is unresolved). For `count` 0, assert there is no average line and no review list items, and that invitation-style empty copy is present without pinning a fixed string from Q1.

| ID | kind | given | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| C1-01 | positive | `average` 4.7, `count` 3, three reviews newest-first (authors Ben Moss, Omar K., Grace L. with text and dates) | looks | Shows **4.7 out of 5 · 3 reviews**. Each review shows its author, text, and date. | `docs/features/plant-reviews.md` Reviews section; average one decimal | equivalence class: populated list |
| C1-02 | positive | `average` 5, `count` 1, one review | looks | Summary uses singular **review** (e.g. **5.0 out of 5 · 1 review**). Author, text, and date for that review are shown. | feature: count wording | equivalence class: singular |
| C1-03 | edge | `average` 0, `count` 0, `reviews` `[]` | looks | No average line (no “out of 5”). No review list items. Empty invitation copy is shown (do not assert the exact Q1 sentence). | feature: “With no reviews, the section says so and invites the first one.” Plan Q1 unresolved for exact wording. | state: empty |
| C1-04 | accessibility | same as C1-01 | inspects ratings | Decorative ★ characters are `aria-hidden`. Each rating exposes a visually hidden “{n} out of 5”. | feature / PRODUCT: names for meaningful content | accessibility: name |
| C1-05 | accessibility | same as C1-01 | inspects contrast | Average / list text colour against its background is at least 4.5:1. | `docs/PRODUCT.md` contrast 4.5:1 | accessibility: contrast |

## Out of scope

Form, stars input, plant-page slot, and API. Those are C2, C3, U1, and the API rows.
