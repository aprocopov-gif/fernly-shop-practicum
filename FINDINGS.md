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
  - `web/cypress/component/OrderSummary.cy.tsx` — rows that expect fixed two decimals (e.g. C1-01, C1-03)
  - `web/cypress/ui/browse.cy.ts` — "shows $0.00 for a plant priced at 0"
  - `web/cypress/ui/cart.cy.ts` — CP-01, CP-02, CP-03, CP-05 (and any other CP row that asserts `$x.xx`)
  - `web/cypress/ui/plant.cy.ts` — PL-01, PL-06
  - `web/cypress/ui/orders.cy.ts` — OR-06
  - `web/cypress/ui/order.cy.ts` — OD-01, OD-06, OD-08, OD-11
  - `web/cypress/ui/checkout-promo.cy.ts` — U2-01 (expects `$18.20`, got `$18.2`), U2-05 (expects `$12.50`, got `$12.5`)
  - Promo UI totals that require two decimals (e.g. orders promo specs)
  - `web/cypress/ui/orders-promo.cy.ts` — U3-01, U3-02 (actual `$18.2` vs expected `$18.20`)
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
  - Playwright a11y: `tests/a11y/pages.spec.ts` (Browse, Plant, Cart, Checkout) and promo a11y scans that hit Checkout/Order; report `a11y-report/` — axe rule `color-contrast` on PriceTag selectors. Cart occurrences are **baselined** in `tests/a11y/a11y-baseline.json` (owner design team, expires 2026-12-31, reason "new brand colors"); other pages remain blocking.
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
  - Promo (tagged `@known-bug`): `web/cypress/ui/cart-promo.cy.ts` (U1 rows requiring textbox name **Promo code**); `web/cypress/component/PromoCodeInput.cy.tsx` (C2-01, C2-09). UI shows **Have a promo code?** as a `<p>` and an unlabeled `<input>`.
- **Contradicts:** `docs/PRODUCT.md`: "every button and form field has a name a screen reader can announce." Approved cart promo design (`web/cypress/test-design/CartPromo.md` U1-01 / U1-09): visible label **Promo code**.
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
- **Evidence:** Executed (tagged `@known-bug` / failing a11y):
  - `web/cypress/component/PromoCodeInput.cy.tsx` — "C2-11 announces the expired message with contrast at least 4.5:1". Error text is not inside `role="alert"` or `aria-live="assertive"`.
  - `tests/a11y/promo.spec.ts` — "X1 an expired-code refusal is in an alert…" (no alert with /expired/i).
- **Contradicts:** Approved promo design / feature expectation that the error is announced when it appears; `docs/PRODUCT.md` WCAG AA aim for operable, understandable feedback on forms.
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

## Suspicions — possible findings (awaiting human confirmation)

Things that look different from `docs/PRODUCT.md`, `docs/features/promo-codes.md`, or the API contract. Entries with **executed** evidence failed under the approved promo-codes plan; do not add `@known-bug` until a human confirms. "Seen" / "code" / "inspected" means not yet proven by a Fernly test.

### F-12. `LEAFY10` takes 10% off plants **and** shipping

- **Where:** `POST /api/cart/promo` percentage discount — **Business rules in the API**
- **Impact:** Customers are undercharged on the discount line (or totals disagree with the feature doc): e.g. Small Pothos discount `1.95` instead of `1.25` (10% of 12.50 + 6.95).
- **Evidence:** Executed — `tests/api/promo-codes.spec.ts` M1 (Pothos, cutting, fiddle, qty 2), M3 ($50 bird), M4 / SCH1 order money fields, B1 `leafy10`; `tests/e2e/promo-codes.spec.ts` E1 leafy10 flow (missing `−$1.25` / `$18.20`). Checkout/Order axe HTML shows totals like `$17.5` for a Pothos+LEAFY10 cart.
- **Contradicts:** `docs/features/promo-codes.md` / OpenAPI: percentage off the plant subtotal, **never** off shipping.
- **Suggested fix:** Base the percentage on plant subtotal only; leave shipping out of the discount.

### F-13. Free shipping at exactly $50.00 is not granted

- **Where:** Cart shipping calculation — **Business rules in the API**
- **Impact:** A cart at the free-shipping line (Bird of Paradise size S, subtotal 50.00) still pays `$6.95`.
- **Evidence:** Executed — `tests/api/promo-codes.spec.ts` “SCH1 a $50.00 Bird of Paradise with no code ships free” (shipping `6.95`, expected `0`). M3 LEAFY10 on that cart also discounts as if shipping were charged (`5.70` = 10% of 50 + 6.95). Code/inspected: `subtotal > FREE_SHIPPING_FROM` (strict greater than 50).
- **Contradicts:** `docs/PRODUCT.md`: free when the subtotal is **$50.00 or more**.
- **Suggested fix:** Use `>=` for the free-shipping threshold.

### F-14. Expired `SPRING5` is accepted instead of refused

