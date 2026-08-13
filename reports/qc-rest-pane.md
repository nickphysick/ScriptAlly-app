# Query Centre — Pack B: the rest state and the reading pane

Refs: `design-refs/94-rest-polish.html` (chassis) · `design-refs/95-tracking-half.html` (pane, at
"Tracking slightly wider"). Commits `decdb6f` → `ea14f04`. **Not deployed, not pushed.**

---

## 0 · Recon — landed / partial / absent

The earlier sheet pack's §1, item by item:

| Item | Status |
|---|---|
| Masthead counts | **landed** — `Queries.tsx`, `description={queriesMastheadCounts(mastheadScopedQueries)}` |
| List-scope controls in the column head | **landed** — Pack A §1c moved them; the grid's `toolbar` prop is gone from this page |
| "Showing n of m" + Export at the list foot | **landed** — `.f12-lfoot` |
| Six verbs behind the kebab | **landed** — via `F12Menu`, inside the selected-query branch |
| The 18px gap | **landed** — page-scoped, both states named |

So **§1d, §1e and §1g of this pack were already built.** They are locked here rather than rebuilt,
which is the right outcome for an audit.

**The three cards were three hand-rolled `<div className="f12-card">` blocks inline in
`Queries.tsx`** — not a component. Heights were **equalised by the grid**, not content-driven:
measured 278/278/278 at 1024, 481×3 at 1440, 661×3 at 1920, identical to the pixel because
`1fr 1fr 1fr` with `align-items: stretch` forced it.

**The auto-select fallback exists in two effects** — one selects the first row when nothing is
selected, one re-selects when the current row leaves the filtered list. Together they mean "nothing
selected" is reachable only with an empty filtered list.

---

## 1 · Gates

| | tsc | `vite build` | Vitest |
|---|---|---|---|
| **Baseline** | pass | pass | 277 files / **4574 passed**, 0 failed |
| **Final** | pass | pass | 278 files / **4593 passed**, 0 failed |

---

## 2 · The chassis, measured

| | 1024 | 1440 | 1920 |
|---|---|---|---|
| masthead (before) | 354 @ 447 | 770 @ 447 | 1250 @ 447 |
| working body | 594 @ 327 | 1010 @ 327 | 1490 @ 327 |
| **masthead (after)** | **594 @ 327** | **1010 @ 327** | **1490 @ 327** |
| list / pane | 334 / 248 | 334 / 664 | 334 / 1144 |
| seam (list / body height) | 533 / 533 | 678 / 678 | 858 / 858 |
| list ground | `rgb(250,246,240)` | same | same |
| selected row | `rgb(255,255,255)` | same | same |
| hero band height | 74 (was 199) | 74 (was 141) | 74 (was 141) |
| column heading present | **false** | false | false |

**§1b — the masthead was an island by 120px a side.** `header = content − 2 × --header-inset` at
120px is a reasoned, shell-wide law read by all ten pages. This page opts out with one page-scoped
token; the shell's value is asserted unchanged.

> ⚠️ **And the override works here where the identical-looking move failed in Pack A.**
> `--content-top-gap` is *computed at `:root`* from its `-rest` variant, so overriding the variant
> lower down changed nothing. `--header-inset` is read inside a `calc()` on `.wpg-plate`, and a
> custom property resolves at its **use** site. Two cases that look the same from a distance, two
> different answers.

**§1c — the blue is gone.** `--blue-t` (`#e7eef6`) was a cool selector-blue on a warm parchment
page. It was read in exactly **two** places, both on this page — the selected row and the settle
animation's end frame — so nothing else decided it, and the two moved together because they are one
decision. Three steps from three existing tokens now: ground `--paper`, hover `--panel`, selected
`--white` + ring.

⚠️ **A tinted column cannot pay its own gutter.** As `padding-right` the ground stops short of the
hairline and leaves a stripe of page between them. The column fills to the seam; its children carry
the inset.

**§1h — the hero band takes the static fact, Tracking keeps the live pair.** Queried date on the
band (identity); days waiting and expected by in Tracking (they move, and the progress bar reads
against them). That split is what stops either surface restating the other — and it resolves the
loose wording in §1h against §2.

---

