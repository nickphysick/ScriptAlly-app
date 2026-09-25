# Query Centre v65.4 — run log

25 September. Follows the overnight v65.3 run. Ref `design-refs/query-centre-v92.html`,
SHA256 `008c3401…02de2` — **matches the brief. No stop.**

## Premises, checked

- **HEAD** `9fb20151`, on `main`, level with `origin/main` (0 ahead, 0 behind). `src/` and `tests/`
  clean. (The tree carries other sessions' PNG/TXT artefacts under `reports/` and `run-artifacts/`,
  as it did overnight; no gate reads those paths, and gate cleanliness is read over `src/` and
  `tests/` only.)
- **Baseline gates:** tsc 0 · production build clean · **505 files, 8,390 passed, 3 skipped**.
- **The ref's live defaults are the brief's**, read from its own boot code rather than assumed:
  `hm=0 · oh2=1 · nd=3 · ym=2 · fl=a · fx=float`. No disagreement.
- **Nothing in this brief is already done on `main`.** Each item was checked against the source:
  the bars are `height: 10px` hairlines with 9px labels (A2), there is no `clip-path` in the
  timeline sheet (A3), the heat strip is live (B1), the overdue pill and tab are live (B2), the
  striped `--nd` patterns are live (B3), `--qcv-rust` is read by the bars and the ghost (C1–C3),
  the popover is a 300px unsectioned panel (D1), and the empty track is inert (D4).
- **One correction to the brief's framing, and the mock settles it (A4).** The rail's heading is not
  "in the display serif": v65.3 already gives it Special Elite 16px, the full-width background and
  the 22px inset. What IS wrong is measured below and fixed as part of A4.

## Plan

Fifteen items, one commit each with its lock, in this order — the cheap removals first so the
later builds measure against a settled row:

B1 → A3 → A2 → A4 → B2 → C1 → C2 → C3 → B3 → A1 → A5 → D4 → D1 → D2 → D3.

Phase 0 enrols v92 and repoints `qcV65.measure.ts`. Every value below is measured off the RENDERED
ref, never read out of its cascade — that file is cumulative (v4 → v92) and its first declaration
of a selector is routinely a whole design away from its last.

---

## Phase 0 + B1 — v92 enrolled; nothing under the dates

v92 enrolled in `design-refs/.refhashes.json`; `qcV65.measure.ts` repointed. **The heat strip and
its whole derivation are deleted** — `heatWeeks`, `HeatWeek`, `HEAT_CURRENT`, `HEAT_EXPECTED`, the
rules and the element. A pure function nothing calls is a thing the next reader has to trace to a
rendered root before they can touch the row it used to draw in.

**A lock went vacuously green and the prefix rule is why.** `toContain("tl-month")` is satisfied by
`tl-monthX`, so the mutation that removed the month bands reported clean. Bounded to
`["\s`]tl-month["\s`]` and re-proved red. **Three mutations, all red.**

**Two measurement assertions were about the strip** and are retired with their subject rather than
inverted: asserting "0 heat cells" is an absence nobody reads. What replaces them is the claim the
removal makes — the row still draws its bands and its Mondays.

- Gates: tsc 0 · build clean · **8,384 passed** (baseline 8,390; six heat cases retired with the
  derivation, no case lost coverage).
- Measurement: **30 passed**.

---

## A3 · the month band clips its own contents

`clip-path: inset(0)`, **never `overflow: hidden`**. The band's label is `position: sticky`, and an
`overflow` of any value makes its ancestor the label's scrollport — so the label would stick to the
BAND, which never scrolls, and leave the screen with it. That is the law this repo already records
for a sticky inside a clipping ancestor, arriving from the other side. Two mutations, both red.

## A2 · a past stage is the SAME bar, set back

It was a 10px hairline with 9px words, which reads as a different KIND of thing from the stage beside
it rather than as the same thing, earlier. It states **no height, no top and no radius** now, so it
IS the base bar's 22/11 by construction rather than by two numbers somebody has to keep in step —
and that absence is what the lock asserts. Opacity .42, .7 with its row; the name in the same 11.5px
typewriter at the bar's start, in ink-70. Three mutations, all red.

## A4 · the rail's group headings — ⚠️ AND MY OWN PREMISE WAS WRONG

**I reported at the top of this run that A4's description was inaccurate. It was not; I was.** I read
`.qcv-be-gh`'s `font-family: var(--qcv-type)` out of the stylesheet, saw Special Elite, and wrote
that the brief had it wrong — **which is the exact fault this repo records at length**: a value read
off a rule is only the rendered value once you have checked what wins. Measured on the page, the
heading rendered in **Playfair Display**.

**The cause is `brand.tsx`, and it is already a law in CLAUDE.md.** It injects
`h1, h2, h3 { font-family: <serif> !important }` at runtime; the heading is an `<h3>`, so the sheet's
own rule was written, valid, matched and discarded. `font-family: var(--qcv-type) !important` — the
second heading in this page to need it.

**And the geometry was wrong in a way only a render shows.** `margin: 0 -22px` pays its 22 back in
padding, which is right on a scroller that carries 22px of its own — **and this scroller carries
none**. Measured: the background started 22px OUTSIDE the card (**384 wide against a 340 card**) and
the ink landed on the card's own edge, **22px left of the first disc**. The rows take their inset
from the row grid, not from a padded scroller, so there was never anything to pay back.

Measured after: face **Special Elite 16px**, background **340 = the card's inner width** starting at
**1056 = the card's own left**, ink at **1078 = the first disc's x**, count a **mono 9px pill, ink
with cream text** because the first group is Overdue.

**All four claims are in the MEASUREMENT, not a source lock** — three of them name a position on
screen, and the fourth is a typeface a source lock carried correctly about a rule the browser was
throwing away. Two rendered mutations, both red, each reproducing the fault seen on dev.

- Gates: tsc 0 · build clean · 8,386 passed.
- Measurement: **30 passed**.
