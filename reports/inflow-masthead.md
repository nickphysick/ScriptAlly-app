# The masthead moves into the flow — app-wide

**Refs:** `design-refs/169-inflow-masthead-qc.html` (fill pages) · `design-refs/170-sticky-control-row.html` (scrolling pages).
`page-header-schools.html` was a comparison of design schools rather than a spec and has no build value now the decision is made — deliberately not chased.

**The rule.** *The masthead is the first thing on a page and it leaves when the user starts working — by scrolling on pages that scroll, by the first click on pages that don't. It holds no actions, so it never needs to come back within a visit.*

---

## The census (step 0)

Ten in-scope pages, eight `WorkspacePageGrid` call sites (the Tasks family is three pages through `TasksPageLayout`).

| Page | Path | Variant | Mark | Masthead actions **before** |
|---|---|---|---|---|
| Query Centre | `/queries` | fill | illustrated | `Export` · `Log query` (empty branch) |
| Analytics | `/queries/analytics` | scroll | monoline | range toggle + Export |
| Contact list | `/agents` | scroll | illustrated | `Add new agent` |
| Discover | `/agents/discover` | scroll | monoline | ms selector / `Coming soon` |
| Manuscripts | `/manuscripts` | fill | illustrated | `Add manuscript` |
| Comparable titles | `/manuscripts/comps` | scroll | monoline | — |
| Submission packages | `/manuscripts/packages` | scroll | monoline | ms selector + `New package` |
| To-do list | `/todo` | fill | monoline | — |
| Calendar | `/todo/calendar` | fill | monoline | — |
| Noteboard | `/todo/noteboard` | fill | monoline | — |

Out of scope, confirmed: Dashboard (renders neither the grid nor `PageHeader` — its files were not opened), Settings and its six sections, `/plans`, `/help`, `/import`, the pre-auth hashes, and the dev labs. Import, Help, Plans and `PkgLab` render `PageHeader variant="full"`, a different layout this pack does not touch.

---

## ⚠️ THE CENSUS COUNTED BUTTONS; IT SHOULD HAVE COUNTED CAPABILITIES

**Three of the seven masthead actions turned out to be duplicates of a control the page already had elsewhere.** Not similar controls — the *same handler*, reachable twice on one screen:

| Page | Masthead action | The control that already existed |
|---|---|---|
| Query Centre | `Export` | `EXPORT CSV` in the list foot, calling `handleExportFilteredCSV`, sitting beside the `SHOWING n OF m` that names what it exports |
| Query Centre | `Log query` (empty branch) | `Log your first query` in `.qc-welcome`, calling `openCreate()` |
| Manuscripts | `Add manuscript` | `ManuscriptAddTile` in the library grid — which renders at every count, including one — plus the zero state's own button |

So three of the pages the census said needed a home for their action needed a **deletion** instead. Query Centre needed no control row at all; Manuscripts needed none either.

**Why the census missed it.** It asked *"what buttons are in this masthead?"* and answered correctly. The question that mattered was *"what can this page already do, and from how many places?"* — and a masthead action is exactly where a duplicate hides, because it is chrome: it sits far enough from the page's own controls that nobody puts the two side by side.

**The check that would have caught it, and costs seconds:** for every control being rehomed, grep the page for its HANDLER, not its label.

```bash
grep -n "handleExportFilteredCSV" src/components/Queries.tsx
```

Two call sites means two seats for one act. Labels differ (`Export` vs `EXPORT CSV`, `Log query` vs `Log your first query`) and will keep differing; the handler is the identity. **Do this before proposing a home for anything, in any pack that relocates controls.**

### The lock working as designed

An earlier attempt put Query Centre's `Export` in the list column's head. `queryCentrePane.test.ts` rejected it:

> ⚠️ NOTHING IN THE HEAD IS EVER DISABLED. These three act on the list, which always exists in this branch — a control here that could go dead would be the very fault §1c cured.

Export can go dead (an empty filtered list), so the head was the wrong home. A law forbidding controls that can go dead, catching a control that can go dead — with a stated reason, so the fix was obvious rather than a negotiation. That is what the locks are for, and it is worth recording as a success rather than only recording failures.

---

## Parked

- **⚠️ COMPARABLE TITLES RENDERS ITS COMP COUNT TWICE, THREE INCHES APART.** Both come from `compCounts(comps)` — the same derivation, so they cannot disagree *today* — but they are two renders of one figure and that is a desync risk the moment either side grows its own filtering.
  - `src/components/manuscripts/ComparableTitlesPage.tsx` — the control row's `PageTally` (`{counts.total} comps · {counts.inQuery} IN YOUR QUERY`).
  - `src/components/manuscripts/ComparableTitlesPage.tsx` — the hero's stat rail, `.ct-hero-r > .ct-hstat`, whose first tile reads `{counts.total}` under the label `Comps saved`.
  - **Deliberately not resolved in this pack**, per Nick: restructuring the hero's stat rail is a different piece of work. Resolving it means deciding which of the two states the page total — the anchor that survives the masthead, or the hero tile beside `In your query` and `Verified`.
