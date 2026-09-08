# Dashboard v16 — build the ref faithfully

**Ref:** `design-refs/dashboard-cappuccino-v16.html`, md5 `4db460b17b0480e66afced1843cce9fc`
— unchanged by this pass. v14 left the watchlist at `1ca59a49e8783b7c92f17d47f99a3e9d` (the
hash it carried after the previous pass's six `data-probe-text` attributes, not the one it was
delivered with). One dashboard ref is on the watchlist now, not two.

**Result: 154 → 34.** By width: 1536 `59 → 12`, 1920 `48 → 11`, 2520 `47 → 11`.
Every one of the type scale's nineteen rows is green, in size, family and weight.

---

## The harness audit, and what was wrong with it

**Not the tolerances, and not a missing font-size comparison.** The tolerances were the pack's
exactly — edge ±3, size ±4, font ±0.5, colour and radius exact — and always had been. The text
probes did compare computed `font-size`. All sixteen box probes resolved to elements that
genuinely correspond, checked one by one against the ref's.

**The fault was coverage, and it is this repo's own monoculture-fixture fault wearing a
harness's clothes.** There were six text probes and I had chosen all six, and every one landed
on a run that already matched — the greeting at 52, the stat figure at 34, the card title at
23, the bubble sentence at 15. Measured across every text leaf on both pages: the ref's small
type sits at 9.5 / 10 / 11 and its **floor is 9.5**, while the app had **27 leaves at or below
9px** and almost nothing in the ref's populous 14.5 band. A whole register of the scale was a
quarter to a third short, and no probe pointed at any of it. The sample had been drawn from the
population that was already correct.

So the gate is `TYPE_SCALE` — nineteen named treatments as **selector pairs**, ref side and app
side, each compared for size, family and weight. Pairs rather than more attributes, because
attributes mean editing the ref, and a ref whose md5 moves can no longer be checked against the
one the pack names.

Three smaller repairs came out of the same audit:

- **The ref instruments a probe on an element its own shipping config hides.** `card-title`
  sits on the chart card's `h3` inside `hdA`, and `hdr:'b'` sets `hdA` to `display: none`. A
  visible-only read reports "the ref has no such text probe" about a probe the ref ships. Type
  is readable on a hidden element and type is all a text probe compares, so text probes now read
  their element regardless of visibility and **record** that it was hidden. Boxes still require
  visibility: a hidden box has no geometry.
- **A row missing on one side is a miss, not a skip**, and the two are named apart in the table.
  A skip is how a type gate quietly stops covering the treatment nobody has rebuilt yet.
- The ref's own three text-probe names replace my six.

**Proved red in both halves before anything was built on it**: the self-test's planted 40px box
break is reported at 40px, and a scratch build with the legend at 19px instead of 14 turned
`type:legend` from a family-only miss into `size 14→19`. The scratch was discarded.

Two later changes to the harness, both datum decisions rather than tolerances: navigation and
sign-in leashes went to 120s/90s after a load average of 17 made a `file://` load and a cold
Firebase auth blow a 30s default and die with a TimeoutError that reads exactly like a broken
page; and the app is re-read in a window that gives it the ref's content box exactly, by a
measured delta. Nothing about what is **compared** moved.

---

## Decisions I took

1. **The line is the three bands' sum, and an unplaceable query is not on the chart.** The pack
   cuts the fourth band and holds the legend to three entries, so those queries have nowhere to
   be drawn — and adding them to the line while drawing them nowhere would put back the gap
   between the line and the top of the stack that closing this sum was for. `bandTotal` says so
   in its own name: the figure is "placeable active", not "active". `undatedNow` still derives
   the difference for any surface that wants to state it.
2. **`OneScreenGoals` is an extraction, not a second mount of the rail.** `OneScreenRail` could
   have taken a `part` prop and been rendered once per column: fewer lines, and every one of the
   feed's derivations run a second time on a card that has no feed in it.
3. **Community takes the left column's slack in every state; Pro sits at the foot at its natural
   height.** "Whichever card is last closes the column" needed to know which card that was, and
   it is three different cards in three states — `OneScreenPro` returns null for a subscriber,
   is `display: none` below its own viewport gate, and renders otherwise. A `:last-child` rule
   cannot see the display:none case at all.
