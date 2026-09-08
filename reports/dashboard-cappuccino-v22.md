# Dashboard v22 — build report

Ref: `design-refs/dashboard-cappuccino-v22.html` (md5 `1633d335edcd52452ca75e9c980f2de1`)
Gate: `scripts/dash-refdiff.mjs`, at 1536 / 1920 / 2520, against the running app.
Commits: `47eaa447` → `64f8e744` → `7166d68b` → `e6b2ba9f` → `831d04f1` → `7c0cb149`.

**132 misses at the baseline. 3 at the end, one per width, and neither of them is a
layout fault — both are named below with what they actually are.**

---

## The finding of this pass

**v22's base CSS is not what v22 renders, and reading it top-down gives the wrong
number.** The shipping config at line 1014 sets `aw:'360'`, which applies
`.grid2.aw-360` at line 665; the base `.grid2` says `440px` and never paints. The
hero's `h1` is `52px` in its base rule and `46px` in a v17 priority block below it.
The tile is `42px` at the base and `26px` under `ch-bare`, which every card in v22
wears — and the glyph inside that smaller plate is *larger*, 20px against 17.

That is three values in one file where the first match is the wrong one, and it
cost most of Phase 3 and part of Phase 5. **The rule for the next pass reading this
ref: take values from the COMPUTED style of a rendered element, never from the
stylesheet's first match.** `SA_REFDIFF_DUMP` (added this pass) prints exactly that
for both sides at once.

---

## Per-phase

| phase | commit | misses after |
|---|---|---|
| baseline | — | **132** |
| 1–2 · ref on the watchlist, harness honest | `47eaa447`, `64f8e744` | 132 |
| 3–4 · layout + type scale | `7166d68b` | **37** |
| 5 · chart | `e6b2ba9f` | **24** |
| 6 · to-do | `831d04f1` | 24 |
| 7 · activity | `7c0cb149` | **3** |

Phase 6 moved no number and that is correct: the to-do card had no footer at all,
and its body simply ran 40px longer inside a card whose own height was already in
tolerance. Nothing in the diff table can report a missing element — a probe
measures a box that exists.

## Final

| probe | 1536 | 1920 | 2520 |
|---|---|---|---|
| main | · | · | · |
| hero | · | · | · |
| **stats** | · | x 372.4→366.5 | x 372.4→366.5 |
| grid | · | · | · |
| toprow | · | · | · |
| manuscript-card | · | · | · |
| chart-card | · | · | · |
| plot | · | · | · |
| **brush** | xr 517.3→582 | · | · |
| todo-card | · | · | · |
| todo-badge | · | · | · |
| todo-rule | · | · | · |
| activity-card | · | · | · |
| activity-filters | · | · | · |
| feed | · | · | · |
| community-strip | · | · | · |
| page | · | · | · |
| _main (datum, not compared)_ | ref 1274×1512 · app 1274×1512 (window 1544×1644) | ref 1634×1465 · app 1634×1465 (window 1904×1597) | ref 2154×1465 · app 2154×1465 (window 2424×1597) |

**1536**: 1 misses  ·  **1920**: 1 misses  ·  **2520**: 1 misses

**total misses: 3**

`page` covers the ground colour, horizontal scroll (0) and the two columns' bottoms
(within 1px) at every width. Every text probe and every one of the fourteen
type-scale rows is within ±0.5px.

---

## Unmatched, with reasons

Neither is closeable, and neither should be closed by loosening anything.

**1 · `stats` x, 372.4 → 366.5 at 1920 and 2520.** The hero is `auto 1fr`, so the
stat row begins where the greeting ends. The ref's greeting reads *"Hello,
Bethany"*; the harness account's name is shorter, and the whole 5.9px is that
difference. It is the fixture, not the design — and renaming the account to flatter
a diff is the wrong direction entirely. **The alignment the probe cannot see was a
real fault and IS fixed:** the ref centres the three stats in their track at a 44px
gap, tightens to 34 below 2100 and only below 1700 goes flex-start at 32; ours was
flex-start at 56 everywhere, so at 1920 the stats sat hard against the greeting with
~300px of empty track to their right, with every probe green. A container's box is
identical whether its children are centred or packed left.

**2 · `brush` xr, 517.3 → 582 at 1536.** The ref's frequency control is a two-button
chip pair (Weekly | Monthly) 146.3px wide; ours is a native `<select>` at 79px,
because this app offers **three** frequencies — Daily, Weekly, Monthly. Below the
breakpoint the control row is left-aligned, so the brush starts 64.7px earlier;
above it the row is right-aligned and the brush is green at both widths. Matching
the ref's geometry means dropping a frequency the app supports, which is a product
decision and not a layout fix.

---

## False premises in the pack

**"Find where the fourth band was reintroduced."** It never was. `bandTotal` is
`queried + agent + you` at source — the three bands, as designed. There was nothing
to find and nothing to remove.

**"Delete the dashboard-local copy of the goals card."** There is no second copy:
the dashboard is querying goals' *only* home in this app, so deleting the component
deletes the feature. `OneScreenGoals` is **unmounted, not deleted** — one line
either way, and Nick's call.

**"The footer becomes 'Everything else is with the agents' alone (remove the
right-hand query count)."** There was no footer on the to-do card to remove
anything from. It has one now, with that clause and nothing else — and the count
deliberately does not join it, because the badge in the band already states how
many tasks there are and the rule beneath it already draws their split. What the
line is for is the tasks that are *not* on the card.

**"Restore the corner expander."** Not built, on the ref's own evidence. Its handler
is `body.classList.toggle('tall')` and its tooltip is *"Give the feed more room"*.
This column is already the full height of the grid, so there is no room for it to
give: it would toggle a class, change nothing a reader can see, and read as a
feature. That is the reasoning the v16 pass retired it on, and the v22 layout has
only made it more true.

