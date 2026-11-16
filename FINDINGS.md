# Fernly findings

One entry per issue, ordered by severity: money and privacy first, then broken flows, then everything else. A finding needs evidence: a failing test, or exact steps and requests. The map of the app is in [docs/APP-MAP.md](docs/APP-MAP.md).

Failing tests that prove a finding are tagged `@known-bug` so `npm run cy:component` / `npm run cy:ui` (`grepTags=-@known-bug`) stay green until the product is fixed. Assertions stay strict.

## Entry format

```markdown
### F-NN. <One-line title: what is wrong>

- **Where:** <page, component, or endpoint>
- **Category:** <Components | Pages | Business rules in the API | The contract | Caching | Authorization | Accessibility>
- **Impact:** <the impact on a customer, in one sentence>
- **Evidence:** <the test that fails (file and test name), or the exact steps and requests>
- **Contradicts:** <the line in docs/PRODUCT.md or the API contract>
- **Suggested fix:** <optional, one line>
```

## Findings

### F-01. Prices drop trailing zeros (shows `$0` instead of `$0.00`)

- **Where:** `formatPrice` (`web/src/money.ts`), used by `PriceTag`, `SizePicker` (size deltas), order/cart summaries, and elsewhere
- **Category:** Components
- **Impact:** Customers see prices without the promised two decimals (e.g. `$0` / `$12.5` / `+$6` instead of `$0.00` / `$12.50` / `+$6.00`).
- **Evidence:** Executed failing tests (tagged `@known-bug`), including:
  - `web/cypress/component/PriceTag.cy.tsx` — PT-01, PT-02, PT-04, PT-07, PT-11, PT-12, PT-13
  - `web/cypress/component/SizePicker.cy.tsx` — SZ-01, SZ-06
  - `web/cypress/component/PlantCard.cy.tsx` — PC-01, PC-11
  - `web/cypress/component/CartLine.cy.tsx` — CA-01
  - `web/cypress/component/OrderSummary.cy.tsx` — C1-01, C1-03 (tagged `@known-bug`)
  - `web/cypress/ui/browse.cy.ts` — "shows $0.00 for a plant priced at 0"
  - `web/cypress/ui/cart.cy.ts` — CP-01, CP-02, CP-03, CP-05 (and any other CP row that asserts `$x.xx`)
  - `web/cypress/ui/plant.cy.ts` — PL-01, PL-06
  - `web/cypress/ui/orders.cy.ts` — OR-06
  - `web/cypress/ui/order.cy.ts` — OD-01, OD-06, OD-08, OD-11
  - Promo UI (tagged `@known-bug`): `web/cypress/ui/checkout-promo.cy.ts` U2-01, U2-05; `web/cypress/ui/orders-promo.cy.ts` U3-01, U3-02
  Code: `formatPrice` returns `` `$${Math.round(amount * 100) / 100}` `` with no `toFixed(2)`.
- **Contradicts:** `docs/PRODUCT.md`: "Every price is shown in dollars with **two decimals**, everywhere: `$12.50`, never `$12.5`."
- **Suggested fix:** Format with `toFixed(2)` (or equivalent) in `formatPrice`.

### F-02. Quantity stepper's + button stays enabled at the stock limit

- **Where:** `QuantityStepper` (`web/src/components/QuantityStepper.tsx`), used on the plant page and in cart lines
- **Category:** Components
- **Impact:** A customer can raise the quantity one above the stock left, asking for a plant the shop doesn't have.
- **Evidence:** Executed (tagged `@known-bug`):
  - `web/cypress/component/QuantityStepper.cy.tsx` — "QS-06 disables Increase at the stock limit"; "QS-07 disables both buttons when min equals max"
  - `web/cypress/component/CartLine.cy.tsx` — "CA-06 disables Increase when quantity equals stock"
  - `web/cypress/ui/cart.cy.ts` — "CP-10 disables Increase quantity at the stock limit"
  Code: `disabled={disabled || value > max}` instead of `value >= max`.
