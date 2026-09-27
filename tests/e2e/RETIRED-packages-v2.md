# Retired with the Submission packages v2 rebuild (27 Sep) — swept by SELECTOR, not by filename

The v2 rebuild (design-refs/materials/packages-v2.html) replaces the Packages · Builder · Tracking tabs with one page and
deletes the old page's markup: `.pkg-root`/`.pkgw`/`pkgw-wpg`, the `pkgb-*` broadsheet cards and sheets, the `pkgt-*`
tracking bands, the `pkgd-*` drawer, the build panel and rail, and the teach-first surface. The sweep was
`grep -rlE '\.pkgw|\.pkgb-|\.pkgt-|\.pkgo-|pkgw-wpg|tab=builder|tab=tracking|pkg-root|pkgd-|pkgtch|\.pkgdr' tests/e2e`,
which found 40 files. Recover any retired file from its last commit (the parent of the commit that deletes it).

The page is measured now by **`pkgMat.measure.ts`** (S1–S7 once; P1–P9), plus `pageHeaderV2.measure.ts` §2 and §4.4,
`mastheadMatrix` (full), `illustratedMasthead` (WITH_ART) and `optedOut.ts` (5).

## Retired — the subject is gone (25)

| File | Last commit | What it measured | Now |
|---|---|---|---|
| `archiveRestore.measure.ts` | 4b2f7fa28 | the old page's archive drawer — put away and restore | the rail's Put away section (unit-locked in materialsBand; no rendered lock — deferred) |
| `bandGeometry.measure.ts` | e0f97382c | the broadsheet bands' geometry | gone — the surface is deleted |
| `bookVersionsCD.measure.ts` | a21f01b29 | sample sheets and the two version tracking panels (Parts C/D) | P6 Side by side (facts from the log); the version panels are gone with Tracking |
| `buildPanel.measure.ts` | 6b1a79124 | the Builder tab's build panel | P2, P3 |
| `buildPanelSlots.measure.ts` | 6b1a79124 | the build panel's slot wells | P2 |
| `builderCards.measure.ts` | 01d735e6c | the Builder rail's material cards | P2 (rail chips) |
| `fadGuard.measure.ts` | ce90345d7 | the remove popover's guard on a used material | gone — the surface is deleted |
| `fadUnlinked.measure.ts` | ce90345d7 | the remove popover on an unlinked material | gone — the surface is deleted |
| `footnoteBand.measure.ts` | cbf809674 | the footnote band | gone — the surface is deleted |
| `packageDrawer.measure.ts` | c723f03ed | the package detail drawer | P4, P5 (card actions inline) |
| `packagesConsolidated.measure.ts` | d9ec64617 | the consolidated Packages tab at two widths | S1–S7, P1–P9 |
| `packagesTeach.measure.ts` | 6f3d106ce | the teach-first first-visit surface | P8 (empty state) |
| `packagesWorkspace.measure.ts` | 9bafaa9c7 | the old workspace layout | gone — the surface is deleted |
| `partA.measure.ts` | 4b2f7fa28 | restructure Part A (the page's counts) | gone — the surface is deleted |
| `partB.measure.ts` | 4b2f7fa28 | restructure Part B (banded cards) | gone — the surface is deleted |
| `pkgBroadsheet.measure.ts` | 4b2f7fa28 | the broadsheet layout | gone — the surface is deleted |
| `pkgDrawer.measure.ts` | 995d21066 | the packages drawer | P4, P5 |
| `pkgFlow.measure.ts` | 9c6c74508 | the Builder → modal → Query Centre flow | P1–P4; the log-a-query door is the query-actions session's |
| `pkgRecut.measure.ts` | 3726ba4eb | the re-cut page | gone — the surface is deleted |
| `pkgRestructure.measure.ts` | 805c04853 | the three-tab restructure | gone — the surface is deleted |
| `pkgTracking.measure.ts` | bbe668fd8 | the Tracking tab | P6, P7 |
| `stampLock.measure.ts` | b5a042c36 | the lock line on the old card and builder | P4 (sent lock, Duplicate & edit, note on a locked package) |
| `teachHero.measure.ts` | a3465fdbf | the teach-first hero | P8 |
| `teachStages.measure.ts` | 23602c16d | the teach-first stages | P8 |
| `pointerControls.measure.ts` | 64311dbad | the old card's pointer controls and scores | gone — the surface is deleted |

## NOT retired — shared suites whose packages row is now stale (deferred, owner below)

- **Ten censuses** list the page by the grid class it no longer emits (`pkgw-wpg`): `barBinding`, `chromeGround`, `compactHeader`,
  `contentGeometry`, `headerFix`, `illoRules`, `serifClip`, `surfaceCensus`, `toolbarIsContent`, `washEdges`. They join the backlog
  the comps and Contact-list runs already recorded (the chrome SLAB an opted-out page does not have). `headerFix` routes through
  `optedOut.ts`, where Submission packages joined.
- **`drawerTab`** measures the spine tab on four drawers; the packages one is deleted, the others are not.
- **`allSessions`** is a multi-session deploy check; its packages probe reads `pkgw-hero`.
- **`queryVersions`**, **`attachStates`** read `pkgb-mver` / `pkgb-plate`, which are Query Centre and illustration classes that
  are still rendered — NOT stale.

**Owner: the next shell/masthead census pass (Nick to schedule).**

## Unit cases retired or retargeted in the same pass

- `bandedCards.test.ts`, `packageDrawer.test.ts` (+ `lib/packageDrawer.ts`, whose only caller was the drawer): deleted.
- `bookVersionsTracking.test.ts` D18 (the two gated panels on TrackingBand): retired; the gate `versionsActive` is locked in `bookVersions.test.ts`.
- `packageShapes.test.ts`: "the builder states which slots are optional…" and "the card renders Other as a note…": retired with PackageModal/PackagesBand.
- `packageLock.test.ts` D-D2/D-D3: the row, drawer, palette and builder-seed cases retired; "duplicating is a CREATE" and "the two modes are exclusive" retargeted onto the v2 page; the single-writer sweep reads SubmissionPackages/packagesPage instead of PackageModal.
- `materialsBand.test.ts`: "the sheets (D3)", "the removal popover…" and "the ONE add card…" retired; the rail/archive/preselect cases retargeted (one materials surface; the Put away route; + Add names its kind).
- Components deleted (unreachable after the rewrite, found by a before/after reachability sweep from main.tsx): ArchivedRow, BuildPanel, BuilderRail, FootnoteBand, MaterialCard, MaterialsBand, PackageDetailDrawer, PackageModal, PackageNote, PackageTabs, PackageTracking, PackagesBand, PackagesDrawer, PackagesTeachFirst, RemovePopover, TrackingBand, VersionQuickAdd, tourExample — with their stylesheets archivedRow, builderRail, packageNote, packageTabs, packageTracking, packagesDrawer, packagesTeach, packageDetailDrawer. CardBand, IllustrationSlot and packageIcons stay (still imported).
- `containers.test.tsx`: CardBand's renderers are now CappedCard and CardBand only.
- `workspacePageGrid.test.tsx`: packages moved CONVERTED → OPTED_OUT (5) and its chain/root/cap reads point at packagesV2.css.
- `respondDesk.test.tsx`: the retired chrome-art rule is asserted ABSENT from illustratedMasthead.css.

## Left in place, unreachable, deliberately (deferred)

`lib/builderRail.ts`, `lib/packageTracking.ts`, `lib/ledgerSort.ts`, `lib/packagesOverview.ts` lost their last caller with this rebuild and keep their
unit suites (packagesOverview is also read by two other suites); `packagesBroadsheet.css`, `packageWorkshop.css`, `buildPanel.css` and
`illustratedMasthead.css` are imported by nothing now and are still read by source-reading tests. A reachability sweep, not this run.
**Owner: the next packages pass.**
