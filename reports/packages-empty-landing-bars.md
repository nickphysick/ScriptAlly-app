# Packages — empty states, Pro header, landing retoken, composition bars

Design refs: `design-refs/scriptally-packages-empty.html`, `design-refs/scriptally-packages-landing-newlook.html`.

**Commits:** `df7bbae` refs → `28532c1` Pro header (P3) → `0c67798` workshop empty (P4) → `0dc7303`
analytics empty (P5) → `41410cb` corrected refs → `422ffc1` composition bars + sage retirement (P2).
Gates green per commit (tsc clean, `vite build` ✓, Vitest **1724**). No deploys.

**Status: Phases 1, 2, 3, 4, 5 landed. Phases 6, 7 HELD — product decision, not a blocker.**

---

## Step 0 answers, in full

### 1. RED — the overdue / no-reply predicate

`taskPrecedence.replyTask()` reuses cleanly from packages code — `src/lib/packageAnalytics.ts:20`
already imports it and `overdueSends()` already calls it. No duplication, no blocker, and the
"3× responseTimeWeeks floored at 12 weeks" rule is **not** reintroduced anywhere (it does not exist in
this codebase).

**The predicate, as ruled:**

```
replied       = isResponse(q)                                   // packageMetrics; requests ⊆ responses
no reply      = !isResponse(q) && replyTask({...}) === "close"
still waiting = everything else unanswered                      // includes replyTask() === "nudge"
```

`replyTask` inputs come straight from the records: `q.status`, `q.dateSent`, `q.responseDeadline`,
`agent.responseTimeWeeks`, `agent.noResponseMeansNo`, `q.lastNudgeSentDate`.

Two consequences worth knowing:

- A query whose agent has **no recorded reply window** returns `"none"` forever, so it can never
  become "no reply". Honest — there is nothing to be late against, and the data-quality task covers
  that case elsewhere.
- A `noResponseMeansNo` agent skips "nudge" entirely and goes straight to `"close"` at deadline +
  grace, so those sends reach "no reply" sooner. Correct: stated silence *is* the answer.

### ⚠️ DELIBERATE DIVERGENCE — do not "fix" these into agreement

**The composition bar and the ⚠ marker answer different questions and fire at different thresholds.**

| | Question | Threshold |
|---|---|---|
| `overdueSends()` → the ⚠ marker, the "Waiting game" recommendation | *Should I chase this?* | `replyTask()` is **`"nudge"` OR `"close"`** |
| The composition bar's "no reply" segment | *Has this gone quiet?* | `replyTask() === "close"` **only** |

So a send can legitimately carry the ⚠ marker while the bar still counts it as **still waiting**. That
is the intended behaviour, not an inconsistency: a query that merely owes a nudge is still live and
the writer is expected to chase it, and colouring it as "no reply" would count an outstanding query
as a failure — the exact thing the composition form exists to stop doing.

If a future change makes these agree, it will silently either (a) start calling live queries dead, or
(b) stop prompting nudges. Both are regressions. **They are meant to differ.**

### 2. `--sage-deep` / `#5a6e58` usage

**On the packages surface** (Phase 2 retired it — the full list is further down): one definition,
`--pkg-sage: var(--sage-d)` at `packageWorkshop.css:34`, consumed at ~12 sites — note left-rules, the
hot usage line, the req chip, `hero3 .big`, `srow b.g`, `kpi .v.g`, `kpi .d b`, leaderboard bars,
material bars + `rr`, percentile pills, the ev chip, and the recommendation card border. Plus
`PackageShowcase.tsx` (its own Cappuccino-scoped copy — Phase 6 replaces that file wholesale).

`--pkg-sage-band: #dce0d9` (the pale band) **stays**, as specified.

**Elsewhere — reported, untouched:** `index.css`, `designTokens.ts`, `shellV2.css`, `f12.css`,
`shellTokens.ts`, `discover.css`, `agentsV2.css`, `todo.css`, `comps.css`, `forms.css`, `auth.css`,
`marketing.css`, `Dashboard.tsx`, `EditQueryDrawer/EditAgentDrawer/Form11Drawer`, `Onboarding.tsx`,
`MaterialsField.tsx`, `EmailImportReview.tsx`, `StatCards.tsx`, `OverToYou.tsx`, `NoteEditor.tsx`,
`QueryTimeline.tsx`, the six onboarding screens, `timelineEvent.ts`. Also
`PackageWorkshop.tsx:403` (`--wk-acc: var(--sage-d)`) — that file is Phase D's and stays untouched.

