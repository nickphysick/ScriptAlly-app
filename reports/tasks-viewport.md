# Tasks viewport lock — run report (7 Aug 2026)

**Refs committed:** `design-refs/tasks-viewport.html` (todo-fix99) · `design-refs/today-redesign.html`
(todo-fix107, normative for Today).
**Phase 1: `c8e6e79`.** Gates green — tsc, production build, **3290 passed | 2 skipped, 209 files**.

**⚠️ PHASES 2–5 ARE NOT BUILT.** I stopped at the phase boundary rather than half-build Today.
The pack named the clean split as after Phase 2; this is one phase earlier, and the reason is
budget rather than a problem with the work — see *Where this stopped* at the foot, which lists
what is ready for the next run.

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

## Where this stopped, and what is ready

**Phase 2 (Today, redesigned)** is the next piece and the largest. Recon done, nothing written:
- `today-redesign.html` is committed and is normative; its section-head, stat-pill, `.plan` card
  and two-region measurements are all in its stylesheet.
- **The illustration is embedded in the ref as a base64 PNG (100×100, 17KB)** and needs extracting
  to `public/` and rendering through the existing `ArtSlot` — not a new component.
- Today currently renders its old interior inside one `TplZone`; Phase 2 splits that into the two
  named regions, each with its own zone.
- The eyebrow's two derivations (`{DAY DATE}` and `WEEK {n} OF QUERYING`) already exist on the
  Dashboard — Phase 2 must consume those, not recompute them.
- The copy laws to enforce in review: **the app reports, never appraises** (no "well within the
  day", no verdicts on the workload) and **no private metaphors for functional elements** ("the
  bench" is dead; it is "Up next").

**Phases 3–5** are unchanged from the pack: Calendar to standard (incl. the tool-row filter that
closes consequence 1 above), Noteboard to standard, and Task settings' second door (consequence
2). **themes.md is not yet updated** — the viewport-lock law and Today's grammar go in with
Phase 2.

## Deploy

Dev hosting redeployed at `c8e6e79`. **No rules change** — this phase touches neither
`firestore.rules` nor `types.ts`. The prod queue is unchanged and still Nick's: rejectedDate ·
detail/surfaceOffset · committedDate · tags · todoPrefs · estimateMin.
