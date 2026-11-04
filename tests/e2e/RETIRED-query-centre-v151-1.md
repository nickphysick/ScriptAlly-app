# Retired by Query Centre v151.1 (3 Nov)

v151.1 (design-refs/query-centre-v151-1/) supersedes v151 where they differ. These QC151 cases
(`tests/e2e/qc151.measure.ts`) asserted things v151.1 removed or replaced. Each successor is a QC1511 lock
(`tests/e2e/qc1511.measure.ts`).

| QC151 case | What it held | Why it is retired | Successor |
|---|---|---|---|
| L3 toolbar | the tabs, search, Filters and Group in one row, inside the table's edge | the toolbar row is split: quick filters + switch on one row, the control line under it (§3, §4) | QC1511 L3, L4 |
| L5 active strip | one chip per filter in a white strip, "Reset all" keeps the tab | the strip is replaced by the pill row (§5) | QC1511 L5 |
| L7 sort | each of seven headings orders asc then desc; Due ascending default | the master heading row is gone (§0); Agency and Next move columns are gone (§7); the labels live in each group header | QC1511 L5 (the Sort pill), L6 (labels) |
| L8 rows | one line, 54px tall; Agency truncates first | rows are 69px mini cards with the agency under the name (§7) | QC1511 L7, L8 |
| L9 next move | the button in the Next move column | the button moves to its own last column; Next is one phrase (§7) | QC1511 L9 |
| L11 hover timeline | nothing at 500ms, open at 1.2s | the hover timeline is removed (§0) | QC1511 L1 (asserts it is absent) |
| L13 switch | the switch in the header before Record a response | the switch moves to the quick-filter row (§3) | QC1511 L3 |

Re-pointed, not retired: **L1** (one width) now names the summary card, the quick row and the control line in place of
the banner and the toolbar row.

Still standing and run as they are: L2, L4, L6, L10, L12, L14, L15, L16.

Also retired: `tests/e2e/qc151Shots.measure.ts` (v151's report screens; v151's shots are kept in
`reports/qc-v151/shots/`). The v151.1 screens are `tests/e2e/qc1511Shots.measure.ts`.
