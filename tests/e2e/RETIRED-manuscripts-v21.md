# Retired with Manuscripts v21 (the Contact list look) — swept by SELECTOR, not by filename

v21 (design-refs/manuscripts/manuscripts-v21.html) rebuilds `/manuscripts`: an open header, the book
card beside Recent activity, a versions banner and stacked deck, three material doors on a band, and
an empty state that shares the header. The desk hero, the owed list, the shelf (Comps · Materials ·
Packages), the version tiles and v12's empty state are gone.

Swept by the selectors the retired parts were reached through — `[data-msv12="hero"]`,
`[data-msv12="hero-art"]`, `[data-msv12="cover"]`, `[data-msv12="facts"]`, `[data-msv12="owed"]`,
`[data-msv12="owed-row"]`, `[data-msv12="edit-details"]`, `[data-msv12-esec]`, `[data-msv12-ghost]`,
`[data-msv13="shelf"]`, `[data-msv13-card]`, `[data-msv13-vtile]`, `[data-msv13="arow"]`, every
`.msv13-*` class — across `tests/`, `src/` and `scripts/`. The only readers were
`manuscriptsV13.measure.ts` and `msv12Smoke.test.tsx`. The route sweep (every suite that opens
`/manuscripts`) found two that read anything page-specific: `headerFix` reads `.msv12-wpg` (the grid
root keeps that class) and `pkgMat` P1 asserts `.msv12-pro` is absent (still true).

Recover any file from `8d4b0df2`, the last commit that contains all of it.

## The v13 suite, case by case

`tests/e2e/manuscriptsV13.measure.ts` is deleted, with `ms13Fixture.mjs` and
`seedManuscriptsV13.mjs` (renamed to `ms21Fixture.mjs` and `seedManuscriptsV21.mjs`, and extended).
The locks are `tests/e2e/manuscriptsV21.measure.ts` (MS21).

| v13 case | Disposition | Why |
|---|---|---|
| M1 one-column | **retired** | there is no hero to share an edge with; H1 holds the header to the Contact list's, and every geometry lock asserts no horizontal overflow |
| M2 shelf | **retired** | the shelf is gone; M1 (doors) holds three cards in a row at equal heights |
| M3 bands | **retired** | no card on the page carries an anthracite band |
| M4 comps-rows | **retired** | the page lists no comps; the door's count and its "in your query letter" count are M1's |
| M5 version-tiles | **rewritten** (V3, V4, V5) | the tiles are a stacked deck and a list; the counts are still `versionUsage`'s and still asserted against the fixture |
| M6 activity | **rewritten** (B2) | five rows, not seven; still newest first and still scoped to this book (the other book's record is the newest on the account) |
| M7 edit-details | **rewritten** (B1) | the modal's fields changed: no author, a genre select, six statuses; the save path is the unit lock's |
| M8 owed-kept | **rewritten** (B3) | the owed list is gone; an owed request is a rust "your move" row in Recent activity, and it opens the same "sent" journey |
| L1 hero-one-row | **retired** | the desk hero is gone; H2 holds the drawing to the column's right edge |
| L2 art-floats | **rewritten** (H1, H2) | no ancestor of the title has a fill; the drawing paints above the hairline |
| L5 statusdot | **kept**, as a unit lock | `msv21Smoke.test.tsx`: every status glyph is `StatusDot`, and no mock ring was ported |
| L6 empty-examples | **rewritten** (E1) | three previews instead of five ghost sections; still inert, still one real action |
| L9 honest-missing | **kept**, as a unit lock | `manuscriptV21.test.ts`: an unset series reads "Standalone", an unset fact says "Not set" |
| L11 no-appraisal | **kept**, as a unit lock | `msv21Smoke.test.tsx`, both states |
| geometry vs mock | **rewritten** (H1) | the header is held to the Contact list's rendered header at both widths, which is what the page is built to |

## The unit file

`src/components/manuscripts/v12/msv12Smoke.test.tsx` is replaced by `msv21Smoke.test.tsx`. Its
dialog locks carry over (one write, `factPatch`, the rules allowlist, the portal, the London date);
the author-name lock is retired with the field.

## Older suites that open `/manuscripts`

`shelfLanding`, `heroLanding`, `msRecord`, `msProfileScroll` and `bookVersions` measure the book
profile (`AllManuscripts.tsx`), which no route has rendered since v12. They were named in
`RETIRED-manuscripts-v12.md` and are unchanged by this pack.
