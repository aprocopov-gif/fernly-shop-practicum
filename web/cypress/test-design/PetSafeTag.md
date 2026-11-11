# PetSafeTag — test design

Component: `web/src/components/PetSafeTag.tsx`. Props: `petSafe: boolean`.

Used on: `PlantCard` (Browse), `PlantPage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| PS-01 | render | `petSafe={true}` | looks at the tag | text **Pet safe** is visible | APP-MAP.md: "🐾 Pet safe" or "⚠ Not pet safe"; PRODUCT.md pet-safe filter purpose | equivalence class: true |
| PS-02 | render | `petSafe={false}` | looks at the tag | text **Not pet safe** is visible | same | equivalence class: false |
| PS-03 | accessibility | `petSafe={true}` | inspects the emoji and the tag | the 🐾 (or ⚠ when false) is `aria-hidden`; accessible name is **Pet safe** / **Not pet safe** without relying on the emoji alone | PRODUCT.md: screen-reader names; decorative icons hidden | accessibility basics: name |
| PS-04 | accessibility | `petSafe={true}` and `petSafe={false}` on `#f6faf3` | looks at the tag text | text colour against the background is at least 4.5:1 for both states | PRODUCT.md contrast 4.5:1 | accessibility basics: contrast |

## Out of scope

The Browse "Pet-safe plants only" filter (page / API). This component only displays the tag for one plant.
