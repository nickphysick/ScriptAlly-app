# Retired and rewritten with Comparable titles v28 (17 Oct)

The page at `/manuscripts/comps` was rebuilt again: the app's two-state header (the shared `EmptyPanel` with no comps, the
shared `LightHeader` with them), one notice, "Your comp shelf" (a toolbar over a grid of index cards) and "What's landing"
(by comp and by letter). v25's list (its bar, column sort, grouping and row tray), full screen, the "At a glance" strip and
the v27 navy title panel are gone. The data model (`compIds` on Query Letter versions, `lib/compUsage.ts`) is unchanged.

The new suite is `tests/e2e/compsV28.measure.ts` (CX28: H1–H3, N1, S1–S5, D1–D2, E1–E3, L0) with `cx28Lib.ts`,
`cx28Mutations.py` and `cx28Shots.measure.ts`. Unit locks: `src/lib/compsShelf.test.ts` (S3, S4 and the derivations behind
S2, S5, N1, D1, D2, E3).

## Deleted files

- `tests/e2e/compsV27.measure.ts` (V1–V10) and `tests/e2e/v27Mutations.sh`
- `tests/e2e/compsV25Shots.measure.ts`, `compsV26Shots.measure.ts`, `compsV27Shots.measure.ts`, `compsV271Shots.measure.ts`
  (screenshots of pages that no longer exist; `cx28Shots.measure.ts` takes v28's)

## Case by case

| Lock | What it held | Now |
|---|---|---|
| CV25 B1 header | The v27 title panel, its drawing 196 tall | **Retired.** CX28 H1 (the shared LightHeader / EmptyPanel; no title panel in either state). |
| CV25 B2 strip | The "At a glance" cells and their filtering | **Retired** with the strip. The header card's rows filter instead: CX28 H2. |
| CV25 D1 heading | The library heading's edges are the list's | **Retired** with the list. |
| CV25 D2 bar | The list bar one row at 1024/1280/1512 | **Rewritten: CX28 S1** (the shelf's toolbar). |
| CV25 D3 sort | Column-heading sort, three clicks | **Rewritten: CX28 S4** (the sort menu's five orders) and the unit S4. |
| CV25 D4 groups | Grouping by where, type and letter | **Retired.** No grouping on this page (baked decision 3). |
| CV25 E1 drawer | A row opens the drawer, inset 8 | **Retired.** A card opens it: exercised by CX28 E1 and E2. |
| CV25 F1 full screen | Full screen hides the panel and strip | **Retired** with full screen (`sa.compsFull` and `?full=1` are no longer read; the F key is unregistered). |
| CV25 L1 no jump | The panel's loading and loaded boxes | **Rewritten: CX28 L0.** |
| CV25 A1 ids | Every written comp has a unique, stable id | **Kept**, re-pointed from rows to cards. |
| CV25 A2, A4 | Unit locks | **Kept.** A4 now reads every file in the page's folders rather than a list naming deleted components. |
| CV25 A3 fixed | A sent, recorded letter is fixed; New version | **Kept**, re-pointed (the notice's "Log it now"; the ring for the rate). |
| CV25 E2 picker | Save writes the chosen letter only; Undo; first frame | **Kept**, re-pointed (a card's "Log in a letter"; the count reads "N comps named"). |
| AD1–AD7, AD10 | The add-and-edit form | **Kept.** Re-pointed to the header's "+ Add a comp" and a card's drawer. AD10's edit case now asserts v28's back step: Escape returns to the detail, a second closes and focus returns to the card. |
| AD8 preview | The form's preview was the list row's own cells | **Retired.** The list is gone and the v28 form has no preview; `compForm.test.tsx` holds its absence. |
| V27 V1 header | "Comparable titles" and the subline in both states | **Retired.** CX28 H1, H3. |
| V27 V2 empty | One button, the note, nothing else | **Rewritten: CX28 H3** (two buttons, the steps card, nothing else). |
| V27 V3 card | The steps card is the panel's width | **Retired.** Not re-measured. |
| V27 V4 first | The button opens "Add your first comp" with the explainer | **Rewritten: CX28 H3.** |
| V27 V5 switch | The first save shows the list; removing the last brings the empty page back | **Uncovered on the rendered page.** The state is the comp count (`isEmpty`), unchanged; smoke only. |
| V27 V6 no flash | A seeded account never draws the empty card | **Rewritten: CX28 L0.** |
| V27 V7 no band | With comps, no steps until the link | Held by the smoke test (`materialsPageSmoke`: "the steps are on the page" absent). |
| V27 V8 pop-up | ✕, Escape and the scrim close it; focus back to the link | **Partly rewritten: CX28 E2** (Escape, focus back to the link). ✕ and the scrim are not re-measured. |
| V27 V9 picker | The pop-up's link opens the picker; one Escape closes only it | **Uncovered.** The hand-over is unchanged (`openPicker` closes the pop-up). |
| V27 V10 one component | The empty card and the pop-up render the same steps | Unit: `compsSteps.test.tsx`. |
| V27.1 W1 column | The library in the page column | **Retired** with the list. |
| V27.1 W2 grid | The list's compact row grid | **Retired** with the list. CX28 S1 holds the shelf's grid. |
| V27.1 X1 centred ✕ | Five close buttons each centre an SVG ✕ | **Kept**, openers re-pointed. The explainer pop-up's ✕ is the same `CloseButton` and is not added to X1. |
