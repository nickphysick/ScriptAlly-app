# Retired and rewritten with Comparable titles v25 (12 Oct)

The page at `/manuscripts/comps` was rebuilt: comps are tracked through query letters, the page is the Query Centre v137 dress, and the comps-v2 page (a query line, a card list with a switch and a drag grip, an inline add form, a sticky Scout rail) is gone. Its suite measured that page and is retired by name.

The new suite is `tests/e2e/compsV25.measure.ts` (CV25) with `cv25Lib.ts`, `seedCompsV25.mjs` and `cv25Mutations.sh`. Unit locks: `src/lib/compUsage.test.ts` (A2), `src/lib/compsInQueryRetired.test.ts` (A4), `src/lib/compsLibrary.test.ts`.

## Deleted files

- `tests/e2e/compsMat.measure.ts` (S1–S7, C1–C10)
- `tests/e2e/compsMatLib.ts`
- `tests/e2e/seedCompsFixture.mjs` (the `seed-ms-comps5` / `seed-ms-comps0` fixture; `--restore` was run by every pass, so nothing of it is on the harness account)

## `compsMat` case by case

| Case | What it held | Now |
|---|---|---|
| S1 shell | Already skipped (retired by the ink shell: INK1, INK6, INK11). | Unchanged: the ink shell's own locks. |
| S2 frame: the full living header | The page opened on the shared full header, a number panel since header v3. | **Rewritten: CV25 B1.** The header is the v137 title panel. |
| S3 the rail's place and width | A 340px sticky rail beside the column. | **Retired.** There is no rail: the Scout is a floating tab and a drawer. |
| S4 sticky panel | The rail stuck 16px under the scroller's top. | **Retired** with the rail. |
| S5 the gutter | The scroller's direct child pays the gutter once. | Still true of the page root; held by the unit lock in `workspacePageGrid.test.tsx`, and the list's breakout by CV25 D1. |
| S6 no art slot | The header drew no art. | **Reversed: CV25 B1** asserts the drawing, 196 tall. |
| S7 no shell selector in the page's sheet | `compsV2.css` restyles no shell or header class. | Still a unit lock for `compsV2.css`. `compsV25.css` names the shared panel's classes for v137's two paddings, as the Query Centre's own sheet does. |
| C1 the query line | A sentence built from the switched-on comps. | **Retired.** The query line left the page and `inQuery` is retired (CV25 A4). The line's rules stay unit-locked in `compsPage.test.ts`. |
| C2 order persists (drag and Alt+arrow) | Drag to reorder, stored as array order. | **Retired.** Drag-to-reorder is retired from this page. The stored order is still the writer's own order: CV25 D3 (third click) and A1. |
| C3 the form | Add, inline errors, tags, the duplicate check, the toast. | The form is unchanged and now opens in the drawer. Its rules stay unit-locked (`compsV2.test.tsx` C3); the add path is exercised by CV25 A1. |
| C4 undo of a remove | Undo restores at its index with every field. | CV25 A1 (remove and Undo, the same id back). |
| C5 the Scout is inert | The rail renders "Coming soon" and nothing reaches `suggestComps`. | Unit lock in `compsV2.test.tsx` (nothing the page mounts imports the Scout client). |
| C6 no appraisal word | Page text, filled and empty. | Not re-measured on the rendered page. **Uncovered.** |
| C7 the empty state | Form open first, then the exhibit. | The exhibit is kept under the new header; the form no longer opens by default. Smoke only (`materialsPageSmoke.test.tsx`). **The rendered empty state is uncovered.** |
| C8 keys | N opens the form; Esc returns focus. | N, / and F are bound through the registry; F is in CV25 F1 and N in A1. Focus return after Escape is the drawer's (HalfDrawer). **Not re-measured.** |
| C9 save failure | A refused write puts the list back and says so. | Unit lock (`compsV2.test.tsx` C9: every comp write goes through `runWrite`). The rendered refusal is **not re-measured**. |
| C10 a comp reorder writes no feed item | A `{ comps }`-only write narrates nothing. | Unit lock (`manuscriptFeed.test.ts`). |

## Registers and censuses changed

- `tests/e2e/headerV3.measure.ts`: `/manuscripts/comps` moved from `NUMBER` to `TITLE`; its `WORDS` and `ROWS` entries are gone. H2, H3 and H7 no longer read it.
- `tests/e2e/plateRoutes.ts`: `/manuscripts/comps` joined `OWN_HEADER_ROUTES` (its panel is page-local, `data-own-header`).
- `tests/e2e/livingHeadersV3.measure.ts`: the comps row left `PAGES` (LH3, LH8, LH9, LH10 no longer read it).
- `tests/e2e/ms21Fixture.mjs`, `seedManuscriptsV21.mjs`, `manuscriptsV21.measure.ts`: the Manuscripts fixture's comps carry ids and its newest letter records two of them; the door sentence is asserted from `doors.inLetter`.

## Not run in this pack (they name the route and were not re-measured)

`headerV3` H1–H8 for the route as a TITLE page, `headerPanelV2` P1/P4/P5/P6/P7 (including the 390px as-built width of 396), `pageHeaderV2` §1, §4.4 and its `FOUR`, `illustratedMasthead` (`WITHOUT_ART` still lists the route, which now has a drawing), `manuscriptsV21` (its fixture changed), and the eleven shared censuses `RETIRED-comps-v2.md` already lists as naming a class the page no longer emits.
