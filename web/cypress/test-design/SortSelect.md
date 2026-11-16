# SortSelect — test design

Component: `web/src/components/SortSelect.tsx`. Props: `value: Sort`, `onChange: (value: Sort) => void`.

Used on: `BrowsePage`.

Status: **approved** — human approved in chat. Write component tests from this table.

| ID | kind | given | the user does | expected | source | technique |
|----|------|-------|---------------|----------|--------|-----------|
| SS-01 | render | `value="featured"` | looks | labelled **Sort by**; selected option **Featured**; options include Featured, Price: low to high, Price: high to low, Name: A to Z, Best rated | PRODUCT.md Sort by list; APP-MAP.md SortSelect | equivalence class: default featured |
| SS-02 | state | `value="price-desc"` | looks | selected visible text is **Price: high to low** | PRODUCT.md: "Price: high to low (most expensive first)" | equivalence class: each sort value (spot-check desc) |
| SS-03 | interaction | `value="featured"`, `onChange` spy | chooses **Price: low to high** | `onChange` called once with `'price-asc'` | APP-MAP / OpenAPI sort values | callback |
| SS-04 | interaction | `value="featured"`, `onChange` spy | chooses **Price: high to low** | `onChange` called once with `'price-desc'` | same | callback |
| SS-05 | interaction | `value="featured"`, `onChange` spy | chooses **Name: A to Z** | `onChange` called once with `'name'` | same | callback |
| SS-06 | interaction | `value="featured"`, `onChange` spy | chooses **Best rated** | `onChange` called once with `'rating'` | same | callback |
| SS-07 | accessibility | `value="featured"` | inspects | the select has an accessible name **Sort by**; can be changed with the keyboard | PRODUCT.md every form field has a name; keyboard only | accessibility basics: name and keyboard |

## Out of scope

Whether the API actually sorts price-desc highest-first (FINDINGS suspicion / page UI test). This component only emits the chosen `Sort` value.
