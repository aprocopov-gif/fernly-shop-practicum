# LightFilter — test design

Component: `web/src/components/LightFilter.tsx`. Props: `value: Light[]`, `onChange: (value: Light[]) => void`.

Used on: `BrowsePage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| LF-01 | render | `value={[]}` | looks | fieldset **Light**; checkboxes **Low light**, **Medium light**, **Bright light**; all unchecked | APP-MAP.md LightFilter; PRODUCT.md light filters | equivalence class: none selected |
| LF-02 | state | `value={['low', 'bright']}` | looks | Low and Bright checked; Medium unchecked | PRODUCT.md: "Light filters can be combined: choosing Low and Bright shows plants for either." | equivalence class: combined selection |
| LF-03 | interaction | `value={[]}`, `onChange` spy | checks **Low light** | `onChange` called once with `['low']` | the component's purpose | callback |
| LF-04 | interaction | `value={['low']}`, `onChange` spy | checks **Bright light** | `onChange` called once with `['low', 'bright']` (order: existing then newly added) | PRODUCT.md combined filters | callback: add |
| LF-05 | interaction | `value={['low', 'bright']}`, `onChange` spy | unchecks **Low light** | `onChange` called once with `['bright']` | the component's purpose | callback: remove |
| LF-06 | interaction | `value={['medium']}`, `onChange` spy | unchecks **Medium light** | `onChange` called once with `[]` | the component's purpose | boundary: last filter cleared |
| LF-07 | accessibility | `value={[]}` | inspects / keyboard | fieldset named **Light**; each checkbox has an accessible name matching its label; focus is visible | PRODUCT.md form field names + keyboard + focus | accessibility basics: name and focus |

## Out of scope

Which plants Browse returns for Low+Bright (API / page). This component only toggles the `Light[]` selection.
