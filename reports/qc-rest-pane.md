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

---

# Fix pack 1 — the walkthrough corrections

Ref: `design-refs/101-rest-corrections.html`. Commits `75fdc3f` → `e36052d`. **Not deployed, not
pushed.**

## Gates

| | tsc | `vite build` | Vitest |
|---|---|---|---|
| **Baseline** | pass | pass | 281 files / **4632 passed**, 0 failed |
| **Final** | pass* | pass | 282 files / **4648 passed**, 0 failed |

\* The manuscripts stream has `AllManuscripts.tsx` mid-edit and `tsc` red **in that file**. Nothing
outside it errors. Every gate from §1 on was run in an **isolated worktree** at HEAD carrying only
this stream's files; the figures above are that run.

## The six, verified before building

| # | Fault | Status | Measurement |
|---|---|---|---|
| 1 | Fade at the list foot; radius/border on the container | **landed, with dead machinery** | radius 0, no border, `mask-image: none`, seam full height at all four sizes. But `listFade` was recomputed on every scroll/resize/RO burst and **read by nothing** |
| 2 | Ragged dates, wrapping agency | **partial** | Row heights already uniform (56) and agency already `nowrap` — but dates at **two x positions, 600 and 606**. After: **578** everywhere |
| 3 | Hero avatar degraded to bare text | **absent — a regression from Pack B §1h** | `border-radius: 0px`, `background: rgba(0,0,0,0)`. After: `50%`, `rgb(246,215,207)` |
| 4 | Notes: composer pinned, true count, list shows many | **partial** | Composer already visible at all four sizes; the **meta counted every note in the account** rather than this query's |
| 5 | Page scrolls at short heights | **landed** | `scrollHeight == clientHeight` at all four sizes before any change |
| 6 | Progress bar placement (confirm only) | **not as described** | It is a trailing block **after** `TimelineRows`, not within the waiting event — see below |

## §5 — the four viewports

Measured on a **waiting** query (a closed one has no stats and a shorter timeline, so it fits
trivially and would report a pass for the easy case):

| viewport | page `scrollHeight` / `clientHeight` | reading column overflow | stats in view | composer in view |
|---|---|---|---|---|
| 1024 × 700 | **483 / 483** | 0 | 2 ✓ | ✓ |
| 1024 × 768 | **551 / 551** | 0 | 2 ✓ | ✓ |
| 1440 × 900 | **696 / 696** | 0 | 2 ✓ | ✓ |
| 1920 × 1080 | **876 / 876** | 0 | 2 ✓ | ✓ |

## The content decision at 700 — **the chips, not the nudge event**

I took the prompt's stated alternative rather than its default.

**The materials chips repeat verbatim in *What you sent*, one column over, on the same screen.**
Dropping them at 700 costs the writer nothing: the information has not left the page, only the
duplicate has. **The nudge event appears nowhere else on this card** — it is the only statement of
when the scheduled follow-up lands, and a writer on a short viewport may need that date precisely in
order to plan around it. Losing it would be losing a fact; losing the chips is losing a repetition.

One or the other, never both: the timeline keeps every event it has, and that is asserted rather
than assumed.

⚠️ **And the chips-drop is unverified in the browser.** No query on the harness account renders
materials chips, so the rule is correct and locked at source but never exercised. The measurement
**reports** that rather than going green on an empty selector — which is exactly the failure the
stats case would have had if it had not been re-run against a waiting query.

## Kept as built — and one that is not as described

- **The progress bar stays as `QueryTimeline` renders it.** Its three states (within, overdue with a
  hatch zone past the expected marker, grace against the nudge horizon) are richer than the ref's
  single fill.
- ⚠️ **But it does *not* sit within the waiting event.** It is a trailing open-state block rendered
  **after** `<TimelineRows>`. Notably, **the ref does the same** — its `.wait` box follows `.tl`
  rather than sitting inside an `.ev`. So the prompt's sentence differs from both the code and its
  own ref. I have **left it**, because that section is headed *do not change*, because moving it
  would restructure a component the To-do sheet also renders, and because the ref does not support
  the change either. **Flagged for your call rather than done quietly.**
- §1f's ≥1100 scoping and the 1024 gap log stand.
- The retired collinearity lock stays retired.

## Locks

Three existing locks caught real faults; one more was over-broad:

1. The **grouped-selector trap**, for a third time — §3's shared disc rule made a first-match slice
   read the wrong block. Fixed with a helper that joins **every** block for a selector, written as a
   split rather than a regex so a selector list, a newline between selectors or a dotted class name
   cannot defeat it.
2. **A third unbounded slice** — `queryCentreMoment`'s reduced-motion case ran to end of file, so
   §5's new `max-height` block landed inside it and it reported "reduced motion HID the seal" about
   a `display: none` belonging to something else. Bounded at both ends.
3. Pack B's own Notes-meta case was amended to assert the **filter**, not the count — the count
   alone was what looked right.

## Untouched

Nothing under `src/types.ts`, `src/components/AllManuscripts.tsx`, `src/components/manuscripts/**`,
`src/lib/manuscriptPitch.ts` or the manuscripts reports was touched, staged or reformatted. Every
commit used `git commit --only -- <explicit paths>`; `git add -A` was never run. The stream's own
`tsc` error in `AllManuscripts.tsx` was left alone.

## Also landed

One line to `CLAUDE.md`: a custom property computed at `:root` cannot be overridden by a lower
variant, while one read inside a `calc()` resolves at the use site — why `--content-top-gap`'s
override failed and `--header-inset`'s worked, when the two look identical from a distance.

**Not deployed. Not pushed.**

---

# Fix pack 2 — the agent header and the list edge

