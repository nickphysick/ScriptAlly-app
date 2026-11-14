# Submission packages v43 — locks retired and re-pointed

v43 (design-refs/submission-packages-v43/) puts the page on the Query Centre's layout: the shared navy header with the
Archivist standing in it (v41's header and the pinned hawk are deleted), "Your packages" as a list on the left of a
268 / 28 desk (v42's stat tiles are deleted), the builder in one workspace surface (v42's 7px-rim container is
deleted), the Query Centre's collapsed bar, and day one as the same header and desk (v26's hero is deleted). Every case
below that measured one of those is marked `test.skip` in its file with a pointer here; its claim, where it still
stands, is held by the lock named. The new locks are tests/e2e/pk43.measure.ts and src/components/packages/v43/pk43.test.ts.

## Retired

| File | Case | Why | Now held by |
|---|---|---|---|
| pk41 | L3 header | v41's thin navy header (one-line sub, its own title size, "Pro" tag) is deleted | pk43 P1 (the header is the Query Centre's, measured equal), P6 |
| pk41 | L8 hawk | the pinned Archivist (fixed bottom-right, 212 tall) is deleted | pk43 P6 (one drawing in the header; no `.p41-perch`; nothing pinned) |
| pk42 | L2 tiles | the stat tiles are deleted | pk43 P7 (one row per live package in the tiles' order, one aria-current, one flag, a row opens its package, Retired (n)) |
| pk42 | L3 builder | its claims were the 7px white rim (deleted), the band colours, "Use for current batch" and the side-by-side cards | pk43 P3 (the workspace's edges), P8 (the one writer, "Use for new queries" in pk43.test.ts), P9 (no green); the side-by-side cards are unchanged CSS above 1320 |
| pk42 | L6's first half (no packages → the card, no builder) | with no package at all the page is now day one (the draft package in the builder) | pk43 P10; the "only retired" half stays in L6 |
| pk42 | L8's hawk half | the pinned hawk is deleted | pk43 P6; L8 now asserts no pinned hawk |
| pk41.shots | the whole file | screens of v41's layout | pk43 `shots` |
| pk42.shots | the whole file | screens of v42's layout | pk43 `shots` |
| unit | materialsPageSmoke "empty state: the promise, its steps and the animation" | v26's hero is deleted | the same case re-pointed to day one; pk43.test.ts P10 |
| unit | livingExhibitSource's Pk26Header.tsx entry | the file is deleted | — (the other exhibit files stay in the census) |

## Re-pointed (the claim unchanged, the selector moved)

| File | Case | Change |
|---|---|---|
| pk26 | PK26-R | the open package's ROW (`[data-pk43-row][aria-current="true"]`), not its tile |
| pk26 | PK26-H | opens the package from its row |
| pk38 | the shared wait, L1, L11 (and the shared label) | the list (`[data-pk43="list"]`), not the tiles; the brand-new manuscript waits for day one's steps, not the hero |
| pk39 | the shared wait, L5 (the shared label) | the list and its rows |
| pk393 | L10–L14 (the shared open) | opens the package from its row |
| pk41 | L1 page | population: the rows; "no header art" becomes "the header's one drawing" (the Archivist stands in it) |
| pk41 | L2 banner, L6 frames | the header's probe is `[data-pk43="header"]` (the banner and the Results frames are unchanged) |
| pk42 | L1 retired pieces, L4 navy icons, L5 drawers, L7 how it works | the rows and the header's `[data-pk43="new"]` / `[data-pk43="how"]` |
| pk42 | L6 empty | keeps "only retired packages": the card, its heading and button, no tiles, "Retired (1)" (the list's toggle), no builder |
| pk42 | L8 no regression | the founding strip and the folder tab's pink, unchanged; the hawk half retired (above) |
| unit | workspacePageGrid "the Packages root" | the root's class is `p6 p41 pk43` (+ `pk43--day1`) |
| unit | pageWidth's allow-list comment | the page keeps its entry; the reason is no longer a hawk clearance |
| unit | wsSlim56 "the pin" | qcv156 §3's lists may carry `, .pk43` after `.tws56`; still exactly five bar rules |
| unit | materialsPageSmoke "populated" | the header is `[data-pk43="header"]` ("1 package", "for The Smoke Test", the drawing); the list replaces the tiles |

## Kept unchanged

pk26 PK26-N; pk38 L3, L4, L7, L10; pk393 L10–L14's assertions; pk41 L2, L6; pk42 L4, L5, L7 (their assertions);
`pk42HowItWorks.test.tsx`; `packagesV40/41/42.test.ts`. The cases already skipped by v41 and v42 stay skipped.