- **Where:** `POST /api/cart/promo` — **Business rules in the API**
- **Impact:** Customers can still apply an expired code; refusal UI and screen-reader announcement never appear.
- **Evidence:** Executed — `tests/api/promo-codes.spec.ts` N1 `SPRING5` and `spring5` return **200** (expected 400 `promo_invalid`); `tests/e2e/promo-codes.spec.ts` E1 expired (no alert with /expired/); `tests/a11y/promo.spec.ts` X1 expired refusal (same). Feature table: `SPRING5` expired 30 Apr 2026.
- **Contradicts:** `docs/features/promo-codes.md` / OpenAPI: expired codes refused with `promo_invalid` and an expired message.
- **Suggested fix:** Reject expired catalog codes with `promo_invalid` and an “expired” detail.

### F-15. Another customer can open someone else’s order (200 instead of 404)

- **Where:** `GET /api/orders/{orderId}` — **Authorization**
- **Impact:** Ben can read Ava’s order (including `promoCode` / `discount`) instead of “Order not found”.
- **Evidence:** Executed — `tests/api/promo-codes.spec.ts` P1: Ben’s `GET /api/orders/{orderId}` for Ava’s order returned **200**, expected **404**.
- **Contradicts:** `docs/PRODUCT.md` / `docs/APP-MAP.md`: only the customer who placed the order can see it; anyone else gets 404 (no `rule`).
- **Suggested fix:** Scope order fetch to the authenticated customer; return 404 for others.

### F-16. Cart cannot apply a replacement code without Remove first

- **Where:** `PromoCodeInput` / cart promo slot — **Pages**
- **Impact:** After a code is applied, only Remove is shown; the customer cannot type a new code to replace it in one step.
- **Evidence:** Executed — `tests/e2e/promo-codes.spec.ts` “E1 FREESHIP replaces LEAFY10…” (promo textbox gone after LEAFY10). Inspected / U1-08 tagged `@known-bug` (also blocked by F-07 unlabeled field). API **does** replace on a second `POST` (B1 passed).
- **Contradicts:** `docs/features/promo-codes.md`: applying a new code replaces the old one.
- **Suggested fix:** Keep an apply field available while a code is applied, or document that Remove is required before a new code.

### Other suspicions (not yet proven by a Fernly test)

- **Plant page after a "Likes the same light" link** (Caching) — seen: address bar `/plants/pl-fiddle` while the page still showed Bird of Paradise; code: `usePlant` caches under `['plant']` without `plantId`. *May contradict:* "The plant page always shows the plant in the address bar, including after following a "Likes the same light" link."
- **Price: high to low sorts cheapest first** (Business rules in the API) — seen via API: `GET /api/plants?sort=price-desc` first item Succulent Cutting at $0.99; code: `price-desc` shares the ascending comparator with `price-asc`. *May contradict:* "**Price: high to low (most expensive first)**." OpenAPI: `price-desc (highest first)`.
- **Plant detail `rating` is a string** (The contract) — code/API: `getPlant` sets `rating: plant.rating.toFixed(1)` (e.g. `"4.1"`). *May contradict:* OpenAPI `Plant` / `PlantSummary`: `rating` is a number.
- **Page titles** (Accessibility) — seen: every page has the title "Fernly — plants for every windowsill". *May contradict:* WCAG 2.4.2 Page Titled under the PRODUCT AA aim.
- **Order page after signing out and in as another customer** (Caching / Authorization) — code: sign-out drops cached cart and order list but not `['order', id]`. *May contradict:* order privacy and "Signing out forgets the session on this device."
- **Plant page quantity after a "Likes the same light" link** (Pages) — code: quantity and size state are not reset when `plantId` changes. *May contradict:* "**Quantity** starts at 1 …"

## Questions — neither document answers

- Should a placed order's "Paid" summary say "Add $x more for free shipping."? It did on the walk (OD-A1).
- Should `/orders` and `/orders/:orderId` call the API while signed out? Both can, and get 401, before redirecting to sign in (OR-A1 / OD-A2).
- Should `POST /api/admin/reset` work without signing in? The contract declares no security for it.
- Should `/login?next=//other-site.example` be allowed? `next` is only checked for a leading `/`.
- Should the checkout accept fields that are only spaces? The form has `noValidate`, and the contract only asks for `minLength`.
- Should a signed-in customer who opens `/login` or `/register` be redirected? The form shows again.
- Promo codes are in OpenAPI and the cart UI, but not in `docs/PRODUCT.md` — behaviour for codes is documented in `docs/features/promo-codes.md` instead.
- Does the Orders list UI re-sort if the fixture/API array is oldest-first, or must the payload already be newest-first? (OR-A2)

## Rules to prove next

- Remaining sort modes (featured, price-asc, name, best rated) through `GET /api/plants` and the UI — alongside `price-desc` above.
- Cart line `PATCH` / `DELETE` across customers (order privacy for GET is covered as F-15).
- "Placing an order charges the cart as it is, lowers the stock, and empties the cart." and "Orders are listed newest first."
- Search ignores case and matches Latin names; Low + Bright shows either; Pet-safe shows only pet-safe plants.
- "Passwords have at least 8 characters; an email can have only one account."
- Contract shape: every response field against the OpenAPI schemas, including two-decimal money values and numeric `rating` on plant detail.
- Page titles; order-cache after sign-out; plant quantity reset on similar-light navigation.
- Human confirmation of F-12–F-16 (then move to Findings / `@known-bug` as appropriate).
