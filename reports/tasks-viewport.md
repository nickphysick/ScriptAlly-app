# Tasks viewport lock — run report (7 Aug 2026)

**Refs committed:** `design-refs/tasks-viewport.html` (todo-fix99) · `design-refs/today-redesign.html`
(todo-fix107, normative for Today).
**All five phases + one fix:** `c8e6e79` (P1 lock) → `04e15aa` (the calendar fit) → `12c18ba`
(P2 Today) → `d558b49` (P3 Calendar) → `5cdd71b` (P4 Noteboard) → `5aa51a3` (P5 two doors).
Verified in an isolated worktree at the tip: tsc green, **3349 passed | 2 skipped, 211 files**.

---

## Phase 1 — the viewport lock (`c8e6e79`)

**The frame is a window.** `.tdb-wrap` was `overflow-y: auto` — the page scroller — so a long
list took the tool row off screen exactly when it was the reason you needed it. It is now
`overflow: hidden`, and designated `.tpl-zone`s below the fixed header block own all scrolling,
each with a fade hem at its foot.

The inversion happens **at `.tdb-wrap`'s own rule in todo.css**, not as a second single-class rule
in the layout sheet. Two single-class rules for one selector have equal specificity and resolve on
import order — the kind of pair that works until someone moves an import.

**⚠️ AND IT IS A CHAIN, NOT A RULE.** `flex: 1; min-height: 0` has to hold on every ancestor from
the fill slot down to the zone. One link left at the default `min-height: auto` and the column
grows to its content instead of the frame: **the page scrolls exactly as before, and every
declaration below it is still perfectly correct.** That is why the links are named in one place
rather than spot-checked.

### ⚠️ THE min-height:0 CHAIN — FOR THE BROWSER WALK

jsdom cannot verify this. There is no layout engine in this repo's tests, so the locks assert that
each link *declares* its part; only a browser can prove the chain *resolves*. The links, in
nesting order:

| # | Element | Declared in |
|---|---|---|
| 1 | `StagePage layout="fill" clip` | `src/App.tsx` (all four Tasks slots) |
| 2 | `.spine-root` | `tasksLayout.css` |
| 3 | `.tdb-wrap` | `todo.css` (the rule that was `overflow-y: auto`) |
| 4 | `.tdb-col.tpl` | `tasksLayout.css` |
| 5 | `.tpl-cols` | `tasksLayout.css` |
| 6 | `.tpl-body` | `tasksLayout.css` |
| 7 | `.tpl-zone` — the scroller | `tasksLayout.css` |

**In the browser:** on each of the four pages, confirm `document.querySelector('.tdb-wrap')
.scrollHeight === clientHeight` (the frame does not scroll) and that the zone's does not. If a
page still scrolls, walk the table top-down and find the first element whose computed
`min-height` is not `0px`.

### What else the lock touched

- **The board converges.** Its column region is the zone; the sticky column heads keep working
  because they stick to the zone's top rather than the page's.
- **⚠️ The scroll-restore contract FOLLOWED the scroller.** It read `wrapRef.current.scrollTop`,
  which is now permanently `0` — batch collapse would have jumped silently to the top of the
  board every time. It reads the zone.
- **The card gap survives untouched.** The zone wraps the grid from outside, nowhere near
  `.tbd-body > .tbd-card`. Asserted, given P6's precedent — a wrapper one level too deep killed
  that selector in silence a few hours ago.
- **⚠️ The sidebar is the To-do list's alone.** Today, Calendar and the Noteboard are header block
  → hairline → full-width content. The freed width is the point rather than a side effect.
- **⚠️ Calendar answers the lock by COMPRESSING, not scrolling** — `grid-auto-rows: 1fr`, the whole
  month always on screen. It is deliberately the one region with no zone, and that is asserted so
  a later reader does not "fix" the omission.
- **Hem iff overflow.** A hem over a list that fits fades to nothing and says "there is more" when
  there is not; the caller passes the predicate (the Noteboard hems only when notes exist).

### Two carried consequences, stated

