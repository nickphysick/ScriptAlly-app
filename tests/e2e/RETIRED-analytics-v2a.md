# Retired with the Analytics v2a rebuild (29 Sep)

Scoped by SELECTOR, not filename: `grep -rlE "\.an-|qa-wrap|qa-wpg|/queries/analytics" tests/e2e`.

| File | Entered through | Disposition |
|---|---|---|
| `analyticsChain.measure.ts` | `.an-strip`, `.qa-wrap`, `.qa-wpg` | RETIRED — SUBJECT LIVE. The fixed-viewport chain (`.qa-wrap` → `.qa-wpg` → row 3 scrolls) survives unchanged; `analyticsV2a.measure.ts` asserts the scroller really scrolls (a 700px `scrollTop`, as a precondition) and that the rail sticks inside it. |
| `analyticsPolish.measure.ts` | `.an-panel`, `.an-grid`, `.an-fstage` | RETIRED — SUBJECT GONE. The panel grid, the stat strip and the old funnel are deleted. |
| `analyticsShot.measure.ts` | `.qa-wpg` | RETIRED — a screenshot script, not a lock. Its successor writes to `reports/analytics-v2a/`. |

## Census suites that still name the route (NOT retired, NOT re-enrolled — a deferred census pass)

Analytics joined the opted-out register (`optedOut.ts`) in the same commit, so every suite that
reads the register now skips its masthead the way it skips the other five. Suites with their own
route tables that were not re-pointed in this run: `pageHeaderV2Lib.ts` / `pageHeaderV2.measure.ts`
(FULL_PAGES, WITH_ART), `pageHeaderV1.measure.ts`, `phRollout`, `compactHeader`, `illoRules`,
`illustratedMasthead`, `surfaceCensus`, `matrix`, `gapAudit`, `stickyRow`, `slimBar`,
`toolbarIsContent`, `washEdges`, `groundProbe`, `contentGeometry`, `chromeGround`, `barBinding`,
`engagement`, `handoff`, `closedOutcome`, `stripAudit`. Presumed vacuous for this route until each is
re-run and re-proved red.
