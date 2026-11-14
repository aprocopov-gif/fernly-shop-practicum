# Plant page — test design

Page: `web/src/pages/PlantPage.tsx` (`/plants/:plantId`).

API (from APP-MAP.md):
- `GET /api/plants/{plantId}` — the plant
- `GET /api/plants?pageSize=48` — names for "Likes the same light"
- `POST /api/cart/lines` — Add to cart (signed-in only)
- Layout when a token is present: `GET /api/auth/me`, then `GET /api/cart` for the badge

Status: **approved** — human approved in chat. Spec target: `web/cypress/ui/plant.cy.ts`. Fixtures under `web/cypress/fixtures/plants/` (plant detail + list for similar links). Signed-in helpers must stub `/api/auth/me` (and usually `/api/cart`) whenever a token is set.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| PL-01 | positive | Stub `GET /api/plants/pl-pothos` with an in-stock plant (name, Latin, care, pet, light, description, price `12.5`, sizes S/M/L with deltas, stock ≥ 1, rating, `similar` ids). Stub `GET /api/plants?pageSize=*` with a list that includes those similar names. No token required for viewing. | opens `/plants/pl-pothos` | heading is the plant name; Latin name visible; care / pet / light tags; price `$12.50` for Small; Size radios and Quantity stepper (value 1); button **Add to cart**; "{n} in stock"; "Likes the same light" links for similar plants | APP-MAP.md `/plants/:plantId`; PRODUCT.md two decimals, sizes, quantity starts at 1 | equivalence class: normal in-stock plant |
| PL-02 | negative | Stub plant detail `404` `{ detail: "…" }` (list stub optional / unused) | opens `/plants/pl-missing` | EmptyState **We couldn't find that plant** and link **Back to the shop** → `/` | APP-MAP.md Not found (404) | equivalence class: missing plant (page has no empty catalog) |
| PL-03 | negative | Stub plant detail `500` | opens `/plants/pl-pothos` | `role="alert"` **The plant couldn't be loaded.** with **Try again**; retry re-fetches the plant | APP-MAP.md Other error + Try again; PRODUCT.md never pretend empty when load fails (same idea as browse) | equivalence class: server error |
| PL-04 | negative | No `fernly_token`; plant fixture as PL-01 | opens plant, clicks **Add to cart** | navigates to `/login?next=/plants/pl-pothos` (no `POST /api/cart/lines`) | PRODUCT.md: "Adding to the cart needs a signed-in customer; otherwise the shop asks you to sign in first."; APP-MAP.md Signed out | equivalence class: signed out |
| PL-05 | edge | Plant fixture with a very long `name` (Browse long-name spirit) | opens the plant | long name stays within the plant info layout (no horizontal overflow past the content column) | PRODUCT.md accessibility; browse long-name precedent | boundary: extreme string length |
| PL-06 | edge | Plant fixture with `price: 0`, Small delta 0 | opens the plant | displayed price is `$0.00` | PRODUCT.md two decimals | boundary: zero price |
| PL-07 | edge | Plant fixture with `stock: 0` | opens the plant | both stepper buttons disabled; primary button reads **Out of stock**; note **Out of stock right now.**; cannot add | PRODUCT.md: "Out-of-stock plants can't be added at all."; APP-MAP.md Out of stock | state: empty stock |
| PL-08 | positive | Signed in: set `fernly_token`, stub `GET /api/auth/me`, stub `GET /api/cart` (empty ok), plant as PL-01; stub `POST /api/cart/lines` 200 | clicks **Add to cart** | waits on POST alias; success toast mentioning the plant; stays on the plant page | APP-MAP.md Add to cart + toast; PRODUCT.md signed-in add | interaction + API alias |
| PL-09 | edge | Stub plant detail with deliberate delay (e.g. 1–2s); no fixed `cy.wait(ms)` for the assertion alone | opens `/plants/pl-pothos` | shows **Loading plant…** until the plant response, then PL-01 content | APP-MAP.md Loading | state: slow answer |
| PL-10 | accessibility | Plant as PL-01 | inspects | Size radios and Quantity −/+ have accessible names; **Add to cart** has a name. Hero image: assumed covered by PL-A1 if undocumented | PRODUCT.md every button/field has a name | accessibility basics: name |

## Assumed — ask

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| PL-A1 | accessibility | Plant as PL-01 | inspects the hero `<img>` | assumed — ask: should it have `alt` equal to the plant name? (code currently has no `alt`; FINDINGS suspicion) | no PRODUCT line for plant hero specifically | accessibility: alt |
| PL-A2 | edge | Signed in; plant with `stock: 1`; quantity at 1 | looks at **Increase quantity** | assumed — ask already answered by PRODUCT (+ disabled at stock) — skip if PL-07 / component QS cover it | — | — |

## Out of scope

- Browse filters; Cart page after add (only toast + POST on this page).
- "Likes the same light" wrong-plant cache bug (FINDINGS suspicion) — optional follow-up once PL-01 similar links exist.
- Plant feature slots (empty today).
- Component-only PriceTag / SizePicker / QuantityStepper / CareLevelBadge suites.

## Fixture sketch

- `plants/plant-pothos.json` — full `Plant` (with `description`, `sizes`, `similar`).
- `plants/plant-list-similar.json` — `PlantList` with ids named in `similar`.
- `plants/plant-404.json` / body for 500; `plants/plant-long-name.json`; `plants/plant-zero-price.json`; `plants/plant-out-of-stock.json`.
- Reuse `cart/me-user.json` (or `plants/me-user.json`) for `/api/auth/me`; empty cart fixture for layout badge when signed in.