- **Contradicts:** `docs/PRODUCT.md`: "**Quantity** starts at 1 and can never go above the stock left: at the stock limit, the **+** button is disabled."
- **Suggested fix:** Disable + when `value >= max` instead of `value > max`.

### F-03. Catalog load failure looks like an empty filter result

- **Where:** Browse page (`web/src/pages/BrowsePage.tsx`)
- **Category:** Pages
- **Impact:** When the catalog API fails, customers see "No plants match your filters" with no way to retry, as if search returned nothing.
- **Evidence:** `web/cypress/ui/browse.cy.ts`, test "shows an error with Try again when the catalog cannot be loaded" (executed; tagged `@known-bug`). Intercepted `GET /api/plants?*` with 500; page shows EmptyState "No plants match your filters" / "0 plants", no `role="alert"`, no **Try again**. Code: `plants.isError || !data?.items.length` both render the same EmptyState.
- **Contradicts:** `docs/PRODUCT.md`: "If the catalog can't be loaded, the page says so and offers **Try again**. It never pretends there are no plants."
- **Suggested fix:** On `plants.isError`, render `ErrorBanner` with retry (as Cart does) instead of EmptyState.

### F-04. Care level 3 shows "Moderate care" instead of "Expert care"

- **Where:** `CareLevelBadge` (`web/src/components/CareLevelBadge.tsx`), used on Browse cards and the plant page
- **Category:** Components
- **Impact:** Expert-care plants are labelled as Moderate, so customers get the wrong care guidance.
- **Evidence:** Executed (tagged `@known-bug`):
  - `web/cypress/component/CareLevelBadge.cy.tsx` — "CL-03 shows Expert care with three decorative dots"
  - `web/cypress/component/PlantCard.cy.tsx` — "PC-04 shows Not pet safe and Expert care"
  Code: `LABELS[Math.min(level, LABELS.length - 1) - 1]` caps the index at Moderate. Also seen on Browse for Fiddle Leaf Fig, Calathea Orbifolia, and String of Pearls.
- **Contradicts:** `docs/PRODUCT.md`: "Care level has three steps: 1 **Easy**, 2 **Moderate**, 3 **Expert**." OpenAPI `careLevel`: "1 Easy, 2 Moderate, 3 Expert."
- **Suggested fix:** Index with `LABELS[level - 1]` (or equivalent) so level 3 maps to Expert.

### F-05. Price text fails colour contrast (axe `color-contrast`)

- **Where:** `PriceTag` (`web/src/components/PriceTag.module.css` colour `#8dbb8a`) — **pages:** Browse, Plant, Cart, Checkout, Order
- **Category:** Accessibility
- **Impact:** Price text can be hard to read for customers with low vision (axe reports ~2.18:1 on white/card backgrounds; expected ≥ 4.5:1, or ≥ 3:1 for large text).
- **Evidence:** Executed:
  - Playwright a11y: `tests/a11y/pages.spec.ts` (Browse, Plant, Cart, Checkout) and `tests/a11y/promo.spec.ts` — X1 checkout of a discounted cart; X1 paid order with a discount line (`test.fail`); report `a11y-report/` — axe rule `color-contrast` on PriceTag selectors. Cart occurrences are **baselined** in `tests/a11y/a11y-baseline.json` (owner design team, expires 2026-12-31, reason "new brand colors"); other pages remain blocking.
  - `web/cypress/component/PriceTag.cy.tsx` — "PT-16 meets contrast on page background for each size" (tagged `@known-bug`); `sm` measured **2.07:1** on page background `#f6faf3`.
- **Contradicts:** `docs/PRODUCT.md`: "text has enough contrast against its background (4.5:1 for normal text)"
- **Suggested fix:** Darken the price colour (or background) until contrast meets 4.5:1 (3:1 if large text applies).

### F-06. Plant card save button has no accessible name (axe `button-name`)

