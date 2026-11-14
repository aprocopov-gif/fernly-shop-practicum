# SearchBox — test design

Component: `web/src/components/SearchBox.tsx`. Props: `value: string`, `onSearch: (value: string) => void`.

Used on: `BrowsePage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| SB-01 | render | `value=""` | looks | search form (`role="search"`); visual hint **Search plants**; **Search** button; no **Clear search** | APP-MAP.md SearchBox | equivalence class: empty |
| SB-02 | render | `value="pothos"` | looks | input shows `pothos`; **Clear search** is present; hint is hidden | APP-MAP.md clear when there is text | equivalence class: non-empty value |
| SB-03 | interaction | `value=""`, `onSearch` spy | types `Monstera` and submits (Search or Enter) | `onSearch` called with `Monstera` | PRODUCT.md: Search matches name/Latin (page uses the submitted string); component trims on submit | callback |
| SB-04 | interaction | `value=""`, `onSearch` spy | types `  pothos  ` and submits | `onSearch` called with `pothos` (trimmed) | the component's purpose (`draft.trim()`) | boundary: surrounding whitespace |
| SB-05 | interaction | `value="pothos"`, `onSearch` spy | clicks **Clear search** | draft clears; `onSearch` called with `''` | APP-MAP.md Clear search | callback |
| SB-06 | state | `value="fern"`, then parent remounts/updates prop to `value=""` | looks | input syncs to empty (effect resets draft from `value`) | the component's purpose | state: controlled sync |
| SB-07 | interaction | `value=""`, `onSearch` spy | types `snake` but does not submit | `onSearch` is not called yet | APP-MAP.md: "Searches the trimmed text on submit only" | state: draft vs commit |
| SB-08 | accessibility | `value=""` | inspects the searchbox | the search input has an accessible name a screen reader can announce (e.g. from a real label, not only a visual hint) | PRODUCT.md: "every button and form field has a name a screen reader can announce" | accessibility basics: name |
| SB-09 | accessibility | `value=""` | focuses the input from the keyboard | focus is always visible (outline not removed without a replacement) | PRODUCT.md: "focus is always visible" | accessibility basics: focus |
| SB-10 | accessibility | `value="x"` | inspects | **Clear search** and **Search** have accessible names | PRODUCT.md every button has a name | accessibility basics: name |

## Expected to fail today (inspected, not yet tested)

- SB-08: "Search plants" is a visual hint, not a `<label>` (FINDINGS suspicion).
- SB-09: `.input { outline: none; }` in `SearchBox.module.css` (FINDINGS suspicion).

## Out of scope

Whether Browse matches Latin names or ignores case (page / API). This component only fires `onSearch` with the trimmed string.
