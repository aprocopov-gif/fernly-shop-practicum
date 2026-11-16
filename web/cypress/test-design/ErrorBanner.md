# ErrorBanner — test design

Component: `ErrorBanner` in `web/src/components/Feedback.tsx`. Props: `message: string`, optional `onRetry`.

Used on: Plant, Cart, Checkout, Orders, Order, Login, Register.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| EB-01 | render | `message="Your cart couldn't be loaded."`, no `onRetry` | looks | text of the message is visible; no **Try again** button | APP-MAP.md ErrorBanner; PRODUCT.md catalog error offers Try again when retry exists (page decides) | equivalence class: message only |
| EB-02 | render | same message, `onRetry` spy | looks | **Try again** is present | PRODUCT.md: "offers **Try again**"; APP-MAP.md | equivalence class: retry present |
| EB-03 | interaction | `onRetry` spy | clicks **Try again** | `onRetry` called once | the component's purpose | callback |
| EB-04 | accessibility | `message="The plant couldn't be loaded."`, with retry | inspects | container has `role="alert"`; **Try again** has an accessible name | APP-MAP.md `role="alert"`; PRODUCT.md button names | accessibility basics: alert role and name |
| EB-05 | accessibility | EB-02 on page background | looks at the banner text | text colour against its background is at least 4.5:1 | PRODUCT.md contrast 4.5:1 | accessibility basics: contrast |
| EB-06 | boundary | `message=""` | looks | assumed — ask: empty alert still rendered? | no document says | boundary: empty message |

## Out of scope

Which pages pass `onRetry` (Browse currently does not — F-03). Login/Register error `detail` wording from the API.