1. **Calendar's facet keeps its state but has no control until Phase 3** gives it the tool-row
   `Everything ▾`. Its default shows everything, so nothing is hidden in the interval — but the
   page cannot currently be narrowed.
2. **Task settings needs its second door (Phase 5).** Three of four pages can no longer reach the
   sheet through the sidebar's foot. This is locked as a comment-assertion so it cannot be lost.

### Four existing locks superseded in place — dated, never deleted

The wrap's symmetric scrollbar gutter (nothing scrolls there to reserve one for), and three that
ran over the pages that used to mount a sidebar. Each keeps the rule it was really protecting and
narrows only its scope.

**And a helper fixed that cost two assertions in one session:** a rule-text reader that cannot
tell prose from declarations reads a rule's own note — *"this was `overflow-y: auto`"* — as still
declaring it. Both helpers strip comments now. Worth knowing generally: **in this repo's
rule-text suites, assert on declarations, not on raw rule text**, because the house style is to
explain a rule by quoting what it replaced.

## The walk (dev)

**Lead check:** open **/todo/calendar** and shrink the window vertically — the month **compresses**
(cells shorten, "+N MORE" folds sooner) and the page never gains a scrollbar. Then open **/todo**
and scroll the columns: the title, tool row and hairline **hold still** while the cards move under
them.

Then: the three non-board pages run **full width** with no sidebar (Calendar's cells are visibly
taller for it); the board's sticky column heads still pin as you scroll; expand and collapse a
housekeeping batch and confirm the scroll position returns where it was; a short Noteboard shows
**no hem**, a long one does; and the board's card spacing is unchanged from this morning's fix.

## ⚠️ THE CALENDAR FIT — a fix, and a lesson I had already written (`04e15aa`)

P1 declared the month should take the remaining height and never scroll. It still scrolled on a
laptop. Browser measurement against the built CSS found **two** causes:

1. **A bare `1fr` grid row is `minmax(auto, 1fr)`.** Its floor is the content's min-content
   height, so the rows could not shrink whatever the frame did. It is `minmax(0, 1fr)` now — the
   same law as the board's column measure, which I wrote that morning: *a capped track needs a
   zero minimum or the cap is the only thing that ever applies.* I used the bare form five hours
   after stating why not to.
2. **`.cal-cell` carried `min-height: 104px`.** A floor on the cell is a floor on its row.

| | rows resolved at 1440×900 | overflow |
|---|---|---|
| before | `12.75px 104px ×6` | **17px past the frame** |
| after | `12.75px 101px ×6` | **0** |

Swept downward: zero overflow at every height from **900px to 560px**, week rows compressing
101px → 44px. The locks carry those numbers and assert the bare `1fr` form is *absent*.

## Phases 2–5

**P2 — Today, redesigned (`12c18ba`).** The Dashboard's grammar, both eyebrow derivations
imported rather than reimplemented, the stat row replacing the prose subtitle, two named regions
each with its own zone, no sidebar and no filter control. The plan card stores the **day** rather
than a boolean — a flag would need an owner to clear it — and carries the one real asset,
extracted from the ref's base64. **Eight existing locks superseded in place**, each keeping the
rule it was really protecting.

**P3 — Calendar (`d558b49`).** The fold threshold now derives from the resolved row height via a
ResizeObserver, with `CAL_CELL_CAP` surviving as the ceiling and at least one pip always showing.
The facet moved into the tool row — it had no control at all between P1 and here — reading
`TODO_FACETS` and `facetCounts(liveBoardCards(...))`, so it cannot state a different number from
the board's. It reaches pips, day lists and the day sheet because all three read `byDay`, derived
*under* the facet.

**P4 — Noteboard (`5cdd71b`).** Mostly landed with P1; this centred "Read as a column" (a 620px
column pinned left reads as a masonry that failed) and locked one zone per page so the toggle
cannot grow a second scroller.

**P5 — Task settings, two doors (`5aa51a3`).** A Tasks section on the Settings page. It does
**not** re-render the four behaviours — two forms would mean two places to change a default. The
route lands **before** the event, because the sheet is hosted by the To-do page and dispatching
first would fire into an unmounted page.