### 3. Zero-state routing — the Pro hypothesis does not hold

There is **no Pro gate anywhere on this route**: `isProUser` / `UserPlan.PRO` appear in neither
`App.tsx`, `SubmissionPackages.tsx` nor `packages/`. The actual split:

```
activeMs && msPackages.length === 0 && !entered   → PackageShowcase   (the landing)
otherwise                                          → the two-tab surface
```

`entered` flips true from exactly one place — the landing's "Try it with example data →", which also
starts the FR3 tour. **So before this build the empty workshop was only reachable by taking the tour
and letting it end.** Phase 4's empty state is now also the natural destination once a writer has
materials but no packages. Worth deciding separately whether the landing wants a plain "skip" door;
I have not invented one.

### 4. PageHeader can carry the Pro treatment — with no changes at all

Discover had already solved this without touching the shared component, and Phase 3 mirrors it:
`titleAdornment` (existing prop) for the Pro pill · `actionsSlot` (existing prop) for the right
cluster · PageHeader's **own** `.svh-rule` restyled under `.pkgw` into the 2px Pro rule, so there is
one rule rather than a hairline plus a second rule · the tinted strip as a sibling below. Nothing was
added to a component eleven pages share.

One constraint found: `actions` and `actionsSlot` are mutually exclusive in the component, so the
manuscript selector and "＋ New package" go through `actionsSlot` as one composed node.

### 5. `PackageWorkshop.tsx` — untouched, confirmed

910 lines, referenced only for its `PackageSaveFields` type by `SubmissionPackages.tsx` and
`WorkshopTab.tsx`. Not modified in this build. It belongs to the Phase D retirement sweep.

### 6. Tree / collisions

Clean at start (HEAD `a170283`). The Discover stream had committed everything four hours earlier, so
`PageHeader.tsx`, `discover.css` and `index.css` were settled; none were edited here.

---

## Ref audit

| Ref | State | Consequence |
|---|---|---|
| `scriptally-packages-empty.html` | ✅ current, new | Phases 4, 5 built from it |
| `scriptally-packages-landing-newlook.html` | ✅ current, new | Phases 6, 7 (not started) |
| `scriptally-packages-twotab.html` | ✅ **corrected + committed** (`41410cb`) | Phase 2 built from it |
| `scriptally-bar-forms.html` | ✅ committed, reference-only | Not built from, per the brief |

**Filename artefact worth knowing.** On re-supply, the file at the plain name
`~/Downloads/scriptally-packages-twotab.html` was *still* the stale pre-sweep copy — the browser had
never overwritten it and saved the corrected export beside it as `…twotab (1).html` and `(2).html`.
Both duplicates are byte-identical and both pass every gate (`complegend` 4 · `sage-deep` 0 ·
`#5a6e58` 0 · hatch 4); `(2)` is what is committed. **Deleting the stale plain-named file would stop
the gate failing on a filename artefact next time.**

*(History: on the first pass the only copy available was the pre-sweep version — 3 single-fill sage
bars, zero hatch — so Phase 2 was held rather than built from it, and the committed ref was left
untouched rather than overwritten with a stale file.)*

All four refs are now current and committed. Phases 3–5 were built from the empty-states ref while
Phase 2 waited, so the composition form in Phase 5's preview came from a **current ref** throughout —
never inferred from prose.

**Resolved.** The populated and empty views now teach the same form — both a bordered three-segment
track with a 45° hatch (the empty one greyed and slightly taller, per its own ref). Measured:
populated `1px rgba(46,39,35,0.2)` / 11px, empty `1px rgba(46,39,35,0.14)` / 14px, both hatching at
45deg with the identical 3px/6px rhythm.

---

## What landed

**Phase 3 — Pro header (`28532c1`).** One header across all three states: Pro pill (shield, slate on
slate-tint), italic Playfair sub, manuscript selector + primary action on the title's line (the
floating chip row that was the main source of dead space is gone), the 2px slate Pro rule, and the
Pro claim strip hanging off it. Reading order matches Discover: title → rule → claim → tabs.

**Phase 4 — workshop empty state (`0c67798`).** New `WorkshopEmpty`: derived three-step strip, three
ink-bordered type cards with their own counts and Add actions (pulse on the query letter only, and
only while its count is 0; `prefers-reduced-motion` gets a static ring), the live "Create your first
package" card beside two `aria-hidden`, non-focusable skeleton shells with the italic caption, and the
example-data band wired to the **existing** FR3 tour.