- **Where:** `PlantCard` heart control (`web/src/components/PlantCard.tsx`) — **pages:** Browse
- **Category:** Accessibility
- **Impact:** Screen-reader users cannot tell what the save control does.
- **Evidence:** Executed:
  - Playwright a11y: `tests/a11y/pages.spec.ts` — Browse; axe rule `button-name` on `.PlantCard-module__save` (12 cards in the catalog scan); `a11y-report/`.
  - `web/cypress/component/PlantCard.cy.tsx` — "PC-09 gives the save button an accessible name" (tagged `@known-bug`). Button has `aria-pressed` and accessible name `""` (icon-only SVG is `aria-hidden`).
- **Contradicts:** `docs/PRODUCT.md`: "every button and form field has a name a screen reader can announce."
- **Suggested fix:** Add a visible or visually-hidden name (e.g. "Save {plant name}") / `aria-label`.

### F-07. Form fields without labels (axe `label`)

- **Where:** `SearchBox` on Browse; `PromoCodeInput` on Cart — **pages:** Browse, Cart
- **Category:** Accessibility
- **Impact:** Screen-reader users hear unnamed fields for catalog search and the promo code.
- **Evidence:** Executed:
  - Playwright a11y: `tests/a11y/pages.spec.ts` — Browse and Cart; axe rule `label` on `.SearchBox-module__input` (Browse) and the promo `<input>` (Cart); `a11y-report/`.
  - `web/cypress/component/SearchBox.cy.tsx` — "SB-08 gives the search input an accessible name" (tagged `@known-bug`). Visual hint **Search plants** is a `<span>`, not a label.
  - Promo (tagged `@known-bug` / `test.fail`): `web/cypress/ui/cart-promo.cy.ts` (U1-01, U1-02, U1-05, U1-07, U1-08, U1-09); `web/cypress/component/PromoCodeInput.cy.tsx` (C2-01, C2-02, C2-04, C2-05, C2-07, C2-09, C2-12); `tests/e2e/promo-codes.spec.ts` — "E1 the promo field has a visible Promo code label…"; `tests/a11y/promo.spec.ts` — "X1 cart with a line and an empty promo field…" (axe `label`). UI shows **Have a promo code?** as a `<p>` and an unlabeled `<input>`.
- **Contradicts:** `docs/PRODUCT.md`: "every button and form field has a name a screen reader can announce." `docs/features/promo-codes.md`: "The code field has a visible label." and "The cart shows a **Promo code** field under the order summary".
- **Suggested fix:** Associate a real `<label>` / `aria-label` with the search input; add a visible **Promo code** label on the promo field (keep Apply/Remove named).

### F-08. Search box focus outline is removed

- **Where:** `SearchBox.module.css` (`.input { outline: none; }`) — **pages:** Browse
- **Category:** Accessibility
- **Impact:** Keyboard users cannot see which control is focused in the search field.
- **Evidence:** `web/cypress/component/SearchBox.cy.tsx`, test "SB-09 shows a visible focus outline on the search input" (executed; tagged `@known-bug`). Computed `outlineStyle` is `none` with no replacement focus style.
- **Contradicts:** `docs/PRODUCT.md`: "everything works with the keyboard alone, and focus is always visible."
- **Suggested fix:** Restore a visible `:focus-visible` style (keep outline or an equivalent ring).

### F-09. Promo error message is not announced as an alert

- **Where:** `PromoCodeInput` error text (`web/src/components/PromoCodeInput.tsx`) — **pages:** Cart
- **Category:** Accessibility
- **Impact:** Screen-reader users may miss that a promo code was refused.
- **Evidence:** Executed (tagged `@known-bug`):
  - `web/cypress/component/PromoCodeInput.cy.tsx` — "C2-11 announces the expired message with contrast at least 4.5:1". Error text is not inside `role="alert"` or `aria-live="assertive"` (component receives `error` as a prop, so this is independent of F-14).
- **Contradicts:** `docs/features/promo-codes.md`: "When a code is refused, the message is **announced to screen-reader users** as soon as it appears."
- **Suggested fix:** Wrap the error in `role="alert"` (or an assertive live region); ensure contrast ≥ 4.5:1.

### F-10. Plant hero image has no alternative text (axe `image-alt`)

