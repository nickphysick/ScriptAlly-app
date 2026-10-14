# Retired by Query Centre v138 (14 Oct)

Each of these was red on the v138 build because its SUBJECT is gone, never because the page broke. Measured: all
eleven QC137 cases died in `openQC`, waiting for `.qcw-list [data-qcv="row"]` — the v132/v137 list, replaced by the
v138 list sheet (`.qc138-sheet`, rows `.qc138-row`).

## tests/e2e/qcV137.measure.ts

| Case | Reason |
|---|---|
| A1 · header: the Analytics panel with a title | The panel header is replaced by the centred light header (QC138 A1). |
| B1 · strip: four cells | The "At a glance" strip is replaced by the glyph row in the header (QC138 A2). |
| B2 · filter: a cell narrows the list | The strip's court filter is replaced by the glyphs' stage filter, shared with the Stage pill (QC138 A2, B1). |
| C1 · removed: the list is 40 under the strip | There is no strip; the list sheet follows the header's filter row (QC138 C1). |
| C2 · width: 24 from the sheet's edges | Measured the `.qcw` panel; the v138 sheet keeps the same width rule and is held by QC138 A1/C1. |
| C3 · narrow: What you sent hidden below 900 | The v132 grid's narrow rule; v138's narrow grid (below 1180 of sheet) keeps the package chip (QC138 C1). |
| C4 · one line at 1280 | Measured `.qcw-ws1` and the YOUR MOVE stamp, which v138 removes (QC138 E1). |
| D1 · pins: the ink header pinned at 12 | The ink list head is gone; v138's pinned row is the page-coloured row (QC138 D2). |
| D2 · releases at the list's end | As D1: the ink head's own release. |
| D3 · no jitter across the pin line | As D1: the ink head's sentinel; v138's pinned row has its own hysteresis (`useQcPinned`). |
| L1 · no jump: the panel and the strip loading and loaded | Both the panel and the strip are gone. |

Kept: **E1** (the 12px sheet lip on every page), still green.

## The pack's own retirement list, and where each landed

- QC137's header and strip locks: A1, B1, B2, L1 above.
- Its ink "Your move" band and inner-border assertions: the bands are asserted by QC138 D2 (tints, no ink band).
- Any lock asserting the "overdue" / "No reply yet" group: the unit locks in `src/lib/queryCentreGroups.test.ts` and
  `src/lib/holdingReplyIntegration.test.ts` are RE-POINTED to "move" (Part D's commit), not deleted: their law (a reply
  does not move a row; Nudge only lights on a row the list is chasing) is unchanged.
- Any lock on the Sort pill or the direction button: none existed in an e2e suite still live for the desktop; QC138 C1
  asserts there is no sort control.