## The copy laws, now enforced

Both are asserted in the suite rather than left as prose: **the app reports, never appraises**
(the lock sweeps nine appraising phrases) and **no private metaphors for functional elements**
(the lock scans rendered labels, not identifiers — renaming a variable is not what stops a reader
meeting a metaphor). Both are written into `design-refs/themes.md`.

## Deploy

Dev hosting redeployed at `c8e6e79`. **No rules change** — this phase touches neither
`firestore.rules` nor `types.ts`. The prod queue is unchanged and still Nick's: rejectedDate ·
detail/surfaceOffset · committedDate · tags · todoPrefs · estimateMin.


---

# Four contained fixes (`7ca87e4`)

## 1 · The left gutter is law

**The cause:** `.tdb-col` carried `margin-inline: auto`. A **centred** column's left edge moves
with the width available to it, so pages that resolved to different widths started their titles
at different offsets — Today and the Noteboard sat inboard of the To-do list. Content is
**left-anchored** now (`margin-inline: 0 auto`); the surplus past the 1360px cap becomes right
margin.

**Why it shipped:** the existing alignment test covered the **sidebar pages only** — so the two
pages that diverged were the two nobody was checking. It now asserts all four wear the same
column and that none caps or centres a measure of its own.

## 2 · The calendar — ⚠️ THE CULPRIT IS NOT PROVEN, AND I AM NOT GUESSING AT ONE

**I could not reproduce the page scroll.** A harness built from `dist/assets/index-*.css` shows
**zero overflow at 760px**, and it stays zero when I rebuild the real nesting — `.ws-cscroll` as
an `overflow: auto` flex column, a `flex: none` bar above, a `display: block` slot whose height
comes from `flex: 1` rather than an explicit pixel value. Rows resolve to
`12.75px 73.83px × 6`; the grid is 492px inside a 516px body.

So the fix below is **the removal of the one genuinely fragile link**, not a proven cure:

> **`.spine-root` used `height: 100%`.** A percentage height must resolve against a parent with a
> **definite** height, and its parent is a flex item inside the app's real scroll container. Whether
> that percentage resolves depends on every ancestor above it — which is not something a layout law
> should rest on. It asks for the remaining space now (`flex: 1; min-height: 0`), which is the
> pattern **StagePage's own comment already recommends**, and the four Tasks slots moved
> `layout="fill"` → `layout="fillColumn"` so it has a flex parent to be an item of. (`fill` renders
> the slot `display: block`, which is what left the percentage in play.)

**⚠️ jsdom CANNOT PROVE THE FLEX CHAIN. This needs a browser check on dev.** If `/todo/calendar`
still scrolls, the culprit is an element my harness does not have — walk the chain table above
top-down in devtools and report the first ancestor whose `scrollHeight > clientHeight`. That
element is the answer, and I would rather hand you the method than a guess.

## 3 · Briefs are not user-facing copy

Every placeholder rendered its illustrator brief as body text — a writer met *"An empty letter
tray, a pen laid down."* as though the app were telling them something. `.art-cap` is **deleted**
(rule removed, not emptied, so nothing can quietly render into it again); the placeholder shows
the slot name in mono and nothing else. **Where an asset exists it stands alone** — no ratio box,
no dashed frame. Placeholder chrome around finished artwork makes it look unfinished.

## 4 · Up next must not truncate

**The row stacks now** — title, why-line, verb — so two pieces of text no longer compete for one
line's width. The title wraps to two lines with `-webkit-line-clamp: 2`, no ellipsis, and
`overflow-wrap: anywhere` so a long unbroken word cannot force the rail wider than its track. The
rail widens **320 → 360px** to pay for it.

**And the same fault had a second home:** `.tdt-t` truncated every committed item on Today's list
for exactly the same reason. Fixed with it — a title is the only part of a row that says what it
*is*; the chips beneath may be clipped, the title may not.

## The drift that keeps recurring

