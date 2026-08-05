# The app shell — run report

**Branch `claude-il`.** One commit per phase, gates green on each (`tsc --noEmit` clean ·
production build clean · full Vitest).

| Phase | Commit | Suite |
|---|---|---|
| 1 · Desk, capsules, alignment tokens | `ebccbdd` | 2246 + 2 skipped |
| 2 · The one column | `0b57443` | 2259 + 2 skipped |
| 3 · Workspace bar, account menu | `31c6684` | 2259 + 2 skipped |
| — · `--pad-r` + the consumption guard | `c48c02a` | 2260 + 2 skipped |

> **Phase 4 (top-nav shell) and Phase 5 (routing) are NOT BUILT.** Their section is at the foot,
> headed *Pending*. This report is written now rather than held, because the workspace shell is
> measured and passing, and evidence should be written down when it is gathered.

---

## ⚠️ The finding: every gate was green while the shell's only marker rendered 0px wide

`--pad-r` was read by **four** rules — the chevron's right margin, the quick-actions padding, the
foot divider's right edge, and the selector's expanded width — **and defined nowhere.**

`calc()` on an undefined custom property yields `NaN`, and CSS says nothing: the declaration is
dropped. So `col-max − gutter − pad-r` was `NaN`, and **the floating selector — the ONLY active
marker in the whole column — was 0px wide whenever the column was expanded.** Through
`tsc --noEmit` clean, **2,259 tests passing**, and a clean production build.

**It was caught by measuring, not by any gate.**

### Why the guard I already had missed it

After a malformed comment swallowed `--shell-desk` earlier in the session, the rule I wrote was
*grep `dist/` for the tokens you added*. That is the wrong direction. **Checking that what you
wrote arrived cannot catch what you referenced and never wrote.**

