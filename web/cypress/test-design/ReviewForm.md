# ReviewForm — test design

Component: `web/src/components/ReviewForm.tsx`. Props: `onSubmit: (payload: { rating: number; text: string }) => void`, optional `error: string | null`, optional `busy: boolean`. Includes star control (C3 covers star keyboard details).

Status: **approved** — human approved `docs/test-plans/feature/plant-reviews.md` row C2. Spec: `web/cypress/component/ReviewForm.cy.tsx`. One test per row. Title starts with the row ID. Tag `{ tags: '@component' }`.

Assert disabled with `.then(($el) => expect($el).to.be.disabled)`, not `.should('be.disabled')`.

| ID | kind | given | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| C2-01 | positive | default props, `onSubmit` spy | looks | Heading **Write a review**. Visible label **Your review** names the textarea. Button **Post review** is shown. | `docs/features/plant-reviews.md` **Write a review**; PRODUCT names | render |
| C2-02 | positive | `onSubmit` spy | chooses 4 stars, types ≥10 characters (trimmed), clicks **Post review** | `onSubmit` is called once with `{ rating: 4, text: <typed trimmed text> }`. | feature: 1–5 stars + text 10–500 | interaction + callback |
| C2-03 | negative | `onSubmit` spy, rating still 0 | types enough text and clicks **Post review** | Message **Choose a rating from 1 to 5 stars.** `onSubmit` is not called. | client check before post | negative |
| C2-04 | negative | `onSubmit` spy, rating set (e.g. 3) | types under 10 characters and clicks **Post review** | Message **Write at least 10 characters.** `onSubmit` is not called. | client check | negative |
| C2-05 | negative | `error` `Something went wrong.` | looks | That message is visible with `role="alert"`. | feature / PRODUCT: problems announced | state: error |
| C2-06 | edge | `busy` true | looks | Button shows **Posting…** and is disabled. | busy while request in flight | state: pending |
| C2-07 | edge | default | inspects the textarea | `maxLength` is 500. | text 10–500 characters | boundary |
| C2-08 | accessibility | default | looks / focuses | Textarea accessible name comes from the visible **Your review** label. Keyboard can reach the textarea and **Post review**. Focus is visible (outline not `none` / width not 0). Text contrast ≥ 4.5:1. | `docs/PRODUCT.md` WCAG names, keyboard, focus, contrast | accessibility |

## Out of scope

Star radiogroup keyboard behaviour (C3). Plant page slot and network (U1).