Four **pre-redesign rules survived P2 as second rules for live selectors** (`.tdt-brow`,
`.tdt-bt`, `.tdt-why`, and a media query hiding the why-line entirely). That is why the redesigned
row read as half-applied. Deleted rather than left inert: **a stale rule for a live selector wins
or loses on parse order**, which is not a thing anyone should have to reason about. This is the
third time in one day the same duplicate-rule drift has bitten — twice in rules I had just
written myself.

## Gates

Tasks suites **1048 passed | 2 skipped, 58 files**; tsc green. Seven locks superseded in place,
dated. The four reds elsewhere in the tree are the dashboard stream's own specs against their
live WIP — verified not to involve any file in this commit.


---

# The pin — replacing the chain (`f844a3a`)

## Why the mechanism changed

The lock **derived** each region's height through a seven-link `flex: 1; min-height: 0` chain.
That chain **cannot be proven in this repo's tests** (no jsdom, no layout engine), and it **failed
twice in the browser** for reasons no harness could reproduce. A law that cannot be verified and
keeps breaking is the wrong mechanism however correct each link looks — so the region is **pinned**
instead.

`.tpl-body` is the positioning context; every region is `.tpl-pin` — **`position: absolute;
inset: 0`**. An absolutely-positioned box with all four insets takes its containing block's
dimensions **outright**: no `height: 100%`, no `min-height: 0` chain, nothing to inherit and
nothing to break two ancestors up. One mechanism, four pages.

## ⚠️ WHAT BOUNDS EACH REGION, PER PAGE — browser-measured

Against the built CSS (`dist/assets/index-*.css`), four page harnesses reproducing the real
nesting, both viewports. The figure is `scrollHeight − clientHeight` on the app's real scroll
container:

| page | 1440×900 | 1280×800 | pin height | **what bounds it** | what actually scrolls |
|---|---|---|---|---|---|
| **Calendar** | **0** | **0** | 590 / 490 | the pin; grid `minmax(0, 1fr)` rows | **nothing — it compresses** |
| **To-do list** | **0** | **0** | 590 / 490 | the pin; `.tbd` `align-items: stretch` | **3–4 × `.tbd-body`**, one per full column |
| **Today** | **0** | **0** | 567 / 467 | the pin; two flex regions | **2 × `.tpl-zone`** |
| **Noteboard** | **0** | **0** | 590 / 490 | the pin | **1 × `.tpl-zone`** |

**⚠️ jsdom still cannot prove this.** The suite asserts the declarations and carries these
measured numbers as a comment so a future reader can re-run the same check rather than re-deriving
what *should* happen. **The browser check on dev remains the proof.**

## The board's columns

`align-items: start` sized each column to its own content, so the tallest set the page height and
the **page** scrolled. `stretch` gives each column the pin's height to scroll **inside** — which is
also the only way a sticky Playfair head can hold still at the top of **its** column rather than
over the whole board. The FILTERS sidebar is a sibling of the pinned region and does not scroll
with it.

**The card gap survives:** browser-measured **12px**, cards still direct children of `.tbd-body`,
sticky head held still while its column scrolled 200px. The scrollzone went **onto `.tbd-body`
itself** rather than into a wrapper, precisely so the direct-child selector keeps matching — P6's
lane div is the precedent, and the pack's own instruction was that the scrollzone is what gets
fixed.

**The restore contract followed the scroller again**, to the To do column's own body. A page-level
scroller would return a permanent 0 and jump every collapse to the top — the exact fault it had to
be moved for once already.

## ArtSlot

The asset rendered at **natural size, unbounded**, and spilled out of the card behind the page
content. A slot **declares** a box now — real `width`/`height` numbers computed from the brief's
ratio and any cap — and the artwork lives inside it: `object-fit: contain`, `max-width`/
`max-height: 100%`, `display: block`. **Never a background-image** (unmeasurable, and it takes the
alt text with it) and never a bare `<img>`. The Seize the day slot is **62×62, inline in the card's
flex row**, left of the title; the card is an ordinary row of icon, text, button.

Suite **3385 passed | 2 skipped, 212 files**; tsc green.