The guard now runs from **consumption to definition**: every `var(--x)` any shell stylesheet reads
must resolve to a definition (`shellV2Tokens.test.ts`, "no shell rule reads a token that does not
exist"). Pointed that way it immediately found two more:

- **`--sv2-flank`** — defined on `.sv2-tb-dash`, which Phase 3 deleted when the dashboard's centred
  search left for the top-nav shell. The whole reserve block was dead CSS.
- **`--shell-ease`** — written with an inline fallback, so it worked while naming nothing. Both
  easings are real tokens now, and the selector's spring reads `--shell-spring` rather than a
  literal.

### The other three consumers, verified rather than assumed

A token that is `NaN` everywhere it appears can be absorbed somewhere that looks fine by accident,
so all four were re-measured, not just the selector:

| Consumer | Before (undefined) | Measured now |
|---|---|---|
| `.sc-cv` chevron `margin-right` | dropped → `0` | **18px**, sitting **18px** from the column's right edge |
| `.sc-qa` `padding-right` | dropped → `0` | **18px**, ghost button **18px** from the right edge |
| `.sc-foot::before` `right` | dropped → `auto` | **18px**, divider **208px** wide |
| selector width (expanded) | `NaN` → **0px** | **208px** parent · **169px** child |

The divider's 208px is the same number as the parent selector's width, which cross-checks that
`--gutter` and `--pad-r` agree with each other.

---

## The workspace shell — measured

Browser-measured at **1440×900**, over the app's own production stylesheet and the DOM the
components emit. *(The signed-in shell is auth-gated and I do not enter credentials, so this is a
harness over the real built CSS and the real markup — sound for geometry, which is what every
figure below is. Same technique and same caveat as the previous reports.)*

### ⚠️ The pass condition: the icon does not move

| Row | Expanded | Collapsed |
|---|---|---|
| Queries | **20px** | **20px** |
| Agents | **20px** | **20px** |
| Materials | **20px** | **20px** |

**Identical.** The icon-box offset is `--gutter` in both states, on every row. The alignment
contract holds, and the three phases resting on it are sound.

It holds *structurally* rather than by maintenance: `iconBoxX()` reads `--gutter` and nothing
else, and a test asserts it takes no `collapsed` argument — needing one would mean the contract
had already broken.

### Geometry

| | Measured |
|---|---|
| Column width | **246px** expanded · **78px** collapsed |
| Capsule radius | **18px** |
| Page padding / capsule gap | **14px** / **14px** |
| Column masthead height | **72px** |
| Content bar height | **72px** |
| Desk | `rgb(174, 189, 176)` = `#aebdb0` |

Both headers read `--head`, so the two capsules' heads close on one line across the gap.

### The selector, in every state

| State | x | width | height | radius |
|---|---|---|---|---|
| Parent, expanded | **20** | **208** | **38** | **11** |
| Child, expanded | **59** | **169** | **30** | **9** |
| Parent, collapsed | **20** | **38** | **38** | **11** |
| **Child, collapsed** | resolves to its parent — see below | | | |

Parent x is `--gutter` exactly. Child x is `20 + 38 + 1`, so it re-indents past the icon box.
Background is `rgb(255, 255, 255)` — the active fill, never the desk.

**First paint** is a silence and cannot be measured: the mechanism is asserted structurally
(muted at mount, placed in `useLayoutEffect` before paint, unmuted exactly one frame later, with
the ordering itself asserted). Worth a visual confirmation on dev once it is deployed.

### The hairline

`1px solid rgb(227, 217, 207)`, **permanent** — it completes the corner with the capsule edge.
The top-nav shell will reveal its own on scroll instead: no capsule there, so no corner to
complete. That asymmetry is deliberate and is recorded in the design ref.

---

## ⚠️ Two measurement traps, recorded because both cost time

**Transitioned properties report where they STARTED.** Twice a real-looking bug turned out to be
this: a **collapsed column measuring 246px** (its expanded width) and the **fade's opacity
measuring 0** with its class on. Suppress the transition before reading. In the in-app browser
pane transitions do not reliably advance at all, so the start value is returned indefinitely.

**The pane silently loses its viewport.** After a reload `innerWidth` can be `0`, which makes
every rect `0` and every `100vw` calc collapse — it looks exactly like a layout bug. Re-assert the
viewport size and re-measure before believing a zero.

---

## Deviations from the pack, all deliberate

1. **Only pages that exist are in the column.** Baked 4 also names Archive, Query letters,
   Synopses and Opening samples; none is a route, and the corrected map drops them until built. A
   nav item that goes nowhere teaches the wrong shape of the app. `/import` sits under Queries.
2. **The shadow tint is green-grey `rgba(56,66,58,…)`**, not the mockup's blue-grey — that line is
   a stale artefact of the pastille sheet's blue desk and is **fenced as stale in the committed
   ref**. This established the carve-out: *a mockup wins on what it shows, but not where the pack
   names a value and gives its reason.*
3. **`--shell-desk`, not `--desk`.** `--desk` was already the per-theme working-area background;
   a `:root --desk` would have been overridden by every theme class silently.
4. **Two laws superseded, restated rather than deleted quietly:** the stepped trio (two capsules
   on a dark desk now, so depth comes from the desk being dark) and `--shell-inset` (within a hair
   of the column, so an inset fill there is invisible — the mockup's own chrome controls are white
   with a hairline).

## Known incomplete

- **The page-header tool row (Baked 10) is NOT built.** Per-page actions are correctly *out* of
  the bar, so nothing sits in the wrong place, but the tool row itself does not exist yet. It is
  the next commit, extending the existing compact `PageHeader` rather than adding a second one.
- **`--shell-inset` is not yet retired** — the replacement rule (white fill + 1px hairline) is
  agreed and recorded, the deletion is pending.

---

## Top-nav shell — **Pending, not yet built**

Phase 4 (masthead, mega-menus, the reused account menu) and Phase 5 (route-to-shell mapping) are
not started. This section will be **appended after Phase 4** with:

- masthead height, confirming it reads `--head`
- confirmation the top-nav hairline is scroll-revealed, against the workspace hairline's permanence
- which mega-menu figures are live and which are static
- the agent-list check: nine sage card bands on the sage desk at once, confirming the bands still
  read as bands
- any route that did not classify cleanly under the corrected map

**No deploy yet** — the live build hash goes here when there is one shell's worth of work to look
at, not before.
