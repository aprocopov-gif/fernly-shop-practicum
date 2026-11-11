# Fernly findings

One entry per issue, ordered by severity: money and privacy first, then broken flows, then everything else. A finding needs evidence: a failing test, or exact steps and requests. The map of the app is in [docs/APP-MAP.md](docs/APP-MAP.md).

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

### F-01. Quantity stepper's + button stays enabled at the stock limit

- **Where:** `QuantityStepper` component (`web/src/components/QuantityStepper.tsx`), used on the plant page and in cart lines
- **Category:** Components
- **Impact:** A customer can raise the quantity one above the stock left, asking for a plant the shop doesn't have.
- **Evidence:** `web/cypress/component/QuantityStepper.cy.tsx`, test "disables + at the stock limit", fails under `npm run cy:component` (executed). Mounted with `value={3}` and `max={3}`; **Increase quantity** stays enabled. Screenshot: `web/cypress/screenshots/QuantityStepper.cy.tsx/QuantityStepper -- disables + at the stock limit (failed).png`. Code: `disabled={disabled || value > max}` instead of `value >= max`.
- **Contradicts:** `docs/PRODUCT.md`: "**Quantity** starts at 1 and can never go above the stock left: at the stock limit, the **+** button is disabled."
- **Suggested fix:** Disable + when `value >= max` instead of `value > max`.

### F-02. Prices drop trailing zeros (shows `$0` instead of `$0.00`)

- **Where:** `formatPrice` (`web/src/money.ts`), used by `PriceTag` on Browse and elsewhere
- **Category:** Components
- **Impact:** Customers see prices without the promised two decimals (e.g. `$0` / `$12.5` instead of `$0.00` / `$12.50`).
- **Evidence:** `web/cypress/ui/browse.cy.ts`, test "shows $0.00 for a plant priced at 0", fails under `npm run cy:ui` (executed). Stubbed catalog plant at price `0`; card renders `$0`. Screenshot: `web/cypress/screenshots/browse.cy.ts/Browse page -- shows $0.00 for a plant priced at 0 (failed).png`. Code: `formatPrice` returns `` `$${Math.round(amount * 100) / 100}` `` with no `toFixed(2)`.
- **Contradicts:** `docs/PRODUCT.md`: "Every price is shown in dollars with **two decimals**, everywhere: `$12.50`, never `$12.5`."
- **Suggested fix:** Format with `toFixed(2)` (or equivalent) in `formatPrice`.

### F-03. Catalog load failure looks like an empty filter result

- **Where:** Browse page (`web/src/pages/BrowsePage.tsx`)
- **Category:** Pages
- **Impact:** When the catalog API fails, customers see "No plants match your filters" with no way to retry, as if search returned nothing.
- **Evidence:** `web/cypress/ui/browse.cy.ts`, test "shows an error with Try again when the catalog cannot be loaded", fails under `npm run cy:ui` (executed). Intercepted `GET /api/plants?*` with 500; page shows EmptyState "No plants match your filters" / "0 plants", no `role="alert"`, no **Try again**. Screenshot: `web/cypress/screenshots/browse.cy.ts/Browse page -- shows an error with Try again when the catalog cannot be loaded (failed).png`. Code: `plants.isError || !data?.items.length` both render the same EmptyState.
- **Contradicts:** `docs/PRODUCT.md`: "If the catalog can't be loaded, the page says so and offers **Try again**. It never pretends there are no plants."
- **Suggested fix:** On `plants.isError`, render `ErrorBanner` with retry (as Cart does) instead of EmptyState.

## Suspicions — not yet tested

Things that look different from `docs/PRODUCT.md` (or the API contract), from reading the code and walking the app once. Each one needs a test before it becomes a finding. "Seen" means it showed up once on the walk; "code" means it comes from reading the source only.

