# EmptyState — test design

Component: `EmptyState` in `web/src/components/Feedback.tsx`. Props: `title: string`, optional `message`, optional `action` (ReactNode).

Used on: Browse, Plant, Cart, Checkout, Orders, Order, not-found route.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| ES-01 | render | `title="Your cart is empty"` | looks | level-2 heading **Your cart is empty**; decorative 🌱 is `aria-hidden` | APP-MAP.md EmptyState; PRODUCT.md empty cart copy lives on the page | equivalence class: title only |
| ES-02 | render | `title="No plants match your filters"`, `message="Try another search or clear a filter."` | looks | heading plus the message paragraph | APP-MAP.md Browse empty | equivalence class: title + message |
| ES-03 | render | `title="Your cart is empty"`, `action={<a href="/">Browse plants</a>}` | looks / activates | the action link **Browse plants** is present and usable | APP-MAP.md Cart empty + Browse plants | equivalence class: optional action |
| ES-04 | render | title only, no `message`, no `action` | looks | no empty message paragraph; no action | the component's purpose | equivalence class: optionals absent |
| ES-05 | accessibility | ES-02 props | inspects | heading is an `h2`; icon not announced | PRODUCT.md meaningful structure / decorative hide | accessibility basics: heading and decorative |

## Out of scope

Whether Browse incorrectly uses EmptyState for catalog errors (page finding F-03). EmptyState only renders what it is given.
