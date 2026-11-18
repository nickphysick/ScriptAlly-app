# Retired and rewritten with Comparable titles v32 (17 Nov)

The page at `/manuscripts/comps` was re-laid out (design-refs/comps-v32/): the shared navy header with "{n} comparable
titles" and the current letter's comps on its right; one striped band for a sent letter whose comps were never chosen;
"Your shelf" (Next up rows) beside the open comp (details on the page, Letters / Queries switch); the podium; the
Comp-pendium closed by the Scout strip. The data model (`compIds` on Query Letter versions, `lib/compUsage.ts`) is
unchanged; `podiumOf`, `rankedOf`, `pendiumOrder` and `pendiumNote` are new pure derivations in `lib/compsShelf.ts`.

The new suite is `tests/e2e/cp32.measure.ts` (CP32: H1, H2, B1, S1, S2, O1, O2, P1, P2, P3, C1, C2, SC1, G1, W1) with
`cp32Lib.ts`, `cp32Mutate.mjs` (one named mutation per lock, applied by `CP32_PROVE=1`), `cp32Shots.measure.ts` and the
fixture `seedComps32.mjs`. Unit locks: `src/lib/compsShelf.test.ts` ("CP32 P (unit) · podiumOf": order, ties, under
three, none, the Comp-pendium's order and note; "CP32 B1 (unit)": the band's letter).

## Deleted files

- `tests/e2e/cp30.measure.ts`, `cp30Lib.ts`, `cp30Mutate.mjs`, `cp30Shots.measure.ts`, `seedComps30.mjs` — every case
  reads v30's highlight ring, paper cards, list view, letter cards or the comp drawer's detail view, none of which render.
- `src/components/manuscripts/comps30/CompsTop30.tsx`, `CompsShelf30.tsx`, `CompsLetters30.tsx`; v30's notice, shelf,
  card, list, letter-card and Scout rules in `comps30.css`; the comp drawer's detail view (`CompDrawer`'s `view` mode)
  and its rules; `highlightOf`, `leadLine`, `letterCards`, `numberWord`, `WHERE_SWATCH` (lib/compsShelf.ts) and their
  unit tests. `CompDrawer` itself stays: it is still the add and edit drawer.

## Case by case

| Lock | What it held | Now |
|---|---|---|
| CP30 H1, H3 | (already retired by Workspace headers v1) | Unchanged: wsHeaders H3 / H6. |
| CP30 H2 | The header's highlight ring (the leader's rate) | **Retired** with the ring. Successor: **CP32 H2** (the right block is the current letter's comps) and **CP32 P1** (the leader is the podium's 1st). |
| CP30 H2-early | No ring when it is too soon | **Retired.** Successor: **CP32 P3** (nothing ranked: the bare podium and its line). |
| CP30 S1 | The toolbar on one row, no sideways scroll | **Rewritten: CP32 W1** (no sideways scroll at both widths; the page is the shared column). The toolbar is two rows by design now (find, then two selects). |
| CP30 S2 | Band colour by where; no green | **Rewritten: CP32 S1** (the row's line by state) and **G1** (no green on the page). |
| CP30 S3 | A sent card names only its sent letters; "Add it to a letter" opens the picker | **Rewritten: CP32 O1** (the open comp's "sent letters mention it" counts sent letters only) and **CV25 E2** (re-pointed: "Add to a letter" opens the picker for the comp). |
| CP30 S4 | Cards and list read one order | **Retired** with the Cards / List switch. The Comp-pendium's order is **CP32 C1**. |
| CP30 S5 | No control inside a control | **Kept**, moved into **CP32 G1** (rows, podium steps and Comp-pendium rows hold no button or link). |
| CP30 L1, L2 | Letter cards: order, middles, one rate in three places | **Retired** with "Which letter named which comps". Its jobs: the band (**CP32 B1**), the open comp's Letters view (**CP32 O2**, `letterRate`), and the Letters page. |
| CP30 D1, D1t | The comp drawer's ✕ centred; its title not one letter wide | ✕: **CV271 X1** (re-pointed to the edit drawer and the picker). Title width: **not re-covered** — the drawer head is unchanged; recorded as a gap. |
| CP30 D2 | No small uppercase mono text | **Rewritten: CP32 G1.** |
| CP30 E1 | The empty page: header, steps, footer | **Covered by** wsHeaders **H9** (the empty state renders `[data-cp="how-steps"]`) and `materialsPageSmoke`. The order header → card → footer is **not re-measured**; recorded as a gap. |
| CP30 SC1 | The Scout leaf survives a reload; no floating tab | **Rewritten: CP32 SC1** (the strip is inside the Comp-pendium, the leaf survives a reload). |
| CV25 A1 | Ids survive edit, add, remove | **Kept**, re-pointed: a row opens the comp; the open comp's Edit opens the drawer. |
| CV25 E2 | The picker's save writes one letter; Undo restores | **Kept**, re-pointed to the picker's new for-a-comp mode (the open comp's "Add to a letter"). |
| CV25 A3 | Fixed letters; an unrecorded letter accepts one save | **Kept**, re-pointed: the band's pill opens it; the new words; "v1 is now fixed" read from the for-a-comp picker (locked, "Already sent"). |
| AD1–AD7, AD10 | The add-and-edit form | **Kept**; AD7 reads the chips back from the open comp; AD10's edit closes with one Escape (no detail to return to), focus back on Edit. |
| wsHeaders comps row | H1–H9, T1–T3 | **Kept**, re-pointed: the headline pattern "{n} comparable titles", the first section the band or the grid. |
