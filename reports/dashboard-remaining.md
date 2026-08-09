# Dashboard — remaining fixes · build report

**8 August 2026.** Four commits, gates green on each; suite **3410 passing** across 213 files.
Ref: `design-refs/author-tile-round2.html`, option D.

| | | |
|---|---|---|
| P1 | `610aed3` | bound row 2 by the viewport |
| P2 | `0071754` | author tile → option D |
| P3 | — | already landed as `139e76f`; verified, not redone |
| P4 | `<this>` | release fix + this report |

## Step 0 — what had already landed

- **Author tile**: option A as described (burgundy frame, sage band, avatar top-left). Confirmed,
  now converted.
- **Previous Phase 1 DID land** (`5d954f3`): `layout="fill"` on the dashboard slot, `fit` extended
  to it, and **`useStageLock` deleted entirely** — it is not dead code, it is gone. The only
  remaining mention is a lock asserting its absence. `.os-root` is `height: 100%`.
- **Activity feed subject resolution already landed** (`139e76f`) and already meets this pack's
  Phase 3 in full: per-type resolver, per-type pill labels, unmapped type returns null and drops
  the row, an enum-completeness lock, and no em-dash fallback anywhere. **Phase 3 needed no code.**

## ⚠️ I could not reproduce the reported page scroll

This matters, so it leads. In a harness reproducing the real shell chain — same classes, same
`StagePage`, built CSS — at HEAD **before** any change in this pack:

- **332 feed entries**: no page scroll, nothing clipped, feed scrolling internally, columns level.
- **A height sweep at 604 / 644 / 684 / 724 / 764 / 804 / 844 / 904 / 984**: row 2 tracked the
  container every time; `rowsTotal ≤ contentH` at all nine.
- The **deployed dev build already carries the earlier height fix** — `.os-root{height:100%}` is in
  the live CSS, and the live hash is not the one I last deployed, so somebody deployed after me.

So the scrolling being seen is not the earlier fix being absent, and it is not reproducible from
the data shapes I can construct. **What would settle it:** on the real page, the viewport size plus
`document.documentElement.scrollHeight` and `window.innerHeight`, and
`document.querySelector('.os-content').getBoundingClientRect().height`. That distinguishes a
too-tall row from something outside the dashboard entirely.

## Phase 1 — the change landed anyway, and here is why

The diagnosis behind the corrected spec is right even though the symptom did not reproduce.

**Row 2 was `auto` — content-driven. That it had not blown out is a coincidence of one shorthand.**
`.os-actv` was `flex: 1`, whose basis of **0** means the feed's real height contributes *nothing*
to the row's max-content size. Write `flex: 1 1 auto` — which is exactly what the corrected spec
asks for, and the more natural thing to write — and the row takes the feed's full height. The
layout was one word away from the reported bug.

So: `grid-template-rows: auto minmax(0, 1fr)`, `align-content: start` removed (it stops row 2
filling), `height: 100%` on the grid, `height:100% + overflow:hidden` on both columns, and
`.os-actv` now safely `flex: 1 1 auto` behind a **small** `min-height: 120px` — small because its
job is to stop the card collapsing, not to reserve space.

## Phase 2 — option D

Frame, band and header arrangement removed with their CSS; one centred column, manuscript as hero,
author as a byline under a 56px rule. The `+` badge stays a real affordance at 52px, wired to the
same profile destination. The `Querying {n} manuscript(s)` line is **dropped**, and
`authorBandLine` went with it rather than lingering unused.

**⚠️ The ref is drawn at 436×436 and this tile is 302** — the same discrepancy option A hit, and
the ref still describes itself as drawn at the build size. Option D's 136px plate and 30px padding
need ~387px of column here. Type sizes kept as specified; plate and spacing scaled; the plate
shrinks further on a two-line title.

**⚠️ The title's wrapper is load-bearing** and carried over deliberately: `-webkit-line-clamp`
needs `display:-webkit-box`, and a flex item's display is blockified — unwrapped, the title
collapses to zero height and is not on screen at all.

## Measured

| | | |
|---|---|---|
| 1280×800, 70 entries | `scrollHeight ≤ innerHeight` ✅ | columns level, both bodies scroll |
| 1440×900, 70 entries | ✅ | agent-added and manuscript-added both named |
| 1920×1080, 70 entries | ✅ | Pro banner shows, feed scrolls |
| 1440×720 | ✅ | release does **not** fire here — see below |
| 1440×640 | release fires, scrolling permitted | page 836px, feed still scrolls internally |

**The pack asks for "correct release at 1440×720", but 720 is on the holding side of the line** —
the threshold is `max-height: 680px`, so at 720 the lock correctly still holds and the page still
fits. 1440×640 exercises the release properly.

**A release bug found and fixed in Phase 4:** the ≤680px rule was `flex: none; min-height: 300px`,
and `flex: none` is basis **auto** — so once released the feed rendered every entry at full height:
a **6,446px** dashboard, measured with 70 entries. Releasing the lock permits scrolling; it does not
mean abandoning the internal scrollers. Now a definite `height: 360px` — the released page is
**836px** and the feed still scrolls inside. Pre-existing, and masked until now by the base rule's
basis-0.

**Author tile at 302×302**, three cases (normal / long title + long genres / missing manuscript):
every tile square, plate square at 89 / 59 / 96, **space above == space below in all three**
(19/19, 19/19, 49/49), byline inside the tile, no overflow, no truncation.

**Feed**: `Agent added — Added Daniel O'Rourke at Inkwell & Stone`,
`Manuscript added — Murphy's Day Out`, alongside query events naming their agent. No em dash.

## Volume

With 70 query events plus 2 agent/manuscript events the feed reads well — the non-query entries are
a small minority and add genuine context. **On a real account the ratio will differ**: an import or
a bulk agent-add session would produce a run of "Agent added" rows in one day. Worth watching; the
answer would be a filter, not exclusion. Nothing is excluded in these commits.

## For your eye

- **Everything was rendered in Cappuccino only.** Option D's plate shadow, the sage pills and the
  rule are untested against Bold and Editorial.
- **"Three genres"** is still unreachable — the model carries `ageCategory` + `genre`, so two pills
  is the maximum.
- Nothing here is deployed.
