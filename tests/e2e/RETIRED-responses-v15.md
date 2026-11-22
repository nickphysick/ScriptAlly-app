# Retired by Responses v15 (17 Nov 2026)

`tests/e2e/rs5.measure.ts` measured the Responses v5 page (ref `design-refs/responses-v5/`). v15
(`design-refs/responses-v15/`) replaces that page's body: the glance cards, the insights band and showcase, How long
agents took, the quote masonry, the wall and its list are gone; the header keeps the shared navy header with a new
right-hand slot. Every lock below was read against v15 before it went. A lock whose claim is still true of v15 was
**re-pointed** into `tests/e2e/rs15.measure.ts` (or to the existing lock that already holds it), not deleted.

| v5 lock | What it asserted | Disposition |
|---|---|---|
| A1 title card | the title card's geometry against the reference (already skipped since Workspace headers v1) | Retired: the title card went in Workspace headers v1; the header's place is rs15 A1G |
| A2 glance | the four glance counts sum to answered + waiting; their clicks land 20px under the scroller | Retired: the glance cards are gone (Analytics owns those figures). The header's counts are rs15 A1; its labels' jumps are rs15 A1 |
| B1 your move first | request cards with the writer's move come first | **Re-pointed** as rs15 D1 (the Query Centre's own card, the ref's order) |
| C1 band figures | the navy band's reply share, request count and typical wait equal the reference's | Retired: the band is gone; the page's figures are the line of facts, rs15 C1 |
| C2 warming up | the warming-up cards at 1–4 answers, not at 5 | **Re-pointed**: early days (`isEarlyDays`, still 1–4) is rs15 H2 and C1's early case; the 5-answer edge stays unit-locked in `src/lib/responses.test.ts` |
| D1 bars | the four wait bars sum to their totals, the totals to answered | Retired: How long agents took is gone (Analytics) |
| E1 note filter | the note switch's counts (All / From passes / From requests) | **Re-pointed** as rs15 E1 ("the switch and its counts") |
| F1 six columns, no packages | the list's six columns, and no package text anywhere | **Re-pointed** as rs15 F1 (v15's six columns, and "no package text in the collection") |
| F2 month groups and sort | month groups under the date sort; each column sorts | **Re-pointed** as rs15 F1 (months, counts) and F2 (every heading sorts and reverses) |
| G1 panel | the panel opens from a card, a quote and a row | **Re-pointed** as rs15 P1 (a card, Open the card, a row; Esc; focus returns) |
| H1 empty, then populated without a reload | the empty page; the first answer switches it live | **Re-pointed** as rs15 H1 (the ref's empty parts, then `seedRs15.mjs --answer-one` and the live switch) |
| P1 pin | the wall's navy bar and headings pin with v2's hysteresis | Retired: the Rejection collection has no pinned bar (the frozen ref has none) |
| G2 acting | acting dims the page; a no recorded on a request lands live, with Undo | **Re-pointed**: the dim is rs15 P1; a save landing live with Undo is the same composer path as `recordResponse1.measure.ts` R10 |
| S1 share builder | names off by default, nothing uploaded | **Re-pointed** as rs15 S1 (opened by Share your story, under the collection) |
| L1 no overflow | no sideways overflow at five widths | **Re-pointed** as rs15 L1 (five widths and 200% zoom at 1512) |

Also retired with the file: `rs5Shots.measure.ts` (read v5's hooks only) and `seedRs5.mjs` (only rs5 used it; it read
`.env.development` directly, one of the 25 files `src/test/firestoreTarget.test.ts` names on the base). v15's fixture is
`seedRs15.mjs`, through `fsTarget`.

Re-pointed elsewhere: `tests/e2e/wsHeaders.measure.ts`'s Responses entry now reads `[data-rsp15='body'] > :first-child` as
the first section and the header's own `[data-rsp15='replied']` as H6's figure.
