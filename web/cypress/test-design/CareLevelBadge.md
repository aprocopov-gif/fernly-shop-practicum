# CareLevelBadge — test design

Component: `web/src/components/CareLevelBadge.tsx`. Props: `level: 1 | 2 | 3`.

Used on: `PlantCard` (Browse), `PlantPage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| CL-01 | render | `level={1}` | looks at the badge | text includes **Easy care**; one ● shown (decorative) | PRODUCT.md: "Care level has three steps: 1 **Easy**, 2 **Moderate**, 3 **Expert**." | equivalence class: level 1 |
| CL-02 | render | `level={2}` | looks at the badge | text includes **Moderate care**; two ● | same line | equivalence class: level 2 |
| CL-03 | render | `level={3}` | looks at the badge | text includes **Expert care**; three ● | same line | equivalence class: level 3 |
| CL-04 | accessibility | `level={2}` | inspects the dots and the badge | the ● characters are `aria-hidden`; the badge has tooltip/title **How much care this plant needs**; accessible name includes **Moderate care** | APP-MAP.md CareLevelBadge; PRODUCT.md every control/meaningful text is announced | accessibility basics: name and decorative hide |
| CL-05 | accessibility | `level={1}` (and 2, 3) on page background `#f6faf3` | looks at the badge text | text colour against the background is at least 4.5:1 | PRODUCT.md: "text has enough contrast against its background (4.5:1 for normal text)" | accessibility basics: contrast |

## Expected to fail today (inspected, not yet tested)

Code: `LABELS[Math.min(level, LABELS.length - 1) - 1]` caps the index at Moderate. CL-03 would show **Moderate care** instead of **Expert care** (FINDINGS.md suspicion for CareLevelBadge).

## Out of scope

How Browse or Plant choose `careLevel` from the API; only the badge given a `level` prop.
