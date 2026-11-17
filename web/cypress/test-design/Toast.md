# Toast — test design

Component: `Toast` in `web/src/components/Feedback.tsx`. Props: `message: string`, optional `tone` (`'success' | 'error'`, default `success`), `onClose: () => void`, optional `duration` (default 4000; `0` keeps open).

Used on: Plant, Cart.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| TO-01 | render | `message="Added to cart"`, default tone | looks | message visible; container `role="status"`; success styling class path | APP-MAP.md Toast | equivalence class: success default |
| TO-02 | render | `message="Not enough stock"`, `tone="error"` | looks | message visible; error styling | APP-MAP.md Cart change-rejected toast | equivalence class: error tone |
| TO-03 | interaction | `onClose` spy, `duration={0}` | clicks **Dismiss** | `onClose` called | APP-MAP.md Dismiss × | callback |
| TO-04 | state | `onClose` spy, `duration={50}` | waits without clicking | `onClose` is called once after ~50ms (use Cypress clock / tick; do not `cy.wait(50)` as a fixed sleep for the assertion alone without controlling time) | APP-MAP.md closes after `duration` | state: auto-dismiss |
| TO-05 | state | `onClose` spy, `duration={0}` | waits a long tick | `onClose` is not called by the timer | APP-MAP.md: "0 keeps it open" | boundary: duration 0 |
| TO-06 | accessibility | TO-01 | inspects | `role="status"`; **Dismiss** button has accessible name **Dismiss** | APP-MAP.md; PRODUCT.md every button has a name | accessibility basics: status and name |
| TO-07 | accessibility | TO-02 on its background | looks | message text contrast ≥ 4.5:1 | PRODUCT.md contrast | accessibility basics: contrast |

## Out of scope

When Plant/Cart mount a toast (page wiring). Exact toast copy from the API `detail`.
