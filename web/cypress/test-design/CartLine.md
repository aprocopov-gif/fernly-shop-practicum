# CartLine — test design

Component: `web/src/components/CartLine.tsx`. Props: `line: CartLine`, `onQuantityChange: (lineId, quantity) => void`, `onRemove: (lineId) => void`, optional `busy` (default false).

Used on: `CartPage`.

Status: **approved** — human approved in chat. Write component tests from this table.

Fixture plant line (unless a row says otherwise): `{ id: 'line-1', plantId: 'pl-pothos', name: 'Pothos', size: 'S', unitPrice: 12.5, quantity: 2, lineTotal: 25, stock: 10, imageUrl: '/pothos.jpg' }`.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| CA-01 | render | default line | looks | name **Pothos**; meta includes **Size S** and unit price `$12.50` with "each"; line total `$25.00`; image has empty `alt` (decorative beside the name) | APP-MAP.md CartLine; PRODUCT.md two decimals | equivalence class: in-stock line |
| CA-02 | interaction | default line, spies | clicks **Increase quantity** | `onQuantityChange` called with `('line-1', 3)` | APP-MAP.md stepper → PATCH wiring at page; component purpose | callback |
| CA-03 | interaction | default line, spies | clicks **Decrease quantity** | `onQuantityChange` called with `('line-1', 1)` | same | callback |
| CA-04 | interaction | default line, spies | clicks **Remove** | `onRemove` called with `'line-1'` | APP-MAP.md Remove | callback |
| CA-05 | boundary | `quantity: 1`, `stock: 10` | looks | Decrease is disabled; Increase enabled | PRODUCT.md quantity cannot go below 1 | boundary: min quantity |
| CA-06 | boundary | `quantity: 5`, `stock: 5` | looks | Increase is disabled (stock limit) | PRODUCT.md: "A line can never hold more than the plant's stock." + stepper rule | boundary: at stock |
| CA-07 | state | `busy={true}` | looks | Quantity stepper buttons and **Remove** are disabled | APP-MAP.md: "while a change is being saved, every stepper and Remove button is disabled" | state: busy |
| CA-08 | accessibility | default line | inspects | stepper group name is **Quantity of Pothos**; Remove button accessible name is **Remove Pothos**; unit price has screen-reader label **Price each**; line total has **Line total** | APP-MAP.md; PRODUCT.md every button/field has a name | accessibility basics: name |
| CA-09 | render | `size: 'L'`, `unitPrice: 24.99` | looks | meta shows **Size L** and `$24.99` | the component's purpose | equivalence class: other size |

## Out of scope

Cart page toast on rejected PATCH; empty cart; OrderSummary; promo. QuantityStepper internals beyond what CartLine configures (max = stock, busy, label).
