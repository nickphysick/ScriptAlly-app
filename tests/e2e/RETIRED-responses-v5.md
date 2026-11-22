# Retired by Responses v5 (28 Oct 2026)

`tests/e2e/rs2.measure.ts` and its helpers measured the Responses v2 page (ref `design-refs/responses-v4/`). v5 replaces
that page's header, card, carousel, list, panel contents and empty page. Every lock below was read against v5 before
it went. A lock whose claim is still true of v5 was **re-pointed** into `tests/e2e/rs5.measure.ts`, not deleted.

| v2 lock | What it asserted | Disposition |
|---|---|---|
| A1 route | the centred light header, eyebrow and title "{n} answers from agents" | Retired: v5's header is the shared title card (rs5 A1) |
| A2 card | the summary card's counts, its bar and the Reply rate ring | Retired: the card and ring are gone; the counts are the glance cards (rs5 A2) |
| B1 gutter | the carousel band's gutter equal to the header's inset | Retired: the band and the inset are gone; the carousel sits in the page column |
| B2 carousel / one card | the paper band, card widths and the dots | Retired: v5's carousel has no band and no dots; order is rs5 B1 |
| B3 cards | each request state's strip, words and quote | Retired: the card is the reference's (rs5 B1, G1 cover its action and order) |
| B4 none | "No requests yet" panel with the still-out count | Retired: v5 says "No requests yet" in the heading line instead |
| C1 tally | gates per five, the hint under five | Retired: v5's tally follows the reference's ghost rule; the counts are rs5 A2 and G2 |
| C2 list | v2's six columns (Agent, What they said, Queried, Answered, Wait, Got as far as) and its sort words | Retired: v5's columns and sort are rs5 F1 and F2 |
| C3 pins | the pinned stack, the month band under it, the 1px hysteresis walk | **Re-pointed** as rs5 P1 (the "↑ Summary" button is gone: the reference has none) |
| C4 narrow | v2's stacked rows at a narrow sheet | Retired: v5's narrow layout is the reference's (rows drop the headings below 1180) |
| D1 panel | the stand card, index card and feedback card | Retired: the panel's contents are the reference's drawer (rs5 G1) |
| D2 acting | acting dims the page; a no recorded on a request lands live, with Undo | **Re-pointed** as rs5 G2 |
| E1 share | the builder: square, names off, nothing uploaded, story shape, Save | **Re-pointed** as rs5 S1 (the story-shape and no-nos cases dropped: the builder now opens from the share card, which v5 shows only with nos) |
| F1 empty | v2's empty page and its example card | Retired: v5's empty page is rs5 H1 |
| F2 zero nos | the zero-nos panel instead of a tally | Retired: with no nos v5 shows only the banner's first line |
| L1 no overflow | no sideways overflow at five widths | **Re-pointed** as rs5 L1 |

Also retired with the file: `rs2Probe.measure.ts`, `rs2Report.measure.ts`, `rs2Shots.measure.ts` and `rs2Mutate.sh`
(each read v2's `data-rsp` hooks only), and `seedRs2.mjs` (only rs2 used it; v5's fixture is `seedRs5.mjs`).
