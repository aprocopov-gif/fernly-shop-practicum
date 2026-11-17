# SizePicker — test design

Component: `web/src/components/SizePicker.tsx`. Props: `sizes: { label: SizeLabel; priceDelta: number }[]`, `value: SizeLabel`, `onChange: (size: SizeLabel) => void`, optional `name` (default `size`).

Used on: `PlantPage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| SZ-01 | render | sizes S/M/L with deltas `0`, `6`, `12`; `value="S"` | looks at the fieldset | legend **Size**; radios named via **Small** / **Medium** / **Large**; Small shows **Base price**; Medium shows `+$6.00`; Large shows `+$12.00` | PRODUCT.md: "Sizes: Small is the base price; Medium and Large add the amount shown." + two-decimals line | equivalence class: base vs positive delta |
| SZ-02 | state | same sizes, `value="M"` | looks | Medium radio is checked; Small and Large are not | the component's purpose | state: selected value |
| SZ-03 | interaction | same sizes, `value="S"`, `onChange` spy | chooses **Large** | `onChange` called once with `"L"` | the component's purpose | callback |
| SZ-04 | boundary | sizes include `{ label: 'S', priceDelta: 0 }` only | looks | one option, **Small** with **Base price** | the component's purpose | boundary: single size |
| SZ-05 | boundary | `{ label: 'M', priceDelta: 0 }` | looks | Medium shows **Base price** (delta not > 0) | the component's purpose (`priceDelta > 0` → plus, else Base price) | boundary: zero delta on non-Small |
| SZ-06 | boundary | `{ label: 'L', priceDelta: 0.5 }` | looks | delta text is `+$0.50` | PRODUCT.md two decimals | boundary: one-decimal delta via `formatPrice` |
| SZ-07 | accessibility | sizes S/M/L, `value="S"` | uses the keyboard / inspects | fieldset has accessible name **Size**; each radio has an accessible name that includes the size name; focus is visible on a radio | PRODUCT.md: every form field has a name; keyboard and focus visible | accessibility basics: name and focus |
| SZ-08 | render | `name="plant-size"` | inspects the radios | each radio's `name` attribute is `plant-size` | the component's purpose (default `size`) | equivalence class: custom name |

## Expected to fail today (inspected, not yet tested)

`formatPrice` drops trailing zeros, so SZ-01 Medium may show `+$6` / SZ-06 `+$0.5` instead of `+$6.00` / `+$0.50` (same F-02 / formatPrice issue; SizePicker calls `formatPrice` directly).

## Out of scope

How PlantPage recomputes the displayed price from the chosen size; stock limits; Add to cart.
