# Versions — `/manuscripts/versions`

## Current state (Versions v6, 17 Nov 2026, branch `versions-v6`)

Built to `design-refs/versions-v6/versions-v6.html` (live path `S.mp = 6`, `S.fs = 2`, `S.co = 8`; enrolled in
`design-refs/.refhashes.json`). Page: `src/components/versions/VersionsV2Page.tsx` (the file keeps its name — App.tsx
and every route register import it) with its parts in `src/components/versions/v6/`. Data layer unchanged: every figure
is `lib/versionsV2`, every write `lib/bookVersions` + one `db.writeVersionChange` batch. Pure helpers added in
`lib/versionsV6.ts` (funnel geometry, compare order and leader, list order, stage band). Locks:
`tests/e2e/versionsV6.measure.ts` (VV6, emulator) and `src/components/versions/versionsPageSmoke.test.tsx`.

Top to bottom: the shared navy header (`WorkspaceNavyHeader`; "Versions", "of {title}", New version · How it works; on
the right the one-line Version map that opens v2's family tree in a dialog) → the founding writer band (founding writers
only) → the notice for queries with no version recorded → the list ("{n} versions saved") beside the open version and
its queries → "Compare your versions" (three measure tiles, one funnel card per version). Day one: header without the
map, the band, one How it works card. Free: v2's lock, unchanged.

## Baked decisions (17 Nov 2026)

1. The look is the Dashboard's, from its components. Nothing new is invented for cards, buttons or bands. Where the
   Dashboard's part is page-local to another page it is copied beside this page (v6/V6Parts.tsx names each source) and
   is a lift candidate: the framed card (dashboard/v2/Frame), the founding band (Dash2Founding's shell holding
   Packages' Pk41Banner content), the notice (dashboard/fv2/ReminderAsk), the switch (Dash2Active's `.d22-tog`).
2. List on the left, one open version on the right. Details are on the page, not in a drawer. New version and Edit
   render v2's `VersionForm` (`bare`) in the open card under a navy band.
3. The funnel is the bands style (`funnelGeometry`, the ref's `fsvg` style 2), on the page and on every comparison card.
4. The comparison is tiles plus funnel cards: no league table, podium, carousel or left illustration panel. Order is
   `leagueOrder` over the ranked versions; a tile names the first card under its measure (`leaderFor`).
5. The version map is one line in the header that opens the tree in a dialog. No miniature map is drawn.
6. Stage colour means stage only. A query's status is drawn by StatusDot, in ink, on its stage's band colour — not
   StageGlyph (CLAUDE.md: StatusDot is the only drawer of a query's status; SM3-8 pins StageGlyph's importers).
   No berry, blush, rust or green on this page.
7. Tight inside a section, generous between: header, band and notice 16 apart; 40 before the desk (56 after the
   notice); 64 before the comparison.
8. The label is "In use". Copy is the ref's, plain, with no advice and no verdict words.
9. No new stored fields. `src/types.ts` does not change.
10. The stage colours are one page-local block (`--v6-stage-*`, `--v6-chart-*` in v6/versionsV6.css): no shared token
    carries a partial or full band. Re-point there when shared stage tokens exist.
11. "See all {n} →" expands the list in place: the Query Centre has no version filter.
12. Archive is the open card's inline confirm and `archiveVersion` for any version but Original and the one in use
    (sent or not). v2's delete of an unsent version is no longer reachable from the page.

## Open items (owners in reports/versions-v6/REPORT.md)

The How it works film (not built: no play button that does nothing), the two illustrations (swappable placeholders),
Offer as a fourth funnel piece, archived versions' design, the phone.
