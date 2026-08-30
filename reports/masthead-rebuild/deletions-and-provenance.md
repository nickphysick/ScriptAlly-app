# §2 the deletions · §3 the two outstanding reds

## §3 · Provenance, established before anything was fixed

Both reds belonged to one file — `tests/e2e/headerTypes.measure.ts`, the Type A/B partition —
which §2 deletes. That does not answer the question, so the underlying facts were measured
directly, at the tip and against a baseline worktree at `e9f8381b` (the parent of the masthead
rebuild's Phase 1). The lock itself last changed at `448c7a11`, before the rebuild, so the two
runs compare identical assertions against two app builds.

### Red 1 — "Submission packages is a scrolling page whose row has nothing to scroll"

**Not mine. It was red on `main` before the rebuild began, and it is not a defect.**

| page | baseline `e9f8381b` | tip |
|---|---|---|
| Query Centre | static · row 0 | scroll · row 1560 |
| Analytics | pinned · row 1871 | scroll · row 1967 |
| Contact list | pinned · 2394 | scroll · 2466 |
| Discover | pinned · 1173 | scroll · 1245 |
| **Manuscripts** | pinned · **row 0** | scroll · row 32 |
| Comparable titles | pinned · 1104 | scroll · 1176 |
| **Submission packages** | pinned · **row 0** | scroll · **row 0** |
| Tasks family | pinned · 0 (inner zones) | unchanged |

At baseline the case failed on **Manuscripts**, which is earlier in the loop and masked Packages.
My rebuild gave Manuscripts 32px (a taller masthead), so it now passes and the red moved to
Packages — the same pre-existing condition, revealed rather than caused.

**And Packages is correct.** Measured across viewports:

```
1280×900  overflow 0    (scrollHeight 739 / clientHeight 739)
1440×900  overflow 0    (752 / 752)
1440×700  overflow 63   (615 / 552)
1920×900  overflow 0
2560×900  overflow 0
```

The page fits at 900 and scrolls normally at 700. The assertion required a scrolling page's row to
be *currently* overflowing — a fact about how much the harness account holds, not about the page —
and it contradicts the law stated in its own document: *"type is a property of STRUCTURE, not of
today's content."* Resolved by deleting it with the partition and by making overflow a REPORTED
reading in `barBinding.measure.ts`.

### Red 2 — "Analytics: the slab does not start at the scroller's top"

**Does not reproduce at the tip.** Measured at 1440×900, `slabTop` = 0 on all ten pages:

```
Query Centre 0 · Analytics 0 · Contact list 0 · Discover 0 · Manuscripts 0
Comparable titles 0 · Submission packages 0 · To-do 0 · Calendar 0 · Noteboard 0
```

The bar is now the scroller's first child at 46px with `margin-bottom: -46px`, so it contributes
zero and the slab still opens the row. At baseline the owning case PASSED, so the reading was taken
somewhere inside the rebuild and is already fixed. Nothing outstanding.

## §2 · What was deleted

- **The settle** — `.wpg-chrome--stuck` and its posture rules, the `stuck` boolean, the remembered
  resting height and its `getAnimations({ subtree: true })` guard, `--wpg-reclaim-pad`, and the
  reclaim term in the spacer. The spacer survives as the chrome gap alone (still an element: margins
  collapse). Calendar's `--wpg-reclaim-pad: 0` opt-out went with it.
- **Hide and the chevron badge** — `.wpg-mast-hide`, `.wpg-chevfold`, the `hidden` state, the visit
  reset that cleared it, the `displayed` guard, the portal, `WINWRAP_ID` and `shellSlots.ts`.
  Query Centre's restyled chevron pill went too.
- **The Type A/B partition** — `pinned`, `data-wpg-type`, `.wpg--static`, `mastheadBehaviour.ts`
  and its provider. `settleOn` is renamed `scroller` (`data-wpg-scroller`): it names the page's
  primary scroller, which the BAR watches.
- **The wash** — `--mast-wash-top` / `--mast-wash-bottom` and the sweep that guarded them.
- **The per-property carve-out** — `WASH_CARVE_OUTS` and `CARVED`.
- Already gone before this pass: the accent bar, the Packages tint, the tab rail and its sticky
  offset, the masthead CTA table.

`var()` READS swept, not definitions. Zero live reads of any deleted token; the two remaining
occurrences are prose.

## Locks

Deleted: `headerTypes.measure.ts`, `chevronFold.measure.ts`.
Retargeted: `settleBinding` → `barBinding` (the bar binds to the primary scroller); `chromeGround`
from the slab to the BAR (the same two-backdrop pixel sweep, which needed no change when a flat fill
became a gradient and needs none now — but a new precondition, because the bar is `opacity: 0` at
rest); `headerFix`'s wash partition → the ground partition, with no carve-out; `mastheadMatrix`'s
type branches → one unconditional claim.

## Eight more latent reds, revealed one at a time

All eight were masked identically — seven behind an earlier failing assertion, the eighth behind a carve-out: an assertion earlier in the same case failed first, so nothing
below it ran. A case whose first assertion is failing is not green — it is silent — and the
partition's own reds had been failing first for four commits.

1. **`mastheadMatrix`'s height derivation read `.wsh`'s padding, which is `0`.** The format states
   its air on `.wsh-body`, and the derivation also omitted the top rule and the kicker, so the sum
   came out 88px short: *"the masthead is 172.8px … derive 84.4 — it is spending height on something
   unnamed"*. Stale since Phase 1. Rebuilt as `rule + body padding + kicker + title + description`;
   the old `max(mark, …)` term went with the mark — which then exposed a second real figure: the
   kicker is `display: inline-block`, so its contribution to the column is the LINE BOX it sits on
   (the body's `line-height` and strut) plus its margin, not the pill's border box. 1.9px, measured
   as the distance from the body's content edge to the title's top, which is that contribution by
   definition.
2. **The same case's cross-page equality was over raw HEIGHT, which asserts COPY.** The
   description is capped at 58ch and wraps; Analytics and Noteboard measured 198.5 against four
   pages at 175.3, which is exactly one line of `--mast-sub-size` at 1.45. Six correct mastheads
   reported as disagreeing. It compares the chrome around the sentence now — rule, padding, kicker,
   title — and REPORTS the description's own box, so a sentence that quietly grew to four lines is
   visible without being a failure.
3. **`illustratedMasthead`'s "no text sits on painted artwork" ran a `settled` posture.** Scrolling
   no longer settles the masthead, it removes it — so the clip was a box above the viewport and every
   reading came back `Clipped area is either empty or outside the resulting image`.
4. **The same file's "the title's ink is not clipped" did too**, reporting *"ink overflows its
   clipping ancestor by 340.5px"* about an element that had left the scrollport. Both are one
   posture now, which is a simplification rather than lost coverage: there is one shape to check
   because there is one shape.

5. **The mark-size claim expected `[52]` while every page reported `-1`** — the "no mark" sentinel.
   The masthead has drawn none since Phase 1. Inverted over the whole census rather than lapsed.
6. **And behind THAT, a `CARVES` table exempting the two illustrated pages from the type scale, the
   mark and the height.** All three now match exactly: ten pages at `title 44px/700 · mark -1`, both
   trial pages at the same 141.1px of chrome as the other eight. A carve-out naming pages that no
   longer differ can only rot — **and it silently shrinks the population**: three claims were being
   asserted over eight pages while reading as ten.

7. **And widening the population to all ten found a real divergence the carve-out was hiding.**
   Query Centre's masthead chrome measured 138.6 against everyone else's 141.1. `.wsh` stated no
   `font-size` or `line-height`, and nothing in it renders at the inherited size — but the kicker is
   `display: inline-block`, so its line box follows the block's STRUT, and Query Centre sits under
   `.t-f12` at 13px/18.85 where the other nine inherit 16px/24. **A format that inherits is not a
   format.** `.wsh` states both now; QC measures 175.3 like the rest.

8. **The control-row position allowed "at most two distinct heights".** There are three now, and the
   third is a description wrapping to a second line — the same measuring-copy fault, one element
   down. The tolerance had already been loosened once (2 rather than 1) to accommodate a real
   outlier rather than diagnose it, which is exactly how a spread stops meaning anything. It asserts
   the RELATIONSHIP now: the control row's top IS the masthead's height, per page, to the pixel.
   Stronger than any spread — it cannot be satisfied by two pages being wrong in the same direction,
   and it holds however many line counts the descriptions grow into.

**The chain is the lesson, not the count.** Each fix made the next assertion reachable and that one
was wrong too. Budget for a chain.

And one fault of my own, caught by the checks rather than by reading: `chromeGround`'s two scroll
positions were floored to clear the bar's 150px threshold, and the floors collided on Noteboard
(zone scrolls 165–285px), landing 22px apart. Derived and then checked now, with the page skipped
and its numbers printed when the range cannot satisfy both constraints.