- **Plant page after a "Likes the same light" link** (Caching) — seen: address bar `/plants/pl-fiddle` while the page still showed Bird of Paradise at $50 / 5 in stock; code: `usePlant` caches under `['plant']` without `plantId`. *May contradict:* "The plant page always shows the plant in the address bar, including after following a "Likes the same light" link."
- **`CareLevelBadge` for level 3** (Components) — seen: Fiddle Leaf Fig, Calathea Orbifolia, and String of Pearls cards say "Moderate care"; code: `LABELS[Math.min(level, LABELS.length - 1) - 1]` caps the index at Moderate. *May contradict:* "Care level has three steps: 1 **Easy**, 2 **Moderate**, 3 **Expert**." and OpenAPI `careLevel` "1 Easy, 2 Moderate, 3 Expert."
- **Price: high to low sorts cheapest first** (Business rules in the API) — seen via API: `GET /api/plants?sort=price-desc` first item Succulent Cutting at $0.99; code: `price-desc` shares the ascending comparator with `price-asc`. *May contradict:* "**Price: high to low (most expensive first)**." OpenAPI: `price-desc (highest first)`.
- **Plant detail `rating` is a string** (The contract) — code/API: `getPlant` sets `rating: plant.rating.toFixed(1)` (e.g. `"4.1"`). *May contradict:* OpenAPI `Plant` / `PlantSummary`: `rating` is a number.
- **Free shipping at exactly $50.00** (Business rules in the API) — code: `subtotal > FREE_SHIPPING_FROM` (strict greater than 50), so Bird of Paradise at $50.00 still gets `$6.95` shipping. *May contradict:* "Shipping costs $6.95, and is free when the subtotal is $50.00 or more."
- **Plant card save buttons have no accessible name** (Accessibility) — seen: browse heart controls are unnamed buttons with only `aria-pressed`. *May contradict:* "every button and form field has a name a screen reader can announce."
- **Plant detail hero image has no `alt`** (Accessibility) — code: `<img src={data.imageUrl} className={styles.heroImage} />` with no `alt`. *May contradict:* "every meaningful image has alternative text."
- **Search box input** (Accessibility) — seen: accessibility tree lists a `searchbox` with no name; code: "Search plants" is a visual hint, not a label. *May contradict:* "every button and form field has a name a screen reader can announce."
- **Search box focus** (Accessibility) — code: `.input { outline: none; }` in `SearchBox.module.css`, with no other focus style. *May contradict:* "everything works with the keyboard alone, and focus is always visible."
- **Page titles** (Accessibility) — seen: every page, including Cart, Checkout, Order, and "Page not found", has the title "Fernly — plants for every windowsill". *May contradict:* "Fernly aims for **WCAG 2.1 level AA** on every page" (WCAG 2.4.2 Page Titled).
- **Order page after signing out and in as another customer** (Caching / Authorization) — code: sign-out drops cached cart and order list but not `['order', id]`, so the second customer may briefly see the first customer's order from the cache. *May contradict:* "An order is private: only the customer who placed it can see it. Anyone else gets "Order not found"" and "Signing out forgets the session on this device."
- **Plant page quantity after a "Likes the same light" link** (Pages) — code: quantity and size are component state that is not reset when `plantId` changes. *May contradict:* "**Quantity** starts at 1 …"
- **Promo code field has no accessible name** (Accessibility) — seen on cart: unnamed textbox next to Apply; PRODUCT does not describe promos, but the a11y bar still applies. *May contradict:* "every button and form field has a name a screen reader can announce."

### Rules to prove next

- Remaining sort modes (featured, price-asc, name, best rated) through `GET /api/plants` and the UI — alongside `price-desc` above.
- Shipping just below $50, and at exactly $50, with and without a free-shipping promo.
- Order privacy: another signed-in customer’s `GET /api/orders/{orderId}`; cart line `PATCH` / `DELETE` across customers.
- "Placing an order charges the cart as it is, lowers the stock, and empties the cart." and "Orders are listed newest first."
- Search ignores case and matches Latin names; Low + Bright shows either; Pet-safe shows only pet-safe plants.
- "Passwords have at least 8 characters; an email can have only one account."
- Promo percentage vs shipping (OpenAPI / `docs/features/promo-codes.md`: never off shipping); expired codes (`SPRING5`).
- Contract shape: every response field against the OpenAPI schemas, including two-decimal money values and numeric `rating` on plant detail.

### Questions — neither document answers

- Should a placed order's "Paid" summary say "Add $37.5 more for free shipping."? It did on the walk.
- Should `/orders` and `/orders/:orderId` call the API while signed out? Both can, and get 401, before redirecting to sign in.
- Should `POST /api/admin/reset` work without signing in? The contract declares no security for it.
- Should `/login?next=//other-site.example` be allowed? `next` is only checked for a leading `/`.
- Should the checkout accept fields that are only spaces? The form has `noValidate`, and the contract only asks for `minLength`.
- Should a signed-in customer who opens `/login` or `/register` be redirected? The form shows again.
- Promo codes are in OpenAPI and the cart UI, but not in `docs/PRODUCT.md` — behaviour for codes is documented in `docs/features/promo-codes.md` instead.
