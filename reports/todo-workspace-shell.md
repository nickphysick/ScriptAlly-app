# To-do — the workspace shell (sidebar · parchment chrome · the panel page)

The redesign's **final structure**. The To-do page's frame rebuilt: an always-on navigation
sidebar, the parchment chrome, a plain-text hero with the session CTA pair, one bordered
content panel, and Today restored to its corner pop-up. The pastille card system, the ledger,
grouping, undo toasts and the derived engine are untouched. Supersedes `todo-blush-prompt.md`
and `todo-settlement-prompt.md` (both retired); the v9 session's engine/templates/carriage/
close are unchanged, only its choreography retargets.

Ref: `todo-fix48.html` → `design-refs/todo-workspace-shell.html` (normative; fix31–fix47 are
exploration history).

## Phase 0 — recon + the red gates (all passed)

- **Nav is centralised** — the persistent rail was already retired in favour of a NavDrawer over
  one shared model (`railNav.ts` `RAIL_GROUPS`). A shared shell component is feasible; the
  sidebar's WORKSPACE section reads that model.
- **HubHeaderBar is NOT in the To-do path** — the To-do breadcrumb was `CrumbStrip`, already
  repainted by the scoped `.t-f12` class. The shell draws its own plain-text crumb, so
  **HubHeaderBar is untouched** (diff-locked in the suite).
- **Session v9** is deployed; its mount points (the sidebar-seated pair, the hero search,
  `EXIT_LEFT`) were mapped for retargeting.
- **Today** had both a wide `.tdb-railr` column and a still-live corner pop-up's ancestors —
  the corner form was restored, not rebuilt from scratch.
- **The filter reactivity** (facet counts, zero-dimming, the struck totals, the query chip) was
  carried over intact into the sidebar's FILTER section.

**Scope shipped (the confirmed decision):** the shell is one shared component (`TodoShell`)
mounted on `/todo` only; the NavDrawer keeps serving the other six routes. Rolling the shell
app-wide is the flagged follow-up — it would re-lay-out six pages this pack doesn't spec (Queries
Hub and Agents carry their own full-bleed chrome), which is the "breakage outside intent" the
halt rule guards.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref, fenced | `4a9bd7b` | 1471 |
| P1 — the sidebar + the parchment chrome | `5781445` | 1471 |
| P2 — the hero, the panel, the proportions | `d27fae0` | 1477 |
| P3 — Today, back in its corner | `4122b5a` | 1476 |
| P4 — the session, rewired to the shell | `ffb898f` | 1485 |
| P5 — the sweep + this report | `<this commit>` | 1490 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging. New shared component: `src/components/shell/TodoShell.tsx` + `todoShell.css`. Lock
suite: `src/components/todo/todoWorkspaceShell.test.ts` (26 tests across the five phases).

## What shipped

- **P1 — the shell.** `TodoShell` replaces the F12 header wrapper on `/todo`: a ~212px parchment
  sidebar — brand → WORKSPACE nav (Dashboard · Queries · Agents · To-do · Packages, routes from
  the nav model, derived counts on Queries + To-do) → the page-owned FILTER section (its
  quiet-pill rows carrying every reactive behaviour) → Task settings + Help centre foot. No
  REVIEW section, no CTA in the sidebar. The **white-card active law** (never burgundy) governs
  active nav items and filter rows. The sidebar and breadcrumb bar share `#f2ede7` joined by
  `#e4dbcd` borders; the bar keeps its QUERYING / To-do crumb and gains the search as a white
  pill before the account. The hamburger is retired on `/todo`; below 1100px the sidebar folds
  to an icon rail whose ⚲ opens the existing overlay.
- **P2 — the hero + the panel.** The hero is plain on the page: title (~33px) + quiet-grey
  subtitle left, the ink Begin pill with the underlined review link beneath it right. One
  thin-bordered panel (`#e2dbd0`, radius 14, 22px padding) wraps the items row, both card
  sections and the Pro colophon (moved inside, gating intact). The items line reads `{n} items`
  / `Showing {x} of {y} items` by filter state, with the unchanged toggle and a hairline
  beneath. Proportions tokened (26px hero→panel gap, ~40px gutter); the pastille bands are
  byte-untouched.
- **P3 — Today's corner.** A floating white card fixed bottom-right (250px, `#ddd2c2`, radius
  14, deep shadow), reusing the one `renderTodayPanel` so the sage completion circles and the
  "Work the list →" flow are the existing primitives. A minimise control collapses it to a
  sage-dotted pill; the state persists (`sa.todoTodayMin`). Absent when empty; z above the
  panel, below the toasts. The wide rail and the narrow-chip machinery are retired; the board
  runs full-width.
