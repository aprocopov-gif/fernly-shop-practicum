# QuantityStepper — test design

Component: `web/src/components/QuantityStepper.tsx`. Props: `value: number`, `onChange: (value: number) => void`, `max: number`, optional `min` (default 1), optional `disabled` (default false), optional `label` (default `Quantity`).

Used on: `PlantPage`, `CartLine` (Cart).

Status: **approved** — human approved in chat. Spec already exists at `web/cypress/component/QuantityStepper.cy.tsx` for a subset of rows (QS-03, QS-04, QS-05, QS-06); align or extend that file from this full table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| QS-01 | render | `value={2}`, `max={5}`, default label | looks | group named **Quantity**; visible value **2** | APP-MAP.md QuantityStepper; PRODUCT.md quantity starts at 1 (parent sets value) | equivalence class: mid-range |
| QS-02 | render | `label="Quantity of Pothos"`, `value={1}`, `max={5}` | looks | group accessible name is **Quantity of Pothos** | APP-MAP.md CartLine label `Quantity of {name}` | equivalence class: custom label |
| QS-03 | interaction | `value={2}`, `max={5}`, `onChange` spy | clicks **Increase quantity** | `onChange` called once with `3` | the component's purpose | callback |
| QS-04 | interaction | `value={2}`, `max={5}`, `onChange` spy | clicks **Decrease quantity** | `onChange` called once with `1` | the component's purpose | callback |
| QS-05 | boundary | `value={1}`, `min={1}`, `max={5}` | looks | **Decrease quantity** is disabled; **Increase quantity** is enabled | PRODUCT.md: quantity starts at 1 (cannot go below) | boundary: at min |
| QS-06 | boundary | `value={3}`, `max={3}` | looks | **Increase quantity** is disabled | PRODUCT.md: "at the stock limit, the **+** button is disabled" | boundary: at max (stock) |
| QS-07 | boundary | `value={1}`, `max={1}` | looks | both **Decrease** and **Increase** are disabled | PRODUCT.md min 1 and stock limit | boundary: min equals max |
| QS-08 | state | `value={2}`, `max={5}`, `disabled={true}` | looks | both buttons are disabled | APP-MAP.md Cart busy disables steppers | state: disabled |
| QS-09 | interaction | `value={2}`, `max={5}`, `disabled={true}`, `onChange` spy | clicks Increase (if possible) | `onChange` is not called | same | state: disabled + callback |
| QS-10 | accessibility | `value={2}`, `max={5}` | inspects | **Decrease quantity** and **Increase quantity** have those accessible names; value is in an `output` with `aria-live="polite"` | APP-MAP.md; PRODUCT.md every button has a name | accessibility basics: name and live region |
| QS-11 | boundary | `value={0}`, `min={1}`, `max={5}` | looks | assumed — ask: should − stay disabled when value is already below min? | no document says | boundary: value below min |
| QS-12 | boundary | `value={5}`, `max={3}` | looks | assumed — ask: should + be disabled when value is already past max? | no document says (code uses `value > max`) | boundary: value above max |

## Expected to fail today (executed)

QS-06 fails today: `disabled={disabled || value > max}` leaves + enabled at `value === max` (FINDINGS.md F-01).

## Out of scope

Cart PATCH / Plant Add-to-cart API; parent clamping of quantity after a failed request.