Partial states, as required — the ref doesn't draw them:
- nothing at all → the full screen replaces the sidebar+grid (an empty sidebar beside an empty grid
  teaches nothing);
- materials but no packages → sidebar+grid render normally and only the packages section degrades,
  steps strip advanced to 2;
- one type missing → all three type cards still render; a type with materials shows its real count and
  loses the pulse.

**Phase 5 — analytics empty state (`0dc7303`).** New `AnalyticsEmpty`: dashed KPI shells with
em-dashes, the illustrated "Nothing to measure yet" card, the greyed "What appears here" preview that
teaches the composition shape (hatch verified applying in-browser), and the community teaser — which
renders regardless of the flag because it foreshadows a comparison without claiming any data exists,
unlike the percentile claims, which stay gated.

---

## Phase 2 — what landed (`422ffc1`)

**The form.** Every bar is a single track with a 1px ink-alpha hairline, split three ways: replied
(solid ink) · still waiting (45° hatch) · no reply (empty). Legend once per panel. Labels carry the
denominator — "5/6 · 2★", "9 of 11" — never a bare percentage. Applied to the funnel, the package
leaderboard and the materials table, in both the all-packages and in-focus views.

**Every place `--sage-deep` was removed from the packages surface** — swept IN PLACE, so no dead
declarations remain (verified: zero `var(--pkg-sage)` outside the band):

| Site | Was | Now |
|---|---|---|
| `.pkgw-lbr .bar i` (leaderboard) | sage fill | composition bar |
| `.pkgw-matr .bar2 i` (materials) | sage fill | composition bar |
| `.pkgw-fr .tr2 i` (funnel, Replied row) | sage fill | composition bar |
| `.pkgw-hero3 .big` (card-back reply rate) | sage | **ink** |
| `.pkgw-kpi .v.g` (KPI reply rate) | sage | **ink** |
| `.pkgw-kpi .d b` (KPI detail bold) | sage | **ink** |
| `.pkgw-lbr .lv b` (leaderboard value) | sage | **ink** |
| `.pkgw-matr .rr` (material value) | sage | **ink** |
| `.pkgw-srow b.g` (card-back stat) | sage | **ink** |
| `.pkgw-agrow .st3.rep` ("REPLIED") | sage | **ink** |
| `.pkgw-req` (card band request chip) | sage | **gold** |
| `.pkgw-mchip .use.hot` ("· 3 REQUESTS") | sage | **gold** |
| `.pkgw-evchip` (request event chip) | sage border + text | **gold** fill/border/ink |
| `.pkgw-pctpill` (ordinary percentile) | sage-band + sage | fill + hairline + ink-soft |
| `.pkgw-pctpill.top` | — | gold tint + gold ink + `#e4d5b2` |
| `.pkgw-rec3` (recommendation card) | **sage border** + sage shadow | ink border + letterpress |
| `.pkgw-rec3 .rk2` (kicker) | sage | burgundy |
| `.pkgw .note` (italic left-rule) | sage | `--pink-line` |
| `--pkg-sage` token | `var(--sage-d)` | **deleted** |
| `--pkg-sage-band` | `#dce0d9` | **unchanged**, as specified |

`--sage-d` elsewhere in the app is untouched. `PackageShowcase.tsx` still carries its own
Cappuccino-scoped copy — that file belongs to Phase 6.

**7 new tests** (1724 total): a reply counts however it ended · a nudge-due send is waiting, not
no-reply · close is the boundary · stated silence closes without ever nudging · no recorded window is
never overdue · widths sum to 100 and the label carries the denominator · an empty set is all-zero.
One is named for the divergence and asserts both behaviours on the SAME query.

## Outstanding

- **Phase 6 — landing retoken** and **Phase 7 — gate its community claims.** HELD pending a product
  decision. **The current Cappuccino landing is untouched and still works** — no half-replaced state
  on `main`. When they run: a full rebuild of the 452-line `PackageShowcase`, a self-contained
  hero-visual component with a replaceable seam, scroll-triggered compare lanes, and the removal of
  every `psw-*` keyframe.
- Screenshots of the landing in both flag states belong to those phases.

## Lab note

`#/pkg-lab` is **stripped from the dev build** — `import.meta.env.DEV` is false under
`vite build --mode development`, so the harness is tree-shaken out (`"pkg-lab"` appears 0 times in the
deployed bundle). Reviewing these states on dev needs either real data or a one-line gate change to
`import.meta.env.MODE !== "production"`.
