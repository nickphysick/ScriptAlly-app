# The v12 route repoint — measure suites whose subject moved (25 Sep)

`/manuscripts` renders `manuscripts/v12/ManuscriptPage` now; the locked `AllManuscripts.tsx` (the
book profile: `.msv-*`, the dossier, the record view, the library grid) is still in the tree and
still unit-tested, but **no route serves it**. Per the house retirement rule this sweep is scoped
by SELECTOR and by route, not by filename: everything below either opens `/manuscripts` or greps
an `.msv-*` selector.

## Covered by the register (live, nothing to do)

These import `tests/e2e/optedOut.ts`, which now lists **Manuscripts** (name) and `/manuscripts`
(route): `mastheadMatrix.measure.ts` (asserts the declined set EQUALS the register, both ways),
`gapAudit.measure.ts`, `headerFix.measure.ts`, `subWrap.measure.ts`.

## Subject unrouted — stale until re-pointed or retired (named, not silently left)

Bound to the book profile's own anatomy on `/manuscripts`; with the dossier unrouted they will
fail or go vacuous, and each is a decision for the next pass rather than a page fault:

- `msProfileScroll.measure.ts` — the dossier's Type-A scroll behaviour and overflow census
- `msProfileEmpty.measure.ts` — the dossier's empty shelf
- `msRecord.measure.ts` — the dossier's record view
- `bookVersions.measure.ts` — the Versions panel ON the old profile (the panel itself lives on;
  the new page's Versions section has its own locks in manuscriptsV12.measure.ts)
- `shelfLanding.measure.ts` / `heroLanding.measure.ts` — the landing/hero the profile drew
- `engagement.measure.ts`, `washEdges.measure.ts`, `compactHeader.measure.ts`,
  `illustratedMasthead.measure.ts`, `chromeGround.measure.ts`, `contentGeometry.measure.ts`,
  `matrix.measure.ts`, `barBinding.measure.ts`, `illoRules.measure.ts`, `groundProbe.measure.ts`,
  `materialLabel.measure.ts`, `closedOutcome.measure.ts`, `bookNav.measure.ts` — each VISITS
  `/manuscripts` among other pages; the ones that only sweep generic properties (text overlap,
  ground pixels, closed-outcome words) should keep passing against the new page, the ones that
  reach for `.msv-*` or the shared masthead there will not. **Not re-proven here** — the standing
  rule applies: after a structural change, every suite predating it is presumed vacuous until
  re-proved red, and this manifest is the named list.

## The successor

`manuscriptsV12.measure.ts` — L1–L11, the geometry table, and the mock rendered by the same
ruler. 19 cases, assertion floor 60, serial on two owned accounts.
