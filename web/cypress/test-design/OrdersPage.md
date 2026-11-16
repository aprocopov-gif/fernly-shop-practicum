# Orders page — test design

Page: `web/src/pages/OrdersPage.tsx` → `OrdersPage` (`/orders`).

API (from APP-MAP.md):
- `GET /api/orders` — list (APP-MAP notes this can also fire while signed out before redirect and get 401)
- Layout when a token is present: `GET /api/auth/me`, then `GET /api/cart` for the badge

Status: **approved** — human approved in chat. Spec target: `web/cypress/ui/orders.cy.ts`. Fixtures under `web/cypress/fixtures/orders/`. Every signed-in visit must stub `GET /api/auth/me` (and typically `GET /api/cart`) when `fernly_token` is set.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| OR-01 | positive | Signed in (`fernly_token` + stub `GET /api/auth/me` + stub `GET /api/cart`); `GET /api/orders` returns **two** orders, newest first (newer `createdAt` first in the array), with different totals and line counts | opens `/orders` | heading **Your orders**; two rows; each has link **Order {id}**, a date in `en-CA` style (e.g. "Nov 1, 2026"), "{n} line(s)", and total with two decimals; first row is the newer order | APP-MAP.md `/orders`; PRODUCT.md "Orders are listed newest first." + two decimals | equivalence class: normal list |
| OR-02 | negative | Signed in; `GET /api/orders` returns `[]` | opens `/orders` | EmptyState **No orders yet** / **Your orders will show up here.** | APP-MAP.md Empty | equivalence class: empty |
| OR-03 | negative | Signed in; `GET /api/orders` returns 500 | opens `/orders` | `role="alert"` **Your orders couldn't be loaded.** with **Try again**; retry re-fetches orders | APP-MAP.md Error | equivalence class: server error |
| OR-04 | negative | No token (clear `fernly_token`); do not require a successful orders body | opens `/orders` | ends on `/login?next=/orders` | APP-MAP.md Signed out redirect | equivalence class: signed out |
| OR-05 | edge | Signed in; one order whose line `name` is a very long plant name (Browse long-name spirit) | opens `/orders` | long name / row content stays within the list layout (no horizontal overflow past the row bounds) | PRODUCT.md accessibility; browse long-name precedent | boundary: extreme string length |
| OR-06 | edge | Signed in; one order with `total: 0` (and line totals 0 if shown) | opens `/orders` | total shows `$0.00` | PRODUCT.md two decimals | boundary: zero money |
| OR-07 | edge | Signed in; stub `GET /api/orders` with delay | opens `/orders` | after auth ready, shows **Loading your orders…** until the list arrives, then OR-01/OR-02 content | APP-MAP.md Loading | state: slow answer |
| OR-08 | interaction | Signed in; list as OR-01 | clicks **Order {id}** for the first row | navigates to `/orders/{id}` | APP-MAP.md Order {id} link | interaction: navigation |
| OR-09 | accessibility | Signed in; list as OR-01 | inspects | each order link has an accessible name including the order id; totals have usable text / PriceTag label | PRODUCT.md named controls | accessibility basics: name |

## Assumed — ask

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| OR-A1 | negative | No token; observe network | opens `/orders` | assumed — ask: may `GET /api/orders` still fire and 401 before redirect? (APP-MAP walk saw that) — what should the test assert beyond the login URL? | APP-MAP walk note; PRODUCT silent | edge: signed-out request |
| OR-A2 | edge | Signed in; orders array sorted oldest-first in the fixture | opens `/orders` | assumed — ask: does the UI re-sort, or must the fixture already be newest-first like the API? | PRODUCT says listed newest first | boundary: fixture order |

## Out of scope

- **Order detail** (`/orders/:orderId`) — separate page (`OrderPage`); design when asked (privacy 404, Paid summary, `?placed=1`).
- Promo-on-order UI (`OrdersPromo.md` / `orders-promo.cy.ts`) — already covered elsewhere.
- Checkout placing an order end-to-end.

## Fixture sketch

- `orders/two-orders.json` — array, newer first.
- `orders/empty.json` — `[]`.
- `orders/one-long-name.json`; `orders/zero-total.json`.
- Reuse `cart/me-user.json` for `/api/auth/me`; empty or minimal cart for badge.
