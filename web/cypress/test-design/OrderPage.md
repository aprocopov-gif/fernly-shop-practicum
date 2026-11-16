# Order detail page — test design

Page: `web/src/pages/OrdersPage.tsx` → `OrderPage` (`/orders/:orderId`).

API (from APP-MAP.md):
- `GET /api/orders/{orderId}` — the order (APP-MAP walk: also sent while signed out before redirect → 401)
- Layout when a token is present: `GET /api/auth/me`, then `GET /api/cart` for the badge

Status: **approved** — human approved in chat. Spec target: `web/cypress/ui/order.cy.ts`. Fixtures under `web/cypress/fixtures/orders/` (detail objects, not list arrays). Every signed-in visit must stub `GET /api/auth/me` (and typically `GET /api/cart`) when `fernly_token` is set.

There is **no empty-order body** on this page (APP-MAP: Empty N/A). Missing / private orders use **404** as the empty-like case.

Overlap: `OrdersPromo.md` / `orders-promo.cy.ts` already covers promo **Paid** discount (U3-01), signed-out detail (U3-04), 404 (U3-05), 500 (U3-06), and Paid a11y contrast (U3-08). This table is the page’s core product coverage; the writer may reuse promo fixtures where shapes match, but should still implement OD rows below (or skip only if a row is an exact duplicate of an existing passing U3 test — prefer implementing OD-* in `order.cy.ts` for a clear page suite).

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| OD-01 | positive | Signed in (`fernly_token` + stub `GET /api/auth/me` + stub `GET /api/cart`); `GET /api/orders/ord-plain` returns one placed order: one or more lines (`"{qty} × {name} (size {S/M/L})"`), `subtotal` / `shipping` / `total` with two-decimal money, `discount` 0, `promoCode` null, shipping address with full name + city | opens `/orders/ord-plain` | heading **Order ord-plain**; "Placed {en-CA date} · Ships to {fullName}, {city}"; each line shown as above with line total `$x.xx`; **Paid** summary region with Subtotal, Shipping (price or **Free** per given shipping), Total — **no** Discount row | APP-MAP.md `/orders/:orderId`; PRODUCT.md two decimals | equivalence class: normal owned order |
| OD-02 | negative | Signed in; `GET /api/orders/ord-missing` returns **404** | opens `/orders/ord-missing` | EmptyState **Order not found** and link **Back to your orders** → `/orders` | APP-MAP.md Not found; PRODUCT.md: "An order is private: only the customer who placed it can see it. Anyone else gets \"Order not found\"." | equivalence class: missing / not owned (empty-like) |
| OD-03 | negative | Signed in; `GET /api/orders/ord-plain` returns **500** | opens `/orders/ord-plain` | `role="alert"` **The order couldn't be loaded.** with **Try again**; retry re-fetches the order | APP-MAP.md Other error | equivalence class: server error |
| OD-04 | negative | No `fernly_token` | opens `/orders/ord-plain` | ends on `/login?next=/orders/ord-plain` | APP-MAP.md Signed out redirect | equivalence class: signed out |
| OD-05 | edge | Signed in; order line with a very long plant `name` | opens the order | long name stays within the line / layout (no horizontal overflow past the content bounds) | PRODUCT.md accessibility; browse long-name precedent | boundary: extreme string length |
| OD-06 | edge | Signed in; order with `total: 0`, line totals / subtotal 0 as needed | opens the order | Paid total (and visible money) shows `$0.00` | PRODUCT.md two decimals | boundary: zero money |
| OD-07 | edge | Signed in; stub order GET with delay | opens `/orders/ord-plain` | after auth ready, shows **Loading order…** until the response, then OD-01 content | APP-MAP.md Loading | state: slow answer |
| OD-08 | positive | Signed in; same order as OD-01; URL has `?placed=1` | opens `/orders/ord-plain?placed=1` | `role="status"` text **Thank you! Your order is placed.** plus the OD-01 order content | APP-MAP.md `?placed=1` thank-you | equivalence class: just-placed |
| OD-09 | positive | Signed in; order with `shipping: 0`, `itemCount`/lines present, subtotal ≥ 50 (or shipping already 0 in fixture) | opens the order | Paid summary shows shipping as **Free** | PRODUCT.md free shipping at $50+; APP-MAP.md Free when shipping is 0 and there are items | boundary: free shipping on paid summary |
| OD-10 | interaction | Signed in; 404 state as OD-02 | clicks **Back to your orders** | navigates to `/orders` | APP-MAP.md Back to your orders | interaction: navigation |
| OD-11 | accessibility | Signed in; order as OD-01 | inspects | page heading names the order; Paid summary region is named by heading **Paid**; line totals usable via PriceTag / text | PRODUCT.md named content; APP-MAP.md title Paid | accessibility basics: name |

## Assumed — ask

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| OD-A1 | edge | Signed in; Paid summary with subtotal under $50 | opens a placed order | assumed — ask: should the free-shipping hint ("Add $x more…") appear on a **Paid** order summary? (FINDINGS questions; walk saw it) | neither PRODUCT nor APP-MAP says for Paid | edge: post-purchase hint |
| OD-A2 | negative | No token; observe network | opens `/orders/ord-plain` | assumed — ask: may `GET /api/orders/{id}` still fire and 401 before redirect? What to assert beyond login URL? | APP-MAP walk note | edge: signed-out request |
| OD-A3 | negative | Signed in as customer A; order id belonging to B returns 404 | opens that id | same UI as OD-02 (already PRODUCT privacy) — keep OD-02; no separate expected unless we want two fixtures labeled "missing" vs "other customer" | PRODUCT privacy line | equivalence class: privacy |

## Out of scope

- Orders **list** (`OrdersPage.md` / `orders.cy.ts`).
- Promo discount row details beyond noting Discount appears when `discount > 0` — covered by `OrdersPromo.md` U3-01 / U3-07; optional OD follow-up only if you want a non-promo suite copy.
- Checkout → place order → land on `?placed=1` end-to-end (OD-08 stubs the detail GET only).
- Sign-out cache of `['order', id]` (FINDINGS suspicion) — needs a multi-session scenario, not a single mocked load.

## Fixture sketch

- `orders/order-plain.json` — full `Order` (can mirror / reuse `promo/order-plain.json`).
- `orders/order-long-name.json`; `orders/order-zero-total.json`; `orders/order-free-shipping.json`.
- 404/500: status codes with minimal body `{ "detail": "…" }` as needed.
- Reuse `cart/me-user.json` + `cart/empty.json` for auth/me and layout cart.
