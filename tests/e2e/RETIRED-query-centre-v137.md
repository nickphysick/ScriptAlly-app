# Retired and re-pointed by Query Centre v137

Query Centre v137 replaces the v136 bands with a four-cell strip, removes "Recently updated", the banner, the
"View the full list" link and the list header's flying hawk from the populated desktop page, and makes
`/queries` a title page. The locks below describe things that are no longer drawn.

## Retired (skipped in place, with the reason)

| Suite | Lock | Succeeded by |
| --- | --- | --- |
| `qcV136.measure.ts` | A1–A5 (already retired by Header v3) | QC137 A1 |
| `qcV136.measure.ts` | B1 groups, B2 cards, B3 card layout, B4 copy, B5 faces, B6 select, B7 no jump | QC137 B1, B2, L1 |
| `qcV136.measure.ts` | C1 above the fold, C2 link | QC137 C1 |
| `qcV134.measure.ts` | B1 band (Recently updated), B2 banner, B3 the flying hawk clears the banner | QC137 C1 |
| `qcV132.measure.ts` | R1, R2, R3, R5 (Recently updated). R4, the unit test, still runs | QC137 C1 |
| `headerV3.measure.ts` | H9 and H10 (`/queries`: the bands under the panel, the link above the fold) | QC137 B1, C1 |

## Re-pointed

| Suite | Change |
| --- | --- |
| `headerV3.measure.ts` | `/queries` moved from the number pages to the title pages. H2 (number), H3 (counts) and H7 (260 tall) no longer read it; H1, H4, H5, H6 and H8 still do. |
| `qcV132.measure.ts` | The opener no longer waits for "Recently updated". See the report for the W locks that changed. |
| `src/components/queries/centre/qcCentre.test.tsx` | The list's derivation is asserted in parts: the strip's court is a third narrowing of the same list. |
| `src/components/queries/centre/qcOpenHeader.test.tsx` | Rewritten for the title panel. |
