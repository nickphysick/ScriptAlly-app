# Retired by Query Centre v153

v153 replaced the Query Centre list page's table rows, status tabs, Filters button, inline filter panel, pill
row and the summary's to-do rows with slips, a filter rail and a slim bar (`design-refs/query-centre-v153.html`).

Found by sweeping `tests/e2e/` for the retired SELECTORS (`.qc1511-r`, `data-qc1511="quick|pills|control-line|label|tint|group-header|fold|stand-pill"`,
`.qc1522-t|gh|todo|dv`, `data-qc151="tabs|filters|filter-panel|row"`), not by filename.

| file | what it measured | status |
| --- | --- | --- |
| `qc151.measure.ts` | v151's one table, its rows and tabs | retired: its subject is gone |
| `qc1511.measure.ts` | v151.1's quick filters, control line, pill row, table rows | retired: its subject is gone |
| `qc1512.measure.ts` | v151.2's row caps, Next column, row actions in the table | retired: rows are slips now |
| `qc1522.measure.ts` | v152.2's group tables, sticky headers, to-do rows; its card checks (L8) | rows and to-do retired; the card half is SUBJECT LIVE and needs repointing to open a query from a slip (`[data-qc153="slip"]`) |

The v153 locks are `qc153.measure.ts` (S1–S6) and the unit suites `qc153.test.ts`, `qc153Rail.test.ts`,
`qcSlip153.test.tsx`, `qcBar153.test.tsx`.