4. **The feed's expander is removed rather than repurposed.** The pack offered both. It existed
   to give the feed the goals card's height; the goals card is the left column's now and
   Activity already occupies the right one entirely, so expanding gained the feed nothing — what
   was left was a heavier shadow, a hidden foot, and an Escape hint for a thing that had not
   opened.
5. **The body face is Source Sans 3 — an app-wide change, flagged as one.** It is Source Sans
   Pro renamed at its own version 3, and every design ref in `design-refs/` declares it. Seven of
   the nineteen type rows reported a family miss on a typeface that is the same design.
6. **The goal's slots shrink rather than wrap, and the count is not capped at the ref's five.**
   The ref draws five because five is its demo target. One per target is the same device,
   parameterised; capping the count draws a plan of eight as a plan of five.
7. **The goal bar's label stays one line** (`10 Aug · 3`, the ref's `.wk .lb`) where the pack
   asks for the date over the count — Phase 4's own rule is that the ref wins where the two
   disagree.
8. **The ticket's sub-line row was removed from the type scale rather than left failing.** The
   ref's shipping ticket has none: `snip:'a'` makes `sub(t)` return an empty string, so it is a
   tag and a deed and nothing else. A row for a treatment the design does not have can never
   pass, and a permanent "no element in the REF" teaches the reader to skip the table.
9. **`tests/e2e/seedGoal.mjs` is new**, for the same reason `seedRequestDates.mjs` is: the
   harness account had never set a querying goal, so the card had only ever rendered its unset
   state and the figure, the "of N", the slots and the four bars were all unreachable.

---

## False premises

**That the type scale was ~1.6× the ref.** It is not, and the measured shape is different and
more useful: the app's *large* type matched exactly, and its *small* type ran a quarter to a
third short — 8 / 8.5 / 9 against the ref's floor of 9.5, with the ref's 14.5 band nearly
absent. The direction was right; the size and the location were not.

**That `--font-sans` decides the app's body face.** It does not. `brand.tsx` injects
`font-family` on a blanket `p, span, div, button, input, select, textarea, label` selector from
the user's font package, and an element rule beats inheritance from `html`. Changing the token
moved `body` and nothing inside it — the computed family on every card stayed Source Sans Pro
while the token at `:root` read Source Sans 3. **The sort of half-change that measures as done
and renders as nothing.**

**That suppressing a strip's fill is the same as suppressing the strip.** Seven housekeeping
bubbles were rendering an empty strip — a hairline across a card with nothing above the line —
because the fill is conditional on `r.state` and the element was not. Found by measuring, not
by reading the JSX.

**That the plot needed an aspect ratio.** It did, while the chart card's height came from its
content — it was the only thing giving the card a height at all. The moment Phase 3 gave the
card a stated `clamp(400px, 42vh, 560px)` the ratio capped the plot at width ÷ 3.03 and left
the card's slack empty: 246px of chart in a 560px card.

**That the app's hero had no lede.** It has had one all along — `.os-sub2`, two lines below the
greeting, carrying the ref's exact sentence. I added a second `<p>` before finding it, which
widened the hero's `auto` track and pushed the stat row 199px right. The harness caught it
immediately, which is the argument for measuring every phase rather than every other one.

---

## Per phase

| Phase | Commit | 1536 | 1920 | 2520 | Total |
|---|---|---|---|---|---|
| baseline (untouched `main`, honest harness) | `d28a1c44` | 59 | 48 | 47 | **154** |
| 3 · grid proportions | `af340354` | 37 | 30 | 30 | **97** |
| 4 · type scale | `01a5e8ab` | 21 | 14 | 14 | **39** |
| 5 · chart | `701fe6eb` | 17 | 11 | 11 | **39** |
| 6 · to-do | `c65c5ee1` | 12 | 11 | 11 | **34** |
| 7 · activity | `3c841486` | 12 | 11 | 11 | **34** |
| 8 · goals | `88116c49` | 12 | 11 | 11 | **34** |
| 9 · table committed | `f0a01f59` | 12 | 11 | 11 | **34** |