- **Where:** Plant detail hero `<img>` (`web/src/pages/PlantPage.tsx`) — **pages:** Plant
- **Category:** Accessibility
- **Impact:** Screen-reader users get no description of the plant photo.
- **Evidence:** Executed: `tests/a11y/pages.spec.ts` — Plant; axe rule `image-alt` on `img` (no `alt` / accessible name); `a11y-report/`. Code: `<img src={data.imageUrl} className={styles.heroImage} />` with no `alt`.
- **Contradicts:** `docs/PRODUCT.md`: "every meaningful image has alternative text."
- **Suggested fix:** Set `alt` to the plant name (or an equivalent short description).

### F-11. Cart rejected quantity change does not show the API error toast

- **Where:** Cart page (`web/src/pages/CartPage.tsx`) after a failed `PATCH /api/cart/lines/{lineId}`
- **Category:** Pages
- **Impact:** When a quantity change is refused (e.g. stock limit), the customer may not see the API's explanation.
- **Evidence:** `web/cypress/ui/cart.cy.ts`, test "CP-13 shows an error toast when PATCH is rejected and keeps the quantity" (executed; tagged `@known-bug`). Stubbed PATCH 400 with `detail: "Not enough stock left."`; page never shows that text in a `role="status"` toast (timeout). Quantity remains 1.
- **Contradicts:** Documented cart behaviour in `docs/APP-MAP.md`: "Change rejected: error toast with the API's `detail`." (the OpenAPI error body includes `detail` for rules such as `stock_limit`).
- **Suggested fix:** Ensure `mutate(..., { onError })` receives `ApiRequestError` with `detail` as `message` and renders `<Toast tone="error" />`.

### F-12. Percentage promo takes discount off shipping as well as plants

- **Where:** `POST /api/cart/promo` (and cart/order totals that carry `discount`) — **LEAFY10**
- **Category:** Business rules in the API
- **Impact:** Customers pay the wrong total: e.g. Small Pothos ($12.50) + shipping ($6.95) is discounted `$1.95` (10% of plants+shipping) instead of `$1.25` (10% of plants only), so the cart total becomes `$17.50` instead of `$18.20`.
- **Evidence:** Hand-reproduced after reset: register → add `pl-pothos` S → `POST /api/cart/promo` `{ "code": "LEAFY10" }` → `discount: 1.95`, `shipping: 6.95`, `total: 17.5` (executed). Same pattern on `$0.99` cutting (`0.79` vs `0.10`), `$49` fiddle (`5.60` vs `4.90`), qty 2 Pothos (`3.20` vs `2.50`), and `$50` bird + LEAFY10 (`5.70` vs `5.00`). Failing tests (`test.fail` / `@known-bug`):
  - `tests/api/promo-codes.spec.ts` — M1 rows, M3 `$50` after LEAFY10, M4 LEAFY10 order, SCH1 discounted order list, B1 `leafy10`/`Leafy10`
  - `tests/e2e/promo-codes.spec.ts` — "E1 applying leafy10 is the same discount from cart through the paid order…"
- **Contradicts:** `docs/features/promo-codes.md`: "A **percentage code takes that percentage off the subtotal of the plants — never off shipping.**"
- **Suggested fix:** Compute percentage discount from plant subtotal only; leave shipping out of the base.

### F-13. Shipping is still charged when the subtotal is exactly $50.00

- **Where:** Cart totals / shipping rule (no promo) — e.g. Bird of Paradise Small at `$50.00`
- **Category:** Business rules in the API
- **Impact:** A customer at the free-shipping threshold still pays `$6.95` shipping (`total` `$56.95` instead of `$50.00`).
- **Evidence:** Hand-reproduced: add `pl-bird` S → cart `subtotal: 50`, `shipping: 6.95`, `total: 56.95` (executed). Failing test: `tests/api/promo-codes.spec.ts` — "SCH1 a $50.00 Bird of Paradise with no code ships free" (`test.fail`).
- **Contradicts:** `docs/PRODUCT.md`: "Shipping costs $6.95, and is free when the subtotal is $50.00 or more."
- **Suggested fix:** Treat free shipping as `subtotal >= 50` (not strict `>`).

### F-14. Expired promo code `SPRING5` is accepted