- **P4 — the session, rewired.** The v9 engine/templates/carriage/close/quiet-line are
  unchanged. The chrome outside the session's `wrapEl` — the sidebar and the bar search — exits
  via the shell's `.tsh-clearing` class (driven by `heroSession.clearing`): the sidebar slides
  off left, the search fades, both returning on exit. The breadcrumb bar stays (the v9 app-bar
  exemption — the curtains still begin at the measured board top below it). The in-wrap
  selectors retargeted: `EXIT_RIGHT` is the Today corner, `EXIT_FADE` gains the hero pair +
  subtitle so the title crossfades in place while the progress row takes the subtitle's slot,
  the ≥48px band still governing. Browser back still closes-first then reverses.
- **P5 — the sweep.** Extinct in source and styles (grep-locked): `tdb-bigsearch*`, `tdb-mag`,
  `tdb-sbpair`/`tdb-sbdiv`/`tdb-btnp.sb`, `tdb-heropair`, the bar-pair classes, `tdb-railr` + the
  rail-Today popover/chip, `tdb-fside`, `tdb-fpillbtn`, and the dead seat tokens
  (`--tdb-sbpair-h/-fs`, `--tdb-search-w/-clear`). `themes.md` gained **"To-do workspace shell
  (settled)"** (the parchment pair, the white-card law, the panel token, the items-line rule,
  the hero pair, Today's corner, pastille-cards-are-signal), with the sage container structure
  marked superseded. The tour lands on the new seats end to end (Begin hero · search bar ·
  filters sidebar · review link · cards · Today corner). HubHeaderBar diff-locked untouched.

## In-browser script (dev — the page is auth-gated, so this is Nick's eyeball)

1. **The shell reads as one parchment surface** — the sidebar and the breadcrumb bar share the
   fill, joined seamlessly; no hamburger.
2. **The active state** is the soft white card on the lit nav item (To-do) and any active
   filter row — never a burgundy fill.
3. **The search** sits in the bar as a white pill; ⌘K still focuses it; typing narrows the
   board.
4. **The hero** carries the title, the grey subtitle, and the Begin pill over the underlined
   "Last week in review" link — nothing else (the search is in the bar).
5. **The single bordered panel** wraps the items line (both forms as you filter), the toggle,
   the card sections, and the Pro colophon.
6. **The pastille cards** are unchanged at the new scale — pink urgency, latte housekeeping,
   butter notes, white tag pills.
7. **Today** floats bottom-right; minimise it to the pill and restore it (the state sticks
   across a reload); it vanishes when the list empties.
8. **A full session** from Begin: the sidebar slides away left, the search fades, the bar stays,
   the curtains close below it, "In focus" crossfades in with the progress row; run it through
   to **Back to your desk** — the sidebar slides home, the search returns, Today comes back.
9. **Narrow the window below ~1100px**: the sidebar becomes an icon rail; its ⚲ opens the
   filter overlay.

## Deviations (flagged)

- **The shell mounts on `/todo` only** (the confirmed scope) — one shared component, the rollout
  a flagged follow-up. The other routes keep the NavDrawer.
- **The chrome's session exit is a CSS class, not the session's DOM surgery.** The sidebar +
  search live outside the session's `wrapEl`, so `.tsh-clearing` (driven by the session state)
  slides/fades them; `EXIT_LEFT` names the sidebar for intent. This is cleaner than threading a
  second element ref into the session.
- **The hero title is ~33px** (the ref's scale), down from the v9 64px — the plain-page hero is
  smaller than the giant standalone title; the in-session "In focus" inherits it.
- **The nav/filter-row glyphs are plain unicode**, not TypeGlyph (which is locked to material
  types) — decorative, the label carries meaning. The hero review link keeps the real
  `RewindGlyph`.
- **Today's corner is `position: fixed`** bottom-right (the ref's absolute-within-`.app`
  translated to the scrolling shell) so it holds its corner as the board scrolls.
- jsdom mounts nothing: the shell anatomy, the active law, the chrome tokens, the panel, the
  corner and the session rewire are source/rule-text locks; the browser script confirms the
  pixels.

## Close

**The shell is the redesign's final structure.** The queue: dev deploy → prod sequencing pass →
Correction UI. **Follow-up (flagged):** roll `TodoShell` app-wide (it would re-lay-out the other
six routes — out of this pack's scope).
