# Submission packages v42 — locks retired and re-pointed

v42 (design-refs/submission-packages-v42/) retires the packages rail, the header's batch strip with its "Change"
picker, every colour picker (the New and Details drawers' colour field, the icon popover's swatches) and the builder
band's colour wash and stripe; package icons are navy everywhere; How it works is one animated infographic. Every case
below that measured one of those is marked `test.skip` in its file, with a pointer here; its claim, where it still
stands, is held by the lock named.

## Retired

| File | Case | Why | Now held by |
|---|---|---|---|
| pk41 | L4 batch | the header's batch strip and its picker are retired | pk42 L2 (the Current batch tag is the active package), L3 ("Use for current batch" sets it) |
| pk41 | L5 rail | the rail is retired | pk42 L2 (the tiles: order, widths, feet, the open tile, no scroll) |
| pk41 | L7 preview (under the steps) | v42 puts the preview BESIDE the steps; the sent package's buttons-inside-the-well half carries on | pk42 L3 (side by side; buttons inside the preview) |
| pk41 | L9 how it works (five steps) | the five-step guide is deleted | pk42 L7, `pk42HowItWorks.test.tsx` |
| pk41 | L6's builder half (the builder's 7px frame; the band's stripe and wash in the package's colour) | the builder is v42's container; colours are not shown | pk42 L3 (the rim), L4 (navy) |
| pk41 | L3's "the rail head is not navy" | the rail is retired | — (L3 keeps "the builder's heading row is not navy") |
| unit | `pk41HowItWorks.test.tsx` | the five-step guide is deleted | `pk42HowItWorks.test.tsx` |
| unit | packagesV41: railGroups, the batch picker's statusWords | the rail and the picker are deleted | `packagesV42.test.ts` (tileFoot over railLine) |
| unit | packagesV39: the new-package dialog's first colour (firstFreeColour, 3 cases) | the colour field is retired | `packagesV42.test.ts` ("nothing reads a package's colour") |

## Re-pointed (the claim unchanged, the selector moved from the rail to the stat tiles)

| File | Case | Change |
|---|---|---|
| pk41 | L1 page | population: the tiles (`[data-pk42-tile]`); the retired list gains the rail and the batch strip |
| pk41 | L3 header | the rail-head check goes; "the builder band is not navy" reads the v42 heading row |
| pk41 | L6 frames | the Results frames only (totals, the three cards, the two tables); floor 27 → 24 |
| pk26 | PK26-R | the package's open TILE (`.p42-on`), not its rail row |
| pk26 | PK26-H | opens the package from its tile |
| pk38 | L1, L11 (and the shared label / wait) | the stat tiles, not the rail |
| pk39 | L5 rename | the tile's name shows the new name (was the rail row's) |
| pk393 | L10–L14 (the shared open) | opens the package from its tile |