- **Where:** `POST /api/cart/promo` with `SPRING5` / `spring5`
- **Category:** Business rules in the API
- **Impact:** An expired code still applies (HTTP `200`, `promoCode: "SPRING5"`, a 5% discount), so customers get a discount the catalog says has ended.
- **Evidence:** Hand-reproduced: add Pothos → `POST /api/cart/promo` `{ "code": "SPRING5" }` → HTTP `200` with `discount: 0.97`, `promoCode: "SPRING5"` (executed; expected `400` `promo_invalid` with "expired"). Failing tests (`test.fail`):
  - `tests/api/promo-codes.spec.ts` — "N1 an expired code is refused…"; "N1 spring5 is refused as expired…"
  - `tests/e2e/promo-codes.spec.ts` — "E1 an expired code is announced…"
  - `tests/a11y/promo.spec.ts` — "X1 an expired-code refusal is in an alert…" (refusal never appears, so no alert)
- **Contradicts:** `docs/features/promo-codes.md`: "**Expired codes are refused**, with a message that says the code has expired." Table: `SPRING5` valid until **30 Apr 2026 (expired)**.
- **Suggested fix:** Reject expired catalog codes with `400` `promo_invalid` and an expired detail; leave any prior valid code unchanged.

### F-15. Another customer can read someone else's order

- **Where:** `GET /api/orders/{orderId}`
- **Category:** Authorization
- **Impact:** A signed-in customer (Ben) receives HTTP `200` and the full order (including `promoCode` and `discount`) for another customer's (Ava's) order instead of "Order not found".
- **Evidence:** Hand-reproduced after reset: Ava adds Pothos, applies LEAFY10, places order; Ben `GET /api/orders/{id}` → `200` with Ava's lines and `promoCode: "LEAFY10"` (executed; expected `404`). Failing test: `tests/api/promo-codes.spec.ts` — "P1 another customer cannot see the code or the discounted order" (`test.fail`).
- **Contradicts:** `docs/PRODUCT.md`: "**An order is private:** only the customer who placed it can see it. Anyone else gets "Order not found"."
- **Suggested fix:** Authorize order reads by owner; return `404` (no order body) for any other authenticated customer.

### F-16. Applied promo hides the code field so a new code cannot replace without Remove