- **⚠️ `--content-top-gap` IS NOT DEAD, AND STEP 4 MUST NOT ASSUME IT IS.** I first wrote here that Analytics and Discover carried inert overrides of it; that was wrong on both counts and is corrected rather than quietly dropped, because a wrong parked item is read as fact by whoever picks the list up. What a grep actually shows:
  - **Two pages override it** — `.qc-wpg` (`src/components/shell/f12.css`) and `.tpl-wpg` (`src/components/todo/tasksLayout.css`), both to `0px`, in both state variants. Those overrides *are* now inert: nothing reads the token for a gap any more, because the masthead states its own rhythm.
  - **One page still READS it, live**: `src/components/manuscripts/manuscriptLibrary.css` sets `--wpg-foot: var(--content-top-gap)`, so Manuscripts derives its scroll-row foot padding from it. It resolves to `--content-top-gap-rest` (44px) and is unaffected by this pack — but deleting the token at step 4 would silently take 44px off the bottom of one page.
  - Discover and Comparable titles mention it only in COMMENTS (`discover.css`, `comps.css`), explaining why they add no top padding of their own. Nothing to clean.


---

## Step 2 — the control row anchors

`position: sticky; top: 0` on `.wpg-tools`, inside the scroller. At rest indistinguishable from content; once `stuck` (the existing `scrollTop > 2` evaluation) it gains a `--ws-edge` hairline, a `0 10px 14px -12px` shadow, and tightens its top padding 12 → 10.

**Measured on all five scrolling pages** at 1440×900 against a built dev bundle (`tests/e2e/stickyRow.measure.ts`): sticky, `top: 0`, ground `rgb(254,252,250)` = `--ws-window`, `rowTop` 0 when stuck, the row owns its own pixels, and **max scroll identical at rest, scrolled and returned on every page**.

### ⚠️ THREE RULES WERE STILL LIVE AND ALL THREE WERE WRONG BY THEN

Each was correct when written, and each was invalidated by a premise moving out from under it. None was found by reading; all three came from the browser.

1. **The invariance reclaim padding — 99px.** `--wpg-reclaim-pad` hung off `.wpg--working`, and that class is set by `condensed`, which is now driven by `stuck`. So the moment the control row anchored, a scrolling page gained ~103px of bottom padding compensating for a header collapse that no longer happens. Contact list's `scrollHeight` went 1904 → 2003 the instant the row stuck. **Deleted, pulled forward from step 4** — it was not dead, it was actively wrong. Its sibling `.wpg--working { --content-top-gap: … }` went with it, which also fixed a coupling nobody was watching: `manuscriptLibrary.css` reads that token for `--wpg-foot`, so opening a manuscript dossier was quietly taking 9px off that page's foot padding.

2. **`.qa-wrap .wsh-sub` — mono 11px, 3px.** Its own comment: *"THE SUB-LINE IS MONO BECAUSE IT IS A TALLY, not a sentence."* True until step 1 moved the tally to the control row. Analytics' masthead measured 99px against every other page's 102, entirely from a 15px description box where the shared rule gives 19. **Deleted.**

3. **`.pkgw .wsh { border-top: 5px }` — the sage edge, 5px.** Its own comment: *"`box-sizing: border-box` is already on `.wsh`, so this comes out of the plate's interior and `--wsh-plate-h` is untouched."* Exactly right while `.wsh` had a fixed height — a border on a fixed-height box eats its interior. The masthead is content-sized now, so the same 5px adds. Packages measured 109 against 102. **Deleted** — and it would have gone anyway, being card treatment on one page.

**The pattern worth carrying:** all three rules *stated their own reasoning*, and in each case the reasoning named the premise that later moved (a collapse, a tally, a fixed height). **A rule that explains itself is a rule you can re-check in seconds — so when a premise moves, grep for the rules whose comments name it.** That is cheaper than waiting for a measurement, and only measurement found these.

### Masthead heights after the three fixes

| Page | before | after |
|---|---|---|
| Analytics | 99 | **102** |
| Contact list | 102 | **102** |
| Submission packages | 109 | **104** |

The residual 2px on Packages is its `titleAdornment` (the Pro pill) adding 1px to the title's line box, which propagates through `.wsh-txt`. **Open for step 5's matrix**: either give the adornment a zero-height treatment, or state a tolerance and say why. Do not close it by widening the tolerance without looking.

### Two smaller findings