## 3 · §1f — scoped to ≥1100, and the gap below it

Asserted at 1440 and 1920: list **334** (inside the 330–340 band), pane **664** and **1144** — the
pane is no longer the leftover, at a pane/list ratio of 1.99 and 3.43.

**At 1024 the pane measures 248px against a 334px list, and that is reported, not asserted.** The
whole working column is 594px there; no ratio fixes it, because both halves lose. What 768–1100
needs is a **single-column mode** — list, then detail with a back control — which is the mobile
pass's shape, not a tuning. The page already has a seam at 1100, where the glance panel hides.

---

## 4 · The reading pane, measured

| | 1024 | 1440 | 1920 |
|---|---|---|---|
| rendered tracks | 110.4 / 81.6 | 349.6 / 258.4 | 625.6 / 462.4 |
| ratio (declared 1.353) | 1.352 | 1.353 | 1.353 |
| Tracking height | 423 | 568 | 748 |
| **stacked column height** | **423** | **568** | **748** |
| stacked cards | 204 + 204 | 276 + 276 | 366 + 366 |
| horizontal overflow | **0** | 0 | 0 |

The stack fills Tracking's height exactly at all three widths, with neither card trailing into
white, and nothing wraps badly enough to overflow at the narrow end.

**The two stats are verified both ways**: 2 cells reading "Waiting so far | Reply expected by" on a
waiting query, **0** on a closed one — each cell omits itself when its figure is underivable, which
is why the first pane measurement showed `stats=0` (the harness's first row is a No Response).

### Two decisions inside §2

**The progress bar is not rebuilt.** `QueryTimeline` already draws one against the agent's stated
window, with three states the ref does not have: within-window, overdue with a hatch zone past the
expected marker, and grace against a nudge horizon. Building the ref's single-fill bar beside it
would have been a second, poorer answer to the same question on the same card.

**Two of §2's additions were already there** — "What you sent" has had its manuscript row (cover
plate, title, genre, word count) since the spec sheet was built, and Notes has had its composer
pinned inline. Verified rather than rebuilt.

---

## 5 · Dead code surfaced — reported, not swept

| | Why |
|---|---|
| `.f12-lhtitle` (CSS) | Dies with §1a; nothing renders it |
| `.f12-ctl` (CSS) | Died an earlier pack ago when the pane toolbar's verbs moved to the kebab |
| `listHeadLabel` (lib + tests) | No caller; its tests are **kept**, because they test a function that is still correct and make restoring the heading cheap |
| `--blue-t`, `--blue-b` (index.css) | Now unread. `--blue-i` is still live in `genrePicker.css` and `f12.css`, so the block stays |

⚠️ **One lock had to go rather than pass.** `queryCentreHeads`' head-band describe existed to lock
the collinearity of `.f12-lhtitle` and `.f12-ctl` — two elements the app no longer draws. It would
have kept passing, and a green assertion about nothing is worse than no assertion, because it reads
as coverage. Retired and replaced with one falsifiable case: neither renders.

---

## 6 · Browser checklist

`tests/e2e/qcReconcile.measure.ts`, extended rather than duplicated. **19 tests, all green.**

- Chassis at 1024/1440/1920 — masthead spans the body, no column heading, ground tinted, selected
  row white and distinct from the ground, seam full height.
- §1f proportions at 1440/1920; 1024 logged as the known gap.
- Pane at three widths — ratio, stack filling Tracking, no overflow.
- The two stats on a waiting query and on a closed one.
- Pack A's cases still green: the distribution rule, the glance-panel equality, the chips.

**Not covered by the harness:** the empty-filter state and the kebab-absent case are source-locked
but not browser-driven (reaching them needs a filter that matches nothing, which the harness does
not set); and a query with exactly one activity versus several is unmeasured — the timeline is
locked at source as one-event-per-activity rather than a fixed three, but not rendered both ways.

---

## 7 · Standing flags

- **768–1100px** — both glance panels hide, and now the two-column pane is squeezed as well. Needs
  single-column mode. Not this pack's work; on the list before the mobile pass.
- **`:not(.qc-hero)`** in a mobile rule still excludes a class nothing renders (from Pack A).

---

**Not deployed. Not pushed.**
