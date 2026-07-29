# Packages — empty states, Pro header, landing retoken, composition bars

Design refs: `design-refs/scriptally-packages-empty.html`, `design-refs/scriptally-packages-landing-newlook.html`.

**Commits:** `df7bbae` refs → `28532c1` Pro header (P3) → `0c67798` workshop empty (P4) → `0dc7303`
analytics empty (P5). Gates green per commit (tsc clean, `vite build` ✓, Vitest **1717**). No deploys.

**Status: Phases 1, 3, 4, 5 landed. Phase 2 HELD (stale ref). Phases 6, 7 NOT STARTED.** Details below.

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

**On the packages surface** (this build retires it here — Phase 2, held): one definition,
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

## Ref audit — and which phases are held

| Ref | State | Consequence |
|---|---|---|
| `scriptally-packages-empty.html` | ✅ current, new | Phases 4, 5 built from it |
| `scriptally-packages-landing-newlook.html` | ✅ current, new | Phases 6, 7 (not started) |
| `scriptally-packages-twotab.html` | ⚠️ **stale** | **Phase 2 HELD** |
| `scriptally-bar-forms.html` | ❌ **absent** from `~/Downloads` | Reference-only — non-blocking, noted |

The `~/Downloads` copy of `scriptally-packages-twotab.html` is **byte-identical to the copy already
committed** (body hashes match), and it is the pre-sweep version: **3 single-fill
`background:var(--sage-deep)` bars and zero hatch/composition markup**. Per the ruling that a stale
ref must not be built from, Phase 2 — the composition bars and dark-sage retirement across the
already-shipped Analytics tab — is held until the updated ref lands. The committed copy was left
exactly as it was rather than overwritten with a stale file.

The two current refs are already in the final language (zero `sage-deep` between them, hatch present),
which is why Phases 3–5 could proceed and why the composition form in Phase 5's preview comes from a
**current ref** rather than from this prompt's prose.

**Expect this until Phase 2 lands:** the Analytics tab's *populated* view still shows the old
single-fill sage bars while its *empty* view teaches the new composition form. That inconsistency is
the direct, visible cost of the held phase.

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

## Outstanding

- **Phase 2 — composition bars + dark-sage retirement.** HELD on the stale `twotab` ref. When it
  lands: build the bar from the `.tr3` structure already proven in Phase 5's preview, apply the
  reassignment table, and use the predicate recorded above.
- **Phase 6 — landing retoken.** Not started. It is the largest piece (a full rebuild of the 452-line
  `PackageShowcase`, a new self-contained hero-visual component with a replaceable seam, scroll-
  triggered compare lanes, and the removal of every `psw-*` keyframe) and deserves a session with room
  to do it properly rather than a rushed tail. **The current Cappuccino landing is untouched and still
  works** — no half-replaced state on `main`.
- **Phase 7 — gate the landing's community claims.** Depends on Phase 6.
- Screenshots of the landing in both flag states, and of the populated Analytics tab with composition
  bars, belong to those phases and are not in this report.

## Lab note

`#/pkg-lab` is **stripped from the dev build** — `import.meta.env.DEV` is false under
`vite build --mode development`, so the harness is tree-shaken out (`"pkg-lab"` appears 0 times in the
deployed bundle). Reviewing these states on dev needs either real data or a one-line gate change to
`import.meta.env.MODE !== "production"`.
