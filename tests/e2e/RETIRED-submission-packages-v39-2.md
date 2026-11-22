# Retired or rewritten by Submission packages v39.2 (29 Oct)

Each lock below asserted something v39.2 changes on purpose. Every rewrite was proved red against the v39.1 build and
under its own named break (reports/submission-packages-v39-2/).

| Lock | Asserted | Now |
|---|---|---|
| `pk391.measure.ts` **L2** | exactly two typewriter elements (the title, the open package's name) | **Retired**, rewritten as `pk392.measure.ts` L2: three typewriter headings (the title, "Your packages", the open package's name), with the materials tab's label as the one named exception |
| `pk391.measure.ts` **L7** | the materials header is #fbf9f5 with a 4px #5e2f3a top edge, the package header's height | **Retired**, rewritten as `pk392.measure.ts` L7: a 40px #5e2f3a folder tab level with the package card's top; names never cut off; the in-package row; Add on hover or focus |
| `pk26.measure.ts` **PK26-M** | every material name is one line, with the full name as its title | **Rewritten**: every name shows in full (scrollWidth ≤ clientWidth) and is never ellipsised; "no type for a summary" unchanged. Break `PK26_MUTATE=PK26-M` |
| `pk39.measure.ts` **L4** | the two card headers are the same height with equal tops; Your materials 320 / 280 wide | **Rewritten**: the materials tab's top is the package card's top (±1); Your materials 340 / 300 wide. New break `PK39_MUTATE=L4tab` |

## The rework (the pattern on the page, the packages panel, the version first)

The first v39.2 put the pattern inside the header card; the replacement pack moved it to the page and added the
panel and the version-first order. These locks were rewritten again, each proved red (reports/submission-packages-v39-2/):

| Lock | Asserted | Now |
|---|---|---|
| `pk392.measure.ts` **L1** | a `::before` on the header card with the packages tile, 0.085, faded from the left | the PAGE's scroller carries the tile by the Contact list's mechanism (#f2eee8, 340 × 360, `local`, the tile's stroke opacity equal to the Contact list's SVG's); the header card has no pattern |
| `pk392.measure.ts` **L7** | read Your materials on its default list | opens Letters first: the list now opens on Versions |
| `pk26.measure.ts` **PK26-W** | the builder takes the header card's insets | the packages panel takes them (the builder is inside it). Break re-pointed to the panel |
| `pk391.measure.ts` **L1** | the labels row and the builder share the card's edges | the packages panel does (floor 19 → 16: one block for two). Break re-pointed |
| `pk391.measure.ts` **L4** | explainer → labels 48; builder → band 96 | explainer → panel 48; panel → band 96 (pk392 L8 holds 80 at 1280) |
| `pk38.measure.ts` **L8** (its material-drawer step) | clicked the first Edit in Your materials | clicks Letters first: Versions have no Edit |
| `pk39.measure.ts` **L2** | — | gains "the picker opens on screen" (the panel exposed a picker that opened below the fold; fixed in 1512df16) |
| `pk26.measure.ts` **PK26-B** (its first step) | dragged a letter from Your materials' default list | opens Letters first: the list opens on Versions. The drag claims are unchanged |

New: `pk392.measure.ts` **L8** (the panel) and **L9** (the version first, and stored fields unchanged).