Phase 7 changes nothing the harness probes — v16 has no bubble probe — so it was gated by its
own measurement instead (`scripts/dash-bubbles.mjs`, 1536 and 1920, 48 bubbles): bodies with a
state fill **0**, query head bubbles with exactly one strip **9 of 9**, run continuations with
none **28**, housekeeping bubbles with a strip **0** (was 7), bubbles past the feed's inner
width **0**, feed horizontal scroll **0**.

Phase 8's own measurement (`scripts/dash-goals.mjs`): slot rows **1** at 300px and 352px, was 2
and 1; the goals card 336.5 → **298** at 1536.

---

## What I could not match, and why

| probe | 1536 | 1920 | 2520 |
|---|---|---|---|
| `brush` | y 310.7→319.9<br>xr 487.3→532<br>w 265.4→288 | · | · |
| `community-card` | y 926.7→894.1<br>h 563.7→157.4 | y 844.3→795.5<br>h 563.7→174 | y 844.3→795.5<br>h 563.7→174 |
| `feed` | y 301.5→305.3<br>h 1147.5→1158.2 | h 1147.5→1160.3 | h 1147.5→1160.3 |
| `goals-card` | y 594.6→574.1<br>h 310.1→298 | y 512.2→490<br>h 310.1→283.5 | y 512.2→490<br>h 310.1→283.5 |
| `manuscript-card` | h 362.2→340 | h 362.2→340 | h 362.2→340 |
| `plot` | y 372.7→395.9<br>h 353.1→328.2 | y 205→219<br>h 438.4→421 | y 205→219<br>h 438.4→421 |
| `stats` | · | x 424.9→416.4<br>w 1205.1→1213.6 | x 424.9→416.4<br>w 1725.1→1733.6 |
| `todo-badge` | · | y 729.1→724.5 | y 729.1→724.5 |

**Six cannot close while `OneScreenPro` renders** — `community-card`, at all three widths. The
ref's left column has three cards and the app's has four, per recon 4's branch, so Community
cannot be 563.7px tall while Pro takes space beneath it.

**Six are the goals card**, and about 38px of its difference is the ref's `.try` row ("Try it:
Send one · Reset"), a demo control for a static mockup that must not be built.

**The rest are work, and they are small.** The chart card's own height matches exactly; inside
it the band spends 3.3px more than the ref's and the legend 1.4 more, and the plot wears the
difference — decomposed with `scripts/dash-chartparts.mjs` (ref hd 72.7 / svg 431.7 / legend
39.6 against app 76 / 421 / 41), because "the card matches and the plot does not" is only
answerable by measuring the parts either side of it. The manuscript card sits at its 340px floor
against 362.2 of content in the ref. The stats row starts 8.5px early because the greeting's
`auto` track is narrower than the ref's. The feed is 13px tall, the to-do badge 4.6px, and the
brush is out of place inside the stacked header at 1536 only.

---

## Things for you

1. **The `git add -A` incident.** Staging Phase 4 with `git add -A -- src/` swept three of the
   Query Centre session's in-flight files into my commit `01a5e8ab` —
   `src/components/Queries.tsx`, `src/components/shell/illustratedMasthead.css` and
   `src/assets/queries/query-centre-masthead.png`. Nothing was lost, but their work was
   published under my message, and for a while it left two reds on `main`: a support-address
   sweep, and `pageStructure.test.ts` **timing out** (not failing) on a `Queries.tsx` that had
   grown. Both are green again as of the last full run — that session finished. Recorded rather
   than rewritten, per the standing rule. Explicit paths only from here.
2. **Source Sans 3 is app-wide.** `brand.tsx`'s default font package and `--font-sans` both name
   it now, with Pro still requested in `index.html` **only** because ~20 components name it as a
   literal in an inline style or a scoped stylesheet. Making those read the token is a follow-up
   sweep; until then, dropping Pro falls those surfaces back to a system sans.
3. **The harness account now has a querying goal** (8 per month, effective 2026-01-01), seeded
   by `tests/e2e/seedGoal.mjs` and removable with `--clean`.
4. **`OneScreenPro` in the left column** is the one ruling that puts a permanent six misses on
   the board. If the ref is the target, Pro needs another home; if Pro is right, those six are
   the price and the harness should be told so.
5. **The `.try` row.** If some equivalent is wanted it needs to be a real control rather than the
   ref's demo pair — and it is worth about 38px of the left column.
