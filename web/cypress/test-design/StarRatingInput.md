# StarRatingInput — test design

Component: `web/src/components/StarRatingInput.tsx`. Props: `value: number`, `onChange: (rating: number) => void` (and any name/id the component accepts).

Status: **approved** — human approved `docs/test-plans/feature/plant-reviews.md` row C3. Spec: `web/cypress/component/StarRatingInput.cy.tsx`. One test per row. Title starts with the row ID. Tag `{ tags: '@component' }`.

| ID | kind | given | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| C3-01 | positive | `value` 0, `onChange` spy | looks | A `role="radiogroup"` named **Your rating**. Five `role="radio"` options labeled **1 star** and **2 stars** … **5 stars**. | `docs/features/plant-reviews.md` keyboard radio group; PRODUCT every control has a name | render |
| C3-02 | positive | `value` 0, `onChange` spy | clicks the **4 stars** radio | `onChange` is called with `4`. That radio is selected (`aria-checked` true). | feature: choose a rating | interaction |
| C3-03 | edge | `value` 0 | looks | No star radio is selected (`aria-checked` false on all, or none checked). | unset rating | state: empty |
| C3-04 | accessibility | `value` 0 or 3, `onChange` spy | Tabs into the group, then uses arrow keys | Tab moves focus into the group. Arrow keys change the rating like radio buttons (`onChange` / checked star updates). Focus is visible on the focused star. | feature: “Tab moves into it, the arrow keys change the rating”; PRODUCT keyboard + focus | accessibility: keyboard |
| C3-05 | accessibility | `value` 4 | looks / AT | The selected star can be announced (checked radio with its name). Screen-reader-facing name remains **N stars** / **1 star**. | feature: screen reader announces which star is selected | accessibility: name |

## Out of scope

ReviewForm submit validation (C2). Plant page integration (U1).
