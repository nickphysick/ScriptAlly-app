# Retired and rewritten by Dashboard v59 (16 Oct)

The right column stopped being a list, the feed tab became a folder tab, and the page gained a first
paint. The DB58 claims below stated those things; each is retired or rewritten in
`tests/e2e/dashV58.measure.ts`, and its successor is named.

| DB58 claim | Now | Successor |
|---|---|---|
| R1 population (`rows > 0`) | rewritten: a focus card and **no** rows | DB59 R1 |
| R1 order `list-head>focus>then>list` | rewritten: `list-head>focus>(coming-extra>)rule>panel` | DB59 R1 |
| R1 "the list scrolls inside, clear of the tab" | retired — the list is on the To-do page | DB59 F1 (nothing scrolls) |
| R2 "groups in order, none skipped" | retired — rows gone | the focus card's group (DB58 R2, kept) |
| R2 "the row groups never go backwards" | retired | — |
| R2 "Then or Also" | retired — the row is gone | DB59 R1 ("All {n} →") |
| R2 "the first goes back into the list, first" | retired | — |
| R3 (the whole test: focus action opens the flow; the tick writes nothing) | retired | DB59 V1 |
| A1 "the tab" (`rgb(42, 58, 82)`, "LAST 30 DAYS") | rewritten: the feed's tab, on the sheet's edge | DB59 T1 |
| A1 "the tab's corner" (28/26 inside the sheet) | retired — the tab sits ON the edge | DB59 T1 |
| F2 "scrolling regions" (`only the list`) | rewritten: none | DB59 F1 |
| L1 loaded reading at +900ms | rewritten: read after the first paint (+1800ms) | DB59 L1 |

Every other DB58 claim stands unchanged (F1, F2's clips and escapes, F3, H1, C1, R2's focus group,
label, count and ›, A1's drawer, A2, L1's boxes).