Two reversals of Pack B, both from Nick's walkthrough against `102-rest-signed-off.html`.
Three commits: `add89c1` (the ref + a harness repair), `18987f7` (§1), `efdaac6` (§2).

## §1 — the header is a contained plate again

Pack B's §1h dissolved the hero into an open row closed by a hairline, on the reasoning that a card
inside a card is one frame too many. Against the signed-off ref it is not: the header is the query's
identity, and identity needs an edge — without one it reads as a caption drifting above the columns
rather than as the thing they belong to.

The plate wears `.f12-card`'s **tokens**, not its numbers — `var(--panel)`, `1px solid var(--line)`,
`var(--r-lg)`, `var(--sh-1)`. Restating `12px` and a literal hex would have agreed with the cards
today and drifted the first time a theme moved either. Browser-confirmed identical at all three
widths:

| | radius | ground | rim |
|---|---|---|---|
| `.f12-heroband` | 12px | `rgb(255,253,251)` | `1px rgb(230,220,205)` |
| `.qp-cols .f12-card` | 12px | `rgb(255,253,251)` | `1px rgb(230,220,205)` |

All four controls measured **inside** the plate at 1024/1440/1920 — avatar, status pill, primary,
kebab.

### The plate's height, with and without a status pill

The pack asks specifically whether the plate is stable when the pill is absent. This suite is
`environment: 'node'` with no box model, so the clause is carried by measurement: `fp2` hides the
pill and re-reads the plate.

| viewport | with pill | without pill |
|---|---|---|
| 1024×768 | 65px | **65px** |
| 1440×900 | 76px | **76px** |
| 1920×1080 | 76px | **76px** |

The avatar sets the row; the pill never did. What the source lock holds is the *cause* — a centred
flex row, so a shorter child cannot pull the height down with it.

### One casualty, repaired

`queryCentreHeads` asserted the literal `margin: 0 20px`, bundling two independent facts: the side
inset (load-bearing — it is what lines the header up with the cards beneath it) and the top margin
(incidental — `0` only because the band began where the masthead's rule ended). The plate takes a top
gap, so the case failed for the one reason that was never its subject. It now reads the side value
out of the shorthand and compares that alone. **Testing the shorthand tested more than the case
meant** — the same shape will bite any lock that asserts a whole shorthand to pin one of its parts.

## §2 — the list runs flush

**Mostly already true, and reported as that rather than rebuilt.** Pack B's §1c gave the list its
ground and seam with no radius, and §1b spanned the masthead across the body. Measured before a line
was changed:

| viewport | masthead left | list left | pane left | list radius | list margins | seam |
|---|---|---|---|---|---|---|
| 1024 | 327 | **327** | 673 → **661** | 0px | 0px/0px | 533/533 (full) |
| 1440 | 327 | **327** | 673 → **661** | 0px | 0px/0px | 678/678 (full) |
| 1920 | 327 | **327** | 673 → **661** | 0px | 0px/0px | 858/858 (full) |

The one thing genuinely still wrong was the **channel**: `.f12-body` carried `gap: var(--gut)`,
leaving 12px of page showing to the *right* of the seam. So the division the seam is supposed to
**be** was a line plus a stripe, and that is what made the list read as a widget resting on the page.
The ref's own split (`.cols`) has no gap either. Removing it moves the pane's left edge from 673 to
661 — exactly onto the list's right edge.

It costs no breathing room, because the inset was never the gap's job: the list's children carry
`padding-inline: var(--gut)` and the pane's carry their own 20px, so nothing lands against the line.
That is also what lets the ground and the seam run edge to edge, and it is locked, because deleting
the children's inset would put the rows against the seam with no obvious cause.

## A harness repair, and one unexercised assertion

The e2e onboarding walk matched `"Skip this step"` anchored and exact. One gated step
(*"Where are you with it?"*) offers **"Skip setup"** instead, so on that step the match found
nothing, the walk fell through to a Continue that stays disabled until a choice is made, and
Playwright auto-waited on it: **796 click attempts over seven minutes**, reported as a click failure
on a button that was only waiting for an answer. A prefix match reaches both wordings. The fallback
beneath it now takes a choice by **shape** rather than by label — any enabled button in the flow that
is not one of the flow's own verbs — because naming one option (`/Just getting started/`) is exactly
what failed here.

**⚠️ The dev e2e account has lost its query fixture.** After the walk was fixed and the run reached
the page, `/queries` rendered its empty branch — "No queries", "first query" — so there is no
selected query, no `.qp-pane`, and no plate. Every clause this pack specifies was measured earlier in
the session against a populated account and this exact CSS, and those are the numbers above. One
assertion added afterwards while repairing the heads lock — that the plate's left edge equals the
cards' — is **in the harness but has not yet run**. Stated rather than implied: it is not verified.
The fixture needs restoring before the next measurement run, which will otherwise fail at the same
line for the same reason.

## Gates

Baseline before editing: tsc pass, build pass, **285 files / 4713 tests, 0 failures**.

The manuscripts stream went live mid-run (`bbd466c`, `4103a7b`, four files dirty), and its
`plateEdit.test.tsx` was red in the shared tree — not mine. Gates therefore ran in an isolated
worktree at HEAD carrying only my files: **tsc pass, build pass, 285 files / 4720 tests, 0 failures**
at the final state, and green at each of the three commits independently.

Both new locks were verified **red before believed**: restoring the band shape fails the plate case,
and restoring the gap fails the channel case — each alone, neither spuriously.

**Nothing under `src/types.ts`, `AllManuscripts.tsx` or `manuscripts/**` was touched, staged or
reformatted** — confirmed against all three commits.

**Not deployed. Not pushed.**