---

## The harness

Audited at Phase 0 and it went **red on demand** — `--self-test` breaks one probe's
geometry by 40px in the loaded ref and requires the run to report it. It still does.
Three changes this pass, all in the direction of catching more:

**`SA_REFDIFF_DUMP=<probe>`** prints that probe's subtree from both sides, offsets
relative to the probe's own box. A diff row names a box and never says which child
moved it — *"plot y 199 → 213"* was 14px of header padding the table has no row for.
Every fault in Phases 5 and 7 was found one level down. It lives inside the harness
rather than in a second script because a separate script means rebuilding the
sign-in, which is how a probe ends up measuring the auth page.

**`SA_REFDIFF_SHOT=<dir>`** writes a picture of each side. A whole class of Phase 7's
work is invisible to the table by construction — moving a status dot into a strip,
mirroring that strip, left-aligning prose — because all of it leaves the feed's box
exactly where it was. **Both of Phase 7's real bugs came from the image, not the
numbers**, and neither could have been caught by extending the probe set: the claim
is about arrangement *inside* a box.

**A load-race guard.** One run reported **15 misses that read exactly like a
regression** — the plot "renders no visible element", the to-do rule likewise, nine
type rows absent, one column's bottom 1465px out. Every one of those was the
dashboard correctly drawing its EMPTY state, because Firestore had not answered
inside the 2.6s settle. The next run was 1 miss. It now waits for the chart's series
and throws naming the race — rather than raising the blanket settle, which costs
every run and still races on a slow one. It is the same family as the existing
auth-page guard and gets past it because the probes are all *there*.

## Live bugs found by measuring, not by reading

**The activity meta has been printing the manuscript title where the agency
belongs.** `metaAgency` was `caption.split(" · ")[1]`, and `captionFor(who, agency,
title)` puts the *title* in that slot whenever an agency exists. It read plausibly
beside the surname — "Whitfield · The Smoke Test" looks like a person and their book
— and became obvious the moment the surname came off and it stood alone under a
sentence that already names the book. The field was there all along; splitting a
display string to recover it is the string-parsing this codebase forbids elsewhere.

**A tight run dropped its strip, costing every member its direction, state and
time.** Correct when the run's *side* carried the direction; wrong at full width.
Measured on the harness account: four consecutive sends to **three different agents**
rendered as one attributed burst and three anonymous lines.

**Two rules for one law, and the older one won.** `.os-bw`'s narrow-width override
already existed, correctly reasoned and correctly placed after the base rule,
carrying v16's 170px. A second rule saying 150 was written fifty lines up before
anyone looked — where it lost, silently, for exactly the reason the existing comment
gave.

**A lock that contradicted its own preamble.** `.os-counters`'s case said "the GROUP
centres" in its comment and required `justify-content: flex-start` three lines
below. Written one after the other, disagreeing, and green because the CSS matched
the assertion rather than the sentence.

**Three unanchored selectors in source locks**, each reading the wrong rule:
`.os-th2 {` matched the tail of `.os-ahead, .os-th2 {`, and `.os-afoot {` matched the
tail of `.os-actv .os-afoot {`. A selector in a source lock is anchored at a line
start or it matches every rule that ends with it — a law this repo already records,
and which this pass broke three times.

---

## Decisions worth Nick's eye

- **`OneScreenGoals` is unmounted, not deleted.** One line either way.
- **The corner expander and the activity foot's "Full log →" are not built.** Both
  would be controls with nothing to do; there is no full-log page to send anyone to.
- **The narrow breakpoint is 1699px in eight blocks where v22 says 1700px.** One
  pixel of viewport, measured by nothing, and closing it means editing six test
  files that pin the number. Left alone deliberately rather than swept mid-phase.
- **`.os-root` now states `line-height: 1.4`**, the ref's own `body` value, where this
  app inherited 1.5. It was being rediscovered one element at a time — the legend
  measured 41 against 39.6 and took the difference off the plot, the stat block 40.4
  against 39.3, the to-do heading 34.5 against 32.2. One cause, three symptoms.
- **The band's height is a FLOOR now, not the height.** The old rule stated
  `height: 51px` and centred its contents, on the reasoning that three bands agreeing
  structurally beats three that happen to measure alike. The reasoning holds; the
  mechanism was wrong — the ref's band is 14px of air, its contents, then 4px, so its
  contents sit *high*. Centring them put the to-do badge 4.6px low at every width
  while the band's own height stayed in tolerance, so the diff blamed the badge.

## Out of scope, reported only

- `OFFER` in `TERMINAL` — untouched.
- **Re-exporting the stat illustrations — the ceiling is two of the three source
  files.** The slot is the ref's 112px (96 below 1700) and the artwork renders at
  **50px inside it**, so it fills 45% of the space the design reserves. These are
  rasters with no `srcset`, so the largest sharp size is the source's own pixels at
  the DPR the app targets: agents-on-file **100×100 → 50**, response-rate **100×100
  → 50**, active-query **800×800 → 400**. Two of three bind at 50 and the row caps
  there, because a row of three marks at two different sizes is worse than a row at
  the smaller one. **To fill the slot sharply, those two need re-exporting at 224×224
  or better; the third is already capable.** The slot reserves what the design asks
  for and the picture centres in it, so nothing about the layout changes when they
  arrive — it is one asset swap and one `max-width`.
- The stat marks carry `mix-blend-mode: multiply`, which an ancestor `transform`
  silently kills. The harness watches for exactly that (`page` reports
  `blendAncestorTransform`) and it is clean at all three widths.
