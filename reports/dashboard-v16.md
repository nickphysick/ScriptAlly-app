# Dashboard v16 — build report

**7 August 2026.** Five commits, all four gates green on each; the suite grew 3264 → **3313
passing** across 210 files. Design authority: `design-refs/dashboard-v16.html`, committed in
Phase 1.

| | | |
|---|---|---|
| P1 | `5044e0d` | layout and header |
| P2 | `4f8dad0` | the author tile |
| P3 | `02635b0` | frequency and range |
| P4 | `0cb900e` | the task counts |
| P5 | `719a921` | the Pro banner |
| P6 | `<this>` | verification + report |

## What the verification pass found

**The entrance stagger never cleaned up after itself — a live bug, now fixed.** The `enter` class
was added and *never removed*: `entered` was in state and in the effect's deps, so setting it
re-ran the effect, the cleanup fired first and cleared the pending timeout, and the re-run
returned early at the guard without re-arming it. A self-cancelling effect that reads as correct.

It matters because `.os-card.enter` carries `animation: … both`, and while the class is on, **the
animation's final keyframe outranks any inline transform on every card on the page** — precisely
the motion trap in CLAUDE.md, left armed across the whole dashboard. It also cost 2px: colM
overran its column by exactly that much, which is what led me to it.

The guard is a **ref** now, for the same reason the chart's `drewIn` is one. Browser-verified
both ways: `stillAnimating: true` long after settling before, `0` and `colMOverflow: 0` after.
Locked against the deps array itself, since that is where the fault lived.

**A stale stagger selector.** `.os-colR .os-aut.enter` still named the rail after Phase 1 moved
the author tile to the main column, so that card animated on the default delay. Now `.os-colM`,
with a lock that every stagger delay names the column its card actually lives in.

## Measured, on a real page, against the built CSS

Both target sizes, fresh load each (see the harness note below):

| | 1280×800 | 1440×1000 |
|---|---|---|
| lock | 800px | 1000px |
| page scroll | 0 | 0 |
| columns end level | 0px apart (778) | 0px apart (976) |
| colM overflow | 0 | 0 |
| author / chart | 302px each | 302px each |
| tasks | 290 (shrinks from its 318 cap) | 318 |
| Pro banner | `display: none` | 143px, at 827–970 |
| h1 | 40px (the ≤1440 step) | 46px |

Tasks shrinking to 290 at the shorter height while the midrow holds 302 is the intended
division: the midrow is `flex: 0 0 auto`, tasks is `0 1 auto` behind a cap, so the row that can
give, gives.

## Decisions worth a second look

- **The sparse chart message changed meaning.** "The line begins once you have queried in two
  separate weeks" became false the moment the chart could be read daily — at that grain the line
  begins the next day. It names the grain now, and the only sparse case left is a *single day* on
  the record: sent-yesterday gives two daily points and a real, flat line.
- **The task trio counts what it sits above, so Phase 4 also had to render the third tier.** A
  "yours" pill over a list with no such rows would never add up. "Yours" reuses `taskSurfaced`
  from `lib/todoBoard` rather than a second rule written on the dashboard.
- **The Pro banner gained a plan gate the rail's mini never had.** A paying user is never sold to
  (house law); the mini showed to Pro users too. Moving it was the moment to stop that.
- **One typeface in the count pills, but not the ref's.** The ref names Inter; these inherit,
  because the app's body font is Source Sans Pro and hardcoding Inter would make two pills the
  only Inter on the page. The rule is *one face*, not *that face* — measured: numeral and label
  share a family and their centres agree to the pixel.
- **The dense daily view is the ref's own look, not a deviation.** At Daily × Everything the
  nodes form a beaded chain that nearly hides the line. I compared it against the ref rendered at
  the same grain over the same 180 days and they match, so I have **not** changed it. If you want
  it thinned at high density, that is a real design call and a one-line change — flagging it for
  your eye rather than making it unilaterally.

## ⚠️ A harness limit worth knowing

**ResizeObserver does not fire at all in the in-app browser pane.** A probe element genuinely
resized 50→80px and the observer recorded nothing. So *resize-then-measure is invalid here* — the
lock keeps whatever height it captured at mount, and every measurement above was taken on a
**fresh load at that size** instead. This is a sibling of the transitions note already in
CLAUDE.md and belongs beside it.

## Not done / carried forward

- **The two icons.** The pack named `design/refreshed-designs/icons/`, which does not exist; the
  assets were already committed at `src/assets/shell/` and are byte-identical to
  `~/Desktop/ScriptAlly/Refreshed Designs/Icons`. Only the manuscript mark is consumed here.
- **The ref's own stale comment** — "Rail now holds only Activity (tall) + Pro" — is wrong about
  Pro: its markup puts the banner in `colM`. Built to the markup.
- Still open from the one-screen pack: the **rules deploy** for `goalTarget` / `goalPeriod` /
  `tourCompletedAt` / `tourDismissed` (dev first, both configs; prod is Nick's). Until it lands,
  goals do not persist and the tour may auto-run again.
