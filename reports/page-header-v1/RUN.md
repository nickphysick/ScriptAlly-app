# Page header v1

Reference `design-refs/page-headers-v6.html`, hash matched and enrolled (84 refs guarded).
Worktree at `33113f0c`, never the shared checkout. Baseline: tsc 0 · build clean · **8,298 passed /
498 files**.

## Where the mock and the brief disagree — the mock wins, as ruled

| | brief | mock (measured) |
|---|---|---|
| The rule beneath the header | 1.5px | **1px** `rgba(28,19,15,.16)` |
| Title top | eyebrow + 20 | **eyebrow + 22** |
| Full header height (1280 / 1440) | 259 / 265 | **264 / 270** |
| Compact title top | header + 40 | **header + 42** |
| Compact height | 138 ±2 | **167 as drawn** — the mock's compact page still carries the Query Centre's 460px-capped intro over *two* lines; with a one-line intro it is ~140, which is where the brief's 138 comes from |

Everything else matches exactly: header top = bar bottom + 18 · eyebrow + 26 · padding 26/0 · no
background · intro 18px/1.45 capped 460 at title + 14 · actions 48px at intro + 22 · art box 42% ×
276 anchored bottom-right, drawn 457 × 143 with its bottom on the rule · text block exactly 50%.
Content column **301→1239 / 306→1394 / 462→1718** at 1280/1440/1920, as stated.

**Special Elite did not fall back** in the headless render (the title measured 56px/1), so the 5px
height difference is real rather than the font artefact the brief anticipated.

## Phase 2 — the bar

The breadcrumb is gone, and nothing replaces it. Its two links were "QueryHawk" → `/dashboard` and
the section → its default child, and this file's own comment said the section segment went to *"the
same destination its rail icon and panel row reach"*. Both are the sidebar's doors, so **no route
lost its only way in**. What the trail really carried was the page's name, said a second time a few
pixels above where the header now says it.

Gone with it: `crumb`, `recordCrumb` and `sectionDefaultPath` (all dead once the trail went), the
`shellCrumb` import, five CSS rules, and the dashboard's loading-cover rule that hid the crumb — a
rule whose subject no longer exists.

**⚠️ `position: sticky` WAS ASKED FOR AND IS NOT BUILT, deliberately.** `.ws-main` is a flex column
holding the bar and then `.ws-winwrap`; every page's scroller is *inside* the wrap. The bar is not
in the scroll container at all, so it cannot move, and a `sticky` there would be a declaration that
can never do anything — this repo's own law is that a sticky on a box that cannot scroll claims a
behaviour that cannot occur, and a dead claim is how the next reader is misled into hanging an
offset off it. The lock asserts the **requirement** instead: the page scrolls and the bar has not
moved.

**The scrolled shadow** is derived from the value, never from an event that might not arrive: a
capture-phase `scroll` listener on the wrap (scroll does not bubble, and each page owns a different
scroller), rAF-throttled, `scrollTop > 2`, written only when it differs, and reset on a route change
so the shadow cannot survive into a page nobody has scrolled. The rule restates the hairline —
`box-shadow` is one property, so naming only the new shadow would drop the bar's edge the moment a
reader scrolled.

**Locks** (`tests/e2e/pageHeaderV1.measure.ts`): at 1280, 1440 and 1920 — the bar's left is the main
area's left and its right is the window's; 64px tall; the toggle 24px in and Help's right edge 24px
in; no crumb element, no separator in its text, and it does not state the page's title. Plus: the
bar holds its place through a real scroll and gains its shadow; and no crumb anywhere on four
routes. The unit suite's crumb case is **inverted rather than deleted** — "there is no breadcrumb"
is exactly as losable as its styling was.

Proved red before the change (3 of 4 cases), and by both mutations after: the breadcrumb put back,
and the scrolled shadow removed.

One correction to my own lock: it first drove the scroll on `/todo`, which **fills** rather than
scrolls, so the precondition refused it — correctly. It now finds a route that genuinely overflows
and reports which.

Gates after Phase 2: tsc 0 · build clean · **8,298 passed** (level with baseline).

## Phase 3 — the content column

One rule for every workspace route, on `.wpg-scroll > *`: `max-width: 1360px`, `padding-inline:
clamp(28px, 3.2vw, 52px)`, `margin-inline: auto`, `box-sizing: border-box`.

**The gutter is inside the cap, and that is the whole difference from what it replaces.** The old
form was `min(measure, 100% − 2 × gutter)`, where the cap bounded the *content* and the gutter came
off the outside — so past the cap the content ran the full 1360 and the gutter did nothing. Now 1360
is the box: at an ultrawide window the content is 1360 − 2 × 52 = 1256 and the column keeps its air.

`3.2vw` is of the **window**, not the main area, which is what makes the two ends of the page agree:
the bar is inset 24 from the window's right and the column's right margin is a share of the same
width. Against the main area it would drift whenever the sidebar collapsed.

**Six per-page overrides are gone** — the Query Centre, Contact list, Manuscripts v12, Comparable
titles, Tasks and the F12 shell each named their own `--wpg-gutter` and `--wpg-measure`, because the
old rule computed cap and gutter in one `min()` and a page wanting a different inset had to say so.
There is one column now, so no page states either.

**⚠️ THE BRIEF'S ABSOLUTE x VALUES ARE THE MOCK'S, AND THE APP'S SIDEBAR IS 248 WHERE THE MOCK'S IS
260.** So 301 / 306 / 462 land at 289 / 294 / 450 here — the column is exactly right and every
absolute is 12px out. The lock asserts the **relation** §2 states (equal margins ±1; content =
min(1360, main) − 2 × gutter; the cap; `border-box`), which is true of both shells. A lock on the
numbers would have failed on a correct page and could only have been "fixed" by moving the column to
match a sidebar the app does not have.

**The rail** sticks 16 below the bar and ends on the column's right edge, with `RAIL_INSET_FOOT = 20`
split out from the single inset. **§2's "80px from the scroll container's top" is the mock's
arithmetic**: there the bar scrolls inside the same column as the content, so bar + 16 = 80. Here
the bar is a flex sibling *above* the scroller, which already starts at the bar's bottom — 80 would
sit the rail 64px lower than the design draws it. The requirement is 16 below the bar, and that is
what is built and locked.

Three full-bleed children keep `max-width: none` on purpose — the reclaim spacer, the chrome slab
and the mini bar — and their *inners* take the column. The lock finds the first child that actually
takes the cap, so it cannot measure the page's background by accident.

Five unit files retargeted, each asserting the old machinery: `queryCentreFrame`, `queriesHubColumn`,
`qcCentre` (the page's own cap → it states none), `workspacePageGrid` (the rule rewritten, including
`border-box`, without which the padding is added to the cap and every margin reading still passes),
and `qcRail` (the foot inset).

Proved red by the brief's mutation — the column's padding set to 22px — and by the rail sticking at
96 instead of 16.

Gates after Phase 3: tsc 0 · build clean · **8,298 passed**.