- **Where:** `PromoCodeInput` on Cart (`web/src/components/PromoCodeInput.tsx`)
- **Category:** Components
- **Impact:** After a code is applied, the cart only shows "Code … applied" and **Remove** — there is no field to type a replacement code, so "apply a new code to replace" is impossible without removing first.
- **Evidence:** Inspected: when `appliedCode` is set the component returns only the applied row + Remove (no `<input>`). Failing tests (`test.fail` / `@known-bug`):
  - `tests/e2e/promo-codes.spec.ts` — "E1 FREESHIP replaces LEAFY10 and Remove restores paid shipping" (expects the promo field to stay available)
  - `web/cypress/ui/cart-promo.cy.ts` — U1-08 (blocked earlier by F-07's missing label in the UI suite)
- **Contradicts:** `docs/features/promo-codes.md`: "One code per cart. Applying a new code replaces the old one."
- **Suggested fix:** Keep the promo field available while a code is applied (or provide an equivalent replace path); API already accepts a replacement (`B1 a later FREESHIP replaces LEAFY10` passes).

### F-17. Price: high to low sorts cheapest first

- **Where:** `GET /api/plants?sort=price-desc` — **pages:** Browse
- **Category:** Business rules in the API
- **Impact:** Choosing **Price: high to low** shows Succulent Cutting ($0.99) first instead of the most expensive plant.
- **Evidence:** Hand-reproduced: `GET /api/plants?sort=price-desc` first three prices `0.99`, `9.99`, `12.5` (executed). Failing tests (`test.fail`):
  - `tests/api/plants.spec.ts` — "GET /api/plants?sort=price-desc lists the most expensive plant first"
  - `tests/e2e/browse.spec.ts` — "Price: high to low shows the most expensive plant first"
- **Contradicts:** `docs/PRODUCT.md`: "**Price: high to low (most expensive first)**." OpenAPI: `price-desc (highest first)`.
- **Suggested fix:** Sort `price-desc` descending by price.

### F-18. Plant detail `rating` is a string instead of a number

- **Where:** `GET /api/plants/{plantId}` — Plant schema
- **Category:** The contract
- **Impact:** Clients that expect a numeric `rating` get a string (e.g. `"4.7"`), so schema validation and typed consumers fail.
- **Evidence:** Hand-reproduced: `GET /api/plants/pl-monstera` → `rating` type `str` value `'4.7'` (executed). Failing test: `tests/api/plants.spec.ts` — "GET /api/plants/{plantId} returns a plant that matches Plant" (`test.fail`; OpenAPI `Plant.rating` is number).
- **Contradicts:** OpenAPI `Plant` / `PlantSummary`: `rating` is a number.
- **Suggested fix:** Return `rating` as a number (do not `toFixed` into a string on the wire).

### F-19. Review average for 5, 4, 5 shows 4.6 instead of 4.7

- **Where:** `GET /api/plants/{plantId}/reviews` average (and the plant page Reviews summary)
- **Category:** Business rules in the API
- **Impact:** Seeded Snake Plant reviews (5+4+5) show average **4.6** instead of the documented halves-up **4.7**.
- **Evidence:** Executed: `tests/api/plant-reviews.spec.ts` — "M1 GET pl-snake reviews returns average 4.7…"; `tests/e2e/plant-reviews.spec.ts` — "E1 signed-out pl-snake shows Reviews average…". API/UI both return/show `4.6`.
- **Contradicts:** `docs/features/plant-reviews.md`: “The average is rounded to one decimal, halves up… 5, 4 and 5… **4.7**.”
- **Suggested fix:** Round halves away from zero / up at one decimal (not banker's / truncating to 4.6).

### F-20. Any signed-in customer can delete any review

- **Where:** `DELETE /api/reviews/{reviewId}`
- **Category:** Authorization
- **Impact:** Ava can delete Ben’s review and a guest seed review (HTTP `204`) instead of `404` “Review not found”, so authorship/privacy for deletes is broken.
- **Evidence:** Executed: `tests/api/plant-reviews.spec.ts` — "P1 Ava cannot delete Ben’s review or a guest review" — Ava `DELETE` on Ben’s review and on `rv-seed-1` each returned `204`; those ids disappeared from the next GET.
- **Contradicts:** `docs/features/plant-reviews.md`: “Only the author can delete a review. Anyone else gets ‘Review not found’.” OpenAPI DELETE: author-only; others 404.
- **Suggested fix:** Authorize delete by review author (guest/`userId` null never deletable by a customer); return 404 with detail “Review not found” and no `rule`.

### F-21. Star rating radios lack `aria-checked` and keyboard support

- **Where:** `StarRatingInput` (`web/src/components/StarRatingInput.tsx`) — plant page Write a review
- **Category:** Accessibility
- **Impact:** Keyboard and screen-reader users cannot set or hear the selected star rating, so they cannot review.
- **Evidence:** Executed:
  - `web/cypress/component/StarRatingInput.cy.tsx` — C3-02, C3-04, C3-05 (no `aria-checked`; Tab does not focus stars; no arrow-key behaviour)
  - `web/cypress/ui/plant-reviews.cy.ts` — U1-08 (`tabIndex` −1 on star radios)
  - `tests/e2e/plant-reviews.spec.ts` — E1 star group keyboard focus
  - `tests/a11y/plant-reviews.spec.ts` — X1 write-form / post / validation scans: new blocking axe `aria-required-attr` on each star `role="radio"`
- **Contradicts:** `docs/features/plant-reviews.md`: “Tab moves into it, the arrow keys change the rating, and a screen reader announces which star is selected.” `docs/PRODUCT.md` keyboard-only and named controls.
- **Suggested fix:** Real radio-group behaviour: `aria-checked`, roving `tabIndex`, arrow keys, visible focus.

### F-22. Reviews list does not refresh after a successful post

- **Where:** Plant page reviews slot (`web/src/slots/plant-page/reviews.tsx`)
- **Category:** Caching
- **Impact:** After posting, the thanks toast appears but the list/average stay stale until a full reload.
- **Evidence:** Executed: `web/cypress/ui/plant-reviews.cy.ts` U1-02 (no second `GET …/reviews` after POST); `tests/e2e/plant-reviews.spec.ts` — “E1 Ava posts on pl-fiddle…” (thanks visible; average/text of the new review not on the page without reload). Inspected: invalidate key `['review', plant.id]` vs query key `['reviews', plant.id]`.
- **Contradicts:** `docs/features/plant-reviews.md`: “After posting, the review appears in the list right away.”
- **Suggested fix:** Invalidate `['reviews', plantId]` (match the query key).

## Suspicions — not yet tested

Things that look different from `docs/PRODUCT.md` (or the API contract) but do not yet have a failing Fernly test proving them. "Seen" means it showed up once on the walk; "code" means it comes from reading the source only.

- **Plant page after a "Likes the same light" link** (Caching) — seen: address bar `/plants/pl-fiddle` while the page still showed Bird of Paradise; code: `usePlant` caches under `['plant']` without `plantId`. *May contradict:* "The plant page always shows the plant in the address bar, including after following a "Likes the same light" link."
- **Page titles** (Accessibility) — seen: every page has the title "Fernly — plants for every windowsill". *May contradict:* WCAG 2.4.2 Page Titled under the PRODUCT AA aim.
- **Order page after signing out and in as another customer** (Caching / Authorization) — code: sign-out drops cached cart and order list but not `['order', id]`. *May contradict:* "Signing out forgets the session on this device." (cross-customer `GET` itself is **F-15**).
- **Plant page quantity after a "Likes the same light" link** (Pages) — code: quantity and size state are not reset when `plantId` changes. *May contradict:* "**Quantity** starts at 1 …"

## Questions — neither document answers

- Should a placed order's "Paid" summary say "Add $x more for free shipping."? It did on the walk (OD-A1).
- Should `/orders` and `/orders/:orderId` call the API while signed out? Both can, and get 401, before redirecting to sign in (OR-A1 / OD-A2).
- Should `POST /api/admin/reset` work without signing in? The contract declares no security for it.
- Should `/login?next=//other-site.example` be allowed? `next` is only checked for a leading `/`.
- Should the checkout accept fields that are only spaces? The form has `noValidate`, and the contract only asks for `minLength`.
- Should a signed-in customer who opens `/login` or `/register` be redirected? The form shows again.
- Promo plan rows **Q1–Q4** (`docs/test-plans/feature/promo-codes.md`): spaces around a code; a discount with no code; free-shipping hint while `FREESHIP` is applied under $50; what happens to the code after the last plant is removed. Neither `PRODUCT.md` nor `docs/features/promo-codes.md` answers these — no tests written.
- Plant-reviews plan rows **Q1–Q5** (`docs/test-plans/feature/plant-reviews.md`): exact empty-state sentence; exact thanks toast wording; whether the plant page exposes a delete control; exact `already_reviewed` / author-mismatch `detail` beyond “Review not found”; whether the UI hides **Write a review** after the customer already reviewed. No tests written (`assumed — ask`).
- Does the Orders list UI re-sort if the fixture/API array is oldest-first, or must the payload already be newest-first? (OR-A2)

## Rules to prove next

- Remaining sort modes (featured, price-asc, name, best rated) through `GET /api/plants` and the UI (`price-desc` is **F-17**).
- Cart line `PATCH` / `DELETE` across customers (order `GET` cross-customer is **F-15**).
- "Placing an order charges the cart as it is, lowers the stock, and empties the cart." and "Orders are listed newest first."
- Search ignores case and matches Latin names; Low + Bright shows either; Pet-safe shows only pet-safe plants.
- "Passwords have at least 8 characters; an email can have only one account."
- Contract shape: remaining response fields against OpenAPI (plant detail `rating` is **F-18**).
- Page titles; order-cache after sign-out; plant quantity reset on similar-light navigation.
