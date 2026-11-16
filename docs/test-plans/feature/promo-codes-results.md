# Results: feature/promo-codes

Plan: `docs/test-plans/feature/promo-codes.md` (approved). Application code under `web/src` / `api/src` was not changed. A failed assertion that matches its row is a possible finding. Q1–Q5 are `assumed — ask` — no tests.

Commands (executed this run):

- `npx playwright test tests/api/promo-codes.spec.ts --project=api` — **12 passed, 12 failed**
- `npx playwright test tests/e2e/promo-codes.spec.ts --project=e2e` — **2 passed, 4 failed**
- `npx playwright test tests/a11y/promo.spec.ts --project=a11y` — **2 passed, 4 failed**
- `npm run cy:component -- --spec web/cypress/component/OrderSummary.cy.tsx,web/cypress/component/PromoCodeInput.cy.tsx` — **13 passed, 5 pending (`@known-bug`), 0 failed**
- `npm run cy:ui -- --spec web/cypress/ui/cart-promo.cy.ts,web/cypress/ui/checkout-promo.cy.ts,web/cypress/ui/orders-promo.cy.ts` — **13 passed, 10 pending (`@known-bug`), 0 failed**

| row | test | result | possible finding |
| --- | --- | --- | --- |
| M1 | `tests/api/promo-codes.spec.ts` — LEAFY10 on one Small Pothos | fail | **F-12.** Discount `1.95`, expected `1.25`. |
| M1 | same — 10% of a $0.99 cutting | fail | **F-12.** Discount `0.79`, expected `0.10`. |
| M1 | same — $49.00 fiddle, not off shipping | fail | **F-12.** Discount `5.60`, expected `4.90`. |
| M1 | same — quantity raised to 2 after LEAFY10 | fail | **F-12.** Discount `3.20`, expected `2.50`. |
| M2 | same — FREESHIP on one Small Pothos | pass | — |
| M2 | same — FREESHIP on a $50.00 Bird of Paradise | pass | — |
| M3 | same — $50.00 subtotal stays free after LEAFY10 | fail | **F-12** / **F-13.** Discount `5.70` (10% of 50 + 6.95). |
| M3 | same — $49.00 subtotal still pays shipping after LEAFY10 | pass | Shipping stayed `6.95`. |
| M4 | same — order keeps LEAFY10 and the cart forgets it | fail | **F-12.** Order discount `1.95`, expected `1.25`. |
| M4 | same — order keeps FREESHIP and the cart forgets it | pass | — |
| SCH1 | same — cart routes and a cart with no code | pass | Schemas OK; Pothos no-code shipping `6.95`. |
| SCH1 | same — $50.00 Bird of Paradise with no code ships free | fail | **F-13.** Shipping `6.95`, expected `0`. |
| SCH1 | same — order routes / list after discounted checkout | fail | **F-12.** Discount `1.95` on order and list. Schemas matched. |
| P1 | same — another customer cannot see the code or the order | fail | **F-15.** Ben’s `GET` of Ava’s order is `200`, expected `404`. |
| S1 | same — promo routes without a token | pass | `401` `auth_required`; owner cart unchanged. |
| B1 | same — `leafy10` / `Leafy10` store `LEAFY10` | fail | **F-12.** Failed on discount `1.95` vs `1.25` before catalog-code assert. |
| B1 | same — FREESHIP replaces LEAFY10 | pass | — |
| B1 | same — DELETE clears a code / no-op when none | pass | — |
| N1 | same — expired `SPRING5` refused; LEAFY10 stays | fail | **F-14.** Status `200`, expected `400` `promo_invalid`. |
| N1 | same — unknown code refused; LEAFY10 stays | pass | — |
| N1 | same — code on empty cart | pass | `400` `empty_cart`. |
| N1 | same — missing or blank `code` | pass | `400` `validation_error`; LEAFY10 kept. |
| N1 | same — `spring5` same expired refusal | fail | **F-14.** Status `200`, expected `400`. |
| C1 | `OrderSummary.cy.tsx` C1-01 | fail (`@known-bug`) | **F-01.** Unpadded prices / hint (`−$4`, `$40`, `Add $10 more…`). |
| C1 | C1-02 | pass | No Discount row when discount is 0. |
| C1 | C1-03 | fail (`@known-bug`) | **F-01.** `−$4.9` / `Add $1 more…` vs `−$4.90` / `Add $1.00 more…`. |
| C1 | C1-04 | pass | Shipping **Free**; no Discount; no hint. |
| C1 | C1-05 | pass | Heading / region **Paid**. |
| C1 | C1-06 | pass | Region name + discount contrast ≥ 4.5:1. |
| C2 | `PromoCodeInput.cy.tsx` C2-01, C2-09 | fail (`@known-bug`) | **F-07.** No visible / accessible **Promo code** label. |
| C2 | C2-02 … C2-08, C2-10, C2-12 | pass | Apply/Remove, error visible, busy, focus (per table). |
| C2 | C2-11 | fail (`@known-bug`) | **F-09.** Error not in `role="alert"` / `aria-live="assertive"`. |
| U1 | `cart-promo.cy.ts` U1-01, U1-02, U1-05, U1-07, U1-08, U1-09 | fail (`@known-bug`) | **F-07** (and **F-01** / **F-09** / **F-16** once label is fixed). |
| U1 | U1-03, U1-04, U1-06 | pass | Signed-out redirect; load error; empty cart. |
| U2 | `checkout-promo.cy.ts` U2-01, U2-05 | fail (`@known-bug`) | **F-01.** `$18.2` / `$12.5` vs `$18.20` / `$12.50`. |
| U2 | U2-02, U2-03, U2-04, U2-06 | pass | Redirect, empty, load error, region + contrast. |
| U3 | `orders-promo.cy.ts` U3-01, U3-02 | fail (`@known-bug`) | **F-01.** Paid / list total `$18.2` vs `$18.20`. |
| U3 | U3-03 … U3-08 | pass | Redirects, 404, load error, no Discount + `$19.45`, a11y. |
| E1 | `tests/e2e/promo-codes.spec.ts` — leafy10 cart → paid order | fail | **F-12** (wrong amounts) and **F-01** (two decimals). Discount label / shipping show; cart empties after order. |
| E1 | same — expired SPRING5 announced; totals stay | fail | **F-14** (code accepted) / **F-09** (no alert). |
| E1 | same — unknown code refused | pass | Totals stay; no Discount. |
| E1 | same — FREESHIP replaces LEAFY10, then Remove | fail | **F-16.** Promo textbox gone after LEAFY10. |
| E1 | same — Promo code label; Apply/Remove keyboard | fail | **F-07.** No textbox named **Promo code**. |
| X1 | `tests/a11y/promo.spec.ts` — cart, empty promo field | fail | **F-07.** New blocking axe `label` on promo `<input>`. |
| X1 | same — cart after LEAFY10 | pass | No new blocking (Cart baseline covers price contrast). |
| X1 | same — checkout discounted cart | fail | **F-05.** New blocking `color-contrast` on PriceTag. Total HTML `$17.5` (**F-12** / **F-01**). |
| X1 | same — paid order with discount line | fail | **F-05.** Same price contrast on Order. |
| X1 | same — cart while expired refusal showing | fail | **F-14** / **F-09.** No expired alert; scan did not complete that assert. |
| Q1–Q5 | — | skip | assumed — ask. No tests. |
