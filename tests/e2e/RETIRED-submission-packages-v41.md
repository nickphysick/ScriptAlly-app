# Submission packages v41 — locks retired and re-pointed

v41 (design-refs/submission-packages-v41/, the workspace layout) restyles the page: the header card, the explainer, the
raised panel, the label tiles, the "Build, view and edit" kicker, the navy results band, the tilted showcases and the
v39 guide are gone; the packages are a rail beside the open package, and the builder's band is a soft wash of the
package's own colour with a stripe of it. Every case below that measured one of those is marked
`test.skip` in its file, with a pointer here; its claim, where it still stands, is held by the lock named.

## Retired

| File | Case | Why | Now held by |
|---|---|---|---|
| pk26 | PK26-W the three insets | the header card it measured is retired | pk41 L1 (the column), L3 (the header) |
| pk26 | PK26-D the drawer's header stops at its inner border | the drawer opens on header option A (`.p41-dh`), not `.p8-dh` | pk41 shots 07; the drawer frame is unchanged |
| pk38 | L2 a live label loads its package… | the labels row is retired | pk41 L5 (rows, the open row), pk26 R |
| pk38 | L5 every showcase's figure… | read the tilted showcase's anatomy (`.p9-ag3`) | `packageShowcases` unit tests; pk38 L3 (the drawer's rate), L4 (the slots) |
| pk38 | L6 the results band spans the sheet | the band is retired | pk41 L6 (the totals card) |
| pk38 | L8 no element is mono AND uppercase | v41 brings mono capitals back by design (the Pro tag, Active, the picker's label) | — (the rule is reversed by the pack) |
| pk38 | L9 a sent package opens locked | **already red on the v39.3 base**: it reads `data-locked` and Your materials, both retired by v39.3 | pk393 L13-sent |
| pk39 | L1 the header card equals the Contact list's | header card retired | pk41 L3 |
| pk39 | L2 a colour picked reaches the label, both headers… | the label and the colour band are retired; the colour reaches the tile only | pk41 shots 01–05 (tiles) |
| pk39 | L3 the labels row spans the content width | labels retired | pk41 L5 |
| pk39 | L6 every package once; one piece type at a time… | read the v39 list panels (`.p9-rl`) | pk41 L6 (the two tables' frames); figures unit-locked |
| pk39 | L7 How it works | the v39 guide is deleted | pk41 L9, `pk41HowItWorks.test.tsx` |
| pk39 | L8 the pieces band across the sheet | band retired | — |
| pk391 | L1 every block shares the header card's edges | header card retired | pk41 L1 |
| pk391 | L3 one status pill…; the selected label has the bar | labels retired | pk41 L5 (each row's line, the open row) |
| pk391 | L4 explainer → labels 48 … | the spacing between retired parts | — |
| pk391 | L5 the explainer shows first; ✕ hides it | explainer retired | pk41 L2 (the strip's ✕ and reload) |
| pk391 | L6 New package and Package details in the drawer; the header follows the colour | the drawer header is option A (no colour); Create adds a label | pk41 shots 07 |
| pk392 | L1 the page ground carries the pattern; the header card is plain | header card retired | pk41 L1 |
| pk392 | L2 exactly three headings in the typewriter | v41 sets every name and figure in the typewriter, as the ref | — (the rule is reversed by the pack) |
| pk392 | L8 one panel holds the labels and the builder | panel retired | pk41 L1 (absent) |
| pk392 | L9 the version leads: the packing list, the pieces row… | read the retired packing list and pieces row | pk393 L10 (the version step opens first) |

## Re-pointed (the law unchanged; only how the case reaches the page)

| File | Case | Change |
|---|---|---|
| pk393 | open() (L10–L14) | a package opens from its rail row (`[data-pk41-row]`), the builder is scrolled to by its frame |
| pk393 | L12 linking | the outline is the ref's navy on #eaf0f5 (v39.3: Harbour on #eef4f7) |
| pk26 | PK26-R | the open package is the rail's open row, not the pressed label |
| pk26 | PK26-H | opens packages from their rows; reads the band (`.p93-bh-t`, `.p93-addnote`) — it read `.p9-po-tt`, which nothing has rendered since v39.3 |
| pk38 | open(), L1, label() | the page is ready when its rail (or, on a brand-new manuscript, its hero) is; a package opens from its row |
| pk38 | L3 | Figures is in the frame's band; a showcase's body is `.p41-bc-b` |
| pk38 | L4 | the showcases sit in `[data-pk41="best"]` |
| pk38 | L7 | the band's line is retired; Results is checked by its heading |
| pk38 | L11 | the rail and Results render (the brand-new page: the hero and Results) |
| pk39 | open(), label(), L5 | as pk38; the name is read in the builder frame; the rail row shows the new name |

## v41's own locks, rewritten for the workspace

The first v41 pack (a stacked page: a full-width list above the builder) was built and deployed to dev before the
workspace pack replaced it. Its locks were rewritten on the same branch, not added beside:

| Lock | Was (stacked) | Now (workspace) |
|---|---|---|
| L3 | the header ≤ 100 tall; navy; one-line subheader | exactly one navy panel above the results; the rail head and builder band are not navy; one-line subheader under the title |
| L4 | the batch row under the header | the batch is a strip inside the header, flush left, right and bottom; Open → selects the package |
| L5 | one list card, navy bar, tabs, Show retired | the rail: width, top level with the builder, groups and their counts, each row's line, the open row's colour edge, no scroll on select, Retired folded, sticky after 600, ↓ / Enter |
| L6 | the builder's band navy | the builder's band a wash of the open package's colour with a 5px stripe of it, for two colours |
| L7 | the footer's buttons inside the well | the preview under the steps; the buttons inside the well |
| L1 | — | also holds the list card, its bar and its tabs absent |