- **`.wsh-sub` had no `line-height`** and was inheriting each page's. Now declared (1.4). It was not the whole of the divergence, but it was part of it and would have kept the pages apart after the other three were fixed.
- **The first oscillation guard silently did nothing.** The 12 → 10 tighten removes 4px from the row's flow height, which moves max scroll — the same shrink/clamp/un-shrink cycle documented elsewhere in this repo. The compensation was written as `margin-bottom: 4px` and **adjacent siblings' margins collapse**, so it was absorbed by the next element's `margin-top` and contributed nothing. Measured: with the reclaim removed, the delta was still exactly −4. It is `padding: 10px 0 14px` now — padding cannot collapse — which makes the tighten asymmetric on purpose: the controls move up 2px and the boundary line stays put.

### Screenshots (the two combinations nothing else in the app has)

- **Analytics — charts under a sticky row.** Reads correctly: the panels pass under an opaque row and are cut cleanly at the hairline.
- **Submission packages — card grids under a hairline.** No oddness: the cards are inset by their own layout and scroll under the row without crowding it.


---

## Step 3 — the masthead vanishes on engagement (fill pages)

First `pointerdown` in the content area collapses `.wpg-mast` to nothing — `max-height` 220 → 0, opacity out, ~.26s, hairline included. No restore affordance; it returns on the next visit to the page.

**Measured on all five fill pages** (`tests/e2e/mastheadVanish.measure.ts`), 1440×900, built dev bundle:

| Page | masthead at rest | after one content click | reclaimed |
|---|---|---|---|
| Query Centre | 118.5 | 0 (opacity 0) | 119 |
| Manuscripts | 118.5 | 0 | 119 |
| To-do list | 101 | 0 | 101 |
| Calendar | 118.5 | 0 | 119 |
| Noteboard | 118.5 | 0 | 119 |

To-do is 101 rather than 118.5 because it has no description — title-only pages are simply shorter, which is the step-1 rule doing its job.

**A click ON the masthead does not collapse it.** That used to be structural (the header was row 1, only rows 2–4 carried the handler); inside the scroller it needs a containment test — `mastRef.current?.contains(e.target)` — rather than a `stopPropagation`, which would change what every other listener sees in order to fix what this one does.

### The Manuscripts dossier, both ways

- **Opened during the visit:** arrives 118.5 / not working → dossier open → 0 / working. Leaving it leaves the masthead gone, which is the latch behaving.
- **Already open on arrival — it cannot currently happen, and that is a verified fact rather than an untested case.** `AllManuscripts` initialises `openId` to `null` and never seeds it: it *writes* `scriptally_active_manuscript_id` for the comps and packages sub-pages to read, and never reads it back into its own view state. Measured too — returning to `/manuscripts` with a pointer already in `localStorage` gives masthead 118.5, not working.
- **The risk behind the question is real and is now locked.** A fill page whose `condensed` is true at first paint must render with `wpg--working` already on the root, so the stylesheet collapses from the first frame rather than drawing a full masthead and snatching it away. `workspacePageGrid.test.tsx` asserts that against rendered output, and the measurement asserts the *current* answer so the day Manuscripts starts restoring a selection, the note above goes red instead of quietly becoming false.

### ⚠️ TWO MEASUREMENT BUGS, BOTH OF WHICH REPORTED A CORRECT APP AS BROKEN

Worth recording because both are about the *probe*, not the product, and both had confident wrong answers:

1. **The probe clicked a link.** The content point was "120px below the masthead, horizontally centred" — which on Query Centre is inside the reading pane, where it landed on an agent link. The app navigated to `/agents`, the post-click read found the Contact list's grid, and the report was "the first click did not register as engagement". **Fixed twice over:** the click now lands in the scroller's own horizontal gutter (content area, structurally incapable of holding a control), the probe asserts the point is not on an `A`/`BUTTON`/`INPUT`, and it asserts the URL is unchanged after the click.

2. **`.tpl-wpg` is not unique.** To-do, Calendar and Noteboard are three pages through one layout, so they share the grid class. `document.querySelector` returned To-do's grid on every one of them, and the run reported "the wrong page is showing" about Calendar while Calendar was showing perfectly well. **The selector is now class *and* displayed** — the class names the family, the box names which of them you are on.

**The general form:** a measurement addresses its subject by something that is unique *and* stable across the interaction. "The first `.wpg` with a box" fails the moment anything navigates; a shared class fails when a family shares a layout. Both failures look exactly like a broken feature.

## Also in step 3

- **The Packages 2px is closed by decision, not tolerance** (Nick's call). Ornaments hung on the title — the two `Pro` pills — are absolutely positioned out of the title's line box, so the masthead's height is a function of the mark and the title only, whatever a page hangs on it. Measured after: **all five scrolling pages 102px, title 31px**, both pills vertically centred and 9px clear of the title. Tuning the pill down would have fixed this pill at this size; the next badge would have done it again.
- **The margin-collapse trap is logged in `CLAUDE.md`** alongside the other "applies cleanly, does nothing" faults.
