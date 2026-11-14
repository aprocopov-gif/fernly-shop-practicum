# PlantCard — test design

Component: `web/src/components/PlantCard.tsx`. Props: `plant: PlantSummary`, optional `saved` (default false), optional `onToggleSave`.

Used on: `BrowsePage`.

Status: **approved** — human approved in chat. Write component tests from this table.

Base plant (unless a row says otherwise): `{ id: 'pl-pothos', name: 'Pothos', latinName: 'Epipremnum aureum', price: 12.5, light: 'medium', careLevel: 1, petSafe: true, stock: 10, rating: 4.7, imageUrl: '/pothos.jpg' }`.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| PC-01 | render | base plant, no `onToggleSave` | looks | article shows name link **Pothos**, Latin name, **Easy care**, **Pet safe**, price `$12.50`, rating text including **4.7** and visually-hidden **out of 5**; image `alt` is **Pothos**; no save button | APP-MAP.md PlantCard; PRODUCT.md two decimals and care levels | equivalence class: in-stock, pet-safe, easy |
| PC-02 | render | `stock: 0` | looks | **Out of stock** overlay is visible on the image | APP-MAP.md: overlay when `stock === 0` | state: out of stock |
| PC-03 | render | `stock: 1` | looks | no **Out of stock** overlay | APP-MAP.md | boundary: one left |
| PC-04 | render | `petSafe: false`, `careLevel: 3` | looks | **Not pet safe**; care text **Expert care** | PRODUCT.md care levels + pet-safe wording | equivalence class: unsafe + expert |
| PC-05 | interaction | `onToggleSave` spy, `saved={false}` | clicks the save (heart) button | `onToggleSave` called once with `'pl-pothos'`; button `aria-pressed` is false before click | APP-MAP.md heart when `onToggleSave` is given | callback |
| PC-06 | state | `onToggleSave` spy, `saved={true}` | looks | save button `aria-pressed` is true | APP-MAP.md `aria-pressed` | state: saved |
| PC-07 | render | no `onToggleSave` | looks | save button is absent | APP-MAP.md | equivalence class: optional callback absent |
| PC-08 | interaction | base plant | activates the name link (or image link) | navigates toward `/plants/pl-pothos` | APP-MAP.md links to the plant | interaction |
| PC-09 | accessibility | base plant with `onToggleSave` | inspects the heart | the save button has an accessible name a screen reader can announce (not icon-only unnamed) | PRODUCT.md: "every button and form field has a name a screen reader can announce" | accessibility basics: name |
| PC-10 | accessibility | base plant | inspects the image | meaningful image has `alt` equal to the plant name | PRODUCT.md: "every meaningful image has alternative text" | accessibility basics: alt |
| PC-11 | boundary | `rating: 5`, `price: 0` | looks | rating shows **5.0**; price `$0.00` | PRODUCT.md two decimals; APP-MAP rating toFixed(1) | boundary: max rating / zero price |
| PC-12 | boundary | `rating: 0` | looks | rating shows **0.0** | the component's purpose | boundary: zero rating |

## Expected to fail today (inspected / related)

- PC-01 / PC-11 price: `formatPrice` / PriceTag may show `$12.5` / `$0` (F-02).
- PC-04 Expert: CareLevelBadge may show **Moderate care** for level 3 (FINDINGS suspicion).
- PC-09: heart is icon-only with `aria-pressed` and no name (FINDINGS suspicion).

## Out of scope

Browse filters, pagination, `PlantCardSlot` contents, `localStorage` hearts on the page.
